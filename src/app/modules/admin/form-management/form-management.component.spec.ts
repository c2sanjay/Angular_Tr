import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormManagementComponent } from './form-management.component';
import { ApiService } from 'src/app/auth/api.service';
import { AdminService } from '../services/admin.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { InjectionToken } from '@angular/core';
import { DataStateChangeEvent } from '@progress/kendo-angular-grid';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';

const AUTH0_CLIENT = new InjectionToken<any>('auth0.client');

jest.mock('src/app/lib/exportAs', () => ({
  exportAsCSV: jest.fn(),
  exportAsExcel: jest.fn(),
  exportAsPDF: jest.fn(),
}));

const mockAuthService = {
  user$: of({ email: 'test@example.com' }),
  isAuthenticated$: of(true),
};

const mockApiService = {
  _sInspectionFormCustomerCountList: jest.fn(),
  CustomerAssigned: jest.fn().mockReturnValue(
    of({
      Listofforms: [
        { FormName: 'Form 1', customerIds: [1, 2] },
        { FormName: 'Form 2', customerIds: [3] },
      ],
    }),
  ),
};

const mockAdminService = {
  getProjectList: jest.fn().mockReturnValue(of([])),
};

const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
};

const kendoNotificationServiceMock = { showWarning: jest.fn() };

