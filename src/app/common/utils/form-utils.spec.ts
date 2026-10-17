import { getDropdownKeys, processComponents } from './formio-utils';
import { DropdownService } from '../services/dropdown.service';

describe('getDropdownKeys', () => {
  it('should return keys for components with valid dataSrc', () => {
    const mockInstance = {
      everyComponent: (callback: any) => {
        callback({ component: { dataSrc: 'values', key: 'country' } });
        callback({ component: { dataSrc: 'url', key: 'state' } });
        callback({ component: { dataSrc: 'input', key: 'name' } }); // invalid
      },
    };

    const result = getDropdownKeys(mockInstance);
    expect(result).toEqual(['country', 'state']);
  });

  it('should return empty array if no components match', () => {
    const mockInstance = {
      everyComponent: (callback: any) => {
        callback({ component: { dataSrc: 'input', key: 'name' } });
      },
    };

    const result = getDropdownKeys(mockInstance);
    expect(result).toEqual([]);
  });

  it('should handle empty or null component objects gracefully', () => {
    const mockInstance = {
      everyComponent: (callback: any) => {
        callback(null);
        callback({});
        callback({ component: null });
      },
    };

    const result = getDropdownKeys(mockInstance);
    expect(result).toEqual([]);
  });
});

describe('processComponents', () => {
  let mockDropdownService: DropdownService;

  beforeEach(() => {
    mockDropdownService = {
      fetchAndCache: jest.fn().mockResolvedValue(undefined),
    } as unknown as DropdownService;
  });

  it('should call fetchAndCache for select components with data.url', async () => {
    const components = [
      {
        type: 'select',
        key: 'country',
        data: { url: 'https://api.com/countries' },
      },
    ];

    await processComponents(components, 'mock-token', mockDropdownService);

    expect(mockDropdownService.fetchAndCache).toHaveBeenCalledWith(
      'country',
      'https://api.com/countries',
      'mock-token'
    );
  });

  it('should recurse into nested components', async () => {
    const components = [
      {
        components: [
          {
            type: 'select',
            key: 'state',
            data: { url: 'https://api.com/states' },
          },
        ],
      },
    ];

    await processComponents(components, 'token-123', mockDropdownService);

    expect(mockDropdownService.fetchAndCache).toHaveBeenCalledWith(
      'state',
      'https://api.com/states',
      'token-123'
    );
  });

  it('should skip components without type "select"', async () => {
    const components = [
      {
        type: 'textfield',
        key: 'firstName',
        data: { url: 'https://api.com/names' },
      },
    ];

    await processComponents(components, 'token', mockDropdownService);

    expect(mockDropdownService.fetchAndCache).not.toHaveBeenCalled();
  });

  it('should handle empty input without errors', async () => {
    await expect(
      processComponents([], 'tok', mockDropdownService)
    ).resolves.toEqual([]);
    expect(mockDropdownService.fetchAndCache).not.toHaveBeenCalled();
  });
});
