import { TestBed } from '@angular/core/testing';
import { IndexedDBService } from './indexed-db.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { of, lastValueFrom, throwError } from 'rxjs';

(globalThis as any).indexedDB = {
  open: jest.fn(() => {
    const dbMock = {
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn(),
      })),
      objectStoreNames: {
        contains: jest.fn(() => false),
      },
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(),
          get: jest.fn(),
        })),
        oncomplete: null,
        onerror: null,
      })),
      close: jest.fn(),
    };

    const request: any = {
      result: dbMock,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };

    setTimeout(() => {
      if (request.onupgradeneeded)
        request.onupgradeneeded({ target: { result: dbMock } });
      if (request.onsuccess) request.onsuccess();
    }, 0);

    return request;
  }),
};

afterEach(() => {
    jest.restoreAllMocks();
  });

describe('IndexedDBService', () => {
  let service: IndexedDBService;
  let db: any;
  let tx: any;
  let store: any;
  let mockRequest: any;

  const mockDbService = {
    add: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    store = {
      get: jest.fn(() => {
        mockRequest = {
          onsuccess: () => {},
          onerror: () => {},
          result: { data: 'mockedValue' },
          error: null,
        };
        return mockRequest;
      }),
    };

    tx = {
      objectStore: () => store,
      oncomplete: null,
      onerror: null,
    };

    db = {
      transaction: jest.fn(() => tx),
      close: jest.fn(),
    };

    (globalThis as any).indexedDB.open = jest.fn(() => {
      const request: any = {
        result: db,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);

      return request;
    });

    TestBed.configureTestingModule({
      providers: [
        IndexedDBService,
        { provide: NgxIndexedDBService, useValue: mockDbService },
      ],
    });

    service = TestBed.inject(IndexedDBService);
  });

  it('should reject if get fails', async () => {
    const fakeError = new Error('get failed');
    store.get = jest.fn(() => {
      mockRequest = {
        onsuccess: () => {},
        onerror: () => {},
        result: null,
        error: fakeError,
      };
      return mockRequest;
    });

    const promise = service.get('badKey');
    setTimeout(() => mockRequest.onerror(), 0);
    await expect(promise).rejects.toThrow('get failed');
  });

  it('should call add with correct params', async () => {
    const data = { id: 1, name: 'Test' };
    mockDbService.add.mockReturnValue(of(data));
    const result = await lastValueFrom(service.add('DraftForms', data));
    expect(result).toEqual(data);
    expect(mockDbService.add).toHaveBeenCalledWith('DraftForms', data);
  });

  it('should call getAll with correct params', async () => {
    const mockList = [{ id: 1 }, { id: 2 }];
    mockDbService.getAll.mockReturnValue(of(mockList));
    const result = await lastValueFrom(service.getAll('DraftForms'));
    expect(result).toEqual(mockList);
    expect(mockDbService.getAll).toHaveBeenCalledWith('DraftForms');
  });

  it('should call delete with correct params', async () => {
    const mockResponse = { success: true };
    mockDbService.delete.mockReturnValue(of(mockResponse));
    const result = await lastValueFrom(service.delete('DraftForms', 1));
    expect(result).toEqual(mockResponse);
    expect(mockDbService.delete).toHaveBeenCalledWith('DraftForms', 1);
  });

  it('should reject if indexedDB open fails', async () => {
    const fakeError = new Error('Failed to open DB');
    (globalThis as any).indexedDB.open = jest.fn(() => {
      const req: any = {
        result: null,
        error: fakeError,
        onsuccess: null,
        onerror: null,
      };
      setTimeout(() => {
        if (req.onerror) req.onerror();
      }, 0);
      return req;
    });

    await expect((service as any).getDB()).rejects.toThrow('Failed to open DB');
  });

  it('should resolve with value from getByKey', (done) => {
    const mockResult = { id: 1, name: 'Test Item' };

    const mockRequest: any = {};
    const mockStore = {
      get: jest.fn(() => {
        setTimeout(() => {
          mockRequest.result = mockResult;
          mockRequest.onsuccess?.();
        }, 0);
        return mockRequest;
      }),
    };

    const mockTx = {
      objectStore: jest.fn(() => mockStore),
    };

    const mockDb = {
      transaction: jest.fn(() => mockTx),
    };

    const dbPromise = Promise.resolve(mockDb);
    (service as any).dbPromise = dbPromise;

    service.getByKey('DraftForms', 1).subscribe((result) => {
      expect(mockDb.transaction).toHaveBeenCalledWith(
        ['DraftForms'],
        'readonly',
      );
      expect(mockTx.objectStore).toHaveBeenCalledWith('DraftForms');
      expect(mockStore.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
      done();
    });
  });

  it('should store data successfully using set()', (done) => {
    const putMock = jest.fn();

    const tx = {
      objectStore: () => ({ put: putMock }),
      oncomplete: (() => {}) as () => void,
      onerror: (() => {}) as () => void,
    };

    const db = {
      transaction: jest.fn(() => tx),
      close: jest.fn(),
    };

    (globalThis as any).indexedDB.open = jest.fn(() => {
      const request: any = {
        result: db,
        onsuccess: null,
        onerror: null,
      };
      setTimeout(() => request.onsuccess?.(), 0);
      return request;
    });

    const testService = TestBed.inject(IndexedDBService);
    const promise = testService.set('myKey', 'myData');

    setTimeout(async () => {
      tx.oncomplete();
      await expect(promise).resolves.toBeUndefined();
      expect(db.transaction).toHaveBeenCalledWith(
        testService['storeName'],
        'readwrite',
      );
      expect(putMock).toHaveBeenCalledWith({ key: 'myKey', data: 'myData' });
      expect(db.close).toHaveBeenCalled();
      done();
    }, 10);
  });

  it('should update a record and resolve with result', (done) => {
    const mockValue = { id: 1, name: 'Updated Item' };
    const mockResult = 1;

    const mockRequest: any = {};
    const mockStore = {
      put: jest.fn(() => {
        setTimeout(() => {
          mockRequest.result = mockResult;
          mockRequest.onsuccess?.();
        }, 0);
        return mockRequest;
      }),
    };
    const mockTx = {
      objectStore: jest.fn(() => mockStore),
    };
    const mockDb = {
      transaction: jest.fn(() => mockTx),
    };
    (service as any).dbPromise = Promise.resolve(mockDb);
    service.update('DraftForms', mockValue).subscribe((result) => {
      expect(mockDb.transaction).toHaveBeenCalledWith(
        ['DraftForms'],
        'readwrite',
      );
      expect(mockTx.objectStore).toHaveBeenCalledWith('DraftForms');
      expect(mockStore.put).toHaveBeenCalledWith(mockValue);
      expect(result).toBe(mockResult);
      done();
    });
  });

  it('should update the status if entry is found', (done) => {
    const storeName = 'DraftForms';
    const entryId = 1;
    const newStatus = 'COMPLETED';
    const existingEntry = { id: 1, name: 'Sample', status: 'PENDING' };
    const updatedEntry = { ...existingEntry, status: newStatus };
    jest.spyOn(service, 'getByKey').mockReturnValue(of(existingEntry));
    jest.spyOn(service, 'update').mockReturnValue(of(updatedEntry));

    service.updateStatus(storeName, entryId, newStatus).subscribe((result) => {
      expect(service.getByKey).toHaveBeenCalledWith(storeName, entryId);
      expect(service.update).toHaveBeenCalledWith(storeName, updatedEntry);
      expect(result).toEqual(updatedEntry);
      done();
    });
  });

  it('should create object store and indexes during onupgradeneeded in dbPromise', async () => {
    const createIndexMock = jest.fn();
    const storeMock = { createIndex: createIndexMock };
    const createObjectStoreMock = jest.fn(() => storeMock);
    const containsMock = jest.fn(() => false);

    const mockDB = {
      objectStoreNames: { contains: containsMock },
      createObjectStore: createObjectStoreMock,
      close: jest.fn(),
    };

    const mockRequest: any = {
      result: mockDB,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };

    (globalThis as any).indexedDB.open = jest.fn(() => {
      setTimeout(() => {
        mockRequest.onupgradeneeded?.({ target: { result: mockDB } });
        mockRequest.onsuccess?.();
      }, 0);
      return mockRequest;
    });

    const testService = TestBed.inject(IndexedDBService);
    await (testService as any).createDatabase();
    expect(containsMock).toHaveBeenCalledWith('DraftForms');
    expect(createObjectStoreMock).toHaveBeenCalledWith('DraftForms', {
      keyPath: 'id',
      autoIncrement: true,
    });
    expect(createIndexMock).toHaveBeenCalledWith('status', 'status', {
      unique: false,
    });
    expect(createIndexMock).toHaveBeenCalledWith('savedAt', 'savedAt', {
      unique: false,
    });
  });

  it('should return null if entry is not found in updateStatus', (done) => {
    const storeName = 'DraftForms';
    const entryId = 123;
    const newStatus = 'ARCHIVED';

    jest.spyOn(service, 'getByKey').mockReturnValue(of(null));

    service.updateStatus(storeName, entryId, newStatus).subscribe((result) => {
      expect(service.getByKey).toHaveBeenCalledWith(storeName, entryId);
      expect(result).toBeNull();
      done();
    });
  });

  it('should handle error when adding data fails', async () => {
    const error = new Error('Add failed');
    mockDbService.add.mockReturnValue(throwError(() => error));

    await expect(lastValueFrom(service.add('DraftForms', {}))).rejects.toThrow(
      'Add failed',
    );
  });

 it('should create object store if it does not exist', async () => {
  const mockCreateObjectStore = jest.fn();

  const mockDb = {
    objectStoreNames: {
      contains: jest.fn().mockReturnValue(false),
    },
    createObjectStore: mockCreateObjectStore,
  };

  const mockRequest: any = {};

  Object.defineProperty(mockRequest, 'result', {
    get: () => mockDb,
  });

   setTimeout(() => {
    mockRequest.onupgradeneeded?.({ target: mockRequest });
    mockRequest.onsuccess?.({ target: mockRequest });
  }, 0);

  const openSpy = jest.fn().mockReturnValue(mockRequest);

  // @ts-ignore override
  global.indexedDB = { open: openSpy } as any;

  const db = await service['getDB']();

  expect(openSpy).toHaveBeenCalledWith(service['dbName'], 1);
  expect(mockDb.objectStoreNames.contains).toHaveBeenCalledWith(service['storeName']);
  expect(mockCreateObjectStore).toHaveBeenCalledWith(service['storeName'], { keyPath: 'key' });
  expect(db).toBe(mockDb);
});

});