describe('FormManagementComponent (Standalone)', () => {
  let fixture: ComponentFixture<FormManagementComponent>;
  let component: FormManagementComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormManagementComponent, HttpClientTestingModule],
      providers: [
        provideAnimations(),
        { provide: ApiService, useValue: mockApiService },
        { provide: AdminService, useValue: mockAdminService },
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
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormManagementComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should sync on online', () => {
    component.online();
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();
  });

  it('should sync and call ngOnInit', () => {
    const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');
    const mockSyncFn = jest.fn(
      (cb: () => void, setSyncFlag: (val: boolean) => void) => {
        setSyncFlag(true);
        cb();
      },
    );

    mockSubmitDraftHelperService.syncAllOfflineFormSubmissions = mockSyncFn;
    component.online();

    expect(mockSyncFn).toHaveBeenCalled();
    expect(ngOnInitSpy).toHaveBeenCalled();
    expect(component.isSyncInProgress).toBe(true);
  });

  it('should warn when exporting empty data', () => {
    component.handleExport('CSV', []);
    expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
      'No data present, unable to export.',
    );
  });

  it('should export in CSV/EXCEL/PDF', () => {
    const data = [{ FormName: 'Test', customerIds: [1] }];
    component.handleExport('CSV', data);
    expect(exportAsCSV).toHaveBeenCalled();

    component.handleExport('EXCEL', data);
    expect(exportAsExcel).toHaveBeenCalled();

    component.handleExport('PDF', data);
    expect(exportAsPDF).toHaveBeenCalled();
  });

  it('should not export for unknown type', () => {
    component.handleExport('UNKNOWN' as any, [{ FormName: 'Test' }]);
    expect(exportAsCSV).not.toHaveBeenCalled();
    expect(exportAsExcel).not.toHaveBeenCalled();
    expect(exportAsPDF).not.toHaveBeenCalled();
  });

  it('should update gridState on data change', () => {
    const spy = jest.spyOn(component as any, 'loadGridData');
    const state: DataStateChangeEvent = {
      skip: 0,
      take: 10,
      sort: [],
      filter: { logic: 'and', filters: [] },
    };
    component.onDataStateChange(state);
    expect(component.gridState).toEqual(state);
    expect(spy).toHaveBeenCalled();
  });

  it('should call handleExport after export dropdown change', () => {
    jest.useFakeTimers();
    const spy = jest
      .spyOn(component as any, 'handleExport')
      .mockImplementation(() => {});
    component.gridState = { skip: 5, take: 10 };
    component.formsAssigned = [{ id: 1 }, { id: 2 }];
    component.onExportDropdownChange({ text: 'CSV' });

    jest.runAllTimers();
    expect(spy).toHaveBeenCalledWith('CSV', expect.any(Array));
  });

  it('should compute CustomerCount correctly', () => {
    const list = [
      { FormName: 'Form A', customerIds: [1, 2] },
      { FormName: 'Form B', customerIds: null },
    ];
    const processed = list.map((item) => ({
      ...item,
      CustomerCount: Array.isArray(item.customerIds),
    }));

    expect(processed[0].CustomerCount).toBe(true);
    expect(processed[1].CustomerCount).toBe(false);
  });

  it('should open form.io in new tab', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    component.createForm();
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://portal.form.io'),
      '_blank',
      'noopener',
    );
    openSpy.mockRestore();
  });

  it('should set formsAssigned and load grid data when API returns success with data', () => {
    const mockResponse = {
      IsSuccess: true,
      Result: [{ FormName: 'Test Form', customerIds: [1] }],
    };

    const apiSpy = jest
      .spyOn(component['commonApiService'], '_sInspectionFormCustomerCountList')
      .mockReturnValue(of(mockResponse));
    const loadGridSpy = jest.spyOn(component as any, 'loadGridData');

    component.FormManagementListing();

    expect(apiSpy).toHaveBeenCalled();
    expect(component.formsAssigned).toEqual(mockResponse.Result);
    expect(loadGridSpy).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should navigate to form overview and set session storage', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest
      .spyOn(router, 'navigate')
      .mockImplementation(() => Promise.resolve(true));

    const sessionSetItemSpy = jest.spyOn(
      Object.getPrototypeOf(sessionStorage),
      'setItem',
    );
    const mockCustomer = {
      Path: 'mock-path',
      FormId: 123,
      Title: 'Test Title',
    };

    component.GetCustomerListByFormPath(mockCustomer);

    expect(navigateSpy).toHaveBeenCalledWith(['/form-overview', 'mock-path'], {
      queryParams: {
        ID: 123,
        path: 'mock-path',
        Title: 'Test Title',
      },
    });

    expect(sessionSetItemSpy).toHaveBeenCalledWith('formPath', 'mock-path');
    expect(sessionSetItemSpy).toHaveBeenCalledWith('FormId', 123);

    sessionSetItemSpy.mockRestore();
  });

  it('should show export dialog and resolve the promise when called', async () => {
    const promise = component.showExportDialog();

    expect(component.exportDialogVisible).toBe(true);
    expect(typeof component['exportDialogPromiseResolver']).toBe('function');
    component['exportDialogPromiseResolver']?.({
      confirmed: true,
      value: 'Test',
    });

    await expect(promise).resolves.toEqual({ confirmed: true, value: 'Test' });
  });
  it('should close export dialog and resolve promise if confirmed', () => {
    const result = { confirmed: true, value: 'CSV' };
    const exportSpy = jest.spyOn(component as any, 'onExportDropdownChange');
    const resolverMock = jest.fn();
    (component as any).exportDialogPromiseResolver = resolverMock;

    component.onExportDialogClose(result);

    expect(component.exportDialogVisible).toBe(false);
    expect(resolverMock).toHaveBeenCalledWith(result);
    expect((component as any).exportDialogPromiseResolver).toBeNull();
    expect(exportSpy).toHaveBeenCalledWith('CSV');
  });

  it('should log error and set isLoading false on API failure in FormManagementListing', () => {
    const error = 'API error';
    jest
      .spyOn(component['commonApiService'], '_sInspectionFormCustomerCountList')
      .mockReturnValue(throwError(() => error));

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    component.FormManagementListing();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching list of forms:',
      error,
    );
    expect(component.isLoading).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should handle customerIds missing or not array gracefully in handleExport', () => {
    jest
      .spyOn(component['timezoneService'], 'getTimezone')
      .mockReturnValue('UTC');

    const dataWithMissingCustomerIds = [
      { Title: 'Form 1', Created: new Date().toISOString() }, // no customerIds
      { Title: 'Form 2', customerIds: null, Created: new Date().toISOString() },
      {
        Title: 'Form 3',
        customerIds: 'not-an-array',
        Created: new Date().toISOString(),
      },
    ];

    component.handleExport('CSV', dataWithMissingCustomerIds);

    expect(exportAsCSV).toHaveBeenCalled();

    const calledWith = (exportAsCSV as jest.Mock).mock.calls[0][0];
    expect(calledWith[0].CustomerCount).toBe(0);
    expect(calledWith[1].CustomerCount).toBe(0);
    expect(calledWith[2].CustomerCount).toBe(0);
  });
});
