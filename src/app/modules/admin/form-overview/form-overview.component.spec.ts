import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { FormOverviewComponent } from './form-overview.component';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { Location } from '@angular/common';
import { exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { DataStateChangeEvent } from '@progress/kendo-angular-grid';
jest.mock('src/app/lib/exportAs', () => ({
  exportAsCSV: jest.fn(),
  exportAsExcel: jest.fn(),
  exportAsPDF: jest.fn(),
}));

const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
};
const mockActivatedRoute = {
  paramMap: of(convertToParamMap({ formPath: 'test/form/path' })),
  queryParamMap: of(convertToParamMap({ path: 'form123', Title: 'Form ABC' })),
};
const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
};
const mockIndexedDbService = { getByKey: jest.fn() };
const mockCommonApiService = {
  _sGetCustomerByFormPath: jest.fn(),
  unassignInspectionForm: jest.fn(),
};
const mockRouter = { navigate: jest.fn() };
const mockLocation = { back: jest.fn() };

describe('FormOverviewComponent (no template)', () => {
  let component: FormOverviewComponent;
  let fixture: ComponentFixture<FormOverviewComponent>;
  let syncMock: jest.Mock;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormOverviewComponent, HttpClientTestingModule],
      providers: [
        provideAnimations(),
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        { provide: '_NgxIndexedDBService', useValue: mockIndexedDbService },
        { provide: Router, useValue: mockRouter },
        { provide: Location, useValue: mockLocation },
        { provide: CommonApiService, useValue: mockCommonApiService },
      ],
    })
      .overrideComponent(FormOverviewComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormOverviewComponent);
    component = fixture.componentInstance;
    component.formPath = 'test/form/path';
    component.formName = 'Test Form';
    syncMock = jest.fn();
    component['submitDraftHelperService'].syncAllOfflineFormSubmissions =
      syncMock;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call syncAllOfflineFormSubmissions on online event', () => {
    component.online();
    expect(syncMock).toHaveBeenCalled();
  });

  it('should set sync flag and call ngOnInit after sync', () => {
    const ngOnInitSpy = jest
      .spyOn(component, 'ngOnInit')
      .mockImplementation(() => {});

    syncMock.mockImplementation(
      (onSuccess: Function, setSyncFlag: Function) => {
        setSyncFlag(true);
        onSuccess();
      },
    );

    component.online();

    expect(component.isSyncInProgress).toBe(true);
    expect(ngOnInitSpy).toHaveBeenCalled();
  });
  it('should handle export after delay', fakeAsync(() => {
    component.formsList = [{ customerName: 'Test' }];
    component.gridState = { skip: 0, take: 10, sort: [], filter: undefined };
    jest.spyOn(component, 'handleExport');
    component.onExportDropdownChange({ text: 'CSV' });
    tick(51);
    expect(component.handleExport).toHaveBeenCalledWith(
      'CSV',
      expect.any(Array),
    );
  }));

  it('should warn when export data is empty', () => {
    component.handleExport('CSV', []);
    expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
      'No data present, unable to export.',
    );
  });

  it('should export Excel with valid data', () => {
    component.handleExport('EXCEL', [
      { customerName: 'John', ContactPerson: 'Jane', PhoneNo: '1234567890' },
    ]);
    expect(exportAsExcel).toHaveBeenCalled();
  });

  it('should export PDF with fallback N/A values', () => {
    component.handleExport('PDF', [
      { customerName: 'John', ContactPerson: null, PhoneNo: undefined },
    ]);
    expect(exportAsPDF).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ ContactPerson: 'N/A', PhoneNo: 'N/A' }),
      ]),
      'Form-Overview',
      expect.any(Array),
      expect.any(Array),
    );
  });

  it('should update grid state and load data', () => {
    component.formsList = [{ customerName: 'A' }, { customerName: 'B' }];
    const state: DataStateChangeEvent = {
      skip: 0,
      take: 10,
      sort: [],
      filter: undefined,
    };
    component.onDataStateChange(state);
    expect(component.gridState).toEqual(state);
    expect(component.gridView.data.length).toBeGreaterThan(0);
  });

  it.each([
    ['confirm', true],
    ['cancel', false],
  ])('should resolve %s on confirm dialog close', async (input, expected) => {
    const promise = component.showConfirm();
    component.handleDialogClose(input);
    await expect(promise).resolves.toBe(expected);
  });

  it('should navigate to /form-management on goBack()', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/form-management']);
  });

  it('should navigate to /assign-customer on assignNewCustomer()', () => {
    component.assignNewCustomer();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/assign-customer']);
  });

  it('should resolve export dialog promise and call exportDropdown when confirmed', async () => {
    const promise = component.showExportDialog();
    const exportSpy = jest
      .spyOn(component, 'onExportDropdownChange')
      .mockImplementation(() => {});
    component['exportDialogPromiseResolver']?.({
      confirmed: true,
      value: 'CSV',
    });
    await expect(promise).resolves.toEqual({ confirmed: true, value: 'CSV' });
    component.onExportDialogClose({ confirmed: true, value: 'CSV' });
    expect(component.exportDialogVisible).toBe(false);
    expect(exportSpy).toHaveBeenCalledWith('CSV');
  });
  it('should call unassign API and update formsList on success', async () => {
    const mockInspection = { InspectionId: 123 };
    component.formPath = 'test/form/path';
    component.formsList = [{ InspectionId: 123 }, { InspectionId: 456 }];
    jest.spyOn(component, 'showConfirm').mockResolvedValue(true);
    jest.spyOn(component as any, 'loadGridData').mockImplementation(() => {});

    jest
      .spyOn(component['commonApiService'], 'unassignInspectionForm')
      .mockReturnValue(of({}));

    await component.unassignInspection(mockInspection);

    expect(component.isLoading).toBe(false);
    expect(component.formsList).toEqual([{ InspectionId: 456 }]);
    expect(kendoNotificationServiceMock.showSuccess).toHaveBeenCalledWith(
      'Form unassigned successfully.',
    );
  });

  it('should show error toast when API fails', async () => {
    const mockInspection = { InspectionId: 123 };
    component.formPath = 'test/form/path';
    component.formsList = [{ InspectionId: 123 }];
    jest.spyOn(component, 'showConfirm').mockResolvedValue(true);

    jest
      .spyOn(component['commonApiService'], 'unassignInspectionForm')
      .mockReturnValue(of({ error: true }));

    const errorResponse = new Error('API Error');
    jest
      .spyOn(component['commonApiService'], 'unassignInspectionForm')
      .mockReturnValueOnce({
        subscribe: ({ error }: any) => error(errorResponse),
      } as any);

    await component.unassignInspection(mockInspection);

    expect(component.isLoading).toBe(false);
    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      `Error unassigning form: ${errorResponse}`,
    );
  });

  it('should not call API if user cancels confirmation', async () => {
    jest.spyOn(component, 'showConfirm').mockResolvedValue(false);
    const apiSpy = jest.spyOn(
      component['commonApiService'],
      'unassignInspectionForm',
    );
    await component.unassignInspection({ InspectionId: 123 });
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it('should show warning toast and return early if offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    const kendoNotificationServiceSpy = jest.spyOn(
      component['kendoNotificationService'],
      'showWarning',
    );
    await component.unassignInspection({ InspectionId: 1 });
    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      '"Unassign Form" feature is not available in offline mode. Please try again once you are back online.',
    );
  });

  it('should navigate to form details with correct parameters', () => {
    const inspection = { InspectionId: '123' };
    component.formPath = 'test-form-path';

    component.InspectionFormDetailGetById(inspection);

    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/form-details-form',
      'test-form-path',
      '123',
    ]);
  });

  it('should load customer data and call loadGridData on success', () => {
    const mockData = { Result: [{ id: 1, name: 'Customer A' }] };
    const loadGridDataSpy = jest.spyOn(component as any, 'loadGridData');
    jest
      .spyOn(component['commonApiService'], '_sGetCustomerByFormPath')
      .mockReturnValue(of(mockData));

    component.loadCustomerData('mockFormPath');

    expect(component.formsList).toEqual(mockData.Result);
    expect(loadGridDataSpy).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should handle error and show kendoNotificationService message on failure', () => {
    jest
      .spyOn(component['commonApiService'], '_sGetCustomerByFormPath')
      .mockReturnValue(throwError(() => new Error('API error')));

    component.loadCustomerData('mockFormPath');

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Error loading customer data',
    );
    expect(component.isLoading).toBe(false);
  });

  describe('ngOnInit', () => {
    let loadCustomerDataSpy: jest.SpyInstance;

    beforeEach(() => {
      loadCustomerDataSpy = jest.spyOn(component, 'loadCustomerData').mockImplementation(() => {});
    });

    it('should set formPath and formTitle from query params', fakeAsync(() => {
      const mockParams = { path: 'test-path', Title: 'Test Title' };
      mockActivatedRoute.queryParamMap = of(convertToParamMap(mockParams));

      component.ngOnInit();
      tick();

      expect(component.formPath).toBe('test-path');
      expect(component.formTitle).toBe('Test Title');
      expect(loadCustomerDataSpy).toHaveBeenCalledWith('test-path');
    }));

    it('should call loadCustomerData if formPath is present', fakeAsync(() => {
      const mockParams = { path: 'form-path-with-data', Title: 'Test Title' };
      mockActivatedRoute.queryParamMap = of(convertToParamMap(mockParams));

      component.ngOnInit();
      tick();

      expect(component.formPath).toBe('form-path-with-data');
      expect(loadCustomerDataSpy).toHaveBeenCalledWith('form-path-with-data');
    }));

    it('should call loadCustomerData if formTitle is present but formPath is not', fakeAsync(() => {
      const mockParams = { path: null, Title: 'Test Title Only' };
      mockActivatedRoute.queryParamMap = of(convertToParamMap(mockParams as any));

      component.ngOnInit();
      tick();

      expect(component.formPath).toBe(null);
      expect(component.formTitle).toBe('Test Title Only');
      expect(loadCustomerDataSpy).toHaveBeenCalledWith(null);
    }));

    it('should not call loadCustomerData if both formPath and formTitle are null', fakeAsync(() => {
      const mockParams = { path: null, Title: null };
      mockActivatedRoute.queryParamMap = of(convertToParamMap(mockParams as any));

      component.ngOnInit();
      tick();

      expect(component.formPath).toBe(null);
      expect(component.formTitle).toBe(null);
      expect(loadCustomerDataSpy).not.toHaveBeenCalled();
    }));
  });
  
});
