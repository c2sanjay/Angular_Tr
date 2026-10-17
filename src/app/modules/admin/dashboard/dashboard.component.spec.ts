import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { TimezoneService } from 'src/app/common/services/timezone.service';
import { AuthService } from '@auth0/auth0-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, Directive, Input, ChangeDetectorRef } from '@angular/core';
import html2canvas from 'html2canvas';
import * as kendoDataQuery from '@progress/kendo-data-query';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import jsPDF from 'jspdf';
import { provideMockStore } from '@ngrx/store/testing';
import {
  selectAllCustomers,
  selectSelectedCustomer,
} from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

@Component({ selector: 'formio', template: '' })
class MockFormioComponent {
  @Input() form: any;
  @Input() submission: any;
  formio = {
    on: () => {},
    setPage: () => {},
    form: { display: 'form' },
    pages: [],
  };
}
@Component({ selector: 'app-tabs', template: '' })
class MockTabsComponent {}
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

const jsPDFMockInstance = {
  internal: {
    pageSize: {
      getWidth: () => 612,
      getHeight: () => 792,
    },
  },
  getImageProperties: () => ({ width: 800, height: 600 }),
  addPage: jest.fn(),
  addImage: jest.fn(),
  save: jest.fn(),
};

jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn(() => jsPDFMockInstance),
}));

jest.mock('html2canvas');

jest.mock('src/app/lib/exportAs', () => ({
  exportAsCSV: jest.fn(),
  exportAsExcel: jest.fn(),
  exportAsPDF: jest.fn(),
}));

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

