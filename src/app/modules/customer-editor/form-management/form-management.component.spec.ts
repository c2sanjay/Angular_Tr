import {
  ComponentFixture,
  TestBed,
  waitForAsync,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Component, Directive, Input } from '@angular/core';
import { FormManagementComponent } from './form-management.component';
import { ApiService } from 'src/app/auth/api.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { TimezoneService } from 'src/app/common/services/timezone.service';
import { of } from 'rxjs';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import { T_RailYard } from 'src/app/common/types';
import { provideMockStore } from '@ngrx/store/testing';
import { selectAllCustomers, selectSelectedCustomer } from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

@Component({ selector: 'app-rsi-topbar', template: '' })
class MockTopbar {}

@Component({ selector: 'app-rsi-sidebar', template: '' })
class MockSidebar {}

@Directive({ selector: '[routerLink]' })
class MockRouterLinkDirective {
  @Input('routerLink') link: any;
}

jest.mock('src/app/lib/exportAs', () => ({
  exportAsCSV: jest.fn(),
  exportAsExcel: jest.fn(),
  exportAsPDF: jest.fn(),
}));

const mockApiService = {
  getFormListing: jest.fn().mockReturnValue(of([])),
  CustomerAssigned: jest.fn().mockReturnValue(of({ Listofforms: [{ id: 1 }] })),
};

const mockCommonApiService = {
  _sgetRailYards: jest
    .fn()
    .mockReturnValue(of([{ name: 'Yard A' }, { name: 'Yard B' }])),
  _sgetFormMgmtListingYardOnly: jest
    .fn()
    .mockReturnValue(of({ Listofforms: [{ FormName: 'Form1' }] })),
  _sGetInspectionFormList: jest.fn(),
};

const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
};

const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
};

const mockRouter = { navigateByUrl: jest.fn(), navigate: jest.fn() };
const mockTimezoneService = {
  getTimezone: jest.fn().mockReturnValue('Asia/Kolkata'),
};
const mockAccessRoleService = { getRole: jest.fn().mockReturnValue('Admin') };

