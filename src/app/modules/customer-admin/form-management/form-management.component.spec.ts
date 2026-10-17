import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormManagementComponent } from './form-management.component';
import { ApiService } from 'src/app/auth/api.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import type { DataStateChangeEvent } from '@progress/kendo-angular-grid';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import { AuthService } from '@auth0/auth0-angular';
import { InjectionToken } from '@angular/core';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { T_RailYard } from 'src/app/common/types';
import { process } from '@progress/kendo-data-query';
import { provideMockStore } from '@ngrx/store/testing';
import { selectAllCustomers, selectSelectedCustomer } from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

const AUTH0_CLIENT = new InjectionToken<any>('auth0.client');

jest.mock('src/app/lib/exportAs', () => ({
  exportAsCSV: jest.fn(),
  exportAsExcel: jest.fn(),
  exportAsPDF: jest.fn(),
}));

const mockAuthService = {
  user$: of({ email: 'test@example.com' }),
  isAuthenticated$: of(true),
  loginWithRedirect: jest.fn(),
  logout: jest.fn(),
};

const mockApiService = {
  CustomerAssigned: jest.fn().mockReturnValue(
    of({
      Listofforms: [
        { FormName: 'Form 1', customerIds: [1, 2] },
        { FormName: 'Form 2', customerIds: [3] },
      ],
    }),
  ),
  _sgetRailYardsByCustomer: jest.fn(),
};

const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
};

const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
};

const mockCommonApiService = {
  _sGetInspectionFormList: jest.fn().mockReturnValue(of({ Result: [] })), 
  _sGetRailYardsByCustomer: jest.fn(),
  _sCustomerListing: jest.fn(),
}


