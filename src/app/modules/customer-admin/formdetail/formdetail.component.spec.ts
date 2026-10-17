import {
  ComponentFixture,
  TestBed,
  waitForAsync,
  fakeAsync,
  tick,
  flushMicrotasks,
} from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormDetailComponent } from './formdetail.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { IndexedDBService } from 'src/app/common/services/indexed-db.service';
import { DropdownService } from 'src/app/common/services/dropdown.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { UserDetailService } from 'src/app/shared/services/user-details.service';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { AuthService } from '@auth0/auth0-angular';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { HttpClient } from '@angular/common/http';
@Component({ selector: 'formio', template: '' })
class MockFormioComponent {
  @Input() form: any;
  @Input() submission: any;
  formio = {
    on: jest.fn(),
    form: { display: 'form' },
    _form: { title: 'Title' },
    setPage: jest.fn(),
    getComponent: jest.fn().mockReturnValue({
      on: jest.fn(),
      getValue: jest.fn().mockReturnValue({}),
      setValue: jest.fn(),
    }),
    checkValidity: jest.fn().mockResolvedValue(true),
    submission: { data: {} },
    data: {},
    showErrors: jest.fn(),
    reset: jest.fn(),
  };
}

const setUpFormComponentTest = (component: any, options = {}) => {
  component.isOnline = true;
  component.formTitle = 'Test Form Title';
  component.originalFormData = {
    productName: { id: 1, name: 'Product A' },
    railCarId: { id: 2, asset: 'RailCar123' },
  };
  mockUserDetailService.getEmail.mockReturnValue('user@example.com');
  Object.assign(component, options);
};

const mockActivatedRoute = {
  paramMap: of({
    get: (k: string) =>
      ({
        formPath: 'mockFormPath',
        id: 'mockId123',
        customerName: 'Customer A',
        yardName: 'Yard A',
      })[k] || null,
  }),
  queryParamMap: of({
    get: (k: string) => (k === 'Date' ? '2024-06-30' : null),
  }),
};

const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
};
const mockRouter = { navigate: jest.fn() };
const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
  submitOrDraftHelper: jest.fn(),
};
const mockIndexedDBService = { get: jest.fn(), set: jest.fn() };
const mockDropdownService = {
  fetchAndCache: jest.fn().mockReturnValue(Promise.resolve()),
  injectDropdownData: jest.fn().mockReturnValue(Promise.resolve()),
};
const mockPdfGeneratorService = {
  downloadPDF: jest.fn().mockResolvedValue(true),
};
const mockUserDetailService = {
  getToken: jest.fn().mockReturnValue('mock-token'),
  getEmail: jest.fn().mockReturnValue('user@example.com'),
};
const mockAuthService = {
  isAuthenticated$: of(true),
  user$: of({ email: 'test@example.com' }),
  loginWithRedirect: jest.fn(),
  logout: jest.fn(),
};
const mockTabNavigationService = {
  setupTabNavigation: jest.fn(),
  goToPreviousTab: jest.fn(),
  goToNextTab: jest.fn(),
};
const mockAccessRoleService = { getRole: jest.fn() };
const mockHttpClient = { get: jest.fn() };
const mockLocation = {
  back: jest.fn(),
  reload: jest.fn(),
};