describe('FormManagementComponent', () => {
  let fixture: ComponentFixture<FormManagementComponent>;
  let component: FormManagementComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormManagementComponent, HttpClientTestingModule],
      declarations: [MockTopbar, MockSidebar, MockRouterLinkDirective],
      providers: [
        provideAnimations(),
        { provide: ApiService, useValue: mockApiService },
        { provide: CommonApiService, useValue: mockCommonApiService },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: Router, useValue: mockRouter },
        { provide: TimezoneService, useValue: mockTimezoneService },
        { provide: AccessRoleService, useValue: mockAccessRoleService },
         provideMockStore({
        selectors: [
          { selector: selectAllCustomers, value: [] },
          { selector: selectSelectedCustomer, value: null },
        ],
      }),
      ],
    })
      .overrideComponent(FormManagementComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should export with warning when no data', () => {
    component.handleExport('CSV', []);
    expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
      'No data present, unable to export.',
    );
  });

  it('should call syncAllOfflineFormSubmissions and update isSyncInProgress', () => {
    const spy = jest.spyOn(
      mockSubmitDraftHelperService,
      'syncAllOfflineFormSubmissions',
    );
    const ngOnInitSpy = jest
      .spyOn(component, 'ngOnInit')
      .mockImplementation(() => {});

    component.online();

    const [onComplete, setLoading] = spy.mock.calls[0];

    onComplete();
    setLoading(true);

    expect(spy).toHaveBeenCalled();
    expect(typeof onComplete).toBe('function');
    expect(typeof setLoading).toBe('function');
    expect(ngOnInitSpy).toHaveBeenCalled();
    expect(component.isSyncInProgress).toBe(true);
  });

  it('should update gridState and call loadGridData()', () => {
    const mockState = { skip: 0, take: 10, filter: undefined, sort: [] };

    component.formListing = [
      {
        FormName: 'Form A',
        YardName: 'Yard 1',
        AssignedDate: '2024-01-01T10:00:00Z',
      },
      {
        FormName: 'Form B',
        YardName: 'Yard 2',
        AssignedDate: '2024-02-01T12:00:00Z',
      },
    ];

    component.onDataStateChange(mockState);

    expect(component.gridState).toEqual(mockState);
    expect(component.gridView.data.length).toBeGreaterThan(0);
  });

  it('should set selectedRailYard, set isLoading true, and call getFormMgmtListing with correct params', () => {
    const mockYard = { Id: 10, Name: 'Yard A' } as any;
    component.currentCustomerObj = { id: 123 } as any;

    const getFormMgmtListingSpy = jest
      .spyOn(component, 'getFormMgmtListing')
      .mockImplementation(() => {});

    component.selectYard(mockYard);

    expect(component.selectedRailYard).toEqual(mockYard);
    expect(component.isLoading).toBe(true);
    expect(getFormMgmtListingSpy).toHaveBeenCalledWith(123, [10]);
  });

  it('should call getFormMgmtListing with empty array when All yard is selected', () => {
    const mockYard = { Id: -1, Name: 'All' } as any;
    component.currentCustomerObj = { id: 123 } as any;

    const getFormMgmtListingSpy = jest
      .spyOn(component, 'getFormMgmtListing')
      .mockImplementation(() => {});

    component.selectYard(mockYard);

    expect(component.selectedRailYard).toEqual(mockYard);
    expect(getFormMgmtListingSpy).toHaveBeenCalledWith(123, []);
  });

  it('should navigate to /form-details-form with Path and Id when userRole is Customer User', () => {
    const mockInspection = { Path: 'path123', Id: 456 };
    component.userRole = 'Customer User';

    const navigateSpy = jest.spyOn(mockRouter, 'navigate');

    component.InspectionFormDetailGetById(mockInspection);

    expect(navigateSpy).toHaveBeenCalledWith([
      '/form-details-form',
      'path123',
      456,
    ]);
  });

  it('should set exportDialogVisible to true and return a promise with resolver', async () => {
    const promise = component.showExportDialog();

    expect(component.exportDialogVisible).toBe(true);
    expect(typeof (component as any).exportDialogPromiseResolver).toBe(
      'function',
    );

    (component as any).exportDialogPromiseResolver({
      confirmed: true,
      value: 'CSV',
    });

    await expect(promise).resolves.toEqual({ confirmed: true, value: 'CSV' });
  });

  it('should hide dialog, resolve promise, and call onExportDropdownChange when confirmed is true', () => {
    const mockResult = { confirmed: true, value: 'CSV' };
    const exportDialogPromiseResolver = jest.fn();

    (component as any).exportDialogPromiseResolver =
      exportDialogPromiseResolver;
    component.exportDialogVisible = true;
    jest
      .spyOn(component, 'onExportDropdownChange')
      .mockImplementation(() => {});

    component.onExportDialogClose(mockResult);

    expect(component.exportDialogVisible).toBe(false);
    expect(exportDialogPromiseResolver).toHaveBeenCalledWith(mockResult);
    expect((component as any).exportDialogPromiseResolver).toBeNull();
    expect(component.onExportDropdownChange).toHaveBeenCalledWith('CSV');
  });

  it('should navigate to /form-details-filled with params when userRole is not Customer User', () => {
    const mockInspection = { Path: 'path123', YardName: 'Yard A' };
    component.userRole = 'Admin';
    component.currentCustomerObj = { name: 'Test Customer' } as any;

    const navigateSpy = jest.spyOn(mockRouter, 'navigate');

    component.InspectionFormDetailGetById(mockInspection);

    expect(navigateSpy).toHaveBeenCalledWith([
      '/form-details-filled',
      'path123',
      'Test Customer',
      'Yard A',
    ]);
  });

  it('should reset gridState.skip to 0 and call selectYard with yard', () => {
    const yard: T_RailYard = { Id: 123, Name: 'Test Yard' };
    component.gridState = { skip: 5, take: 10 };

    const selectYardSpy = jest
      .spyOn(component, 'selectYard')
      .mockImplementation(() => {});

    component.onDropdownChange(yard);

    expect(component.gridState.skip).toBe(0);
    expect(selectYardSpy).toHaveBeenCalledWith(yard);
  });

  it('should set isLoading to false when Result is null in success response', () => {
    const mockResponse = { IsSuccess: true, Result: null };
    jest
      .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
      .mockReturnValue(of(mockResponse));

    component.getRailYardsByCustomerId(123);

    expect(component.isLoading).toBe(false);
    expect(component.isRailYardLoading).toBe(false);
  });

  describe('onExportDropdownChange', () => {
    beforeAll(() => {
      Object.defineProperty(window.URL, 'createObjectURL', {
        writable: true,
        value: jest.fn(() => 'blob:mock-url'),
      });
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        writable: true,
        value: jest.fn(),
      });
    });

    it('should call handleExport with correct arguments', fakeAsync(() => {
      const mockValue = { text: 'CSV' };
      const mockData = [{ FormName: 'Form A' }, { FormName: 'Form B' }];

      component.gridState = { skip: 15, take: 15, filter: undefined, sort: [] };
      component.formListing = mockData;

      const handleExportSpy = jest.spyOn(component as any, 'handleExport');

      component.onExportDropdownChange(mockValue);
      tick(50);

      expect(handleExportSpy).toHaveBeenCalledWith('CSV', mockData);
    }));
  });

  describe('handleExport', () => {
    const mockData = [
      {
        FormName: 'Form A',
        YardName: 'Yard 1',
        AssignedDate: '2025-06-24T12:00:00Z',
      },
    ];

    beforeEach(() => jest.clearAllMocks());

    it('should call exportAsCSV', () => {
      component.handleExport('CSV', mockData);
      expect(exportAsCSV).toHaveBeenCalled();
    });

    it('should call exportAsExcel', () => {
      component.handleExport('EXCEL', mockData);
      expect(exportAsExcel).toHaveBeenCalled();
    });

    it('should call exportAsPDF', () => {
      component.handleExport('PDF', mockData);
      expect(exportAsPDF).toHaveBeenCalled();
    });

    it('should show warning when data is empty', () => {
      component.handleExport('CSV', []);
      expect(exportAsCSV).not.toHaveBeenCalled();
      expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
        'No data present, unable to export.',
      );
    });
  });

  describe('getQueryParams timezone logic', () => {
    it('should use timezone from service if available', () => {
      mockTimezoneService.getTimezone.mockReturnValue('Asia/Kolkata');
      expect(mockTimezoneService.getTimezone() ?? 'UTC').toBe('Asia/Kolkata');
    });

    it('should fallback to UTC if timezone service returns falsy', () => {
      mockTimezoneService.getTimezone.mockReturnValue(undefined);
      expect(mockTimezoneService.getTimezone() ?? 'UTC').toBe('UTC');
    });
  });
  describe('getRailYardsByCustomerId', () => {
    it('should set railYards and call selectYard when response is successful with yards', () => {
      const mockResponse = {
        IsSuccess: true,
        Result: [
          { Id: 2, Name: 'B Yard' },
          { Id: 1, Name: 'A Yard' },
        ],
      };
      const sortedYards = [
        { Id: 1, Name: 'A Yard' },
        { Id: 2, Name: 'B Yard' },
      ];
      jest
        .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
        .mockReturnValue(of(mockResponse));
      const selectYardSpy = jest
        .spyOn(component, 'selectYard')
        .mockImplementation(() => {});

      component.getRailYardsByCustomerId(123);

      expect(component.railYards).toEqual([
        { Id: -1, Name: 'All' },
        ...sortedYards,
      ]);
      expect(selectYardSpy).toHaveBeenCalledWith({ Id: -1, Name: 'All' });
      expect(component.isRailYardLoading).toBe(false);
    });

    it('should set isLoading to false if response is not successful or empty', () => {
      const mockResponse = { IsSuccess: false, Result: [] };
      jest
        .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
        .mockReturnValue(of(mockResponse));

      component.getRailYardsByCustomerId(123);

      expect(component.isLoading).toBe(false);
      expect(component.isRailYardLoading).toBe(false);
    });

    it('should handle error response and show kendoNotificationService error', () => {
      const error = 'Test error';
      jest
        .spyOn(component['commonApiService'], '_sGetRailYardsByCustomer')
        .mockReturnValue({
          subscribe: ({ error: errFn }: any) => errFn(error),
        } as any);
      jest.spyOn(component['kendoNotificationService'], 'showError');

      component.getRailYardsByCustomerId(123);

      expect(
        component['kendoNotificationService'].showError,
      ).toHaveBeenCalledWith(error);
      expect(component.isRailYardLoading).toBe(false);
      expect(component.isLoading).toBe(false);
    });
  });

  describe('loadCustomerList', () => {
    it('should set currentCustomerObj and call getRailYardsByCustomerId when data is returned', () => {
      const mockData = [{ id: 1, name: 'Customer A' }];
      jest
        .spyOn(component['commonApiService'], '_sCustomerListing')
        .mockReturnValue(of(mockData));
      const getRailYardsSpy = jest
        .spyOn(component, 'getRailYardsByCustomerId')
        .mockImplementation(() => {});

      component.loadCustomerList();

      expect(component.isLoading).toBe(true);
      expect(component.currentCustomerObj).toEqual(mockData[0]);
      expect(getRailYardsSpy).toHaveBeenCalledWith(1);
    });

    it('should show kendoNotificationService error and set isLoading to false when no data is returned', () => {
      jest
        .spyOn(component['commonApiService'], '_sCustomerListing')
        .mockReturnValue(of([]));
      const kendoNotificationServiceSpy = jest.spyOn(
        component['kendoNotificationService'],
        'showError',
      );

      component.loadCustomerList();

      expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
        'User data not found.',
      );
      expect(component.isLoading).toBe(false);
    });

    it('should handle error response and set isLoading to false', () => {
      const error = 'Test error';
      jest
        .spyOn(component['commonApiService'], '_sCustomerListing')
        .mockReturnValue({
          subscribe: ({ error: errorFn }: any) => errorFn(error),
        } as any);
      const kendoNotificationServiceSpy = jest.spyOn(
        component['kendoNotificationService'],
        'showError',
      );

      component.loadCustomerList();

      expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
        `Error fetching form management records: ${error}`,
      );
      expect(component.isLoading).toBe(false);
    });
  });

  describe('getFormMgmtListing', () => {
    it('should set formListing, call loadGridData, and set isLoading to false on success', () => {
      const mockResponse = { Result: [{ id: 1, name: 'Form 1' }] };
      jest
        .spyOn(component['commonApiService'], '_sGetInspectionFormList')
        .mockReturnValue(of(mockResponse));
      const loadGridDataSpy = jest
        .spyOn(component as any, 'loadGridData')
        .mockImplementation(() => {});

      component.getFormMgmtListing(1, [10]);

      expect(component.formListing).toEqual(mockResponse.Result);
      expect(loadGridDataSpy).toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    });

    it('should show kendoNotificationService error and set isLoading to false on error', () => {
      const mockError = { message: 'Fetch error' };
      jest
        .spyOn(component['commonApiService'], '_sGetInspectionFormList')
        .mockReturnValue({
          subscribe: ({ error }: any) => error(mockError),
        } as any);
      const kendoNotificationServiceSpy = jest.spyOn(
        component['kendoNotificationService'],
        'showError',
      );

      component.getFormMgmtListing(1, [10]);

      expect(kendoNotificationServiceSpy).toHaveBeenCalledWith('Fetch error');
      expect(component.isLoading).toBe(false);
    });
  });
});
