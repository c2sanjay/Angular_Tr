import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { AuthService } from '@auth0/auth0-angular';
import { Component, ElementRef, ChangeDetectorRef } from '@angular/core';
import { process } from '@progress/kendo-data-query';
import * as kendoDataQuery from '@progress/kendo-data-query';
import html2canvas from 'html2canvas';
import { exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import { HttpClient } from '@angular/common/http';
import { saveAs } from 'file-saver';
import { Router } from '@angular/router';
import { DEFAULT_ALL_YARD } from 'src/app/common/types';
import { provideMockStore } from '@ngrx/store/testing';
import {
  selectAllCustomers,
  selectSelectedCustomer,
} from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    output: jest
      .fn()
      .mockReturnValue(new Blob(['mock-pdf'], { type: 'application/pdf' })),
    addPage: jest.fn(),
    addImage: jest.fn(),
    internal: { pageSize: { getWidth: () => 600, getHeight: () => 800 } },
  })),
}));

jest.mock('file-saver', () => ({ saveAs: jest.fn() }));
jest.mock('html2canvas', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('src/app/lib/exportAs', () => ({
  exportAsCSV: jest.fn(),
  exportAsExcel: jest.fn(),
  exportAsPDF: jest.fn(),
}));

const mockFormResponse = {
  Result: {
    FormPath: 'form-path',
    FormEntryDetail: JSON.stringify({
      productName: { name: 'P1' },
      customerName: { name: 'C1' },
      yardName: { name: 'Y1' },
      railCarId: { asset: 'RC1' },
    }),
  },
};

@Component({ selector: 'formio', template: '' })
class MockFormioComponent {}
@Component({ selector: 'app-tabs', template: '' })
class MockTabsComponent {}
@Component({ selector: 'app-rsi-topbar', template: '' })
class MockTopbar {}
@Component({ selector: 'app-rsi-sidebar', template: '' })
class MockSidebar {}

const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
  clearOldOfflineData: jest.fn(),
};

const mockCommonApiService = {
  _sCustomerListing: jest.fn().mockReturnValue(of([])),
  _sgetRailYardsByCustomer: jest.fn().mockReturnValue(of([])),
  getInspectionHubDataByCustomer: jest.fn().mockReturnValue(of([])),
  _sDeleteInspectionRecord: jest.fn(),
};

const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
};

const mockAccessRoleService = {
  getRole: jest.fn().mockReturnValue('Trinity Staff'),
};

const mockAuthService = {
  user$: of({ email: 'test@example.com' }),
  isAuthenticated$: of(true),
  loginWithRedirect: jest.fn(),
  logout: jest.fn(),
};

const mockFormContainer = {
  nativeElement: document.createElement('div'),
};

const mockTimezoneService = {
  getTimezone: jest.fn().mockReturnValue('Asia/Kolkata'),
};

const mockRouter = {
  navigate: jest.fn(),
};

const mockCustomerId = 1;
const mockYards = [
  { Id: 2, Name: 'Yard B' },
  { Id: 1, Name: 'Yard A' },
];

const mockResponse = {
  IsSuccess: true,
  Result: mockYards,
};

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

