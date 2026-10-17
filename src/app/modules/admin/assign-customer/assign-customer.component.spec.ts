import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Component, Directive, Input } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AssignCustomerComponent } from './assign-customer.component';
import { AdminService } from '../services/admin.service';
import { ApiService } from 'src/app/auth/api.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DataStateChangeEvent } from '@progress/kendo-angular-grid';
import { provideMockStore } from '@ngrx/store/testing';
import { selectAllCustomers, selectSelectedCustomer } from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

@Component({ selector: 'formio', template: '' })
class MockFormioComponent {
  @Input() form: any;
  @Input() submission: any;
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
@Directive({ selector: '[routerLink]' })
class MockRouterLinkDirective {
  @Input('routerLink') link: any;
}

const mockAdminService = {
  assignedCustomer: jest.fn().mockReturnValue(of({ Status: 200 })),
};
const mockApiService = { getFormListing: jest.fn().mockReturnValue(of([])) };
const mockCommonApiService = {
  _sCustomerListing: jest.fn().mockReturnValue(of([])),
  _sGetRailYardsByCustomer: jest.fn().mockReturnValue(of([])),
  _sAssignInspectionFormToCustomer: jest.fn().mockReturnValue(of([])),
};
const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
};
const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
};
const mockRouter = { navigate: jest.fn() };
const mockActivatedRoute = {
  snapshot: {
    queryParams: {},
    paramMap: { get: jest.fn() },
  },
};
const mockLocation = { back: jest.fn() };

