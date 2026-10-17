import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { noop, of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { TimezoneService } from 'src/app/common/services/timezone.service';
import { AuthService } from '@auth0/auth0-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, Directive, Input } from '@angular/core';
import * as exportAsModule from 'src/app/lib/exportAs';
import jsPDF from 'jspdf';
import { DateTime } from 'luxon';
import type { DataStateChangeEvent } from '@progress/kendo-angular-grid';
import { T_RailYard } from 'src/app/common/types';
import { provideMockStore } from '@ngrx/store/testing';
import {
  selectAllCustomers,
  selectSelectedCustomer,
} from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

@Component({ selector: 'formio', template: '' })
class MockFormioComponent {
  @Input() form: any;
  formio = { on: jest.fn(), setPage: jest.fn(), form: { display: 'formpack' } };
}
@Component({ selector: 'app-rsi-topbar', template: '' })
class MockTopbar {}
@Component({ selector: 'app-rsi-sidebar', template: '' })
class MockSidebar {}
@Component({ selector: 'kendo-grid', template: '' })
class MockKendoGrid {}
@Component({ selector: 'kendo-grid-column', template: '' })
class MockKendoColumn {}
@Directive({ selector: '[kendoGrid]' })
class MockKendoGridDirective {}

jest.mock('html2canvas', () =>
  jest.fn().mockResolvedValue({
    toDataURL: () => 'data:image/jpeg;base64,mocked',
    width: 800,
    height: 600,
  }),
);

const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
};

jest.mock('jspdf', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        internal: { pageSize: { getWidth: () => 612, getHeight: () => 792 } },
        getImageProperties: () => ({ width: 800, height: 600 }),
        addPage: jest.fn(),
        addImage: jest.fn(),
        save: jest.fn(),
        output: jest.fn(() => new Blob()),
      };
    }),
  };
});

jest.mock('src/app/lib/exportAs', () => ({
  exportAsCSV: jest.fn(),
  exportAsExcel: jest.fn(),
  exportAsPDF: jest.fn(),
}));

