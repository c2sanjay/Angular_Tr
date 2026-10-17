import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DropdownService } from './dropdown.service';
import { IndexedDBService } from './indexed-db.service';

describe('DropdownService', () => {
  let service: DropdownService;
  let httpMock: HttpTestingController;
  let mockIndexedDB: jest.Mocked<IndexedDBService>;

  const createDropdown = (overrides = {}) => ({
    component: { template: 'tpl', data: null, ...overrides },
    setValue: jest.fn(),
    getValue: jest.fn().mockReturnValue(null),
    redraw: jest.fn(),
    disabled: false,
    element: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    _clickHandler: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    mockIndexedDB = { get: jest.fn(), set: jest.fn() } as any;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DropdownService,
        { provide: IndexedDBService, useValue: mockIndexedDB },
      ],
    });

    service = TestBed.inject(DropdownService);
    httpMock = TestBed.inject(HttpTestingController);
    (window.location as any).href = 'http://localhost';
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  describe('injectDropdownData', () => {
    it('should exit early if data is not array', async () => {
      mockIndexedDB.get.mockResolvedValue(null);
      const form = { getComponent: jest.fn() };
      await service.injectDropdownData(form, 'key1');
      expect(form.getComponent).not.toHaveBeenCalled();
    });

    it('should warn if dropdown component not found', async () => {
      mockIndexedDB.get.mockResolvedValue([{ id: '1', name: 'A' }]);
      const form = { getComponent: jest.fn().mockReturnValue(null) };
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await service.injectDropdownData(form, 'missingKey');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missingKey'));
      warnSpy.mockRestore();
    });

    it('should handle errors thrown by component getter', async () => {
      mockIndexedDB.get.mockResolvedValue([{ id: '1', name: 'A' }]);
      const throwingDropdown: any = {};
      Object.defineProperty(throwingDropdown, 'component', {
        get: () => { throw new Error('forced error'); },
      });
      const form = { getComponent: jest.fn().mockReturnValue(throwingDropdown) };
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      await service.injectDropdownData(form, 'someKey');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('someKey'), expect.any(Error));
      errorSpy.mockRestore();
    });

    it('should build, apply and refresh dropdown data', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      const dropdown = createDropdown();
      const form = { getComponent: jest.fn().mockReturnValue(dropdown) };
      const mockValues = [{ label: 'Test', value: { id: '1' } }];

      jest.spyOn(service as any, 'buildDropdownValues').mockReturnValue(mockValues);
      jest.spyOn(service as any, 'refreshDropdown').mockImplementation(() => {});
      jest.spyOn(service as any, 'tryApplyPrefill').mockReturnValue(true);

      mockIndexedDB.get.mockResolvedValue(mockData);
      await service.injectDropdownData(form, 'dropdownKey', { dropdownKey: 'prefillValue' });

      expect(form.getComponent).toHaveBeenCalledWith('dropdownKey');
      expect(dropdown.component.data).toEqual({ values: mockValues });
      expect(dropdown.component.template).toBe('');
    });

    it('should apply auto select if prefill fails', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      const dropdown = createDropdown();
      const form = { getComponent: jest.fn().mockReturnValue(dropdown) };
      const mockValues = [{ label: 'Test', value: { id: '1' } }];

      jest.spyOn(service as any, 'buildDropdownValues').mockReturnValue(mockValues);
      jest.spyOn(service as any, 'refreshDropdown').mockImplementation(() => {});
      jest.spyOn(service as any, 'tryApplyPrefill').mockReturnValue(false);
      const autoSelectSpy = jest.spyOn(service as any, 'applyAutoSelectIfEmpty').mockImplementation(() => {});

      mockIndexedDB.get.mockResolvedValue(mockData);
      await service.injectDropdownData(form, 'autoKey', {});
      expect(autoSelectSpy).toHaveBeenCalledWith(dropdown, mockValues);
    });

    
  });

  describe('fetchAndCache', () => {
    it.each([
      ['empty token', 'http://x.com', '', true],
      ['empty url', '', 'token', true]
    ])('should skip fetch if %s', async (_, url, token) => {
      await service.fetchAndCache('key1', url, token);
      httpMock.expectNone(() => true);
      expect(mockIndexedDB.set).not.toHaveBeenCalled();
    });

    it('should fetch data and cache it', fakeAsync(() => {
      const key = 'k';
      const url = 'http://api.com/data';
      const token = 'abc';
      const response = [{ foo: 'bar' }];
      let done = false;

      service.fetchAndCache(key, url, token).then(() => done = true);
      const req = httpMock.expectOne(url);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush(response);
      tick();

      expect(mockIndexedDB.set).toHaveBeenCalledWith(key, response);
      expect(done).toBe(true);
    }));

    it('should log error on failure', fakeAsync(() => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      let done = false;

      service.fetchAndCache('keyErr', 'http://api.com/fail', 'tok').then(() => done = true);
      httpMock.expectOne('http://api.com/fail').error(new ErrorEvent('error'), { status: 500 });
      tick();

      expect(errorSpy).toHaveBeenCalled();
      expect(done).toBe(true);
      errorSpy.mockRestore();
    }));
  });

  describe('attachClickEventsOnce', () => {
    beforeEach(() => {
      service = new DropdownService({} as any, {} as any);
    });

    it('should not attach if component is missing', () => {
      const form = { getComponent: jest.fn().mockReturnValue({}) };
      service.attachClickEventsOnce(form, ['key'], jest.fn());
      expect(form.getComponent).toHaveBeenCalledWith('key');
    });

    it('should attach and invoke custom click handler', () => {
      const dropdown = createDropdown();
      const form = { getComponent: jest.fn().mockReturnValue(dropdown) };
      const callback = jest.fn();

      service.attachClickEventsOnce(form, ['k1'], callback);
      expect(dropdown.element.removeEventListener).toHaveBeenCalled();
      dropdown._clickHandler();
      expect(callback).toHaveBeenCalledWith('k1');
    });
  });

  describe('tryApplyPrefill', () => {
    it('should return false if no prefill', () => {
      expect((service as any).tryApplyPrefill({}, [], undefined)).toBe(false);
    });

    it('should apply single match value and disable dropdown', () => {
      const dropdown = createDropdown({ component: { multiple: false } });
      const result = (service as any).tryApplyPrefill(dropdown, [{ label: 'L', value: {}, item: {} }], 'L');
      expect(dropdown.setValue).toHaveBeenCalledWith({});
      expect(dropdown.disabled).toBe(true);
      expect(result).toBe(true);
    });

    it('should apply multiple=true as array', () => {
      const dropdown = createDropdown({ component: { multiple: true } });
      const result = (service as any).tryApplyPrefill(dropdown, [{ value: { name: 'N' } }], 'N');
      expect(dropdown.setValue).toHaveBeenCalledWith([{ name: 'N' }]);
      expect(result).toBe(true);
    });

    it('should return false if no match found', () => {
      const dropdown = createDropdown({ component: { multiple: false } });
      expect((service as any).tryApplyPrefill(dropdown, [{ label: 'X' }], 'Y')).toBe(false);
    });
  });

  describe('refreshDropdown', () => {
    it('should set value if no redraw', () => {
      const dropdown = createDropdown();
      dropdown.getValue.mockReturnValue('val');
    Object.defineProperty(dropdown, 'redraw', {
  value: undefined,
  configurable: true,
});

      (service as any).refreshDropdown(dropdown);
      expect(dropdown.setValue).toHaveBeenCalledWith('val');
      expect(dropdown.disabled).toBe(false);
    });

    it('should call redraw if available', () => {
      const dropdown = createDropdown();
      (service as any).refreshDropdown(dropdown);
      expect(dropdown.redraw).toHaveBeenCalled();
      expect(dropdown.disabled).toBe(false);
    });
  });

  describe('buildDropdownValues', () => {
    it('should use template placeholders', () => {
      const data = [{ id: '123', name: 'Test Item' }];
      const template = '{item.id} - {item.name}';
      const result = (service as any).buildDropdownValues(data, template);
      expect(result).toEqual([{ item: data[0], label: '123 - Test Item', value: data[0] }]);
    });

    it('should fallback to item.name or empty string', () => {
      const data1 = [{ id: '456', name: 'Fallback' }];
      const data2 = [{ id: '789' }];
      expect((service as any).buildDropdownValues(data1, '')[0].label).toBe('Fallback');
      expect((service as any).buildDropdownValues(data2, '')[0].label).toBe('');
    });
  });

  describe('applyAutoSelectIfEmpty', () => {
    it('should not set value if already populated', () => {
      const dropdownStr = createDropdown();
      dropdownStr.getValue.mockReturnValue('not empty');

      const dropdownArr = createDropdown();
      dropdownArr.getValue.mockReturnValue(['value']);

      (service as any).applyAutoSelectIfEmpty(dropdownStr, [{ value: 'v1' }]);
      (service as any).applyAutoSelectIfEmpty(dropdownArr, [{ value: 'v1' }]);

      expect(dropdownStr.setValue).not.toHaveBeenCalled();
      expect(dropdownArr.setValue).not.toHaveBeenCalled();
    });

    it('should auto select if only one value exists', () => {
      const dropdown = createDropdown();
      (service as any).applyAutoSelectIfEmpty(dropdown, [{ value: { id: '1' } }]);
      expect(dropdown.setValue).toHaveBeenCalledWith({ id: '1' });
    });

    it('should not auto select if yard param mismatches', () => {
      const originalSearch = window.location.search;
      (window.location as any).search = '?yard=Mismatch';
      const dropdown = createDropdown({ component: { multiple: false } });

      (service as any).applyAutoSelectIfEmpty(dropdown, [{ label: 'A' }, { label: 'B' }]);
      expect(dropdown.setValue).not.toHaveBeenCalled();
      (window.location as any).search = originalSearch;
    });
  });
});
