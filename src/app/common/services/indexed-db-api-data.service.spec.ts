import { IndexedDBApiDataService } from './indexeddbApiData.service';

describe('IndexedDBApiDataService', () => {
  let service: IndexedDBApiDataService;
  let mockDB: any;
  let mockStore: any;
  let mockTx: any;
  let mockOpenRequest: any;
  let mockGetRequest: any;

  const triggerOpenSuccess = () => {
    mockOpenRequest.onsuccess?.({ target: mockOpenRequest });
  };

  const triggerGetSuccess = () => {
    mockGetRequest.onsuccess?.({ target: mockGetRequest });
  };

  const triggerGetError = () => {
    mockGetRequest.onerror?.({ target: mockGetRequest });
  };

  beforeEach(() => {
    mockStore = {
      put: jest.fn(),
      get: jest.fn(),
    };

    mockTx = {
      objectStore: jest.fn(() => mockStore),
    };

    mockDB = {
      transaction: jest.fn(() => mockTx),
    };

    mockGetRequest = {
      onsuccess: null,
      onerror: null,
      result: { name: 'Mocked Result' },
    };

    mockOpenRequest = {
      onsuccess: null,
      result: mockDB,
    };

    (globalThis as any).indexedDB = {
      open: jest.fn().mockReturnValue(mockOpenRequest),
    };

    service = new IndexedDBApiDataService();
  });

  it('creates object store if not exists during upgrade', () => {
    const mockCreateObjectStore = jest.fn();
    const mockDBWithUpgrade = {
      objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
      createObjectStore: mockCreateObjectStore,
    };

    const upgradeRequest: any = {
      result: mockDBWithUpgrade,
    };

    (globalThis as any).indexedDB.open = jest.fn().mockReturnValue(upgradeRequest);

    service = new IndexedDBApiDataService();
    upgradeRequest.onupgradeneeded?.();

    expect(mockDBWithUpgrade.objectStoreNames.contains).toHaveBeenCalledWith('HttpCache');
    expect(mockCreateObjectStore).toHaveBeenCalledWith('HttpCache');
  });

  it('stores value correctly in set()', () => {
    const testKey = 'testKey';
    const testValue = { foo: 'bar' };

    service.set(testKey, testValue);
    triggerOpenSuccess();

    expect(mockDB.transaction).toHaveBeenCalledWith('HttpCache', 'readwrite');
    expect(mockStore.put).toHaveBeenCalledWith(testValue, testKey);
  });

  it('returns value in get() when successful', async () => {
    const testKey = 'testKey';

    mockStore.get.mockReturnValue(mockGetRequest);
    const resultPromise = service.get(testKey);

    triggerOpenSuccess();
    triggerGetSuccess();

    const result = await resultPromise;
    expect(result).toEqual({ name: 'Mocked Result' });
    expect(mockStore.get).toHaveBeenCalledWith(testKey);
  });

  it('resolves to null in get() on error', async () => {
    const testKey = 'testKey';

    mockStore.get.mockReturnValue(mockGetRequest);
    const resultPromise = service.get(testKey);

    triggerOpenSuccess();
    triggerGetError();

    const result = await resultPromise;
    expect(result).toBeNull();
  });
});