describe('FormDetailComponent (Optimized)', () => {
  let fixture: ComponentFixture<FormDetailComponent>;
  let component: FormDetailComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormDetailComponent],
      providers: [
        provideAnimations(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: Router, useValue: mockRouter },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        { provide: IndexedDBService, useValue: mockIndexedDBService },
        { provide: DropdownService, useValue: mockDropdownService },
        { provide: UserDetailService, useValue: mockUserDetailService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
        { provide: TabNavigationService, useValue: mockTabNavigationService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AccessRoleService, useValue: mockAccessRoleService },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: Location, useValue: mockLocation },
      ],
    })
      .overrideComponent(FormDetailComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormDetailComponent);
    component = fixture.componentInstance;
    component.myFormComp = new MockFormioComponent() as any;
    setUpFormComponentTest(component);
    jest.clearAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set isOnline to true and call syncAllOfflineFormSubmissions on online()', () => {
    component.isSyncInProgress = false;
    component.isDownloadEnabled = false;

    component.online();

    expect(component.isOnline).toBe(true);
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();

    // Simulate callback functionality
    const syncFn =
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions.mock.calls[0];
    const loadingCallback = syncFn[1];
    const downloadCallback = syncFn[2];

    loadingCallback(true);
    expect(component.isSyncInProgress).toBe(true);

    downloadCallback(true);
    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should prevent default and call saveAsDraft if not loading', async () => {
    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;

    component.isLoading = false;

    const saveSpy = jest
      .spyOn(component, 'saveAsDraft')
      .mockImplementation(() => Promise.resolve());

    component.handleEnterKey(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
  });

  it('should show error and set isLoading=false if form component not found', fakeAsync(() => {
    // Arrange: remove the form component
    (component as any).myFormComp = undefined;

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    component.validateForm();
    flushMicrotasks();
    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Form component not found.',
    );
    expect(component.isLoading).toBe(false);
  }));

  it('should show error and set isLoading=false if form component not found', fakeAsync(() => {
    // Arrange: remove the form component
    (component as any).myFormComp = undefined;

    const kendoNotificationServiceSpy = jest
      .spyOn(kendoNotificationServiceMock, 'showError')
      .mockImplementation();

    component.validateForm();
    tick(); // flush the IIFE microtask

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Form component not found.',
    );
    expect(component.isLoading).toBe(false);
  }));

  it('should show errors if form.checkValidity resolves to false', async () => {
    const mockFormio = {
      checkValidity: jest.fn().mockResolvedValue(false),
      submission: { data: { foo: 'bar' } },
      data: {},
      showErrors: jest.fn(),
    };
    // Override the private FormioComponent reference
    (component as any).myFormComp = { formio: mockFormio };

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    component.validateForm();
    // Wait for the IIFE to complete (it schedules a microtask)
    await Promise.resolve();
    // There’s a second microtask after showErrors + kendoNotificationService, so await again
    await Promise.resolve();

    expect(mockFormio.checkValidity).toHaveBeenCalledWith(
      mockFormio.submission.data,
      true,
      mockFormio.data,
    );
    expect(mockFormio.showErrors).toHaveBeenCalledWith(true);
    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Please fill the highlighted fields before saving.',
    );
    expect(component.isLoading).toBe(false);
  });

  it('should call onSubmit and set isLoading=true when form is valid', async () => {
    const submissionData = { foo: 'bar' };
    const mockFormio = {
      checkValidity: jest.fn().mockResolvedValue(true),
      submission: { data: submissionData },
      data: {},
      showErrors: jest.fn(),
    };
    // Override the private FormioComponent reference
    (component as any).myFormComp = { formio: mockFormio };

    // Start with isLoading false so we can see it change
    component.isLoading = false;

    // Spy on the onSubmit method
    const onSubmitSpy = jest.spyOn(component, 'onSubmit').mockImplementation();

    // Act
    component.validateForm();

    // Let the internal async IIFE run:
    await Promise.resolve(); // 1st microtask: checkValidity resolves
    await Promise.resolve(); // 2nd microtask: branch-after-await runs, including onSubmit

    expect(mockFormio.checkValidity).toHaveBeenCalledWith(
      submissionData,
      true,
      mockFormio.data,
    );
    expect(onSubmitSpy).toHaveBeenCalledWith(submissionData);
    expect(component.isLoading).toBe(true);
  });

  it('resetForm should call formio.reset when formio exists', () => {
    // formio with reset method
    const resetSpy = jest.fn();
    (component as any).myFormComp = { formio: { reset: resetSpy } };

    component.resetForm();

    expect(resetSpy).toHaveBeenCalled();
  });

  it('resetForm should warn when formio not available', () => {
    //  no myFormComp or formio
    (component as any).myFormComp = undefined;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    component.resetForm();

    expect(warnSpy).toHaveBeenCalledWith('Form.io component not available!');
    warnSpy.mockRestore();
  });

  it('should set up change and submit listeners', () => {
    const onMock = jest.fn();
    component.formInstance = {
      on: onMock,
    };

    component.initFormListeners = function () {
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

      this.formInstance.on('submit', (submission: any) => {
        this.isDownloadEnabled = true;
      });
    };

    component.initFormListeners();

    expect(onMock).toHaveBeenCalledWith('change', expect.any(Function));
    expect(onMock).toHaveBeenCalledWith('submit', expect.any(Function));
  });

  it('should enable download on submit event', () => {
    let submitCallback: Function | undefined;

    component.isDownloadEnabled = false;
    component.formInstance = {
      on: jest.fn((event: string, callback: Function) => {
        if (event === 'submit') {
          submitCallback = callback;
        }
      }),
    };

    component.initFormListeners = function () {
      if (!this.formInstance) return;
      this.formInstance.on('change', (event: any) => {
        if (event.changed && this.isDownloadEnabled) {
          this.isDownloadEnabled = true;
        }
      });
      this.formInstance.on('submit', (submission: any) => {
        this.isDownloadEnabled = true;
      });
    };

    component.initFormListeners();

    if (submitCallback) {
      submitCallback({});
    }

    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should resolve showConfirm with true when confirmed', async () => {
    const promise = component.showConfirm();

    expect(component.dialogVisible).toBe(true);

    component['confirmResolver'](true); // Using bracket notation to bypass private access

    const result = await promise;
    expect(result).toBe(true);
  });

  it('should resolve showConfirm with false when cancelled', async () => {
    const promise = component.showConfirm();

    expect(component.dialogVisible).toBe(true);

    component['confirmResolver'](false);

    const result = await promise;
    expect(result).toBe(false);
  });

  it('should update form components when assetDropdown emits change with selectedItem', () => {
    const mockSetValue = jest.fn();
    const mockGetComponent = jest.fn((key: string) => ({
      setValue: mockSetValue,
    }));

    // Fake formInstance with getComponent()
    component.formInstance = {
      getComponent: mockGetComponent,
    };

    // Fake selected item from dropdown
    const selectedItem = {
      field1: 'value1',
      field2: 'value2',
    };

    // Fake assetDropdown
    const mockOn = jest.fn();
    const mockGetValue = jest.fn().mockReturnValue(selectedItem);

    const assetDropdown = {
      on: mockOn,
      getValue: mockGetValue,
    };

    if (assetDropdown) {
      assetDropdown.on('change', (event: any) => {
        const selected = event?.value ?? assetDropdown.getValue();

        if (!selected || typeof selected !== 'object') return;

        Object.keys(selected).forEach((key) => {
          const comp = component.formInstance.getComponent(key);
          if (comp) {
            comp.setValue(selected[key]);
          }
        });
      });
    }

    const onChangeCallback = mockOn.mock.calls[0][1];
    onChangeCallback({ value: selectedItem });

    // Expect setValue called for each field
    expect(mockGetComponent).toHaveBeenCalledWith('field1');
    expect(mockGetComponent).toHaveBeenCalledWith('field2');

    expect(mockSetValue).toHaveBeenCalledWith('value1');
    expect(mockSetValue).toHaveBeenCalledWith('value2');
  });

  it('should show error if form is not found', async () => {
    component.myFormComp = null as any;

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    await component.saveAsDraft();

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Form component not found.',
    );
  });

  it('should show error and call showErrors if form is invalid', async () => {
    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(false),
      submission: { data: {} },
      data: {},
      showErrors: jest.fn(),
    };

    component.myFormComp = { formio: mockForm } as any;

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    await component.saveAsDraft();

    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Please fill the highlighted fields before saving.',
    );
    expect(mockForm.showErrors).toHaveBeenCalledWith(true);
    expect(component.isLoading).toBe(false);
  });

  it('should log error if formInstance is not initialized', () => {
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

  it('should register change and submit listeners and update isDownloadEnabled', () => {
    // Setup mock handlers map
    const eventHandlers: Record<string, Function> = {};

    //  formInstance.on()
    component.formInstance = {
      on: jest.fn((eventName: string, callback: Function) => {
        eventHandlers[eventName] = callback;
      }),
    } as any;

    component.isDownloadEnabled = false;

    component.initFormListeners();

    //  'change' event
    eventHandlers['change']({ changed: true });
    expect(component.isDownloadEnabled).toBe(false);

    //  Set true to allow enabling
    component.isDownloadEnabled = true;

    eventHandlers['change']({ changed: true });
    expect(component.isDownloadEnabled).toBe(true);

    //  'submit' event
    component.isDownloadEnabled = false;
    eventHandlers['submit']({});
    expect(component.isDownloadEnabled).toBe(true);

    //  Ensure the on() handler was registered twice
    expect(component.formInstance.on).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(component.formInstance.on).toHaveBeenCalledWith(
      'submit',
      expect.any(Function),
    );
  });

  it('should handle error during form load gracefully', async () => {
    const mockError = new Error('Dropdown injection failed');

    // formInstance with components and dropdown keys
    const mockFormInstance = {
      form: { components: [] },
      everyComponent: jest.fn((cb: any) => {
        cb({ component: { dataSrc: 'url', key: 'dropdown1' } });
      }),
      getComponent: jest.fn(),
      on: jest.fn(),
      _form: { title: 'Mock Form Title' },
    };

    // Assign mock form instance
    (component as any).myFormComp = {
      formio: mockFormInstance,
    };
    component.formInstance = mockFormInstance;

    // Force injectDropdownData to reject
    mockDropdownService.injectDropdownData.mockRejectedValueOnce(mockError);

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await component.onFormLoad({ form: mockFormInstance });

    expect(mockDropdownService.injectDropdownData).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error during form load:',
      mockError,
    );

    consoleErrorSpy.mockRestore();
  });

  it('should log error if formInstance is not available in downloadPDF', async () => {
    component.formInstance = null as any;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await component.downloadPDF();

    expect(consoleSpy).toHaveBeenCalledWith('Form not initialized yet.');
    consoleSpy.mockRestore();
  });

  it('should call submitOrDraftHelper with normalized submission in onSubmit', () => {
    const mockSubmission = {
      productName: 'ProductName',
      railCarId: 'RailCar123',
      formName: 'TestForm',
    };
    component.isOnline = true;
    component.formTitle = 'Test Form Title';
    component.originalFormData = {
      productName: { id: 1, name: 'ProductName' },
      railCarId: { id: 2, asset: 'RailCar123' },
    } as any;

    component.onSubmit(mockSubmission);

    expect(
      mockSubmitDraftHelperService.submitOrDraftHelper,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'submit',
        formName: 'testform',
        submissionData: expect.objectContaining({
          productName: { id: 1, name: 'ProductName' },
          railCarId: { id: 2, asset: 'RailCar123' },
          useremail: 'user@example.com',
          status: 'Submitted',
        }),
      }),
    );
  });

  it('should show error and set isLoading=false if form component not found', fakeAsync(() => {
    (component as any).myFormComp = undefined;
    const kendoNotificationServiceSpy = jest
      .spyOn(kendoNotificationServiceMock, 'showError')
      .mockImplementation();

    component.validateForm();
    tick();
    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Form component not found.',
    );
    expect(component.isLoading).toBe(false);
  }));

  it('should disable draft and show info when form is submitted for Customer Admin', fakeAsync(() => {
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });

    const mockResponse = {
      Result: {
        FormEntryDetail: JSON.stringify({
          formTitle: 'Test Form',
          status: 'Submitted',
          yardName: { name: 'Yard A' },
          customerName: { name: 'Customer A' },
          productName: { name: 'Product A' },
          railCarId: { asset: 'Car123' },
        }),
      },
    };

    mockAccessRoleService.getRole.mockReturnValue('Customer Admin');
    mockHttpClient.get = jest.fn().mockReturnValue(of(mockResponse));

    component.ngOnInit();
    tick();

    expect(component.isDraftDisabled).toBe(true);
    expect(kendoNotificationServiceMock.showInfo).toHaveBeenCalledWith(
      'This form has already been submitted. Any changes made now, will override the last submitted version.',
    );
  }));

  it('should prepare submission data and call submitOrDraftHelper on valid form', async () => {
    const mockFormData = {
      formName: 'TestForm',
      productName: 'Product A',
      railCarId: 'RailCar123',
      version: 1,
    };

    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(true),
      submission: { data: mockFormData },
      data: {},
      showErrors: jest.fn(),
    };

    const mockUserEmail = 'user@example.com';

    component.myFormComp = { formio: mockForm } as any;
    component.isOnline = true;
    component.formTitle = 'Test Form Title';
    component.originalFormData = {
      productName: { id: 1, name: 'Product A' },
      railCarId: { id: 2, asset: 'RailCar123' },
    } as any;

    mockUserDetailService.getEmail.mockReturnValue(mockUserEmail);

    const submitDraftSpy = jest.spyOn(
      mockSubmitDraftHelperService,
      'submitOrDraftHelper',
    );

    await component.saveAsDraft();

    expect(component.isLoading).toBe(true);
    expect(submitDraftSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'draft',
        formName: 'testform',
        submissionData: expect.objectContaining({
          formName: 'testform',
          productName: { id: 1, name: 'Product A' },
          railCarId: { id: 2, asset: 'RailCar123' },
          useremail: mockUserEmail,
          version: 2,
          clientTimestamp: expect.any(Number),
          formTitle: 'Test Form Title',
          synced: true,
          status: 'Pending',
        }),
      }),
    );
  });

  it('should set isLoading and isDownloadEnabled using callbacks inside onSubmit()', () => {
    const mockSubmission = {
      formName: 'TestSubmitForm',
      productName: 'Product Name',
      railCarId: 'RailCar123',
    };

    component.isOnline = true;
    component.formTitle = 'Submit Form Title';
    component.originalFormData = {
      productName: { id: 1, name: 'Product A' },
      railCarId: { id: 2, asset: 'RailCarAsset' },
    } as any;

    mockUserDetailService.getEmail.mockReturnValue('user@example.com');

    const submitDraftSpy = jest.spyOn(
      mockSubmitDraftHelperService,
      'submitOrDraftHelper',
    );

    component.onSubmit(mockSubmission);

    const configArg = submitDraftSpy.mock.calls[0][0];
    component.isLoading = false;
    configArg.setIsLoading(true);
    expect(component.isLoading).toBe(true);

    configArg.setIsLoading(false);
    expect(component.isLoading).toBe(false);

    // isDownloadEnabled should be controlled via callback
    component.isDownloadEnabled = false;
    configArg.setIsDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);

    configArg.setIsDownloadEnabled(false);
    expect(component.isDownloadEnabled).toBe(false);
  });

  it('should set dialogVisible to false and resolve confirm status correctly', () => {
    const confirmResolverMock = jest.fn();
    (component as any).confirmResolver = confirmResolverMock;
    component.dialogVisible = true;
    component.handleDialogClose('confirm');
    expect(component.dialogVisible).toBe(false);
    expect(confirmResolverMock).toHaveBeenCalledWith(true);

    // Act with "cancel"
    component.dialogVisible = true;
    component.handleDialogClose('cancel');
    expect(component.dialogVisible).toBe(false);
    expect(confirmResolverMock).toHaveBeenCalledWith(false);
  });

  it('should set currentFormModified to true when event.isModified is true', () => {
    component.currentFormModified = false;
    component.onFormChange({ isModified: true });
    expect(component.currentFormModified).toBe(true);
  });

  it('should not change currentFormModified when event.isModified is false', () => {
    component.currentFormModified = false;
    component.onFormChange({ isModified: false });
    expect(component.currentFormModified).toBe(false);
  });

  it('should not change currentFormModified when event is null or undefined', () => {
    component.currentFormModified = false;
    component.onFormChange(undefined);
    expect(component.currentFormModified).toBe(false);

    component.onFormChange(null);
    expect(component.currentFormModified).toBe(false);
  });

  it('should open confirmation dialog and return a Promise when form is modified', () => {
    component.currentFormModified = true;
    const promise = component.showCancel() as Promise<string>;

    expect(component.formModifiedDialogVisible).toBe(true);
    expect(promise).toBeInstanceOf(Promise);
    expect(typeof (component as any).formModifiedDialogPromiseResolver).toBe(
      'function',
    );
  });

  it('should navigate back when form is not modified', () => {
    const locationBackSpy = jest.spyOn((component as any).location, 'back');
    component.currentFormModified = false;

    const result = component.showCancel();

    expect(locationBackSpy).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
  it('should resolve promise, reset resolver, and navigate back when result is "confirm"', () => {
    const locationBackSpy = jest.spyOn((component as any).location, 'back');
    const mockResolver = jest.fn();
    (component as any).formModifiedDialogPromiseResolver = mockResolver;

    component.handleModifiedDialogClose('confirm');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(mockResolver).toHaveBeenCalledWith('confirm');
    expect((component as any).formModifiedDialogPromiseResolver).toBeNull();
    expect(locationBackSpy).toHaveBeenCalled();
  });

  it('should resolve promise, reset resolver, and not navigate when result is not "confirm"', () => {
    const locationBackSpy = jest.spyOn((component as any).location, 'back');
    const mockResolver = jest.fn();
    (component as any).formModifiedDialogPromiseResolver = mockResolver;

    component.handleModifiedDialogClose('cancel');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(mockResolver).toHaveBeenCalledWith('cancel');
    expect((component as any).formModifiedDialogPromiseResolver).toBeNull();
    expect(locationBackSpy).not.toHaveBeenCalled();
  });

  it('should call submitOrDraftHelper without modifying productName and railCarId when they are objects', () => {
    const mockSubmission = {
      productName: { id: 1, name: 'Product A' },
      railCarId: { id: 2, asset: 'RailCar123' },
      formName: 'TestForm',
    };
    component.isOnline = true;
    component.formTitle = 'Test Form Title';
    component.originalFormData = {
      productName: { id: 1, name: 'Product A' },
      railCarId: { id: 2, asset: 'RailCar123' },
    } as any;

    component.onSubmit(mockSubmission);

    expect(
      mockSubmitDraftHelperService.submitOrDraftHelper,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionData: expect.objectContaining({
          productName: mockSubmission.productName,
          railCarId: mockSubmission.railCarId,
        }),
      }),
    );
  });

  it('should call setIsLoading and setIsDownloadEnabled callbacks from saveAsDraft', async () => {
    const mockFormio = {
      checkValidity: jest.fn().mockResolvedValue(true),
      submission: {
        data: {
          formName: 'TestForm',
          productName: 'Product A',
          railCarId: 'RC-123',
        },
      },
      data: {},
      showErrors: jest.fn(),
    };

    const submitHelperSpy = jest.spyOn(
      mockSubmitDraftHelperService,
      'submitOrDraftHelper',
    );

    (component as any).myFormComp = { formio: mockFormio };
    component.isOnline = true;
    component.formTitle = 'Test Form';
    component.originalFormData = {
      productName: { id: 1, name: 'Product A' },
      railCarId: { id: 2, asset: 'RC-123' },
    };

    await component.saveAsDraft();
    expect(component.isLoading).toBe(true);
    expect(submitHelperSpy).toHaveBeenCalled();

    const submitArg = submitHelperSpy.mock.calls[0][0];
    submitArg.setIsLoading(false);
    expect(component.isLoading).toBe(false);

    submitArg.setIsDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);
  });

  describe('ngOnInit() logic', () => {
    it('should show a warning and navigate to dashboard if the form is submitted and user is Trinity Staff', fakeAsync(() => {
      const mockApiResponse = {
        Result: {
          FormEntryDetail: '{"status": "Submitted"}',
        },
      };
      mockHttpClient.get.mockReturnValue(of(mockApiResponse));
      mockAccessRoleService.getRole.mockReturnValue('Trinity Staff');

      component.ngOnInit();
      tick(); // Advance the fake timer to process the observable

      expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
        'This form has already been submitted and cannot be edited. Navigating you back to home page.',
      );
      tick(3500);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    }));
  });

  describe('downloadPDF()', () => {
    it('should handle a PDF download error gracefully', async () => {
      component.formInstance = { _form: { title: 'Test Title' } } as any;
      component.formContainer = {
        nativeElement: document.createElement('div'),
      };
      mockPdfGeneratorService.downloadPDF.mockRejectedValue(
        new Error('PDF error'),
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');
      await component.downloadPDF();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'PDF download failed:',
        expect.any(Error),
      );
      expect(component.isPdfDownloading).toBe(false);
      expect(mockLocation.reload).not.toHaveBeenCalled();
    });

    it('should not reload the page if the application is offline', async () => {
      component.isOnline = false;
      component.formInstance = { _form: { title: 'Test Title' } } as any;
      component.formContainer = {
        nativeElement: document.createElement('div'),
      };

      // Mock the PDF service to resolve successfully
      mockPdfGeneratorService.downloadPDF.mockResolvedValue(true);

      await component.downloadPDF();
      expect(component.isPdfDownloading).toBe(false);
      expect(mockLocation.reload).not.toHaveBeenCalled();
    });
  });

  describe('Tab navigation', () => {
    beforeEach(() => {
      component.formContainer = { nativeElement: {} } as any;
    });

    it('should call goToPreviousTab with formContainer', () => {
      component.onPreviousTab();
      expect(mockTabNavigationService.goToPreviousTab).toHaveBeenCalledWith(
        component.formContainer,
      );
    });

    it('should call goToNextTab with formContainer', () => {
      component.onNextTab();
      expect(mockTabNavigationService.goToNextTab).toHaveBeenCalledWith(
        component.formContainer,
      );
    });

    it('should set isOnline to false when offline event is triggered', () => {
      component.isOnline = true;

      component.offline();

      expect(component.isOnline).toBe(false);
    });
  });

  describe('ngAfterViewInit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      const mockOn = jest.fn((event: string, cb: Function) => {
        if (event === 'ready') cb();
      });
      component.formioComponent = {
        formio: { _form: { title: 'My Title' }, on: mockOn },
      } as any;
      jest.spyOn(component, 'initFormListeners').mockImplementation();
      const tabNav = TestBed.inject(TabNavigationService);
      jest.spyOn(tabNav, 'setupTabNavigation');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set formTitle, formInstance, call initFormListeners and setupTabNavigation', () => {
      component.ngAfterViewInit();
      // Fast-forward the interval and timeout
      jest.advanceTimersByTime(100); // interval fires
      jest.advanceTimersByTime(300); // timeout for setupTabNavigation

      // Assert
      expect(component.formTitle).toBe('My Title');
      expect(component.formInstance).toEqual(component.formioComponent.formio);
      expect(component.initFormListeners).toHaveBeenCalled();
      const tabNav = TestBed.inject(TabNavigationService);
      expect(tabNav.setupTabNavigation).toHaveBeenCalledWith(
        component.formContainer,
      );
    });
  });
});