function simulateFormioOn(event: string, cb: () => void): void {
  if (event === 'ready') {
    cb();
  }
}

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent, HttpClientTestingModule],
      declarations: [
        MockFormioComponent,
        MockTabsComponent,
        MockTopbar,
        MockSidebar,
      ],
      providers: [
        provideAnimations(),
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        { provide: CommonApiService, useValue: mockCommonApiService },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: AccessRoleService, useValue: mockAccessRoleService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jest.fn() } },
        { provide: 'TimezoneService', useValue: mockTimezoneService },
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
    component.formContainer = mockFormContainer as ElementRef;
    component.formioComponent = {
      formio: {
        on: jest.fn(),
        form: { display: 'form' },
        pages: [],
      },
    } as any;

    component.tabsComponent = {} as any;
    jest.spyOn(component, 'filterCustomersData').mockImplementation(() => {});
    component.startDateKendo = new Date('2024-01-01');
    component.endDateKendo = new Date('2024-01-31');

    jest.spyOn(component as any, 'selectYard').mockImplementation(() => {});
    jest
      .spyOn(component as any, 'fetchDataByYards')
      .mockImplementation(() => {});
    jest
      .spyOn(component as any, 'waitForFormInstanceReady')
      .mockResolvedValue(undefined);
    jest
      .spyOn(component as any, 'waitForFormInstanceReady')
      .mockImplementation((...args: any[]) => Promise.resolve());
    (html2canvas as jest.Mock).mockResolvedValue(
      document.createElement('canvas'),
    );
    jest.spyOn(component, 'fetchDataByYards').mockImplementation(() => {});
    component.isLoading = true;
    component.isRailYardLoading = true;
    component.isCustomersLoading = true;
    component.isLoading = true;
    jest.useFakeTimers();
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call ngOnInit() directly if userRole is "Trinity Staff"', () => {
    component.userRole = 'Trinity Staff';
    const ngOnInitSpy = jest
      .spyOn(component, 'ngOnInit')
      .mockImplementation(() => {});

    component.online();

    expect(ngOnInitSpy).toHaveBeenCalled();
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).not.toHaveBeenCalled();
  });

  it('should call syncAllOfflineFormSubmissions if userRole is not "Trinity Staff"', () => {
    component.userRole = 'External Inspector';

    const ngOnInitSpy = jest
      .spyOn(component, 'ngOnInit')
      .mockImplementation(() => {});

    component.online();

    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();

    // Simulate the callback execution
    const [onComplete, setSyncInProgress, setDownloadEnabled] =
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions.mock.calls[0];

    // Simulate behavior of sync callbacks
    setSyncInProgress(true);
    expect(component.isSyncInProgress).toBe(true);

    setDownloadEnabled(false);
    expect(component.isDownloadEnabled).toBe(false);

    // Simulate completion
    onComplete();
    expect(ngOnInitSpy).toHaveBeenCalled();
  });

  it('should assign ViewChild references correctly', () => {
    component.formContainer = {
      nativeElement: document.createElement('div'),
    } as ElementRef;

    component.formioComponent = {
      formio: {
        on: jest.fn(),
        form: { display: 'form' },
        pages: [],
      },
    } as any;

    expect(component.formContainer.nativeElement).toBeDefined();
    expect(component.formioComponent.formio).toBeDefined();
  });

  it('should assign formInstance when onFormReady is called', () => {
    const mockFormInstance = { someProp: 'test' };

    component.onFormReady(mockFormInstance);

    expect(component.formInstance).toBe(mockFormInstance);
  });

  it('should update gridState and call loadGridData', () => {
    const testState = {
      skip: 10,
      take: 5,
      sort: [],
      filter: undefined,
    };

    const loadGridDataSpy = jest.spyOn(component as any, 'loadGridData');

    component.onDataStateChange(testState);

    expect(component.gridState).toEqual(testState);
    expect(loadGridDataSpy).toHaveBeenCalled();
  });

  it('should process inspectionCustomersList using gridState and update gridView', () => {
    const mockData = [
      { railcarid: '123', yardname: 'Yard A' },
      { railcarid: '456', yardname: 'Yard B' },
    ];

    component.inspectionCustomersList = mockData;
    component.gridState = {
      skip: 0,
      take: 1,
      sort: [],
      filter: undefined,
    };

    // Manually call the private method
    (component as any).loadGridData();

    const expected = process(mockData, component.gridState);

    expect(component.gridView.data).toEqual(expected.data);
    expect(component.gridView.total).toEqual(expected.total);
  });

  it('should call handleExport with processed data', () => {
    window.URL.createObjectURL = jest.fn(() => 'mockObjectURL');
    window.URL.revokeObjectURL = jest.fn();

    const mockData = [{ id: 1 }, { id: 2 }];
    component.inspectionCustomersList = mockData;
    component.gridState = {
      skip: 10,
      take: 15,
      sort: [],
      filter: undefined,
    };

    const mockProcessedData = { data: mockData, total: 2 };
    jest.spyOn(kendoDataQuery, 'process').mockReturnValue(mockProcessedData);

    const handleExportSpy = jest.spyOn(component as any, 'handleExport');

    const mockValue = { text: 'CSV' };
    component.onExportDropdownChange(mockValue);

    jest.advanceTimersByTime(50);

    expect(kendoDataQuery.process).toHaveBeenCalledWith(mockData, {
      ...component.gridState,
      skip: 0,
      take: undefined,
    });

    expect(handleExportSpy).toHaveBeenCalledWith('CSV', mockProcessedData.data);
  });

  it('should call selectCustomer if the new customer is different', () => {
    const mockCustomer = { id: 123, name: 'Customer A' };
    const selectCustomerSpy = jest.spyOn(component, 'selectCustomer');

    component.selectedCustomerObj = { id: 999 };

    component.onComboBoxChange(mockCustomer);

    expect(component.selectedCustomerObj).toEqual(mockCustomer);
    expect(selectCustomerSpy).toHaveBeenCalledWith(mockCustomer);
  });

  it('should filter allCustomers based on case-insensitive match', () => {
    component.allCustomersOriginal = [
      { name: 'Alpha' },
      { name: 'Beta' },
      { name: 'Gamma' },
    ];

    component.filterChange('al');

    expect(component.allCustomers).toEqual([{ name: 'Alpha' }]);
  });

  it('should return full list if filter is empty', () => {
    const mockOriginal = [
      { name: 'Alpha' },
      { name: 'Beta' },
      { name: 'Gamma' },
    ];

    component.allCustomersOriginal = mockOriginal;

    component.filterChange('');

    expect(component.allCustomers).toEqual(mockOriginal);
  });

  it('should handle no matches and return empty array', () => {
    component.allCustomersOriginal = [
      { name: 'Alpha' },
      { name: 'Beta' },
      { name: 'Gamma' },
    ];

    component.filterChange('xyz');

    expect(component.allCustomers).toEqual([]);
  });

  it('should not set anything if formioComponent is not available', () => {
    component.formioComponent = undefined as any;
    component.ngAfterViewInit();
    expect(component.formInstance).toBeFalsy();
  });

  it('should resolve after the specified delay', async () => {
    const delayPromise = (component as any).delay(500);

    jest.advanceTimersByTime(500);

    await expect(delayPromise).resolves.toBeUndefined();
  });

  it('should resolve when formInstance is set', async () => {
    const promise = (component as any).waitForFormInstanceReady();

    setTimeout(() => {
      (component as any).formInstance = { dummy: 'instance' };
    }, 300);

    jest.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });
  it('onFormReady should assign the passed instance to formInstance', () => {
    const dummyInstance = { form: { components: [] }, on: jest.fn() };

    component.onFormReady(dummyInstance);

    expect(component.formInstance).toBe(dummyInstance);
  });

  it('should show warning toast when exporting with empty data', () => {
    const emptyData: any[] = [];

    component.handleExport('csv', emptyData);

    expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
      'No data present, unable to export.',
    );
  });

  //  TEST CASE FOR EXCEL EXPORT
  it('should call exportAsExcel when value is "EXCEL"', () => {
    const sampleData = [
      {
        railcarid: 'RC123',
        yardname: 'Yard A',
        formtitle: 'Inspection A',
        inspectorName: 'Inspector X',
        submittedby: 'user@example.com',
        submittedDate: '2025-06-30T10:30:00.000Z',
        lastupdate: '2025-06-30T12:00:00.000Z',
        status: 'Submitted',
      },
    ];

    component.handleExport('EXCEL', sampleData);

    expect(exportAsExcel).toHaveBeenCalledWith(
      expect.any(Array),
      'Inspection-Hub',
      expect.any(Array),
    );
  });

  //  TEST CASE FOR PDF EXPORT
  it('should call exportAsPDF when value is "PDF"', () => {
    const sampleData = [
      {
        railcarid: 'RC123',
        yardname: 'Yard A',
        formtitle: 'Inspection A',
        inspectorName: 'Inspector X',
        submittedby: 'user@example.com',
        submittedDate: '2025-06-30T10:30:00.000Z',
        lastupdate: '2025-06-30T12:00:00.000Z',
        status: 'Submitted',
      },
    ];

    component.handleExport('PDF', sampleData);

    expect(exportAsPDF).toHaveBeenCalledWith(
      expect.any(Array),
      'Inspection-Hub',
      expect.any(Array),
    );
  });

  //  WARNING CASE: EMPTY DATA
  it('should show warning when data is empty', () => {
    component.handleExport('CSV', []);
    expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
      'No data present, unable to export.',
    );
  });

  it('should reset form state', () => {
    //  dirty state before reset
    (component as any).formReadyToRender = true;
    (component as any).formUrl = 'test-url';
    (component as any).formData = { dummy: true };
    (component as any).formInstance = { dummy: true };
    (component as any).isDownloadEnabled = false;

    (component as any).resetFormState();

    expect((component as any).formReadyToRender).toBe(false);
    expect((component as any).formUrl).toBeUndefined();
    expect((component as any).formData).toBeNull();
    expect((component as any).formInstance).toBeNull();
    expect((component as any).isDownloadEnabled).toBe(true);
  });

  it('should not call filterCustomersData if value is same as current dateRangeSelected', () => {
    component.dateRangeSelected = 'today';
    const spy = jest.spyOn(component, 'filterCustomersData');

    component.onBtnGroupClick('today');

    expect(spy).not.toHaveBeenCalled();
    expect(component.dateRangeSelected).toBe('today');
  });

  it('should update dateRangeSelected and call filterCustomersData if value is different', () => {
    component.dateRangeSelected = 'today';
    const spy = jest
      .spyOn(component, 'filterCustomersData')
      .mockImplementation(() => {});

    component.onBtnGroupClick('last7days');

    expect(component.dateRangeSelected).toBe('last7days');
    expect(spy).toHaveBeenCalledWith('last7days');
  });

  it('should resolve after specified delay', async () => {
    jest.useFakeTimers();

    const promise = component.delay(1000); // Call  delay method

    // Fast-forward all timers
    jest.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();

    jest.useRealTimers(); // Restore real timers after test
  });

  it('should reset skip to 0 and call selectYard with provided yard', () => {
    const mockYard = { Id: 1, Name: 'Yard A' };
    component.gridState = { skip: 10, take: 20 };

    const selectYardSpy = jest.spyOn(component, 'selectYard');

    component.onDropdownChange(mockYard as any);

    expect(component.gridState.skip).toBe(0);
    expect(selectYardSpy).toHaveBeenCalledWith(mockYard);
  });

  it('should download PDF for desktop/android devices', async () => {
    const httpClient = TestBed.inject(HttpClient);
    const getSpy = jest
      .spyOn(httpClient, 'get')
      .mockReturnValue(of(mockFormResponse));
    const saveAsSpy = jest
      .spyOn({ saveAs }, 'saveAs')
      .mockImplementation(jest.fn());

    component.formInstance = {
      form: { display: 'form' },
    } as any;

    (component as any).waitForFormInstanceReady = jest
      .fn()
      .mockResolvedValue(undefined);
    component.delay = jest.fn().mockResolvedValue(undefined);
    (component as any).captureFormTabs = jest.fn().mockResolvedValue(undefined);
    (component as any).captureWizardPages = jest
      .fn()
      .mockResolvedValue(undefined);
    component.formContainer = {
      nativeElement: document.createElement('div'),
    } as any;

    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    });

    await component.downloadPDF('TestForm', 123);

    expect(component.formUrl).toContain('form-path');
    expect(getSpy).toHaveBeenCalled();
    expect((component as any).captureFormTabs).toHaveBeenCalled();
    expect(saveAsSpy).toHaveBeenCalled();

    // Restore userAgent to prevent test pollution
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it('should resolve waitForFormInstanceReady when formInstance is set', async () => {
    const promise = (component as any).waitForFormInstanceReady();

    setTimeout(() => {
      component.formInstance = { someMock: 'mockValue' };
    }, 100);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should navigate to /form-details-filled when userRole is not "Customer Admin"', () => {
    component.userRole = 'Admin';
    const inspection = {
      FormPath: 'path',
      Id: 1,
      CustomerAssigned: true,
      YardName: 'Yard',
    };

    component.InspectionFormDetailGetById(inspection);

    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/form-details-filled',
      'path',
      1,
      true,
      'Yard',
    ]);
  });

  it('should navigate to /form-details when userRole is "Customer Admin" and inspectionType is "edit"', () => {
    component.userRole = 'Customer Admin';
    const inspection = {
      FormPath: 'path',
      Id: 1,
      CustomerAssigned: true,
      YardName: 'Yard',
    };

    component.InspectionFormDetailGetById(inspection, 'edit');

    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/form-details',
      'path',
      1,
      true,
      'Yard',
    ]);
  });

  it('should set exportDialogVisible to true and return a promise', async () => {
    const promise = component.showExportDialog();

    expect(component.exportDialogVisible).toBe(true);
    expect(typeof (component as any).exportDialogPromiseResolver).toBe(
      'function',
    );
    (component as any).exportDialogPromiseResolver({
      confirmed: true,
      value: 'Test',
    });

    await expect(promise).resolves.toEqual({ confirmed: true, value: 'Test' });
  });

  it('should close export dialog and resolve promise when confirmed is true', () => {
    const resolver = jest.fn();
    (component as any).exportDialogPromiseResolver = resolver;
    component.exportDialogVisible = true;
    jest.spyOn(component as any, 'onExportDropdownChange').mockImplementation();

    const result = { confirmed: true, value: 'TestValue' };
    component.onExportDialogClose(result);

    expect(component.exportDialogVisible).toBe(false);
    expect(resolver).toHaveBeenCalledWith(result);
    expect((component as any).exportDialogPromiseResolver).toBeNull();
    expect((component as any).onExportDropdownChange).toHaveBeenCalledWith(
      'TestValue',
    );
  });

  it('should close export dialog and resolve promise when confirmed is false', () => {
    const resolver = jest.fn();
    (component as any).exportDialogPromiseResolver = resolver;
    component.exportDialogVisible = true;
    jest.spyOn(component as any, 'onExportDropdownChange').mockImplementation();

    const result = { confirmed: false };
    component.onExportDialogClose(result);

    expect(component.exportDialogVisible).toBe(false);
    expect(resolver).toHaveBeenCalledWith(result);
    expect((component as any).exportDialogPromiseResolver).toBeNull();
    expect((component as any).onExportDropdownChange).not.toHaveBeenCalled();
  });

  it('should show confirm dialog and set resolver', async () => {
    const promise = component.showConfirm();

    expect(component.dialogVisible).toBe(true);
    expect(typeof (component as any).confirmResolver).toBe('function');
    (component as any).confirmResolver(true);
    await expect(promise).resolves.toBe(true);
  });

  it('should handle dialog close with confirm status', () => {
    const resolver = jest.fn();
    (component as any).confirmResolver = resolver;
    component.dialogVisible = true;

    component.handleDialogClose('confirm');

    expect(component.dialogVisible).toBe(false);
    expect(resolver).toHaveBeenCalledWith(true);
  });

  it('should handle dialog close with cancel status', () => {
    const resolver = jest.fn();
    (component as any).confirmResolver = resolver;
    component.dialogVisible = true;

    component.handleDialogClose('cancel');

    expect(component.dialogVisible).toBe(false);
    expect(resolver).toHaveBeenCalledWith(false);
  });

  it('should delete inspection record when confirmed', async () => {
    const mockId = 123;
    const mockList = [
      { Id: 123, Name: 'Old' },
      { Id: 456, Name: 'Keep' },
    ];
    component.inspectionCustomersList = [...mockList];

    // Bypass private modifier using bracket notation
    jest.spyOn(component as any, 'showConfirm').mockResolvedValue(true);
    jest
      .spyOn((component as any)['commonApiService'], '_sDeleteInspectionRecord')
      .mockReturnValue(of(undefined));
    jest.spyOn(kendoNotificationServiceMock, 'showSuccess');
    jest.spyOn(component as any, 'loadGridData');

    await component.deleteInspection(mockId);

    expect(
      (component as any)['commonApiService']._sDeleteInspectionRecord,
    ).toHaveBeenCalledWith(mockId);
    expect(kendoNotificationServiceMock.showSuccess).toHaveBeenCalledWith(
      'Record Deleted successfully',
    );
    expect(component.inspectionCustomersList).toEqual([
      { Id: 456, Name: 'Keep' },
    ]);
    expect((component as any).loadGridData).toHaveBeenCalled();
  });

  it('should show error toast on API deletion failure', async () => {
    const mockId = 1;
    const mockError = 'Network Error';

    jest.spyOn(component as any, 'showConfirm').mockResolvedValue(true);
    jest
      .spyOn((component as any)['commonApiService'], '_sDeleteInspectionRecord')
      .mockReturnValue(throwError(() => mockError));
    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    await component.deleteInspection(mockId);

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Deletion failed! Please try again later.',
    );
  });

  it('should populate customers and call selectCustomer when data is received', () => {
    const mockData = [{ Id: 1, Name: 'Customer A' }];
    jest
      .spyOn((component as any).commonApiService, '_sCustomerListing')
      .mockReturnValue(of(mockData));
    const selectCustomerSpy = jest.spyOn(component, 'selectCustomer');

    component.customersList();

    expect(component.allCustomers).toEqual(mockData);
    expect(component.allCustomersOriginal).toEqual(mockData);
    expect(selectCustomerSpy).toHaveBeenCalledWith(mockData[0]);
    expect(component.isCustomersLoading).toBeFalsy();
  });

  it('should show error toast when no customers found', () => {
    jest
      .spyOn((component as any).commonApiService, '_sCustomerListing')
      .mockReturnValue(of([]));
    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    component.customersList();

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'No customers found.',
    );
    expect(component.isCustomersLoading).toBeFalsy();
    expect(component.isRailYardLoading).toBeFalsy();
    expect(component.isLoading).toBeFalsy();
  });

  it('should handle API error and show error toast', () => {
    const mockError = 'API failure';
    jest
      .spyOn((component as any).commonApiService, '_sCustomerListing')
      .mockReturnValue(throwError(() => mockError));
    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    component.customersList();

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(mockError);
    expect(component.isCustomersLoading).toBeFalsy();
    expect(component.isRailYardLoading).toBeFalsy();
    expect(component.isLoading).toBeFalsy();
  });

  it('should populate and sort rail yards and call selectYard', () => {
    jest
      .spyOn((component as any).commonApiService, '_sGetRailYardsByCustomer')
      .mockReturnValue(of(mockResponse));

    const selectYardSpy = jest.spyOn(component, 'selectYard');

    component.getRailYardsByCustomerId(mockCustomerId);

    const expectedSorted = [...mockYards].sort((a, b) =>
      a.Name.localeCompare(b.Name),
    );

    expect(component.railYards).toEqual([DEFAULT_ALL_YARD, ...expectedSorted]);
    expect(selectYardSpy).toHaveBeenCalledWith(DEFAULT_ALL_YARD);
    expect(component.isRailYardLoading).toBeFalsy();
  });

  it('should clear inspectionCustomersList and call loadGridData if no yards or not success', () => {
    const responseWithNoYards = { IsSuccess: false, Result: [] };

    jest
      .spyOn((component as any).commonApiService, '_sGetRailYardsByCustomer')
      .mockReturnValue(of(responseWithNoYards));
    const loadGridDataSpy = jest.spyOn(component as any, 'loadGridData');

    component.getRailYardsByCustomerId(mockCustomerId);

    expect(component.inspectionCustomersList).toEqual([]);
    expect(loadGridDataSpy).toHaveBeenCalled();
    expect(component.isLoading).toBeFalsy();
    expect(component.isRailYardLoading).toBeFalsy();
  });

  it('should handle error and show toast', () => {
    const mockError = 'Error occurred';
    jest
      .spyOn((component as any).commonApiService, '_sGetRailYardsByCustomer')
      .mockReturnValue(throwError(() => mockError));
    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    component.getRailYardsByCustomerId(mockCustomerId);

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(mockError);
    expect(component.isLoading).toBeFalsy();
    expect(component.isRailYardLoading).toBeFalsy();
  });

  it('should handle API response missing Result gracefully', async () => {
    jest.spyOn(component['httpClient'], 'get').mockReturnValue(of({}));

    await component.downloadPDF('FormTitle', 123);

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Error trying to generate PDF.',
    );
    expect(component.isPdfDownloading).toBe(false);
  });

  it('should handle invalid JSON in FormEntryDetail gracefully', async () => {
    jest.spyOn(component['httpClient'], 'get').mockReturnValue(
      of({
        Result: {
          FormPath: 'form-path',
          FormEntryDetail: 'invalid json',
        },
      }),
    );

    await component.downloadPDF('FormTitle', 123);

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Error trying to generate PDF.',
    );
    expect(component.isPdfDownloading).toBe(false);
  });

  it('should show warning and return if offline during deleteInspection', async () => {
    // Arrange: mock offline state
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    const warningSpy = jest.spyOn(kendoNotificationServiceMock, 'showWarning');
    const deleteSpy = jest.spyOn(
      mockCommonApiService,
      '_sDeleteInspectionRecord',
    );

    // Act: call the method
    await component.deleteInspection(123);

    // Assert: warning shown and API not called
    expect(warningSpy).toHaveBeenCalledWith(
      '"Delete Form" feature is not available in offline mode. Please try again once you are back online.',
    );
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  describe('onDateChange()', () => {
    beforeEach(() => {
      component.startDateKendo = new Date('2023-01-10');
      component.endDateKendo = new Date('2023-01-20');
      jest.spyOn(component, 'filterCustomersData').mockImplementation(() => {});
    });

    it('should update for startDate', () => {
      const newStart = new Date('2023-02-05');
      component.onDateChange(newStart, 'startDate');
      expect(component.dateRangeSelected).toBe('custom');
      expect(component.filterCustomersData).toHaveBeenCalledWith(
        'custom',
        newStart,
        component.endDateKendo,
      );
    });

    it('should update for endDate', () => {
      const newEnd = new Date('2023-03-15');
      component.onDateChange(newEnd, 'endDate');
      expect(component.dateRangeSelected).toBe('custom');
      expect(component.filterCustomersData).toHaveBeenCalledWith(
        'custom',
        component.startDateKendo,
        newEnd,
      );
    });

    it('should not call filter for unknown type', () => {
      component.onDateChange(new Date(), 'invalid');
      expect(component.filterCustomersData).not.toHaveBeenCalled();
    });
  });

  describe('initFormListeners()', () => {
    it('should log error if formInstance is not set', () => {
      component.formInstance = null;
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.initFormListeners();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Form instance not initialized yet.',
      );
      consoleSpy.mockRestore();
    });

    it('should attach change and submit listeners', () => {
      const changeSpy = jest.fn();
      const submitSpy = jest.fn();
      component.formInstance = {
        on: jest.fn((event, cb) => {
          if (event === 'change') changeSpy.mockImplementation(cb);
          if (event === 'submit') submitSpy.mockImplementation(cb);
        }),
      };

      component.initFormListeners();
      changeSpy({ changed: true });
      expect(component.isDownloadEnabled).toBe(true);

      component.isDownloadEnabled = false;
      submitSpy({});
      expect(component.isDownloadEnabled).toBe(true);
    });
  });

  describe('sliceCanvasToMultiplePages', () => {
    let mockPdf: any;
    let mockCanvas: HTMLCanvasElement;
    const mockDataUrl = 'data:image/jpeg;base64,mockImageData';

    const setupCanvasProperties = (width: number, height: number) => {
      mockCanvas.width = width;
      mockCanvas.height = height;
      mockCanvas.toDataURL = jest.fn().mockReturnValue(mockDataUrl);
      mockPdf.getImageProperties.mockReturnValue({ width, height });
    };

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

    beforeEach(() => {
      jest.restoreAllMocks();
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
      setupCanvasProperties(800, 600);
    });

    describe('when isFirstPage is true', () => {
      it('should slice canvas and add image without adding new page', async () => {
        const result = await component.sliceCanvasToMultiplePages(
          mockPdf,
          mockCanvas,
          true,
        );
        expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
        expect(mockPdf.getImageProperties).toHaveBeenCalledWith(mockDataUrl);
        expect(mockPdf.addPage).not.toHaveBeenCalled();
        expectAddImageCalledWith(572, 429);
        expect(result).toBe(false);
      });

      it('should handle tall canvas (aspect ratio)', async () => {
        setupCanvasProperties(400, 1200);
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
        expectAddImageCalledWith(572, 752);
      });

      it('should handle wide canvas', async () => {
        setupCanvasProperties(2000, 400);
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
        expectAddImageCalledWith(572, 114.4);
      });

      it('should handle image height equal to content height', async () => {
        mockPdf.getImageProperties.mockReturnValue({ width: 572, height: 752 });
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
        expectAddImageCalledWith(572, 752);
      });

      it('should handle different PDF page sizes', async () => {
        mockPdf.internal.pageSize.getWidth.mockReturnValue(800);
        mockPdf.internal.pageSize.getHeight.mockReturnValue(1000);
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
        expectAddImageCalledWith(760, 570);
      });

      it('should call toDataURL with correct format and quality', async () => {
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
        expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
      });

      it('should call getImageProperties with data URL', async () => {
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
        expect(mockPdf.getImageProperties).toHaveBeenCalledWith(mockDataUrl);
      });

      it('should use correct content dimensions', async () => {
        await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true);
        const [, , x, y, width] = mockPdf.addImage.mock.calls[0];
        expect(x).toBe(20);
        expect(y).toBe(20);
        expect(width).toBe(572);
      });
    });

    describe('when isFirstPage is false', () => {
      it('should add new page and image', async () => {
        const result = await component.sliceCanvasToMultiplePages(
          mockPdf,
          mockCanvas,
          false,
        );
        expect(mockPdf.addPage).toHaveBeenCalledTimes(1);
        expect(mockPdf.addImage).toHaveBeenCalled();
        expect(result).toBe(false);
      });
    });

    describe('return value', () => {
      it('should always return false regardless of isFirstPage', async () => {
        expect(
          await component.sliceCanvasToMultiplePages(mockPdf, mockCanvas, true),
        ).toBe(false);
        expect(
          await component.sliceCanvasToMultiplePages(
            mockPdf,
            mockCanvas,
            false,
          ),
        ).toBe(false);
      });
    });

    describe('ngAfterViewInit', () => {
      it('should initialize form listeners when formio is ready in ngAfterViewInit', () => {
        const mockInitFormListeners = jest.spyOn(
          component,
          'initFormListeners',
        );

        const mockOn = jest.fn(simulateFormioOn);

        component.formioComponent = {
          formio: {
            on: mockOn,
          },
        } as any;

        component.ngAfterViewInit();
        jest.runOnlyPendingTimers();

        expect(mockOn).toHaveBeenCalledWith('ready', expect.any(Function));
        expect(mockInitFormListeners).toHaveBeenCalled();
      });
    });
  });

  describe('downloadPDF()', () => {
    it('should call saveAs for non-iOS devices when downloading PDF', async () => {
      // Arrange
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Chrome',
        writable: true,
      });

      // Mock the asynchronous dependencies to return immediately
      jest
        .spyOn(component.httpClient, 'get')
        .mockReturnValue(of(mockFormResponse));
      jest
        .spyOn(component as any, 'waitForFormInstanceReady')
        .mockResolvedValue(undefined);
      jest.spyOn(component as any, 'delay').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'captureFormTabs').mockResolvedValue(true);
      const resetFormSpy = jest.spyOn(component as any, 'resetFormState');

      jest.useFakeTimers();

      await component.downloadPDF('Test Form', 1);
      jest.runAllTimers();

      expect(saveAs).toHaveBeenCalled();
      expect(component.isPdfDownloading).toBe(false);
      expect(resetFormSpy).toHaveBeenCalled();

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
      });
      jest.useRealTimers();
    });
  });
});