describe('FormManagementComponent (Standalone)', () => {
  let fixture: ComponentFixture<FormManagementComponent>;
  let component: FormManagementComponent;
 
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormManagementComponent, HttpClientTestingModule],
      providers: [
        provideAnimations(),
        { provide: ApiService, useValue: mockApiService },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: ActivatedRoute, useValue: {} },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AUTH0_CLIENT, useValue: {} },
        { provide: CommonApiService, useValue: mockCommonApiService },
         provideMockStore({
        selectors: [
          { selector: selectAllCustomers, value: [] },
          { selector: selectSelectedCustomer, value: null },
        ],
      }),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormManagementComponent);
    component = fixture.componentInstance;
    component.gridState = { skip: 10, take: 10 };
    component.inspectionCustomersList = [
      { id: 1, name: 'Customer 1' },
      { id: 2, name: 'Customer 2' },
    ];
    jest.useFakeTimers();
    component.selectYard = jest.fn();
    (component as any).loadGridData = jest.fn();
    jest.spyOn(component as any, 'selectCustomer').mockImplementation(() => {});
    jest.clearAllMocks();
    component.isCustomersLoading = true;
    component.isRailYardLoading = true;
    component.isLoading = true;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call syncAllOfflineFormSubmissions on window:online', () => {
    component.online();
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();
  });

  it('should show warning when exporting empty data', () => {
    component.handleExport('CSV', []);
    expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
      'No data present, unable to export.',
    );
  });

  it('should update gridState and load data on onDataStateChange', () => {
    const loadGridSpy = jest.spyOn(component as any, 'loadGridData');
    const mockState: DataStateChangeEvent = {
      skip: 0,
      take: 10,
      sort: [],
      filter: { logic: 'and', filters: [] },
    };

    component.onDataStateChange(mockState);

    expect(component.gridState).toEqual(mockState);
    expect(loadGridSpy).toHaveBeenCalled();
  });

  it('should not call selectCustomer for same value or invalid input', () => {
    const existing = { id: 123, name: 'Customer A' };
    const selectCustomerSpy = jest.spyOn(component as any, 'selectCustomer');

    component.selectedCustomerObj = existing;
    component.onComboBoxChange(existing);
    expect(selectCustomerSpy).not.toHaveBeenCalled();

    component.onComboBoxChange('invalid');
    component.onComboBoxChange(null);
    component.onComboBoxChange(undefined);
    expect(selectCustomerSpy).not.toHaveBeenCalled();
  });

  it('should filter allCustomers based on provided filter string', () => {
    component.allCustomersOriginal = [
      { id: 1, name: 'Alpha Corp' },
      { id: 2, name: 'Beta Inc' },
      { id: 3, name: 'Gamma LLC' },
    ];

    component.filterChange('beta');

    expect(component.allCustomers).toEqual([{ id: 2, name: 'Beta Inc' }]);
  });

  it('should reset allCustomers if filter is empty', () => {
    component.allCustomersOriginal = [
      { id: 1, name: 'Customer A' },
      { id: 2, name: 'Customer B' },
    ];

    component.allCustomers = [];
    component.filterChange('');
    expect(component.allCustomers).toEqual(component.allCustomersOriginal);
  });

  it('should export based on type', () => {
    const mockData = [{ FormName: 'F1', customerIds: [1, 2] }];

    component.handleExport('CSV', mockData);
    expect(exportAsCSV).toHaveBeenCalled();

    component.handleExport('EXCEL', mockData);
    expect(exportAsExcel).toHaveBeenCalled();

    component.handleExport('PDF', mockData);
    expect(exportAsPDF).toHaveBeenCalled();
  });

  it('should process data and call handleExport on export dropdown change', () => {
    const mockValue = { text: 'PDF' };
    const expectedState = {
      ...component.gridState,
      skip: 0,
      take: undefined,
    };
    const processed = process(component.inspectionCustomersList, expectedState);

    const handleExportSpy = jest.spyOn(component, 'handleExport');
    component.onExportDropdownChange(mockValue);

    jest.advanceTimersByTime(50);

    expect(handleExportSpy).toHaveBeenCalledWith(
      mockValue.text,
      processed.data,
    );
  });

  it('should call ngOnInit() directly when userRole is "Trinity Staff"', () => {
    component.userRole = 'Trinity Staff';
    const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');
    component.online();
    expect(ngOnInitSpy).toHaveBeenCalled();
  });

  it('should call ngOnInit and update isSyncInProgress after sync for non-Trinity Staff', () => {
    component.userRole = 'Some Other Role';
    const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');

    const mockSyncFn = jest.fn(
      (cb: () => void, setFlag: (val: boolean) => void) => {
        setFlag(true);
        cb();
      },
    );
    // Replace method on the fly
    component['submitDraftHelperService'].syncAllOfflineFormSubmissions =
      mockSyncFn;

    component.online();

    expect(mockSyncFn).toHaveBeenCalled();
    expect(ngOnInitSpy).toHaveBeenCalled();
    expect(component.isSyncInProgress).toBe(true);
  });

  it('should reset gridState skip and call selectYard with the given yard', () => {
    component.gridState = { skip: 5, take: 10 };
    const yard: T_RailYard = {
      Id: 123,
      Name: 'Test Yard',
      // add other required properties with dummy values if needed
    };
    const selectYardSpy = jest
      .spyOn(component, 'selectYard')
      .mockImplementation(() => {});

    component.onDropdownChange(yard);

    expect(component.gridState.skip).toBe(0);
    expect(selectYardSpy).toHaveBeenCalledWith(yard);
  });

  it('should call selectCustomer when value is an object and selectedCustomerObj id differs', () => {
    const value = { id: 123, name: 'Customer A' };

    component.selectedCustomerObj = { id: 456, name: 'Customer B' };
    const selectCustomerSpy = jest
      .spyOn(component, 'selectCustomer')
      .mockImplementation(() => {});

    component.onComboBoxChange(value);

    expect(selectCustomerSpy).toHaveBeenCalledWith(value);
  });

  it('should NOT call selectCustomer when value is null or not object', () => {
    const selectCustomerSpy = jest
      .spyOn(component, 'selectCustomer')
      .mockImplementation(() => {});

    component.onComboBoxChange(null);
    component.onComboBoxChange('stringValue');

    expect(selectCustomerSpy).not.toHaveBeenCalled();
  });

  it('should NOT call selectCustomer when selectedCustomerObj has same id as value', () => {
    const value = { id: 123, name: 'Customer A' };
    component.selectedCustomerObj = { id: 123, name: 'Customer A' };

    const selectCustomerSpy = jest
      .spyOn(component, 'selectCustomer')
      .mockImplementation(() => {});

    component.onComboBoxChange(value);

    expect(selectCustomerSpy).not.toHaveBeenCalled();
  });
  it('should set inspectionCustomersList and call loadGridData on success', () => {
    const mockResponse = { Result: [{ id: 1, name: 'Inspection 1' }] };
    jest
      .spyOn(component['commonApiService'], '_sGetInspectionFormList')
      .mockReturnValue(of(mockResponse));
    jest.spyOn(component as any, 'loadGridData');

    component.getFormMgmtListing(123, [456]);

    expect(component.isLoading).toBe(false);
    expect(component.inspectionCustomersList).toEqual(mockResponse.Result);
    expect(component['loadGridData']).toHaveBeenCalled();
  });

  it('should call kendoNotificationService.showError and set isLoading to false on error', () => {
    const mockError = { message: 'Test error' };
    jest
      .spyOn(component['commonApiService'], '_sGetInspectionFormList')
      .mockReturnValue({
        subscribe: ({ error }: any) => error(mockError),
      } as any);
    jest.spyOn(component['kendoNotificationService'], 'showError');

    component.getFormMgmtListing(123, [456]);

    expect(
      component['kendoNotificationService'].showError,
    ).toHaveBeenCalledWith('Test error');
    expect(component.isLoading).toBe(false);
  });

  it('should navigate to form-details-form when userRole is Customer Admin', () => {
    const navigateSpy = jest.spyOn(component['router'], 'navigate');
    component.userRole = 'Customer Admin';
    const mockInspection = { Path: 'test-path', Id: 1 };

    component.InspectionFormDetailGetById(mockInspection);

    expect(navigateSpy).toHaveBeenCalledWith([
      '/form-details-form',
      'test-path',
      1,
    ]);
  });

  it('should navigate to form-details-filled for other roles', () => {
    const navigateSpy = jest.spyOn(component['router'], 'navigate');
    component.userRole = 'Trinity Staff';
    component.selectedCustomerObj = { name: 'Test Customer' };
    const mockInspection = { Path: 'test-path', YardName: 'Test Yard' };

    component.InspectionFormDetailGetById(mockInspection);

    expect(navigateSpy).toHaveBeenCalledWith([
      '/form-details-filled',
      'test-path',
      'Test Customer',
      'Test Yard',
    ]);
  });

  it('should set exportDialogVisible to true and resolve promise when showExportDialog is called', async () => {
    const dialogPromise = component.showExportDialog();

    expect(component.exportDialogVisible).toBe(true);

    //  dialog close
    component['exportDialogPromiseResolver']!({
      confirmed: true,
      value: 'CSV',
    });

    await expect(dialogPromise).resolves.toEqual({
      confirmed: true,
      value: 'CSV',
    });
  });
  it('should call resolver and onExportDropdownChange when confirmed is true', () => {
    const mockResolver = jest.fn();
    (component as any).exportDialogPromiseResolver = mockResolver;
    jest.spyOn(component, 'onExportDropdownChange');

    const mockResult = { confirmed: true, value: 'CSV' };
    component.onExportDialogClose(mockResult);

    expect(component.exportDialogVisible).toBe(false);
    expect(mockResolver).toHaveBeenCalledWith(mockResult);
    expect(component.onExportDropdownChange).toHaveBeenCalledWith('CSV');
  });

  it('should handle error in customersList()', () => {
    jest
      .spyOn(component['commonApiService'], '_sCustomerListing')
      .mockReturnValue({
        subscribe: ({ error }: any) => error('API Error'),
      } as any);

    jest.spyOn(component['kendoNotificationService'], 'showError');

    component.customersList();

    expect(
      component['kendoNotificationService'].showError,
    ).toHaveBeenCalledWith('API Error');
    expect(component.isCustomersLoading).toBe(false);
    expect(component.isRailYardLoading).toBe(false);
    expect(component.isLoading).toBe(false);
  });

  it('should clear list and stop loading when no yards returned', () => {
    jest
      .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
      .mockReturnValue({
        subscribe: ({ next }: any) => next({ IsSuccess: true, Result: [] }),
      } as any);

    jest.spyOn(component as any, 'loadGridData');

    component.getRailYardsByCustomerId(1);

    expect(component.inspectionCustomersList).toEqual([]);
    expect((component as any).loadGridData).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
    expect(component.isRailYardLoading).toBe(false);
  });

  it('should handle error case in getRailYardsByCustomerId()', () => {
    jest
      .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
      .mockReturnValue({
        subscribe: ({ error }: any) => error('API Error'),
      } as any);

    jest.spyOn(component['kendoNotificationService'], 'showError');

    component.getRailYardsByCustomerId(1);

    expect(
      component['kendoNotificationService'].showError,
    ).toHaveBeenCalledWith('API Error');
    expect(component.isLoading).toBe(false);
    expect(component.isRailYardLoading).toBe(false);
  });

  it('should set allCustomers, allCustomersOriginal, and call selectCustomer when data is returned', () => {
    const mockData = [
      { id: 1, name: 'Customer A' },
      { id: 2, name: 'Customer B' },
    ];

    jest
      .spyOn(component['commonApiService'], '_sCustomerListing')
      .mockReturnValue(of(mockData));
    const selectCustomerSpy = jest
      .spyOn(component as any, 'selectCustomer')
      .mockImplementation(() => {});

    component.customersList();

    expect(component.allCustomers).toEqual(mockData);
    expect(component.allCustomersOriginal).toEqual(mockData);
    expect(selectCustomerSpy).toHaveBeenCalledWith(mockData[0]);
  });

 
});