describe('DashboardComponent (continued)', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  const mockRouter = {
    navigate: jest.fn(),
  };

  const mockSubmitHelper = {
    syncAllOfflineFormSubmissions: jest.fn(),
    clearOldOfflineData: jest.fn(),
  };

  const mockCommonApi = {
    _sCustomerListing: jest
      .fn()
      .mockReturnValue(of([{ id: '1', name: 'Customer A' }])),
    _sgetRailYardsByCustomer: jest.fn(),
    getInspectionCustomers: jest.fn().mockReturnValue(of([])),
    _sGetRailYardsByCustomer: jest
      .fn()
      .mockReturnValue(of({ IsSuccess: true, Result: [] })),
    _sGetInspectionCustomers: jest.fn().mockReturnValue(of({ Result: [] })),
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent, HttpClientTestingModule],
      declarations: [
        MockFormioComponent,
        MockTopbar,
        MockSidebar,
        MockKendoGrid,
        MockKendoColumn,
        MockKendoGridDirective,
      ],
      providers: [
        provideAnimations(),
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        {
          useValue: { confirm: jest.fn().mockResolvedValue(true) },
        },
        { provide: SubmitDraftHelperService, useValue: mockSubmitHelper },
        { provide: CommonApiService, useValue: mockCommonApi },
        {
          provide: TimezoneService,
          useValue: { getTimezone: jest.fn().mockReturnValue('UTC') },
        },
        {
          provide: AuthService,
          useValue: {
            user$: of({ name: 'TestUser' }),
            getAccessTokenSilently: jest.fn().mockReturnValue(of('token')),
          },
        },
        { provide: Router, useValue: { navigate: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => null },
              queryParamMap: { get: () => null },
            },
          },
        },
        { provide: Router, useValue: mockRouter },
        provideMockStore({
          selectors: [
            { selector: selectAllCustomers, value: [] },
            { selector: selectSelectedCustomer, value: null },
          ],
        }),
      ],
    })
      .overrideComponent(DashboardComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    component.formContainer = {
      nativeElement: document.createElement('div'),
    } as any;
    jest.useFakeTimers().setSystemTime(new Date('2025-06-30T12:00:00Z'));
    fixture.detectChanges();

    // Setup required properties used in fetchDataByYards
    component.currentCustomerObj = { id: 123 };
    component.startDateKendo = new Date('2023-01-01');
    component.endDateKendo = new Date('2023-01-31');
    jest.spyOn(component as any, 'loadGridData').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('handleExport with CSV should call exportAsCSV', () => {
    const data = [
      {
        railcarid: 'RC1',
        customerassigned: 'C',
        yardname: 'Y',
        formtitle: 'F',
        submittedby: 'S',
        submittedDate: new Date().toISOString(),
        lastupdate: new Date().toISOString(),
        status: 'Submitted',
      },
    ];
    jest.spyOn(exportAsModule, 'exportAsCSV').mockImplementation(() => {});
    component.handleExport('CSV', data);
    expect(exportAsModule.exportAsCSV).toHaveBeenCalled();
  });

  it('should call syncAllOfflineFormSubmissions on window online event', () => {
    const ngOnInitSpy = jest
      .spyOn(component, 'ngOnInit')
      .mockImplementation(() => {});
    const syncSpy = mockSubmitHelper.syncAllOfflineFormSubmissions;

    component.online();

    expect(syncSpy).toHaveBeenCalled();

    const [callback, progressCallback] = syncSpy.mock.calls[0];

    callback();
    expect(ngOnInitSpy).toHaveBeenCalled();

    progressCallback(true);
    expect(component.isSyncInProgress).toBe(true);

    progressCallback(false);
    expect(component.isSyncInProgress).toBe(false);
  });

  it('should set isDownloadEnabled via callback in online()', () => {
    const syncMock = jest.fn();

    mockSubmitHelper.syncAllOfflineFormSubmissions = syncMock;
    component.online();

    const thirdArg = syncMock.mock.calls[0][2];
    component.isDownloadEnabled = false;
    thirdArg(true);
    expect(component.isDownloadEnabled).toBe(true);

    thirdArg(false);
    expect(component.isDownloadEnabled).toBe(false);
  });

  it('should update gridState and call loadGridData on data state change', () => {
    const componentAny = component as any;

    const mockState: DataStateChangeEvent = {
      skip: 0,
      take: 10,
      filter: {
        logic: 'and',
        filters: [],
      },
    };

    const loadGridDataSpy = jest
      .spyOn(componentAny, 'loadGridData')
      .mockImplementation(() => {});

    component.onDataStateChange(mockState);

    expect(component.gridState).toEqual(mockState);
    expect(loadGridDataSpy).toHaveBeenCalled();
  });

  it('onExportDropdownChange should call handleExport with correct processed data', () => {
    jest.useFakeTimers();

    const mockData = [
      { srno: 1, name: 'Test1' },
      { srno: 2, name: 'Test2' },
    ];
    component.inspectionCustomersList = mockData;
    component.gridState = {
      skip: 1,
      take: 1,
      filter: undefined,
      sort: [],
    };

    const mockValue = { text: 'CSV' };
    const handleExportSpy = jest
      .spyOn(component, 'handleExport')
      .mockImplementation(() => {});

    component.onExportDropdownChange(mockValue);

    jest.runAllTimers();

    expect(handleExportSpy).toHaveBeenCalledWith('CSV', expect.any(Array));

    jest.useRealTimers();
  });

  it('should call selectCustomer if new customer is selected', () => {
    const oldCustomer = { id: 2, name: 'Old Customer' };
    const newCustomer = { id: 1, name: 'New Customer' };

    Object.defineProperty(component, 'selectedCustomerObj', {
      value: oldCustomer,
      writable: true,
      configurable: true,
    });

    const selectCustomerMock = jest.fn();
    Object.defineProperty(component, 'selectCustomer', {
      value: selectCustomerMock,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(component, 'onComboBoxChange', {
      value: function (value: any) {
        if (value && typeof value === 'object') {
          if (
            !this.selectedCustomerObj ||
            this.selectedCustomerObj.id !== value.id
          ) {
            this.selectedCustomerObj = value;
            this.selectCustomer(value);
          }
        }
      },
      writable: true,
      configurable: true,
    });

    (component as any).onComboBoxChange(newCustomer);

    expect(selectCustomerMock).toHaveBeenCalledWith(newCustomer);
    expect((component as any).selectedCustomerObj).toEqual(newCustomer);
  });

  it('should call filterCustomersData with correct dates when type is startDate', () => {
    const mockFilterFn = jest.fn();

    const mockStartDate = new Date('2024-01-01');
    const mockEndDate = new Date('2024-01-10');

    (component as any).filterCustomersData = mockFilterFn;
    (component as any).startDateKendo = mockStartDate;
    (component as any).endDateKendo = mockEndDate;

    (component as any).onDateChange = function (value: Date, type: string) {
      this.dateRangeSelected = 'custom';
      const formattedDate = new Date(value).toISOString().split('T')[0];
      if (type === 'startDate') {
        this.filterCustomersData(
          'custom',
          formattedDate,
          new Date(this.endDateKendo).toISOString().split('T')[0],
        );
      } else if (type === 'endDate') {
        this.filterCustomersData(
          'custom',
          new Date(this.startDateKendo).toISOString().split('T')[0],
          formattedDate,
        );
      }
    };

    const selectedDate = new Date('2024-01-05');
    (component as any).onDateChange(selectedDate, 'startDate');

    expect((component as any).dateRangeSelected).toBe('custom');
    expect(mockFilterFn).toHaveBeenCalledWith(
      'custom',
      '2024-01-05',
      '2024-01-10',
    );
  });

  it('should call filterCustomersData with correct dates when type is endDate', () => {
    const mockFilterFn = jest.fn();

    const mockStartDate = new Date('2024-01-01');
    const mockEndDate = new Date('2024-01-10');

    (component as any).filterCustomersData = mockFilterFn;
    (component as any).startDateKendo = mockStartDate;
    (component as any).endDateKendo = mockEndDate;

    (component as any).onDateChange = function (value: Date, type: string) {
      this.dateRangeSelected = 'custom';
      const formattedDate = new Date(value).toISOString().split('T')[0];
      if (type === 'startDate') {
        this.filterCustomersData(
          'custom',
          formattedDate,
          new Date(this.endDateKendo).toISOString().split('T')[0],
        );
      } else if (type === 'endDate') {
        this.filterCustomersData(
          'custom',
          new Date(this.startDateKendo).toISOString().split('T')[0],
          formattedDate,
        );
      }
    };

    const selectedDate = new Date('2024-01-08');
    (component as any).onDateChange(selectedDate, 'endDate');

    expect((component as any).dateRangeSelected).toBe('custom');
    expect(mockFilterFn).toHaveBeenCalledWith(
      'custom',
      '2024-01-01',
      '2024-01-08',
    );
  });

  it('should not set listeners if formInstance is not defined', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    (component as any).formInstance = null;

    // Inject method
    (component as any).initFormListeners = function () {
      if (!this.formInstance) {
        kendoNotificationServiceMock.showError(
          'Form instance not initialized yet.',
        );
        return;
      }

      this.formInstance.on('change', (event: any) => {
        if (event.changed && this.isDownloadEnabled) {
          this.isDownloadEnabled = true;
        }
      });

      this.formInstance.on('submit', (_submission: any) => {
        this.isDownloadEnabled = true;
      });
    };

    (component as any).initFormListeners();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );
    consoleErrorSpy.mockRestore();
  });

  it('should register change and submit events and modify isDownloadEnabled correctly', () => {
    const mockOn = jest.fn();
    const eventHandlers: Record<string, Function> = {};

    mockOn.mockImplementation((event: string, callback: Function) => {
      eventHandlers[event] = callback;
    });

    (component as any).formInstance = { on: mockOn };
    (component as any).isDownloadEnabled = false;

    (component as any).initFormListeners = function () {
      if (!this.formInstance) {
        kendoNotificationServiceMock.showError(
          'Form instance not initialized yet.',
        );
        return;
      }

      this.formInstance.on('change', (event: any) => {
        if (event.changed && this.isDownloadEnabled) {
          this.isDownloadEnabled = true;
        }
      });

      this.formInstance.on('submit', (_submission: any) => {
        this.isDownloadEnabled = true;
      });
    };

    (component as any).initFormListeners();

    (component as any).isDownloadEnabled = false;
    eventHandlers['change']({ changed: true });
    expect((component as any).isDownloadEnabled).toBe(false);

    (component as any).isDownloadEnabled = true;
    eventHandlers['change']({ changed: true });
    expect((component as any).isDownloadEnabled).toBe(true);

    (component as any).isDownloadEnabled = false;
    eventHandlers['submit']({ data: 'submitted' });
    expect((component as any).isDownloadEnabled).toBe(true);
  });

  it('should not call filterCustomersData if value is already selected', () => {
    const componentAny = component as any;
    componentAny.dateRangeSelected = 'today';
    componentAny.filterCustomersData = jest.fn();

    component.onBtnGroupClick('today');

    expect(componentAny.filterCustomersData).not.toHaveBeenCalled();
  });

  it('should update dateRangeSelected and call filterCustomersData if value is different', () => {
    const componentAny = component as any;
    componentAny.dateRangeSelected = 'last30days';
    componentAny.filterCustomersData = jest.fn();

    component.onBtnGroupClick('custom');

    expect(componentAny.dateRangeSelected).toBe('custom');
    expect(componentAny.filterCustomersData).toHaveBeenCalledWith('custom');
  });

  it('should set formInstance on form ready', () => {
    const mockInstance = { someKey: 'someValue' };

    component.onFormReady(mockInstance);

    expect(component.formInstance).toBe(mockInstance);
  });

  it('should handle formInstance change and submit events', () => {
    const mockOn = jest.fn();
    component.formInstance = {
      on: mockOn,
    };

    component.isDownloadEnabled = false;
    component.initFormListeners();
    expect(mockOn).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('submit', expect.any(Function));
    const changeCallback = mockOn.mock.calls.find(
      (call) => call[0] === 'change',
    )[1];
    component.isDownloadEnabled = true;
    changeCallback({ changed: true });

    expect(component.isDownloadEnabled).toBe(true);
    const submitCallback = mockOn.mock.calls.find(
      (call) => call[0] === 'submit',
    )[1];
    component.isDownloadEnabled = false;
    submitCallback({}); //  submission
    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should resolve after specified delay', async () => {
    const delaySpy = jest.spyOn(component as any, 'delay');

    const delayPromise = (component as any).delay(1000);

    expect(delaySpy).toHaveBeenCalledWith(1000);

    // Move virtual timer forward by 1 second
    jest.advanceTimersByTime(1000);

    await expect(delayPromise).resolves.toBeUndefined();
  });

  it('should resolve when formInstance is set before timeout', async () => {
    const componentAny = component as any;

    // Start calling the method before formInstance is defined
    const promise = componentAny.waitForFormInstanceReady();

    // After 300ms, simulate formInstance being ready
    setTimeout(() => {
      componentAny.formInstance = {};
    }, 300);

    // Fast-forward timers by 1000ms to cover all intervals
    jest.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should reject if formInstance is not set in time', async () => {
    const componentAny = component as any;

    const promise = componentAny.waitForFormInstanceReady();
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow('Form initialization timed out');
  });

  it('should set from and to hours correctly for non-custom filter', () => {
    const setHoursSpy = jest.spyOn(Date.prototype, 'setHours');
    component.filterCustomersData('today'); // simulate non-custom filter
    expect(setHoursSpy).toHaveBeenCalledWith(0, 0, 0, 0);
    expect(setHoursSpy).toHaveBeenCalledWith(23, 59, 59, 999);
    setHoursSpy.mockRestore();
  });

  it('should set start and end for "today"', () => {
    component.filterCustomersData('today');

    expect(component.startDateKendo.getDate()).toBe(30);
    expect(component.endDateKendo.getDate()).toBe(30);
    expect(component.startDateKendo.getHours()).toBe(0);
    expect(component.endDateKendo.getHours()).toBe(23);
  });

  it('should set start and end for "last7days"', () => {
    component.filterCustomersData('last7days');

    expect(component.startDateKendo.getDate()).toBe(24); // 30 - 6
    expect(component.endDateKendo.getDate()).toBe(30);
  });

  it('should correctly calculate last30days', () => {
    const today = new Date('2025-06-30');
    const expectedStart = new Date(today);
    expectedStart.setDate(today.getDate() - 30);

    component.filterCustomersData('last30days');

    expect(component.startDateKendo.toDateString()).toBe(
      expectedStart.toDateString(),
    );
    expect(component.endDateKendo.toDateString()).toBe(today.toDateString());
  });

  it('should call filterCustomersData with correct params when endDate changes', () => {
    const startDate = new Date('2025-07-01');
    const endDate = new Date('2025-07-15');
    component.startDateKendo = startDate;

    const filterSpy = jest
      .spyOn(component, 'filterCustomersData')
      .mockImplementation(() => {});

    component.onDateChange(endDate, 'endDate');

    expect(component.dateRangeSelected).toBe('custom');
    expect(filterSpy).toHaveBeenCalledWith(
      'custom',
      startDate,
      new Date('2025-07-15'),
    );
  });

  it('should not break when filterCustomersData is called with undefined type', () => {
    expect(() => component.filterCustomersData(undefined as any)).not.toThrow();
  });

  it('should call export methods only when data is present', () => {
    const mockData = [
      {
        submittedDate: DateTime.utc().toISO(),
        lastupdate: DateTime.utc().toISO(),
        status: 'Submitted',
      },
    ];

    component.handleExport('CSV', mockData);
    component.handleExport('EXCEL', mockData);
    component.handleExport('PDF', mockData);

    expect(exportAsModule.exportAsCSV).toHaveBeenCalled();
    expect(exportAsModule.exportAsExcel).toHaveBeenCalled();
    expect(exportAsModule.exportAsPDF).toHaveBeenCalled();
  });

  it('should update date range for last30days in filterCustomersData', () => {
    const fetchDataSpy = jest.spyOn(component as any, 'fetchDataByYards');
    component.selectedRailYard = { Id: 5, Name: 'Yard A' };
    component.filterCustomersData('last30days');
    expect(fetchDataSpy).toHaveBeenCalledWith([5]);
  });

  it('should update date range for custom and call fetchDataByYards', () => {
    const fetchSpy = jest.spyOn(component as any, 'fetchDataByYards');
    const customStart = new Date('2025-06-01');
    const customEnd = new Date('2025-06-30');
    component.selectedRailYard = { Id: -1, Name: 'All' };
    component.filterCustomersData('custom', customStart, customEnd);
    expect(fetchSpy).toHaveBeenCalledWith([]);
    expect(component.startDateKendo).toEqual(customStart);
    expect(component.endDateKendo).toEqual(customEnd);
  });

  it('should call selectYard and trigger fetchDataByYards', () => {
    const fetchSpy = jest.spyOn(component, 'fetchDataByYards');
    const yard = { Id: 3, Name: 'Some Yard' };
    component.selectYard(yard);
    expect(component.selectedRailYard).toBe(yard);
    expect(fetchSpy).toHaveBeenCalledWith([3]);
  });

  it('should not throw error when unknown export format is provided in handleExport', () => {
    expect(() => {
      component.handleExport('UNKNOWN' as any, [{ some: 'data' }]);
    }).not.toThrow();
  });

  it('should format submittedDate and UpdatedDate correctly in export', () => {
    const testData = [
      {
        submittedDate: '2025-06-30T12:00:00Z',
        UpdatedDate: '2025-07-01T10:15:00Z',
        status: 'Submitted',
        RailCarId: 'RC-001',
        CustomerAssigned: 'Customer A',
        YardName: 'Yard 1',
        FormName: 'Form A',
        UserEmail: 'user@example.com',
      },
    ];
    component.handleExport('CSV', testData);
    expect(exportAsModule.exportAsCSV).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          submittedDate: expect.stringMatching(/06\/30\/2025/),
          UpdatedDate: expect.stringMatching(/07\/01\/2025/),
        }),
      ]),
      expect.any(String),
      expect.any(Array),
      expect.any(Array),
    );
  });

  it('should show error if formInstance is not initialized', () => {
    component.formInstance = undefined;

    component.initFormListeners();

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );
  });

  describe('onDateChange', () => {
    beforeEach(() => {
      component.startDateKendo = new Date('2024-01-01');
      component.endDateKendo = new Date('2024-01-10');
      jest.spyOn(component, 'filterCustomersData').mockImplementation(() => {});
    });

    it('should call filterCustomersData for startDate', () => {
      const selected = new Date('2024-01-05');
      component.onDateChange(selected, 'startDate');
      expect(component.dateRangeSelected).toBe('custom');
      expect(component.filterCustomersData).toHaveBeenCalledWith(
        'custom',
        selected,
        component.endDateKendo,
      );
    });

    it('should call filterCustomersData for endDate', () => {
      const selected = new Date('2024-01-08');
      component.onDateChange(selected, 'endDate');
      expect(component.filterCustomersData).toHaveBeenCalledWith(
        'custom',
        component.startDateKendo,
        selected,
      );
    });
  });

  describe('filterCustomersData', () => {
    beforeEach(() => {
      component.fetchDataByYards = jest.fn();
    });

    it('should reset form-related state in resetFormState', () => {
      const componentAny = component as any;
      componentAny.formReadyToRender = true;
      componentAny.formUrl = 'https://example.com/form';
      componentAny.formData = { key: 'value' };
      componentAny.formInstance = { some: 'instance' };
      componentAny.isDownloadEnabled = false;
      componentAny.resetFormState();
      expect(componentAny.formReadyToRender).toBe(false);
      expect(componentAny.formUrl).toBeUndefined();
      expect(componentAny.formData).toBeNull();
      expect(componentAny.formInstance).toBeNull();
      expect(componentAny.isDownloadEnabled).toBe(true);
    });

    it('should call customersList and clearOldOfflineData on ngOnInit', () => {
      const componentAny = component as any;

      const customersListSpy = jest
        .spyOn(componentAny, 'customersList')
        .mockImplementation(() => {});
      const clearOldDataSpy = jest.spyOn(
        mockSubmitHelper,
        'clearOldOfflineData',
      );

      component.ngOnInit();

      expect(customersListSpy).toHaveBeenCalled();
      expect(clearOldDataSpy).toHaveBeenCalled();
    });

    it('should set formInstance and initialize form listeners after form is ready', () => {
      const componentAny = component as any;

      const onMock = jest.fn((event: string, cb: () => void) => {
        if (event === 'ready') {
          cb();
        }
      });

      // fake formio instance
      const fakeFormioInstance = {
        on: onMock,
      };

      componentAny.formioComponent = {
        formio: fakeFormioInstance,
      };

      const initFormListenersSpy = jest
        .spyOn(componentAny, 'initFormListeners')
        .mockImplementation(() => {});

      component.ngAfterViewInit();

      jest.advanceTimersByTime(100);

      expect(componentAny.formInstance).toBe(fakeFormioInstance);
      expect(onMock).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(initFormListenersSpy).toHaveBeenCalled();
    });
  });

  describe('handleExport', () => {
    let componentAny: any;

    beforeEach(() => {
      componentAny = component as any;

      componentAny.timezoneService = {
        getTimezone: jest.fn().mockReturnValue('UTC'),
      };
    });

    it('should call kendoNotificationService.showWarning if data is empty', () => {
      componentAny.handleExport('CSV', []);

      expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
        'No data present, unable to export.',
      );
    });

    it('should call exportAsCSV with formatted data when value is CSV', () => {
      const mockData = [
        {
          railcarid: 'RC1',
          customerassigned: 'Customer A',
          yardname: 'Yard1',
          formtitle: 'Form A',
          inspectorName: 'Inspector 1',
          submittedby: 'User1',
          submittedDate: DateTime.utc().toISO(),
          lastupdate: DateTime.utc().toISO(),
          status: 'Submitted',
        },
      ];

      componentAny.handleExport('CSV', mockData);

      expect(exportAsModule.exportAsCSV).toHaveBeenCalledWith(
        expect.any(Array), // exportData
        'Inspection-Hub',
        expect.any(Array), // customHeaders
        ['srno', 'formname'],
      );
    });

    it('should call exportAsExcel when value is EXCEL', () => {
      const mockData = [
        {
          submittedDate: DateTime.utc().toISO(),
          lastupdate: DateTime.utc().toISO(),
          status: 'Submitted',
        },
      ];

      componentAny.handleExport('EXCEL', mockData);

      expect(exportAsModule.exportAsExcel).toHaveBeenCalled();
    });

    it('should call exportAsPDF when value is PDF', () => {
      const mockData = [
        {
          submittedDate: DateTime.utc().toISO(),
          lastupdate: DateTime.utc().toISO(),
          status: 'Submitted',
        },
      ];

      componentAny.handleExport('PDF', mockData);

      expect(exportAsModule.exportAsPDF).toHaveBeenCalled();
    });
  });

  describe('showExportDialog', () => {
    it('should resolve the promise with given result', async () => {
      const promise = component.showExportDialog();

      const mockResult = { confirmed: true, value: 'PDF' };

      // Bypass private restriction using type cast
      (component as any).exportDialogPromiseResolver(mockResult);

      await expect(promise).resolves.toEqual(mockResult);
    });
  });

  it('should call addImage with correct params and return updated isFirstPage', async () => {
    const componentAny = component as any;

    const addImageMock = jest.fn();
    const addPageMock = jest.fn();

    const pdfMock = {
      internal: {
        pageSize: {
          getWidth: () => 600,
          getHeight: () => 800,
        },
      },
      getImageProperties: jest
        .fn()
        .mockReturnValue({ width: 1200, height: 1600 }),
      addPage: addPageMock,
      addImage: addImageMock,
    } as unknown as jsPDF;

    const canvasMock = {
      toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,mock'),
    } as unknown as HTMLCanvasElement;

    const result = await componentAny['sliceCanvasToMultiplePages'](
      pdfMock,
      canvasMock,
      false, // not first page
    );

    // Assert
    expect(pdfMock.addPage).toHaveBeenCalled();
    expect(pdfMock.addImage).toHaveBeenCalledWith(
      'data:image/jpeg;base64,mock',
      'JPEG',
      20, // leftMargin
      20, // topMargin
      560, // contentWidth (600 - 20 - 20)
      expect.any(Number), // imgHeight
    );
    expect(result).toBe(false);
  });

  it('should reset skip in gridState and call selectYard with selected yard', () => {
    const mockYard: T_RailYard = { Id: 1, Name: 'Test Yard' };

    const selectYardSpy = jest.spyOn(component as any, 'selectYard');

    component.gridState = {
      skip: 5,
      take: 10,
    };

    component.onDropdownChange(mockYard);

    expect(component.gridState.skip).toBe(0);
    expect(selectYardSpy).toHaveBeenCalledWith(mockYard);
  });

  it('should resolve exportDialogPromiseResolver and call onExportDropdownChange if confirmed', () => {
    const mockResolver = jest.fn();
    const mockValue = 'PDF';

    // Spy on the method to check if it's called
    const exportDropdownSpy = jest.spyOn(
      component as any,
      'onExportDropdownChange',
    );

    // Set up the private resolver
    (component as any).exportDialogPromiseResolver = mockResolver;
    component.exportDialogVisible = true;

    component.onExportDialogClose({ confirmed: true, value: mockValue });

    // Expectations
    expect(component.exportDialogVisible).toBe(false);
    expect(mockResolver).toHaveBeenCalledWith({
      confirmed: true,
      value: mockValue,
    });
    expect(exportDropdownSpy).toHaveBeenCalledWith(mockValue);
    expect((component as any).exportDialogPromiseResolver).toBeNull();
  });

  it('should not call onExportDropdownChange if not confirmed', () => {
    const mockResolver = jest.fn();

    const exportDropdownSpy = jest.spyOn(
      component as any,
      'onExportDropdownChange',
    );

    (component as any).exportDialogPromiseResolver = mockResolver;
    component.exportDialogVisible = true;

    component.onExportDialogClose({ confirmed: false });

    expect(component.exportDialogVisible).toBe(false);
    expect(mockResolver).toHaveBeenCalledWith({ confirmed: false });
    expect(exportDropdownSpy).not.toHaveBeenCalled();
    expect((component as any).exportDialogPromiseResolver).toBeNull();
  });

  describe('InspectionFormDetailGetById', () => {
    it('should navigate to /form-details if status is Pending and userRole is Customer User', () => {
      component.userRole = 'Customer User';
      const inspection = {
        Status: 'Pending',
        FormPath: 'form123',
        Id: 1,
        CustomerAssigned: 'customerA',
        YardName: 'yardA',
      };

      component.InspectionFormDetailGetById(inspection);

      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/form-details',
        'form123',
        1,
        'customerA',
        'yardA',
      ]);
    });

    it('should navigate to /form-details-filled if status is not Pending or userRole is not Customer User', () => {
      component.userRole = 'Customer Admin';
      const inspection = {
        Status: 'Submitted',
        FormPath: 'form456',
        Id: 2,
        CustomerAssigned: 'customerB',
        YardName: 'yardB',
      };

      component.InspectionFormDetailGetById(inspection);

      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/form-details-filled',
        'form456',
        2,
        'customerB',
        'yardB',
      ]);
    });

    it('getRailYardsByCustomerId sets isLoading false when no yards returned', () => {
      const response = { IsSuccess: true, Result: [] };
      jest
        .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
        .mockReturnValue(of(response));

      const selectYardSpy = jest
        .spyOn(component, 'selectYard')
        .mockImplementation(noop);

      component.getRailYardsByCustomerId(1);

      expect(component.isLoading).toBe(false);
      expect(component.isRailYardLoading).toBe(false);
      expect(selectYardSpy).not.toHaveBeenCalled();
    });
  });
});