const mockCustomers = [
  { id: 1, name: 'Customer A' },
  { id: 2, name: 'Customer B' },
];

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let service: PdfGeneratorService;
  let cdrMock: ChangeDetectorRef;

  const kendoNotificationServiceMock = {
    showError: jest.fn(),
    showWarning: jest.fn(),
    showSuccess: jest.fn(),
  };
  const mockActivatedRoute = {
    snapshot: {
      paramMap: { get: () => null },
      queryParamMap: { get: () => null },
    },
  };
  const mockSubmitHelper = {
    syncAllOfflineFormSubmissions: jest.fn(),
    clearOldOfflineData: jest.fn(),
  };
  const mockCommonApi = {
    _sCustomerListing: jest
      .fn()
      .mockReturnValue(of([{ id: '1', name: 'Customer A' }])),
    _sgetRailYardsByCustomer: jest
      .fn()
      .mockReturnValue(of([{ name: 'Yard1' }])),
    getInspectionCustomers: jest.fn().mockReturnValue(
      of([
        {
          srno: 1,
          customerassigned: 'Customer A',
          yardname: 'Yard1',
          formtitle: 'Form1',
          inspectorName: 'Inspector1',
          submittedby: 'User1',
          submittedDate: new Date().toISOString(),
          lastupdate: new Date().toISOString(),
          status: 'Submitted',
          railcarid: 'RC1',
        },
      ]),
    ),
    _sdeleteInspectionRecord: jest.fn().mockReturnValue(of({})),
  };
  const mockTimezone = { getTimezone: jest.fn().mockReturnValue('UTC') };
  const mockAuthService = {
    user$: of({ name: 'TestUser' }),
    getAccessTokenSilently: jest.fn().mockReturnValue(of('fake-token')),
  };
  const mockRouter = { navigate: jest.fn() };
  const mockCdr: ChangeDetectorRef = {
    detectChanges: jest.fn(),
    markForCheck: jest.fn(),
    detach: jest.fn(),
    checkNoChanges: jest.fn(),
    reattach: jest.fn(),
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent, HttpClientTestingModule],
      declarations: [
        MockFormioComponent,
        MockTabsComponent,
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
        { provide: SubmitDraftHelperService, useValue: mockSubmitHelper },
        { provide: CommonApiService, useValue: mockCommonApi },
        { provide: TimezoneService, useValue: mockTimezone },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ChangeDetectorRef, useValue: mockCdr },
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

    jest
      .spyOn(component as any, 'waitForFormInstanceReady')
      .mockResolvedValue(undefined);
    jest
      .spyOn(component as any, 'sliceCanvasToMultiplePages')
      .mockResolvedValue(true);
    (html2canvas as jest.Mock).mockResolvedValue(
      document.createElement('canvas'),
    );

    component.formInstance = {
      form: { display: 'wizard' },
      on: jest.fn(),
      pages: [0, 1],
      setPage: jest.fn().mockResolvedValue(undefined),
    };

    const mockFormioInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'ready') callback();
      }),
    };

    component.formioComponent = { formio: mockFormioInstance } as any;

    jest.spyOn(document, 'getElementById').mockReturnValue({} as HTMLElement);

    jest.spyOn(component, 'initFormListeners');
    component.filterCustomersData = jest.fn();
    component.dateRangeSelected = 'today';
    component.railYards = [];
    component.inspectionCustomersList = [];
    component.isRailYardLoading = true;
    component.isLoading = true;
    component.allCustomers = [];
    component.allCustomersOriginal = [];
    component.isCustomersLoading = true;
    component.startDateKendo = new Date('2024-01-01');
    component.endDateKendo = new Date('2024-01-05');
    component.selectedCustomerObj = { id: 123, name: 'Customer X' };

    fixture.detectChanges();
  });

  afterEach(() => jest.clearAllMocks());

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('selectCustomer should set selectedCustomerObj and call getRailYardsByCustomerId', () => {
    const customer = { id: '1', name: 'Customer A' };
    jest
      .spyOn(component, 'getRailYardsByCustomerId')
      .mockImplementation(() => {});
    component.selectCustomer(customer);
    expect(component.selectedCustomerObj).toEqual(customer);
    expect(component.isLoading).toBeTruthy();
    expect(component.getRailYardsByCustomerId).toHaveBeenCalledWith('1');
  });

  it('onDataStateChange should update gridState and gridView', () => {
    // Provide some data
    component.inspectionCustomersList = [
      { srno: 1, customerassigned: 'A' },
      { srno: 2, customerassigned: 'B' },
    ] as any;
    component.onDataStateChange({
      skip: 1,
      take: 1,
      filter: undefined,
      sort: [],
    });
    expect(component.gridState.skip).toBe(1);
    expect(component.gridView.data.length).toBe(1);
    expect(component.gridView.total).toBe(2);
  });

  it('handleExport with empty data shows warning', () => {
    component.handleExport('CSV', []);
    expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
      'No data present, unable to export.',
    );
  });

  it('should set formInstance and call initFormListeners on form ready', fakeAsync(() => {
    // Create a placeholder for the 'ready' callback
    let readyCallback: () => void;

    readyCallback = () => {
      console.log('Ready!');
    };

    const mockFormioInstance = {
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'ready') {
          readyCallback = callback; // Save the callback to call it later
        }
      }),
    };

    component.formioComponent = {
      formio: mockFormioInstance,
    } as any;

    const spy = jest.spyOn(component, 'initFormListeners');

    component.ngAfterViewInit();

    tick(200); // let the interval run
    expect(component.formInstance).toBe(mockFormioInstance);

    // Simulate 'ready' event being fired
    readyCallback();

    expect(spy).toHaveBeenCalled();
  }));

  it('should reset form state correctly', () => {
    // Arrange - set non-default values first
    component.formReadyToRender = true;
    component.formUrl = 'http://example.com/form';
    component.formData = { some: 'data' };
    component.formInstance = { dummy: 'instance' } as any;
    component.isDownloadEnabled = false;

    (component as any).resetFormState();

    expect(component.formReadyToRender).toBe(false);
    expect(component.formUrl).toBeUndefined();
    expect(component.formData).toBeNull();
    expect(component.formInstance).toBeNull();
    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should resolve when formInstance becomes available', async () => {
    setTimeout(() => {
      component.formInstance = { dummy: 'value' } as any;
    }, 200);

    await expect(
      (component as any).waitForFormInstanceReady(),
    ).resolves.toBeUndefined();
  });

  it('should render canvas and call sliceCanvasToMultiplePages', async () => {
    const mockPdf = {
      addPage: jest.fn(),
      addImage: jest.fn(),
      save: jest.fn(),
      internal: {
        pageSize: {
          getWidth: () => 612,
          getHeight: () => 792,
        },
      },
    } as any;

    //  Mock a canvas element to be returned by html2canvas
    const mockCanvas = document.createElement('canvas');
    (html2canvas as jest.Mock).mockResolvedValue(mockCanvas);

    //  sliceCanvasToMultiplePages
    const sliceSpy = jest
      .spyOn(component as any, 'sliceCanvasToMultiplePages')
      .mockResolvedValue(true);

    const container = document.createElement('div');

    // Manually simulate a method that contains this block
    const isFirstPageInitial = true;

    const result = await (async () => {
      await new Promise((r) => setTimeout(r, 100)); // simulate shorter delay
      const bigCanvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      } as any);
      return await (component as any).sliceCanvasToMultiplePages(
        mockPdf,
        bigCanvas,
        isFirstPageInitial,
      );
    })();

    expect(html2canvas).toHaveBeenCalledWith(
      container,
      expect.objectContaining({
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      }),
    );
    expect(sliceSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('should resolve after specified delay', async () => {
    jest.useFakeTimers();

    const promise = component.delay(1000); // Call  delay method

    // Fast-forward all timers
    jest.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();

    jest.useRealTimers(); // Restore real timers after test
  });

  it('should call syncAllOfflineFormSubmissions and handle callbacks in online()', () => {
    const syncMock = jest.fn((onComplete, setSyncStatus) => {
      setSyncStatus(true);
      expect(component.isSyncInProgress).toBe(true);

      onComplete();
    });

    const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');
    mockSubmitHelper.syncAllOfflineFormSubmissions = syncMock;

    component.online();

    expect(syncMock).toHaveBeenCalled();
    expect(ngOnInitSpy).toHaveBeenCalled();
  });

  it('should reset gridState.skip to 0 and call selectYard on dropdown change', () => {
    const mockYard = { name: 'Yard1' } as any;

    component.gridState = { skip: 10, take: 20 };

    const selectYardSpy = jest.spyOn(component, 'selectYard');

    component.onDropdownChange(mockYard);

    expect(component.gridState.skip).toBe(0);
    expect(selectYardSpy).toHaveBeenCalledWith(mockYard);
  });

  it('should call handleExport with processed data after dropdown export change', () => {
    jest.useFakeTimers();

    component.gridState = { skip: 5, take: 10 };
    component.inspectionCustomersList = [
      { srno: 1, customerassigned: 'Customer A' },
    ];

    const mockProcessedData = [{ srno: 1, customerassigned: 'Customer A' }];

    const handleExportSpy = jest.spyOn(component, 'handleExport');

    jest.spyOn(kendoDataQuery, 'process').mockReturnValue({
      data: mockProcessedData,
      total: 1,
    });

    component.onExportDropdownChange({ text: 'Excel' });

    jest.advanceTimersByTime(50);

    expect(handleExportSpy).toHaveBeenCalledWith('Excel', mockProcessedData);

    jest.useRealTimers();
  });

  it('should filter allCustomers based on name match when filter is non-empty', () => {
    component.allCustomersOriginal = [
      { id: '1', name: 'Alpha Inc' },
      { id: '2', name: 'Beta Corp' },
      { id: '3', name: 'Gamma Ltd' },
    ];

    component.filterChange('beta');

    expect(component.allCustomers).toEqual([{ id: '2', name: 'Beta Corp' }]);
  });

  it('should restore all customers when filter is empty', () => {
    component.allCustomersOriginal = [
      { id: '1', name: 'Alpha Inc' },
      { id: '2', name: 'Beta Corp' },
    ];

    component.allCustomers = []; // simulate previous filtering

    component.filterChange('');

    expect(component.allCustomers).toEqual(component.allCustomersOriginal);
  });

  it('should set formInstance when onFormReady is called', () => {
    const mockInstance = { form: { components: [] } };

    component.onFormReady(mockInstance);

    expect(component.formInstance).toBe(mockInstance);
  });

  it('should log error and return if formInstance is not initialized', () => {
    component.formInstance = null;

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    component.initFormListeners();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );

    consoleErrorSpy.mockRestore(); // Clean up
  });

  it('should keep isDownloadEnabled true when event.changed is true and isDownloadEnabled was already true', () => {
    component.isDownloadEnabled = true;

    let changeCallback: (event: any) => void;

    component.formInstance = {
      on: jest.fn((eventName: string, cb: any) => {
        if (eventName === 'change') {
          changeCallback = cb;
        }
      }),
    } as any;

    component.initFormListeners();

    changeCallback!({ changed: true });

    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should set isDownloadEnabled to true when formInstance emits submit event', () => {
    component.isDownloadEnabled = false;

    let submitCallback: (submission: any) => void;

    component.formInstance = {
      on: jest.fn((eventName: string, cb: any) => {
        if (eventName === 'submit') {
          submitCallback = cb;
        }
      }),
    } as any;

    component.initFormListeners();

    // Trigger submit callback
    submitCallback!({ data: { test: 'value' } });

    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should call exportAsCSV when value is CSV', () => {
    const mockData = [
      {
        Status: 'Submitted',
        SubmittedDate: '2024-01-01T10:00:00Z',
        UpdatedDate: '2024-01-02T12:00:00Z',
      },
    ];

    component.handleExport('CSV', mockData);

    expect(exportAsCSV).toHaveBeenCalledWith(
      expect.any(Array),
      'Inspection-Hub',
      expect.any(Array),
      expect.any(Array),
    );
  });

  it('should call exportAsExcel when value is EXCEL', () => {
    const mockData = [
      {
        Status: 'Submitted',
        SubmittedDate: '2024-01-01T10:00:00Z',
        UpdatedDate: '2024-01-02T12:00:00Z',
      },
    ];

    component.handleExport('EXCEL', mockData);

    expect(exportAsExcel).toHaveBeenCalledWith(
      expect.any(Array),
      'Inspection-Hub',
      expect.any(Array),
      expect.any(Array),
    );
  });

  it('should call exportAsPDF when value is PDF', () => {
    const mockData = [
      {
        Status: 'Submitted',
        SubmittedDate: '2024-01-01T10:00:00Z',
        UpdatedDate: '2024-01-02T12:00:00Z',
      },
    ];

    component.handleExport('PDF', mockData);

    expect(exportAsPDF).toHaveBeenCalledWith(
      expect.any(Array),
      'Inspection-Hub',
      expect.any(Array),
      expect.any(Array),
    );
  });

  it('should populate customer lists and select first customer if data exists', () => {
    jest
      .spyOn(component['commonApiService'], '_sCustomerListing')
      .mockReturnValue(of(mockCustomers));

    const selectCustomerSpy = jest.spyOn(component as any, 'selectCustomer');

    component.customersList();

    expect(component.allCustomers).toEqual(mockCustomers);
    expect(component.allCustomersOriginal).toEqual(mockCustomers);
    expect(selectCustomerSpy).toHaveBeenCalledWith(mockCustomers[0]);
    expect(component.isCustomersLoading).toBe(false);
  });

  it('should show error if no customers found', () => {
    jest
      .spyOn(component['commonApiService'], '_sCustomerListing')
      .mockReturnValue(of([]));

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    component.customersList();

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'No customers found.',
    );
    expect(component.isCustomersLoading).toBe(false);
    expect(component.isLoading).toBe(false);
    expect(component.isRailYardLoading).toBe(false);
  });

  it('should handle API error and show kendoNotificationService error', () => {
    const mockError = 'API failure';

    jest
      .spyOn(component['commonApiService'], '_sCustomerListing')
      .mockReturnValue(throwError(() => mockError));

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    component.customersList();

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(mockError);
    expect(component.isCustomersLoading).toBe(false);
    expect(component.isLoading).toBe(false);
    expect(component.isRailYardLoading).toBe(false);
  });

  it('should navigate to /form-details-filled when inspectType is not "edit"', () => {
    const inspection = {
      FormPath: 'pathA',
      Id: 101,
      CustomerAssigned: 'Customer1',
      YardName: 'Yard1',
    };

    const routerSpy = jest.spyOn(component['router'], 'navigate');

    component.InspectionFormDetailGetById(inspection);

    expect(routerSpy).toHaveBeenCalledWith([
      '/form-details-filled',
      'pathA',
      101,
      'Customer1',
      'Yard1',
    ]);
  });

  it('should navigate to /form-details when inspectType is "edit"', () => {
    const inspection = {
      FormPath: 'pathB',
      Id: 202,
      CustomerAssigned: 'Customer2',
      YardName: 'Yard2',
    };

    const routerSpy = jest.spyOn(component['router'], 'navigate');

    component.InspectionFormDetailGetById(inspection, 'edit');

    expect(routerSpy).toHaveBeenCalledWith([
      '/form-details',
      'pathB',
      202,
      'Customer2',
      'Yard2',
    ]);
  });

  it('should generate PDF for wizard form and trigger download (non-iOS)', async () => {
    const mockPdf = {
      output: jest.fn().mockReturnValue(new Blob()),
      save: jest.fn(),
    };
    (jsPDF as any).mockImplementation(() => mockPdf);

    const mockResponse = {
      Result: {
        FormPath: 'testForm',
        FormEntryDetail: JSON.stringify({
          productName: { name: 'Product A' },
          customerName: { name: 'Customer A' },
          yardName: { name: 'Yard A' },
          railCarId: { asset: 'Asset A' },
        }),
      },
    };

    jest
      .spyOn(component['httpClient'], 'get')
      .mockReturnValue(of(mockResponse));
    jest
      .spyOn(component as any, 'waitForFormInstanceReady')
      .mockResolvedValue(void 0);
    jest
      .spyOn(component as any, 'captureWizardPages')
      .mockResolvedValue(void 0);
    jest.spyOn(component as any, 'delay').mockResolvedValue(void 0);

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Windows',
      configurable: true,
    });

    component.formContainer = {
      nativeElement: document.createElement('div'),
    } as any;

    component.formInstance = {
      form: { display: 'wizard' },
      setPage: () => {},
    } as any;

    await component.downloadPDF('SampleTitle', 123);

    expect(component.formUrl).toContain('testForm');
    expect(component.formData.productName).toBe('Product A');
  });

  it('should capture all form tabs and restore original tab', async () => {
    const container = document.createElement('div');

    const tab1 = document.createElement('a');
    tab1.setAttribute('ref', 'tabLink-tabs');
    tab1.classList.add('active');
    const tab2 = document.createElement('a');
    tab2.setAttribute('ref', 'tabLink-tabs');

    container.appendChild(tab1);
    container.appendChild(tab2);

    (html2canvas as jest.Mock).mockResolvedValue(
      document.createElement('canvas'),
    );
    const sliceSpy = jest
      .spyOn(component as any, 'sliceCanvasToMultiplePages')
      .mockResolvedValue(true);

    const result = await (component as any).captureFormTabs(
      new jsPDF(),
      container,
      true,
    );

    expect(sliceSpy).toHaveBeenCalledTimes(2); // both tabs
    expect(html2canvas).toHaveBeenCalledTimes(2);
    expect(result).toBe(true);
  });

  it('should capture form when no tabs exist', async () => {
    const container = document.createElement('div');

    (html2canvas as jest.Mock).mockResolvedValue(
      document.createElement('canvas'),
    );
    const sliceSpy = jest
      .spyOn(component as any, 'sliceCanvasToMultiplePages')
      .mockResolvedValue(false);

    const result = await (component as any).captureFormTabs(
      new jsPDF(),
      container,
      false,
    );

    expect(sliceSpy).toHaveBeenCalledTimes(1);
    expect(html2canvas).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });

  it('should set exportDialogVisible to true and resolve promise when called', async () => {
    const promise = component.showExportDialog();

    expect(component['exportDialogVisible']).toBe(true);

    // Bypass TypeScript private property access using `as any`
    (component as any).exportDialogPromiseResolver!({
      confirmed: true,
      value: 'Test Value',
    });

    await expect(promise).resolves.toEqual({
      confirmed: true,
      value: 'Test Value',
    });
  });

  it('should close export dialog, resolve promise and call onExportDropdownChange if confirmed', () => {
    const resolver = jest.fn();
    (component as any).exportDialogPromiseResolver = resolver;
    component.exportDialogVisible = true;

    const spy = jest.spyOn(component, 'onExportDropdownChange');

    component.onExportDialogClose({ confirmed: true, value: 'Excel' });

    expect(component.exportDialogVisible).toBe(false);
    expect(resolver).toHaveBeenCalledWith({ confirmed: true, value: 'Excel' });
    expect((component as any).exportDialogPromiseResolver).toBeNull();
    expect(spy).toHaveBeenCalledWith('Excel');
  });

  it('should close export dialog and resolve promise without calling onExportDropdownChange if not confirmed', () => {
    const resolver = jest.fn();
    (component as any).exportDialogPromiseResolver = resolver;
    component.exportDialogVisible = true;

    const spy = jest.spyOn(component, 'onExportDropdownChange');

    component.onExportDialogClose({ confirmed: false });

    expect(component.exportDialogVisible).toBe(false);
    expect(resolver).toHaveBeenCalledWith({ confirmed: false });
    expect((component as any).exportDialogPromiseResolver).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
  it('should set dialogVisible to true and return a Promise from showConfirm', async () => {
    const promise = component.showConfirm();

    expect(component.dialogVisible).toBe(true);
    expect(typeof (component as any).confirmResolver).toBe('function');

    // Resolve the promise manually by calling the resolver
    (component as any).confirmResolver(true);

    await expect(promise).resolves.toBe(true);
  });
  it('should set dialogVisible to false and resolve confirmResolver with true when status is "confirm"', async () => {
    const promise = component.showConfirm();

    component.handleDialogClose('confirm');

    expect(component.dialogVisible).toBe(false);

    await expect(promise).resolves.toBe(true);
  });

  it('should set dialogVisible to false and resolve confirmResolver with false when status is not "confirm"', async () => {
    const promise = component.showConfirm();

    component.handleDialogClose('cancel');

    expect(component.dialogVisible).toBe(false);

    await expect(promise).resolves.toBe(false);
  });

  it('should capture all wizard pages and return final isFirstPage value', async () => {
    const pdfMock = {
      addImage: jest.fn(),
      addPage: jest.fn(),
      save: jest.fn(),
    } as unknown as jsPDF;

    const container = document.createElement('div');
    const result = await (component as any).captureWizardPages(
      pdfMock,
      container,
      true,
    );

    expect(component.formInstance.setPage).toHaveBeenCalledTimes(2); // for 2 pages [0, 1]
    expect(html2canvas).toHaveBeenCalledTimes(2);
    expect((component as any).sliceCanvasToMultiplePages).toHaveBeenCalledTimes(
      2,
    );
    expect(result).toBe(true);
  });

  it('should resolve waitForFormInstanceReady successfully', async () => {
    const spy = jest.spyOn(component as any, 'waitForFormInstanceReady');
    await expect(
      (component as any).waitForFormInstanceReady(),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });

  it('should reject waitForFormInstanceReady on timeout', async () => {
    jest.useFakeTimers();

    // Replace with actual method for timeout testing
    const method = DashboardComponent.prototype[
      'waitForFormInstanceReady'
    ].bind({
      formInstance: null,
    });

    const promise = method();

    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow('Form initialization timed out');

    jest.useRealTimers();
  });

  it('should resolve and clear timers when formInstance is ready', async () => {
    const context: any = {
      formInstance: null,
    };

    const promise =
      DashboardComponent.prototype['waitForFormInstanceReady'].call(context);
    setTimeout(() => {
      context.formInstance = {};
    }, 500);
    jest.advanceTimersByTime(600);

    await expect(promise).resolves.toBeUndefined(); // resolved successfully
  });

  it('should handle successful getRailYardsByCustomerId with empty Result', () => {
    const mockResponse = { IsSuccess: true, Result: [] };

    jest
      .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
      .mockReturnValue(of(mockResponse));

    const loadGridSpy = jest.spyOn(component, 'loadGridData');

    component.getRailYardsByCustomerId(1);

    expect(component.inspectionCustomersList).toEqual([]);
    expect(component.isLoading).toBe(false);
    expect(component.isRailYardLoading).toBe(false);
    expect(loadGridSpy).toHaveBeenCalled();
  });

  it('should handle error in getRailYardsByCustomerId', () => {
    const mockError = 'Error message';
    jest
      .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
      .mockReturnValue(throwError(() => mockError));

    const notifySpy = jest.spyOn(kendoNotificationServiceMock, 'showError');

    component.getRailYardsByCustomerId(123);

    expect(component.isLoading).toBe(false);
    expect(component.isRailYardLoading).toBe(false);
    expect(notifySpy).toHaveBeenCalledWith(mockError);
  });

  it('should fetch inspection customers successfully', () => {
    const mockResponse = { Result: [{ Id: 1, Name: 'Test' }] };
    jest
      .spyOn(component['commonApiService'], '_sGetInspectionCustomers')
      .mockReturnValue(of(mockResponse));

    const loadGridSpy = jest.spyOn(component, 'loadGridData');

    component.selectedCustomerObj = { id: 42 };
    component.startDateKendo = new Date();
    component.endDateKendo = new Date();

    component.fetchDataByYards([1, 2]);

    expect(component.inspectionCustomersList).toEqual(mockResponse.Result);
    expect(loadGridSpy).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should handle error during fetchDataByYards', () => {
    const mockError = 'Network error';
    jest
      .spyOn(component['commonApiService'], '_sGetInspectionCustomers')
      .mockReturnValue(throwError(() => mockError));

    const notifySpy = jest.spyOn(kendoNotificationServiceMock, 'showError');

    component.selectedCustomerObj = { id: 42 };
    component.startDateKendo = new Date();
    component.endDateKendo = new Date();

    component.fetchDataByYards([1, 2]);

    expect(component.isLoading).toBe(false);
    expect(notifySpy).toHaveBeenCalledWith(
      `Error fetching inspection hub records: ${mockError}`,
    );
  });

  it('should call delete API and update list if confirmed', async () => {
    component.inspectionCustomersList = [
      { Id: 1 },
      { Id: 2 },
      { Id: 3 },
    ] as any[];

    jest.spyOn(component, 'showConfirm').mockResolvedValue(true);
    jest
      .spyOn(component['commonApiService'], '_sDeleteInspectionRecord')
      .mockReturnValue(of({}));

    const loadGridSpy = jest.spyOn(component, 'loadGridData');

    await component.deleteInspection(2);

    expect(component.inspectionCustomersList).toEqual([{ Id: 1 }, { Id: 3 }]);
    expect(loadGridSpy).toHaveBeenCalled();
    expect(kendoNotificationServiceMock.showSuccess).toHaveBeenCalledWith(
      'Record Deleted successfully',
    );
  });

  describe('sliceCanvasToMultiplePages', () => {
    let mockPdf: any;
    let mockCanvas: HTMLCanvasElement;
    const mockDataUrl = 'data:image/jpeg;base64,mockImageData';

    beforeEach(() => {
      jest.restoreAllMocks(); // Ensure fresh mocks
      jsPDFMockInstance.addPage.mockClear();
      jsPDFMockInstance.addImage.mockClear();

      mockPdf = {
        internal: {
          pageSize: {
            getWidth: jest.fn().mockReturnValue(612),
            getHeight: jest.fn().mockReturnValue(792),
          },
        },
        getImageProperties: jest
          .fn()
          .mockReturnValue({ width: 800, height: 600 }),
        addPage: jest.fn(),
        addImage: jest.fn(),
      };

      mockCanvas = document.createElement('canvas');
      mockCanvas.width = 800;
      mockCanvas.height = 600;
      mockCanvas.toDataURL = jest.fn().mockReturnValue(mockDataUrl);
    });

    const expectAddImageCalledWith = (width: number, height: number) => {
      expect(mockPdf.addImage).toHaveBeenCalledWith(
        mockDataUrl,
        'JPEG',
        20,
        20,
        width,
        height,
      );
    };

    it('should slice canvas and add to PDF when isFirstPage is true', async () => {
      const result = await component.sliceCanvasToMultiplePages(
        mockPdf,
        mockCanvas,
        true,
      );
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
      expect(mockPdf.getImageProperties).toHaveBeenCalledWith(mockDataUrl);
      expect(mockPdf.addPage).not.toHaveBeenCalled();
      expectAddImageCalledWith(572, 429); // 612 - 40 width, calculated height
      expect(result).toBe(false);
    });

    it('should add new page when isFirstPage is false', async () => {
      const result = await component.sliceCanvasToMultiplePages(
        mockPdf,
        mockCanvas,
        false,
      );
      expect(mockPdf.addPage).toHaveBeenCalledTimes(1);
      expect(mockPdf.addImage).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle tall canvas (aspect ratio)', async () => {
      mockPdf.getImageProperties.mockReturnValue({ width: 400, height: 1200 });
      await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
      expectAddImageCalledWith(572, 752); // max contentHeight
    });

    it('should handle wide canvas', async () => {
      mockPdf.getImageProperties.mockReturnValue({ width: 2000, height: 400 });
      await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
      expectAddImageCalledWith(572, 114.4); // scaled height
    });

    it('should use correct content dimensions', async () => {
      await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
      const addImageCall = mockPdf.addImage.mock.calls[0];
      expect(addImageCall[2]).toBe(20); // left margin
      expect(addImageCall[3]).toBe(20); // top margin
      expect(addImageCall[4]).toBe(572); // contentWidth
    });

    it('should handle different PDF page sizes', async () => {
      mockPdf.internal.pageSize.getWidth.mockReturnValue(800);
      mockPdf.internal.pageSize.getHeight.mockReturnValue(1000);
      await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
      expectAddImageCalledWith(760, 570); // 800 - 40 width, scaled height
    });

    it('should return false regardless of isFirstPage', async () => {
      expect(
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true),
      ).toBe(false);
      expect(
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, false),
      ).toBe(false);
    });

    it('should call toDataURL with correct format and quality', async () => {
      await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    });

    it('should call getImageProperties with data URL', async () => {
      await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
      expect(mockPdf.getImageProperties).toHaveBeenCalledWith(mockDataUrl);
    });

    it('should handle image height equal to content height', async () => {
      mockPdf.getImageProperties.mockReturnValue({ width: 572, height: 752 });
      await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
      expectAddImageCalledWith(572, 752);
    });
  });

  describe('onComboBoxChange', () => {
    it('should call selectCustomer if selectedCustomerObj is undefined', () => {
      component.selectedCustomerObj = undefined;
      const customer = { id: '1', name: 'Customer A' };
      const spy = jest.spyOn(component, 'selectCustomer');
      component.onComboBoxChange(customer);
      expect(spy).toHaveBeenCalledWith(customer);
    });

    it('should call selectCustomer if ids are different', () => {
      component.selectedCustomerObj = { id: '1', name: 'Customer A' };
      const customer = { id: '2', name: 'Customer B' };
      const spy = jest.spyOn(component, 'selectCustomer');
      component.onComboBoxChange(customer);
      expect(spy).toHaveBeenCalledWith(customer);
    });

    it('should not call selectCustomer if ids are same', () => {
      const customer = { id: '1', name: 'Customer A' };
      component.selectedCustomerObj = { id: '1', name: 'Customer A' };
      const spy = jest.spyOn(component, 'selectCustomer');
      component.onComboBoxChange(customer);
      expect(spy).not.toHaveBeenCalled();
    });

    it.each([null, 'string', 123])(
      'should not call selectCustomer if invalid value: %s',
      (value) => {
        const spy = jest.spyOn(component, 'selectCustomer');
        component.onComboBoxChange(value as any);
        expect(spy).not.toHaveBeenCalled();
      },
    );
  });

  describe('onBtnGroupClick', () => {
    it('should skip filtering if value is same as selected', () => {
      component.dateRangeSelected = 'today';
      component.onBtnGroupClick('today');
      expect(component.filterCustomersData).not.toHaveBeenCalled();
    });

    it('should call filterCustomersData if value changes', () => {
      component.onBtnGroupClick('last7days');
      expect(component.filterCustomersData).toHaveBeenCalledWith('last7days');
    });

    it('should call filterCustomersData with new start date and existing endDateKendo when type is startDate', () => {
      const mockStartDate = new Date('2024-01-01');
      const mockEndDate = new Date('2024-01-31');
      component.endDateKendo = mockEndDate;

      const filterSpy = jest.spyOn(component, 'filterCustomersData');

      component.onDateChange(mockStartDate, 'startDate');

      expect(component.dateRangeSelected).toBe('custom');
      expect(filterSpy).toHaveBeenCalledWith(
        'custom',
        new Date(mockStartDate),
        new Date(mockEndDate),
      );
    });

    it('should call filterCustomersData with existing startDateKendo and new end date when type is endDate', () => {
      const mockEndDate = new Date('2024-02-01');
      const mockStartDate = new Date('2024-01-15');
      component.startDateKendo = mockStartDate;

      const filterSpy = jest.spyOn(component, 'filterCustomersData');

      component.onDateChange(mockEndDate, 'endDate');

      expect(component.dateRangeSelected).toBe('custom');
      expect(filterSpy).toHaveBeenCalledWith(
        'custom',
        new Date(mockStartDate),
        new Date(mockEndDate),
      );
    });
  });

  it('resetFormState should reset all related flags and properties', () => {
    component.formReadyToRender = true;
    component.formUrl = 'url';
    component.formData = { some: 'data' };
    component.formInstance = {};
    component.isDownloadEnabled = false;

    component.resetFormState();

    expect(component.formReadyToRender).toBe(false);
    expect(component.formUrl).toBeUndefined();
    expect(component.formData).toBeNull();
    expect(component.formInstance).toBeNull();
    expect(component.isDownloadEnabled).toBe(true);
  });

  describe('deleteInspection', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
    });

    it('should show a warning if the device is offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      await component.deleteInspection(123);
      expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
        '"Delete Form" feature is not available in offline mode. Please try again once you are back online.',
      );
    });

    it('should not call delete API if confirmation is cancelled', async () => {
      jest.spyOn(component, 'showConfirm').mockResolvedValue(false);

      await component.deleteInspection(456);

      expect(mockCommonApi._sdeleteInspectionRecord).not.toHaveBeenCalled();
      expect(kendoNotificationServiceMock.showSuccess).not.toHaveBeenCalled();
      expect(kendoNotificationServiceMock.showError).not.toHaveBeenCalled();
    });
  });

  describe('DashboardComponent uncovered coverage', () => {
    beforeEach(() => {
      // reset flags for safety before each test
      component.isLoading = false;
      component.isRailYardLoading = false;
      component.selectedRailYard = { Id: 1, Name: 'Yard 1' };
      component.selectedCustomerObj = { id: 1, name: 'Customer 1' };
    });

    describe('captureFormTabs', () => {
      it('should click tabs and restore original tab', async () => {
        const container = document.createElement('div');
        const tab1 = document.createElement('a');
        tab1.setAttribute('ref', 'tabLink-tabs');
        tab1.classList.add('active');
        const tab2 = document.createElement('button');
        tab2.setAttribute('ref', 'wizard-1');

        container.appendChild(tab1);
        container.appendChild(tab2);

        jest.spyOn(component.cdr, 'detectChanges');
        (html2canvas as jest.Mock).mockResolvedValue(
          document.createElement('canvas'),
        );
        jest
          .spyOn(component as any, 'sliceCanvasToMultiplePages')
          .mockResolvedValue(true);

        const result = await component.captureFormTabs(
          new jsPDF(),
          container,
          true,
        );

        expect(result).toBe(true);
        expect(component.cdr.detectChanges).toHaveBeenCalled();
      });

      it('should handle case with no tabs', async () => {
        const container = document.createElement('div');
        (html2canvas as jest.Mock).mockResolvedValue(
          document.createElement('canvas'),
        );
        jest
          .spyOn(component as any, 'sliceCanvasToMultiplePages')
          .mockResolvedValue(false);

        const result = await component.captureFormTabs(
          new jsPDF(),
          container,
          false,
        );

        expect(result).toBe(false);
      });
    });

    describe('showExportDialog & onExportDialogClose', () => {
      it('showExportDialog should set exportDialogVisible and resolve promise', async () => {
        const promise = component.showExportDialog();

        expect(component.exportDialogVisible).toBe(true);

        (component as any).exportDialogPromiseResolver!({
          confirmed: true,
          value: 'CSV',
        });

        await expect(promise).resolves.toEqual({
          confirmed: true,
          value: 'CSV',
        });
      });

      it('onExportDialogClose should handle confirmed true', () => {
        const spyOnExportDropdownChange = jest.spyOn(
          component,
          'onExportDropdownChange',
        );
        const resolver = jest.fn();
        (component as any).exportDialogPromiseResolver = resolver;

        component.exportDialogVisible = true;
        component.onExportDialogClose({ confirmed: true, value: 'PDF' });

        expect(component.exportDialogVisible).toBe(false);
        expect(resolver).toHaveBeenCalledWith({
          confirmed: true,
          value: 'PDF',
        });
        expect(spyOnExportDropdownChange).toHaveBeenCalledWith('PDF');
        expect((component as any).exportDialogPromiseResolver).toBeNull();
      });

      it('onExportDialogClose should handle confirmed false', () => {
        const resolver = jest.fn();
        (component as any).exportDialogPromiseResolver = resolver;

        component.exportDialogVisible = true;
        component.onExportDialogClose({ confirmed: false });

        expect(component.exportDialogVisible).toBe(false);
        expect(resolver).toHaveBeenCalledWith({ confirmed: false });
        expect((component as any).exportDialogPromiseResolver).toBeNull();
      });
    });

    describe('deleteInspection', () => {
      beforeEach(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          configurable: true,
        });
      });

      it('should show warning if offline', async () => {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          configurable: true,
        });
        await component.deleteInspection(1);
        expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
          '"Delete Form" feature is not available in offline mode. Please try again once you are back online.',
        );
      });

      it('should not call delete API if user cancels confirmation', async () => {
        jest.spyOn(component, 'showConfirm').mockResolvedValue(false);
        await component.deleteInspection(2);

        expect(mockCommonApi._sdeleteInspectionRecord).not.toHaveBeenCalled();
        expect(kendoNotificationServiceMock.showSuccess).not.toHaveBeenCalled();
        expect(kendoNotificationServiceMock.showError).not.toHaveBeenCalled();
      });

      it('should delete inspection and update list if confirmed', async () => {
        component.inspectionCustomersList = [{ Id: 1 }, { Id: 2 }];
        jest.spyOn(component, 'showConfirm').mockResolvedValue(true);
        jest
          .spyOn(component['commonApiService'], '_sDeleteInspectionRecord')
          .mockReturnValue(of({}));
        const loadGridSpy = jest.spyOn(component, 'loadGridData');

        await component.deleteInspection(1);

        expect(component.inspectionCustomersList).toHaveLength(1);
        expect(loadGridSpy).toHaveBeenCalled();
        expect(kendoNotificationServiceMock.showSuccess).toHaveBeenCalledWith(
          'Record Deleted successfully',
        );
      });

      it('should show error notification on delete failure', async () => {
        jest.spyOn(component, 'showConfirm').mockResolvedValue(true);

        const deleteError = new Error('Delete failed');
        jest
          .spyOn(component['commonApiService'], '_sDeleteInspectionRecord')
          .mockReturnValue(throwError(deleteError));

        const errorSpy = jest.spyOn(kendoNotificationServiceMock, 'showError');
        await component.deleteInspection(1);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(
          'Deletion failed! Please try again later.',
        );
      });
    });
  });
});