describe('AssignCustomerComponent', () => {
  let fixture: ComponentFixture<AssignCustomerComponent>;
  let component: AssignCustomerComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AssignCustomerComponent, HttpClientTestingModule],
      declarations: [
        MockFormioComponent,
        MockTabsComponent,
        MockTopbar,
        MockSidebar,
        MockKendoGrid,
        MockKendoColumn,
        MockKendoGridDirective,
        MockRouterLinkDirective,
      ],
      providers: [
        provideAnimations(),
        { provide: AdminService, useValue: mockAdminService },
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
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Location, useValue: mockLocation },
         provideMockStore({
        selectors: [
          { selector: selectAllCustomers, value: [] },
          { selector: selectSelectedCustomer, value: null },
        ],
      }),
      ],
    })
      .overrideComponent(AssignCustomerComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignCustomerComponent);
    component = fixture.componentInstance;
    jest.spyOn(component, 'ngOnInit').mockImplementation(() => {});
    jest.spyOn(component as any, 'loadGridData').mockImplementation(() => {});
    component.selectedFormDetails = { form1: {} };
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call syncAllOfflineFormSubmissions and ngOnInit on online()', () => {
    mockSubmitDraftHelperService.syncAllOfflineFormSubmissions.mockImplementation(
      (cb, setFlag) => {
        setFlag(true);
        cb();
        setFlag(false);
      },
    );

    component.online();

    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();
    expect(component.ngOnInit).toHaveBeenCalled();
    expect(component.isSyncInProgress).toBe(false);
  });

  it('should update gridState and call loadGridData on onDataStateChange()', () => {
    const newState: DataStateChangeEvent = { skip: 0, take: 10 };
    component.onDataStateChange(newState);
    expect(component.gridState).toEqual(newState);
    expect((component as any).loadGridData).toHaveBeenCalled();
  });

  describe('getFormList()', () => {
    beforeEach(() => {
      component.savedFormPath = 'form-a';
    });

    it('should populate form details on valid response', () => {
      const mockForms = [
        { title: 'Form B', name: 'formB', path: 'form-b' },
        { title: 'Form A', name: 'formA', path: 'form-a' },
      ];
      mockApiService.getFormListing.mockReturnValueOnce(of(mockForms));

      component.getFormList();

      expect(component.forms.length).toBe(2);
      expect(component.formTitle).toBe('Form A');
      expect(component.selectedFormDetails).toEqual(mockForms[1]);
      expect(component.isFormsLoading).toBe(false);
    });

    it('should show kendoNotificationService error if no forms found', () => {
      mockApiService.getFormListing.mockReturnValueOnce(of([]));
      component.getFormList();
      expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
        'No forms found.',
      );
      expect(component.isFormsLoading).toBe(false);
    });

    it('should handle API error', () => {
      const error = new Error('API crashed');
      mockApiService.getFormListing.mockReturnValueOnce(
        throwError(() => error),
      );
      component.getFormList();
      expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
        `Error fetching forms: ${error}`,
      );
      expect(component.isFormsLoading).toBe(false);
    });
  });

  it('should update form details on dropdown change', () => {
    const value = { title: 'Test Title', name: 'test-form', path: 'form-path' };
    component.onDropdownChange(value);
    expect(component.formTitle).toBe(value.title);
    expect(component.formName).toBe(value.name);
    expect(component.formPath).toBe(value.path);
  });

  it('should assign customer details, reset yards, and open assign dialog when form is selected', () => {
    component.selectedFormDetails = { form1: {} }; // Ensure form selected

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showWarning',
    );
    const getYardsSpy = jest
      .spyOn(component, 'getRailYardsByCustomer')
      .mockImplementation(() => {});

    component.formAssign(
      2,
      'Customer B',
      'Contact B',
      9876543210,
      'contact@example.com',
    );

    expect(getYardsSpy).toHaveBeenCalledWith(2);
    expect(kendoNotificationServiceSpy).not.toHaveBeenCalled();
    expect(component.assignDialogVisible).toBe(true);
  });

  it('should assign customer details, reset yards, and open assign dialog when form is selected', () => {
    component.selectedFormDetails = { form1: {} }; // At least one form selected
    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showWarning',
    );
    const getYardsSpy = jest
      .spyOn(component, 'getRailYardsByCustomer')
      .mockImplementation(() => {});

    component.formAssign(
      2,
      'Customer B',
      'Contact B',
      9876543210,
      'contact@example.com',
    );

    expect(component.customerID).toBe(2);
    expect(component.customerName).toBe('Customer B');
    expect(component.customerContactName).toBe('Contact B');
    expect(component.customerContactPhoneNumber).toBe(9876543210);
    expect(component.customerprimaryContactEmail).toBe('contact@example.com');
    expect(component.isYardLoading).toBe(true);
    expect(component.yards).toEqual([]);
    expect(component.yardsToAssign).toEqual([]);
    expect(getYardsSpy).toHaveBeenCalledWith(2);
    expect(kendoNotificationServiceSpy).not.toHaveBeenCalled();
    expect(component.assignDialogVisible).toBe(true);
  });

  it('should show warning and return if no form is selected', () => {
    component.selectedFormDetails = {}; // No forms selected

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showWarning',
    );
    const getYardsSpy = jest.spyOn(component, 'getRailYardsByCustomer');

    component.formAssign(
      1,
      'Customer A',
      'Contact A',
      1234567890,
      'contact@a.com',
    );

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Please select at least one form to assign.',
    );
    expect(getYardsSpy).toHaveBeenCalled(); // still called before the check
    expect(component.assignDialogVisible).toBe(false); // Dialog should not open
  });

  it('should call location.back when goBack is invoked', () => {
    const locationSpy = jest.spyOn(component['location'], 'back');
    component.goBack();
    expect(locationSpy).toHaveBeenCalled();
  });

  it('should set assignDialogVisible to false on cancel', () => {
    component.assignDialogVisible = true;
    component.onCancel();
    expect(component.assignDialogVisible).toBe(false);
  });

  it('should call showInfo if IsSuccess is false', () => {
  const response = { IsSuccess: false, Message: 'This form already exists.' };

  // Ensure a valid yard match
  component.yards = [{ Id: 1, Name: 'Yard 1' }];
  component.yardsToAssign = [1];

  component.customerID = 123;
  component.customerName = 'ABC Corp';
  component.createdBy = 'test-user';
  component.formPath = 'some/path';
  component.savedFormId = 456;
  component.formTitle = 'Test Form';
  component.formName = 'test-form';

  jest.spyOn(component.kendoNotificationService, 'showInfo');
  jest.spyOn(component.kendoNotificationService, 'showError');
  jest.spyOn(component, 'onCancel');

  jest
    .spyOn(component.commonApiService, '_sAssignInspectionFormToCustomer')
    .mockReturnValue(of(response));

  component.onConfirm();

  expect(component.kendoNotificationService.showInfo).toHaveBeenCalledWith(
    'This form already exists.'
  );

  expect(component.kendoNotificationService.showError).not.toHaveBeenCalledWith(
    'Something went wrong while assigning form.'
  );

  expect(component.onCancel).toHaveBeenCalled();
  });

  it('should handle error response and show error message', () => {
  const mockError = {
    error: 'Something went wrong from server.',
  };

  // Setup component state required for `onConfirm()` to proceed
  component.yards = [{ Id: 1, Name: 'Test Yard' }];
  component.yardsToAssign = [1];
  component.customerID = 101;
  component.customerName = 'Test Customer';
  component.createdBy = 'tester';
  component.formPath = 'path/to/form';
  component.savedFormId = 999;
  component.formTitle = 'Test Form';
  component.formName = 'test-form';
  component.forms = [
    {
      FormPath: 'path/to/form',
      FormId: 999,
      FormTitle: 'Test Form',
    },
  ];
 const showErrorSpy = jest.spyOn(component.kendoNotificationService, 'showError');
  const onCancelSpy = jest.spyOn(component, 'onCancel');
  jest.spyOn(component.commonApiService, '_sAssignInspectionFormToCustomer')
    .mockReturnValue(throwError(() => mockError));

  component.onConfirm();
 expect(component.isLoading).toBe(false);
  expect(showErrorSpy).toHaveBeenCalledWith('Something went wrong from server.');
  expect(onCancelSpy).toHaveBeenCalled();
  });

  describe('onConfirm', () => {
    beforeEach(() => {
      component.yards = [];
      component.yardsToAssign = [];
      (component as any).kendoNotificationService =
        kendoNotificationServiceMock;
      (component as any).router = mockRouter;
      (component as any).commonApiService = mockCommonApiService;
      jest.spyOn(component, 'onCancel').mockImplementation(() => {});
      jest
        .spyOn(component['router'], 'navigate')
        .mockImplementation(() => Promise.resolve(true));
      jest
        .spyOn(
          component['commonApiService'],
          '_sAssignInspectionFormToCustomer',
        )
        .mockReturnValue(of({ IsSuccess: true }));
    });

    it('should warn if yards available but none selected', () => {
      component.yards = [{ Id: 1 }];
      component.yardsToAssign = [];

      component.onConfirm();

      expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
        'Please select at least one yard before submitting.',
      );
    });

    it('should warn if no yards available', () => {
      component.yards = [];
      component.yardsToAssign = [];

      component.onConfirm();

      expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
        'No yards are available, so the form cannot be assigned.',
      );
      expect(component.onCancel).toHaveBeenCalled();
    });

    it('should fetch customers and load grid data on success', () => {
      const mockData = [{ id: 1, name: 'Customer A' }];
      const loadGridDataSpy = jest.spyOn<any, any>(
        component as any,
        'loadGridData',
      );

      mockCommonApiService._sCustomerListing = jest
        .fn()
        .mockReturnValue(of(mockData));

      component.customersList();

      expect(component.isLoading).toBe(false);
      expect(component.customers).toEqual(mockData);
      expect(loadGridDataSpy).toHaveBeenCalled();
      expect(mockCommonApiService._sCustomerListing).toHaveBeenCalled();
    });

    it('should show warning toast and return if offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      const kendoNotificationServiceSpy = jest.spyOn(
        component['kendoNotificationService'],
        'showWarning',
      );

      component.formAssign(
        1,
        'Customer A',
        'John Doe',
        1234567890,
        'john@example.com',
      );

      expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
        '"Assign Form" feature is not available in offline mode. Please try again once you are back online.',
      );
      expect(component.assignDialogVisible).toBeFalsy();
    });

    it('should handle invalid yard data from _sGetRailYardsByCustomer', () => {
      const mockInvalidYards = {
        IsSuccess: false,
        Result: [],
      };
      mockCommonApiService._sGetRailYardsByCustomer.mockReturnValue(
        of(mockInvalidYards),
      );
      component.getRailYardsByCustomer(1);
      expect(
        mockCommonApiService._sGetRailYardsByCustomer,
      ).toHaveBeenCalledWith(1);
      expect(component.yards).toEqual([]);
      expect(component.isYardLoading).toBe(false);
    });

    it('should set yards on valid response from _sGetRailYardsByCustomer', () => {
      const mockValidYards = {
        IsSuccess: true,
        Result: [
          { id: 1, name: 'Yard A' },
          { id: 2, name: 'Yard B' },
        ],
      };

      mockCommonApiService._sGetRailYardsByCustomer.mockReturnValue(
        of(mockValidYards),
      );
      component.getRailYardsByCustomer(2);

      expect(
        mockCommonApiService._sGetRailYardsByCustomer,
      ).toHaveBeenCalledWith(2);
      expect(component.yards).toEqual(mockValidYards.Result);
      expect(component.isYardLoading).toBe(false);
    });

    it('should handle error when fetching rail yards', () => {
      const mockError = new Error('API failed');
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockCommonApiService._sGetRailYardsByCustomer.mockReturnValue(
        throwError(() => mockError),
      );
      (component as any).getRailYardsByCustomer(123);

      expect(component.isYardLoading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch rail yards:',
        mockError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return true when all yards are selected', () => {
      component.yards = [{ Id: 1 }, { Id: 2 }];
      component.yardsToAssign = [1, 2];

      const result = component.areAllYardsSelected();

      expect(result).toBe(true);
    });

    it('should return false when not all yards are selected', () => {
      component.yards = [{ Id: 1 }, { Id: 2 }];
      component.yardsToAssign = [1];

      const result = component.areAllYardsSelected();

      expect(result).toBe(false);
    });

    it('should return false when yards array is empty', () => {
      component.yards = [];
      component.yardsToAssign = [];

      const result = component.areAllYardsSelected();

      expect(result).toBe(false);
    });

    it('should update isSyncInProgress when sync callback is called', () => {
      const submitDraftHelperService = TestBed.inject(SubmitDraftHelperService);
      const syncSpy = jest.fn((onSuccess, onSyncStateChange) => {
        onSyncStateChange(true);
        onSyncStateChange(false);
      });

      // Replace the real method with our spy
      jest
        .spyOn(submitDraftHelperService, 'syncAllOfflineFormSubmissions')
        .mockImplementation(syncSpy);

      component.online();

      expect(component.isSyncInProgress).toBe(false);
      expect(syncSpy).toHaveBeenCalled();
    });

    it('should deselect all yards if all are selected', () => {
      component.yards = [{ Id: 1 }, { Id: 2 }];
      component.yardsToAssign = [1, 2];
      jest.spyOn(component, 'areAllYardsSelected').mockReturnValue(true);

      component.toggleSelectAll();

      expect(component.yardsToAssign).toEqual([]);
    });

    it('should select all yards if not all are selected', () => {
      component.yards = [{ Id: 1 }, { Id: 2 }];
      component.yardsToAssign = [];
      jest.spyOn(component, 'areAllYardsSelected').mockReturnValue(false);

      component.toggleSelectAll();

      expect(component.yardsToAssign).toEqual([1, 2]);
    });

    it('should construct FormData correctly and call API with success', () => {
      jest.useFakeTimers();

      component.customerID = 123;
      component.customerName = 'Test Customer';
      component.createdBy = 'Admin';
      component.formPath = 'forms/test';
      component.savedFormId = 456;
      component.formTitle = 'Inspection Form';
      component.formName = 'inspection-form';
      component.yards = [
        { Id: 1, Name: 'Yard A' },
        { Id: 2, Name: 'Yard B' },
      ];
      component.yardsToAssign = [2];

      const expectedFormData = {
        CustomerId: 123,
        CustomerName: 'Test Customer',
        CreatedBy: 'Admin',
        Yards: [
          {
            YardId: 2,
            YardName: 'Yard B',
          },
        ],
        forms: [
          {
            FormPath: 'forms/test',
            FormId: 456,
            FormTitle: 'Inspection Form',
          },
        ],
      };

      const mockResponse = { IsSuccess: true };
      mockCommonApiService._sAssignInspectionFormToCustomer.mockReturnValue(
        of(mockResponse),
      );

      component.onConfirm();

      expect(
        mockCommonApiService._sAssignInspectionFormToCustomer,
      ).toHaveBeenCalledWith(expectedFormData);
      expect(kendoNotificationServiceMock.showSuccess).toHaveBeenCalledWith(
        'Form assigned successfully!',
      );
      jest.advanceTimersByTime(1500);

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [`/form-overview/inspection-form`],
        {
          queryParams: {
            ID: 456,
            path: 'forms/test',
            Title: 'Inspection Form',
          },
        },
      );
    });
  });
});
