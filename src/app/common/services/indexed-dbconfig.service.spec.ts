import { TestBed } from '@angular/core/testing';
import { IndexedDBConfigService } from './indexed-dbconfig.service';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { lastValueFrom } from 'rxjs';

describe('IndexedDBConfigService', () => {
  let service: IndexedDBConfigService;
 let mockNgxDbService: jest.Mocked<NgxIndexedDBService>;

   const mockTransaction = {
    objectStore: jest.fn(),
  };

  const mockDB: any = {
    transaction: jest.fn(),
  };


  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IndexedDBConfigService);
     service = new IndexedDBConfigService();
    (service as any).dbName = 'TestDB';
    (service as any).dbVersion = 1;

     // Inject mock dbReady
    (service as any).dbReady = Promise.resolve();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate DBConfig with provided fields and uniqueness', () => {
    const fields = [
      { name: 'id', unique: true },
      { name: 'name' },
    ];

    const result = service.generateDBConfig('TestStore', fields);

    expect(result).toEqual({
      name: 'TestDB',
      version: 1,
      objectStoresMeta: [
        {
          store: 'TestStore',
          storeConfig: { keyPath: 'clientTimestamp', autoIncrement: true },
          storeSchema: [
            {
              name: 'id',
              keypath: 'id',
              options: { unique: true },
            },
            {
              name: 'name',
              keypath: 'name',
              options: { unique: false },
            },
          ],
        },
      ],
    });
  });

  it('should generate DBConfig with empty schema when no fields are passed', () => {
    const result = service.generateDBConfig('EmptyStore');

    expect(result).toEqual({
      name: 'TestDB',
      version: 1,
      objectStoresMeta: [
        {
          store: 'EmptyStore',
          storeConfig: { keyPath: 'clientTimestamp', autoIncrement: true },
          storeSchema: [],
        },
      ],
    });
  });

  it('should resolve and set db on success', async () => {
    const mockDB = {};
    const request: any = {};
    const openMock = jest.fn().mockReturnValue(request);

    (globalThis as any).indexedDB = {
      open: openMock,
    };

    setTimeout(() => {
      request.result = mockDB;
      request.onsuccess({ target: request });
    }, 0);

    const promise = (service as any).initDB();
    await expect(promise).resolves.toBeUndefined();
    expect((service as any).db).toBe(mockDB);
  });


  it('should reject if there is an error opening the DB', async () => {
    const request: any = {};
    const openMock = jest.fn().mockReturnValue(request);
    (globalThis as any).indexedDB = {
      open: openMock,
    };

    const errorEvent = new Event('error');

    setTimeout(() => {
      request.onerror(errorEvent);
    }, 0);

    await expect((service as any).initDB()).rejects.toBe(errorEvent);
  });

   it('should emit error if db is not initialized', (done) => {
    (service as any).db = null;

    service.add('TestStore', { id: 1 }).subscribe({
      error: (err) => {
        expect(err).toBe('Database not initialized');
        done();
      },
    });
  });

  it('should add data and emit value, then complete', (done) => {
    const mockData = { id: 1, name: 'test' };

    const mockRequest: any = {};
    const mockStore = {
      add: jest.fn().mockReturnValue(mockRequest),
    };
    const mockTransaction: any = {
      objectStore: jest.fn().mockReturnValue(mockStore),
    };
    const mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
    };

    (service as any).db = mockDB;

    const result: any[] = [];
    service.add('TestStore', mockData).subscribe({
      next: (val) => result.push(val),
      complete: () => {
        expect(result).toEqual([mockData]);
        expect(mockDB.transaction).toHaveBeenCalledWith(['TestStore'], 'readwrite');
        expect(mockStore.add).toHaveBeenCalledWith(mockData);
        done();
      },
      error: () => {
        fail('should not error');
        done();
      },
    });

     setTimeout(() => {
      mockRequest.onsuccess?.();
      mockTransaction.oncomplete?.();
    }, 0);
  });

  it('should emit error if add fails', (done) => {
    const mockRequest: any = {};
    const mockStore = {
      add: jest.fn().mockReturnValue(mockRequest),
    };
    const mockTransaction: any = {
      objectStore: jest.fn().mockReturnValue(mockStore),
    };
    const mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
    };

    (service as any).db = mockDB;

    service.add('TestStore', { id: 1 }).subscribe({
      next: () => {
        fail('should not emit next');
      },
      error: (err) => {
        expect(err).toBe('Add failed');
        done();
      },
    });

    setTimeout(() => {
      mockRequest.onerror?.();
    }, 0);
  });

   it('should emit error if db is not initialized', (done) => {
    (service as any).db = null;

    service.getAll('TestStore').subscribe({
      error: (err) => {
        expect(err).toBe('Database not initialized');
        done();
      },
    });
  });

  it('should return all items from the store and complete', (done) => {
    const mockData = [{ id: 1 }, { id: 2 }];
    const mockRequest: any = {
      result: mockData,
    };

    const mockStore = {
      getAll: jest.fn().mockReturnValue(mockRequest),
    };

    const mockTransaction: any = {
      objectStore: jest.fn().mockReturnValue(mockStore),
    };

    const mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
    };

    (service as any).db = mockDB;

    const result: any[] = [];

    service.getAll('TestStore').subscribe({
      next: (data) => result.push(...data),
      complete: () => {
        expect(result).toEqual(mockData);
        expect(mockDB.transaction).toHaveBeenCalledWith(['TestStore'], 'readonly');
        expect(mockStore.getAll).toHaveBeenCalled();
        done();
      },
      error: () => {
        fail('Should not error');
        done();
      },
    });

    // Simulate IndexedDB success
    setTimeout(() => {
      mockRequest.onsuccess?.();
      mockTransaction.oncomplete?.();
    }, 0);
  });

  it('should emit error if getAll fails', (done) => {
    const mockRequest: any = {};

    const mockStore = {
      getAll: jest.fn().mockReturnValue(mockRequest),
    };

    const mockTransaction: any = {
      objectStore: jest.fn().mockReturnValue(mockStore),
    };

    const mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
    };


    (service as any).db = mockDB;

    service.getAll('TestStore').subscribe({
      next: () => {
        fail('Should not emit next');
      },
      error: (err) => {
        expect(err).toBe('GetAll failed');
        done();
      },
    });

    setTimeout(() => {
      mockRequest.onerror?.();
    }, 0);
  });

   it('should delete a record successfully', (done) => {
    const mockRequest: any = {};
    const mockObjectStore = {
      delete: jest.fn().mockReturnValue(mockRequest),
    };

    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockDB.transaction.mockReturnValue(mockTransaction);

    service['db'] = mockDB; // directly assign mock DB

    // simulate onsuccess later
    setTimeout(() => {
      mockRequest.onsuccess(); 
    }, 10);

    service.delete('testStore', 123).subscribe({
      next: () => {
        expect(mockDB.transaction).toHaveBeenCalledWith(['testStore'], 'readwrite');
        expect(mockObjectStore.delete).toHaveBeenCalledWith(123);
        done();
      },
      error: () => {
        fail('Should not reach error');
        done();
      },
    });
  });

  it('should emit error if delete fails', (done) => {
    const mockRequest: any = {};
    const mockObjectStore = {
      delete: jest.fn().mockReturnValue(mockRequest),
    };

    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockDB.transaction.mockReturnValue(mockTransaction);

    service['db'] = mockDB;

    setTimeout(() => {
      mockRequest.onerror('Delete failed');
    }, 10);

    service.delete('testStore', 123).subscribe({
      next: () => {
        fail('Expected error');
        done();
      },
      error: (err) => {
        expect(err).toBe('Delete failed');
        done();
      },
    });
  });

  it('should handle onupgradeneeded and create/delete object stores correctly', async () => {
  const mockDeleteObjectStore = jest.fn();
  const mockCreateObjectStore = jest.fn();

  const mockDb = {
    objectStoreNames: {
      contains: jest
        .fn()
        .mockImplementationOnce((name) => name === 'formSubmissions')
        .mockImplementationOnce(() => false),
    },
    deleteObjectStore: mockDeleteObjectStore,
    createObjectStore: mockCreateObjectStore,
  };

  const mockRequest: any = {
    onsuccess: jest.fn(),
    onerror: jest.fn(),
    onupgradeneeded: jest.fn(),
    result: mockDb,
  };

  // Mock indexedDB.open
  (globalThis as any).indexedDB = {
    open: jest.fn().mockReturnValue(mockRequest),
  };

  // Call initDB() which triggers the mocked open()
  const initPromise = (service as any).initDB();

  // Manually trigger the onupgradeneeded callback
  const upgradeEvent = { target: { result: mockDb } };
  mockRequest.onupgradeneeded(upgradeEvent);

  // Simulate success event
  const successEvent = { target: { result: mockDb } };
  mockRequest.onsuccess(successEvent);

  await expect(initPromise).resolves.toBeUndefined();

  expect(mockDb.objectStoreNames.contains).toHaveBeenCalledWith('formSubmissions');
  expect(mockDeleteObjectStore).toHaveBeenCalledWith('formSubmissions');
  expect(mockCreateObjectStore).toHaveBeenCalledWith('offlineFormSubmission', { keyPath: 'clientTimestamp' });
});

 it('should reject if database is not initialized', async () => {
    // Make sure db is undefined
    (service as any).db = undefined;

    await expect(
      lastValueFrom(service.delete('storeName', 123))
    ).rejects.toEqual('Database not initialized');
  });
  
});
