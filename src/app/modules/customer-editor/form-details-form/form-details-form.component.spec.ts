import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { Component, Directive, Input } from '@angular/core';
import { of, Subject, Subscription } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { FormDetailsFormComponent } from './form-details-form.component';
import { DropdownService } from 'src/app/common/services/dropdown.service';
import { AuthService } from '@auth0/auth0-angular';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { UserDetailService } from 'src/app/shared/services/user-details.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { environment } from 'src/environments/environment';
import {
  getDropdownKeys,
  processComponents,
} from 'src/app/common/utils/formio-utils';
import { Location } from '@angular/common';

jest.mock('src/app/common/utils/formio-utils', () => ({
  processComponents: jest.fn(),
  getDropdownKeys: jest.fn(),
}));
@Component({ selector: 'formio', template: '' })
class MockFormioComponent {
  @Input() form: any;
  @Input() submission: any;
  formio = {
    on: jest.fn(),
    setPage: jest.fn(),
    form: { display: 'form' },
    pages: [],
    reset: jest.fn(),
    checkValidity: jest.fn().mockResolvedValue(true),
    showErrors: jest.fn(),
    submission: { data: {} },
    data: {},
  };
}

@Component({ selector: 'app-rsi-topbar', template: '' })
class MockTopbar {}
@Component({ selector: 'app-rsi-sidebar', template: '' })
class MockSidebar {}
@Component({ selector: 'kendo-confirm-dialog', template: '' })
class MockConfirmDialog {}
@Directive({ selector: '[routerLink]' })
class MockRouterLinkDirective {
  @Input('routerLink') link: any;
}

const mockActivatedRoute = {
  snapshot: {
    queryParams: {},
    paramMap: {
      get: (key: string) => {
        if (key === 'formPath') return 'mock-form';
        if (key === 'inspectionId') return '123';
        return null;
      },
    },
  },
  paramMap: of({
    get: (key: string) => {
      if (key === 'formPath') return 'mock-form';
      if (key === 'inspectionId') return '123';
      return null;
    },
  }),
  queryParams: of({ yard: 'Test Yard' }),
};

const routerEvents$ = new Subject();
const mockRouter = {
  events: routerEvents$.asObservable(),
  navigate: jest.fn(),
};

const mockDropdownService = {
  injectDropdownData: jest.fn().mockResolvedValue(true),
};
const mockAuthService = {
  isAuthenticated$: of(true),
  user$: of({ email: 'test@example.com' }),
};
const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
};
const mockPdfGeneratorService = {
  downloadPDF: jest.fn().mockResolvedValue(true),
  downloadPDFFilledForm: jest.fn().mockResolvedValue(true),
};
const mockUserDetailService = {
  getEmail: jest.fn().mockReturnValue('test@example.com'),
  getToken: jest.fn().mockReturnValue('mock-token'),
};
const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
  submitOrDraftHelperNewForm: jest.fn(),
};

const mockCommonApiService = {
  getForm: jest.fn().mockReturnValue(of({})),
  getInspectionDetailsById: jest.fn(),
};

const mockTabNavigationService = {
  goToPreviousTab: jest.fn(),
  goToNextTab: jest.fn(),
  setupTabNavigation: jest.fn(),
};

const mockLocation = { back: jest.fn() };

describe('FormDetailsFormComponent (Standalone)', () => {
  let component: FormDetailsFormComponent;
  let fixture: ComponentFixture<FormDetailsFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormDetailsFormComponent, HttpClientTestingModule],
      declarations: [
        MockFormioComponent,
        MockTopbar,
        MockSidebar,
        MockConfirmDialog,
        MockRouterLinkDirective,
      ],
      providers: [
        provideAnimations(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: DropdownService, useValue: mockDropdownService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: TabNavigationService, useValue: mockTabNavigationService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
        { provide: UserDetailService, useValue: mockUserDetailService },
        { provide: Location, useValue: mockLocation },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        { provide: CommonApiService, useValue: mockCommonApiService },
      ],
    })
      .overrideComponent(FormDetailsFormComponent, {
        set: { template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormDetailsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should update isSyncInProgress and isDownloadEnabled when online() is called', () => {
    component.online();

    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();

    const [, setSyncProgressFn, setDownloadEnabledFn] =
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions.mock.calls[0];

    setSyncProgressFn(true);
    expect(component.isSyncInProgress).toBe(true);

    setDownloadEnabledFn(false);
    expect(component.isDownloadEnabled).toBe(false);
  });

  it('should set isOnline to false when offline() is called', () => {
    component.isOnline = true;
    component.offline();
    expect(component.isOnline).toBe(false);
  });

  it('should handle online event and sync offline submissions', () => {
    component.isOnline = false;
    component.online();
    expect(component.isOnline).toBe(true);
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();
  });

  it('should call saveAsDraft on Enter key when not loading', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;

    component.isLoading = false;
    component.saveAsDraft = jest.fn();
    component.handleEnterKey(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(component.saveAsDraft).toHaveBeenCalled();
  });

  it('should not call saveAsDraft if loading', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;

    component.isLoading = true;
    component.saveAsDraft = jest.fn();
    component.handleEnterKey(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(component.saveAsDraft).not.toHaveBeenCalled();
  });

  it('should remove formSubmitted and submissionTimestamp on NavigationEnd', () => {
    sessionStorage.setItem('formSubmitted', 'true');
    sessionStorage.setItem('submissionTimestamp', '123');

    routerEvents$.next(new NavigationEnd(1, '/test', '/test'));

    expect(sessionStorage.getItem('formSubmitted')).toBeNull();
    expect(sessionStorage.getItem('submissionTimestamp')).toBeNull();
  });

  it('should show error and return if form component is missing', async () => {
    component.myFormComp = null as any;

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );
    const submitSpy = jest.spyOn(
      mockSubmitDraftHelperService,
      'submitOrDraftHelperNewForm',
    );

    await component.saveAsDraft();

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Form component not found.',
    );
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('should show error if form is invalid and stop execution', async () => {
    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(false),
      showErrors: jest.fn(),
      submission: { data: {} },
      data: {},
      form: { name: 'testform' },
    };

    component.myFormComp = {
      formio: mockForm,
    } as any;

    component.isLoading = true;

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );
    const submitSpy = jest.spyOn(
      mockSubmitDraftHelperService,
      'submitOrDraftHelperNewForm',
    );

    await component.saveAsDraft();

    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Please fill the highlighted fields before saving.',
    );
    expect(mockForm.showErrors).toHaveBeenCalledWith(true);
    expect(component.isLoading).toBe(false);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('should pass correct callback functions to submitOrDraftHelperNewForm', async () => {
    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(true),
      submission: {
        data: {
          customerName: { id: '123' },
          field1: 'value1',
        },
      },
      form: { name: 'TestForm' },
      data: {},
    };

    component.myFormComp = { formio: mockForm } as any;
    component.isOnline = true;
    component.formTitle = 'Mock Title';
    jest
      .spyOn(mockUserDetailService, 'getEmail')
      .mockReturnValue('test@example.com');

    await component.saveAsDraft();

    expect(
      mockSubmitDraftHelperService.submitOrDraftHelperNewForm,
    ).toHaveBeenCalled();

    const args =
      mockSubmitDraftHelperService.submitOrDraftHelperNewForm.mock.calls[0][0];

    // Simulate calling callbacks
    args.setIsLoading(false);
    args.setIsDownloadEnabled(true);
    args.setCurrentFormName('MockForm');
    args.setCurrentCustomerId('456');
    args.setCurrentFormId(999);

    expect(component.isLoading).toBe(false);
    expect(component.isDownloadEnabled).toBe(true);
    expect(component.currentFormName).toBe('MockForm');
    expect(component.currentCustomerId).toBe('456');
    expect(component.currentFormId).toBe(999);
    expect(typeof args.showConfirm).toBe('function');
  });

  it('should build submission object and call submitOrDraftHelperNewForm', () => {
    const mockSubmission = {
      formName: 'TestForm',
      customerName: { id: '789' },
      version: 0,
      someField: 'value',
    };

    const mockTime = 1751999999999;
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    component.isOnline = true;
    component.formTitle = 'Mock Title';

    // Mock private dependencies
    component['userDetailService'].getEmail = jest
      .fn()
      .mockReturnValue('user@example.com');

    const spy = jest.spyOn(
      mockSubmitDraftHelperService,
      'submitOrDraftHelperNewForm',
    );

    component.onSubmit(mockSubmission);

    expect(spy).toHaveBeenCalledWith({
      type: 'submit',
      formName: 'testform',
      submissionData: {
        ...mockSubmission,
        CustomerID: '789',
        useremail: 'user@example.com',
        formName: 'testform',
        version: 1,
        formId: mockTime,
        clientTimestamp: mockTime,
        serverLastKnownVersion: 0,
        synced: true,
        formTitle: 'Mock Title',
        status: 'Submitted',
      },
      toastrMsg: 'Form submitted successfully.',
      router: component['router'],
      isOnline: true,
      setIsLoading: expect.any(Function),
      setIsDownloadEnabled: expect.any(Function),
      setCurrentFormName: expect.any(Function),
      setCurrentCustomerId: expect.any(Function),
      setCurrentFormId: expect.any(Function),
      showConfirm: expect.any(Function),
    });
  });

  it('should call formio.reset() if formio is available', () => {
    const resetSpy = jest.fn();
    component.myFormComp = {
      formio: {
        reset: resetSpy,
      },
    } as any;

    component.resetForm();

    expect(resetSpy).toHaveBeenCalled();
  });

  it('should warn if formio component is not available', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    component.myFormComp = null as any;

    component.resetForm();

    expect(warnSpy).toHaveBeenCalledWith('Form.io component not available!');
    warnSpy.mockRestore();
  });

  it('should set formSrc if formPath is provided', () => {
    fixture.detectChanges();
    expect(component['formSrc']).toBe(`${environment.formIoUrl}/mock-form`);
  });

  it('should set submissionData.yardName from query param', () => {
    component.getYardFromParams();
    expect(component.submissionData).toEqual({
      data: {
        yardName: 'Test Yard',
      },
    });
  });

  it('should set isDownloadEnabled to true on submit event and maintain on change if already true', () => {
    const mockOn = jest.fn();

    component['formInstance'] = { on: mockOn } as any;
    component['isDownloadEnabled'] = true;

    component.initFormListeners();

    const changeCallback = mockOn.mock.calls.find(
      (call) => call[0] === 'change',
    )[1];
    component['isDownloadEnabled'] = true;
    changeCallback({ changed: true });

    expect(component['isDownloadEnabled']).toBe(true);

    // Simulate 'submit' event
    const submitCallback = mockOn.mock.calls.find(
      (call) => call[0] === 'submit',
    )[1];
    component['isDownloadEnabled'] = false;
    submitCallback({});

    expect(component['isDownloadEnabled']).toBe(true);
  });

  it('should log error if formInstance is not initialized', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    component['formInstance'] = null as any;

    component.initFormListeners();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );

    consoleErrorSpy.mockRestore();
  });

  it('should set formPath and preFillFormData on successful API response', () => {
    const mockParams = {
      get: jest.fn((key: string) => {
        if (key === 'formPath') return 'testPath';
        if (key === 'inspectionId') return '123';
        return null;
      }),
    };

    const mockData = {
      IsSuccess: true,
      Result: { YardName: 'Yard A', CustomerName: 'Customer A' },
    };

    jest
      .spyOn(component['route'].paramMap, 'subscribe')
      .mockImplementation((callback: any) => {
        callback(mockParams);
        return new Subscription(); //  Correct RxJS Subscription
      });

    jest
      .spyOn(component['commonApiService'], 'getInspectionDetailsById')
      .mockReturnValue(of(mockData));

    component.ngOnInit();

    expect(component.formPath).toBe('testPath');
    expect(component.preFillFormData).toEqual({
      yardName: 'Yard A',
      customerName: 'Customer A',
    });
    expect(component.yardNameUrl).toBe('Yard A');
  });

  it('should initialize form instance and setup navigation on ngAfterViewInit', fakeAsync(() => {
    const mockFormio = {
      _form: { title: 'Test Title', modified: '2025-01-01' },
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'ready') callback();
      }),
    };

    component.formioComponent = { formio: mockFormio } as any;
    const initFormListenersSpy = jest.spyOn(component, 'initFormListeners');
    const tabNavigationSpy = jest.spyOn(
      component['tabNavigationService'],
      'setupTabNavigation',
    );

    component.formContainer = {} as any;

    component.ngAfterViewInit();

    tick(200); // To cover the interval logic

    expect(component.formTitle).toBe('Test Title');
    expect(component.updatedFormOn).toBe('2025-01-01');
    expect(component.formInstance).toBe(mockFormio);
    expect(initFormListenersSpy).toHaveBeenCalled();

    tick(300); // To cover setTimeout for tabNavigation
    expect(tabNavigationSpy).toHaveBeenCalledWith(component.formContainer);
  }));

  it('should show error if API call returns IsSuccess false', () => {
    const mockParams = {
      get: jest.fn((key: string) => {
        if (key === 'formPath') return 'testPath';
        if (key === 'inspectionId') return '123';
        return null;
      }),
    };

    const mockData = {
      IsSuccess: false,
      Message: 'Invalid ID',
    };

    jest
      .spyOn(component['route'].paramMap, 'subscribe')
      .mockImplementation((callback: any) => {
        callback(mockParams);
        return new Subscription();
      });

    jest
      .spyOn(component['commonApiService'], 'getInspectionDetailsById')
      .mockReturnValue(of(mockData));

    const toastSpy = jest.spyOn(kendoNotificationServiceMock, 'showError');

    component.ngOnInit();

    expect(toastSpy).toHaveBeenCalledWith('Invalid ID');
    expect(component.isLoading).toBe(false);
  });

  it('should call setters and update component state from onSubmit()', () => {
    const mockSubmission = {
      formName: 'TestForm',
      customerName: { id: 123 },
      version: 1,
    };

    const mockEmail = 'test@example.com';
    const mockFormTitle = 'Sample Form';
    const mockFormId = 1234567890;

    jest.spyOn(Date, 'now').mockReturnValue(mockFormId);

    component.formTitle = mockFormTitle;
    component.isOnline = true;

    // Bypass readonly + private
    (component as any)['userDetailService'] = { getEmail: () => mockEmail };
    (component as any)['submitDraftHelperService'] = {
      submitOrDraftHelperNewForm: jest.fn(),
    };
    (component as any)['router'] = {} as any;

    component.onSubmit(mockSubmission);

    const submitDraftHelperSpy = (component as any)['submitDraftHelperService']
      .submitOrDraftHelperNewForm;

    expect(submitDraftHelperSpy).toHaveBeenCalled();

    const arg = submitDraftHelperSpy.mock.calls[0][0];

    // Simulate service-callback setter effects
    arg.setIsLoading(true);
    expect(component.isLoading).toBe(true);

    arg.setIsDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);

    arg.setCurrentFormName('TestName');
    expect(component.currentFormName).toBe('TestName');

    arg.setCurrentCustomerId('456');
    expect(component.currentCustomerId).toBe('456');

    arg.setCurrentFormId(9999);
    expect(component.currentFormId).toBe(9999);
  });

  it('should call location.back() if currentFormModified is false', () => {
    component.currentFormModified = false;
    component.showCancel();
    expect(mockLocation.back).toHaveBeenCalled();
  });

  it('should close dialog and resolve promise with result', () => {
    const resolverSpy = jest.fn();
    component['formModifiedDialogPromiseResolver'] = resolverSpy;

    component.formModifiedDialogVisible = true;
    component.handleModifiedDialogClose('cancel');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(resolverSpy).toHaveBeenCalledWith('cancel');
    expect(component['formModifiedDialogPromiseResolver']).toBeNull();
  });

  it('should call location.back() when result is "confirm"', () => {
    component['formModifiedDialogPromiseResolver'] = jest.fn();

    component.handleModifiedDialogClose('confirm');

    expect(mockLocation.back).toHaveBeenCalled();
  });

  describe('saveAsDraft()', () => {
    beforeEach(() => {
      component.myFormComp = {
        formio: {
          submission: {
            data: {
              customerName: { id: '123' },
              field1: 'value1',
            },
          },
          form: { name: 'TestForm' },
          checkValidity: jest.fn().mockResolvedValue(true),
          showErrors: jest.fn(),
          data: {},
        },
      } as any;

      component.formTitle = 'Mock Title';
      component.isOnline = true;
    });

    it('should call submitOrDraftHelperNewForm with correct payload when form is valid', async () => {
      await component.saveAsDraft();

      expect(component.myFormComp.formio.checkValidity).toHaveBeenCalled();

      expect(
        mockSubmitDraftHelperService.submitOrDraftHelperNewForm,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'draft',
          formName: 'testform',
          toastrMsg: 'Draft saved successfully.',
          isOnline: true,
          submissionData: expect.objectContaining({
            CustomerID: '123',
            useremail: 'test@example.com',
            formTitle: 'Mock Title',
            status: 'Pending',
            synced: true,
          }),
          setIsLoading: expect.any(Function),
          setIsDownloadEnabled: expect.any(Function),
          setCurrentFormName: expect.any(Function),
          setCurrentCustomerId: expect.any(Function),
          setCurrentFormId: expect.any(Function),
          showConfirm: expect.any(Function),
        }),
      );
    });
  });

  describe('downloadPDF', () => {
    beforeEach(() => {
      component.isLoading = false;
      component.isDownloadEnabled = false;
    });

    it('should show error and stop if formInstance is not initialized', async () => {
      component.formInstance = null as any;

      await component.downloadPDF();

      expect(component.isLoading).toBe(false);
      expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
        'Form not initialized yet.',
      );
      expect(
        mockPdfGeneratorService.downloadPDFFilledForm,
      ).not.toHaveBeenCalled();
    });

    it('should call downloadPDFFilledForm and set flags correctly', async () => {
      const mockContainer = document.createElement('div');
      component.formContainer = { nativeElement: mockContainer } as any;
      component.formInstance = {
        _form: { title: 'Mock Form Title' },
      } as any;

      await component.downloadPDF();

      expect(component.isLoading).toBe(false);
      expect(component.isDownloadEnabled).toBe(true);
      expect(
        mockPdfGeneratorService.downloadPDFFilledForm,
      ).toHaveBeenCalledWith(
        mockContainer,
        component.formInstance,
        'Mock Form Title',
        expect.any(String),
      );
    });

    it('should catch error during PDF generation and show toast', async () => {
      component.formInstance = {
        _form: { title: 'Error Form' },
      } as any;

      const error = new Error('PDF error');
      mockPdfGeneratorService.downloadPDFFilledForm.mockRejectedValueOnce(
        error,
      );

      const kendoNotificationServiceSpy = jest.spyOn(
        kendoNotificationServiceMock,
        'showError',
      );

      await component.downloadPDF();

      expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
        `PDF download failed: ${error}`,
      );
      expect(component.isLoading).toBe(false);
      expect(component.isDownloadEnabled).toBe(true);
    });

    it('should set dialogVisible to true and return a promise', async () => {
      const confirmPromise = component.showConfirm();

      expect(component['dialogVisible']).toBe(true);

      expect(typeof component['confirmResolver']).toBe('function');

      component['confirmResolver'](true);
      await expect(confirmPromise).resolves.toBe(true);
    });

    it('should set dialogVisible to false and resolve true when status is "confirm"', async () => {
      const resolverMock = jest.fn();
      (component as any).confirmResolver = resolverMock;
      component['dialogVisible'] = true;

      component.handleDialogClose('confirm');

      expect(component['dialogVisible']).toBe(false);
      expect(resolverMock).toHaveBeenCalledWith(true);
    });

    it('should set dialogVisible to false and resolve false when status is not "confirm"', async () => {
      const resolverMock = jest.fn();
      (component as any).confirmResolver = resolverMock;
      component['dialogVisible'] = true;

      component.handleDialogClose('cancel');

      expect(component['dialogVisible']).toBe(false);
      expect(resolverMock).toHaveBeenCalledWith(false);
    });

    it('should call goToPreviousTab with formContainer', () => {
      const prevSpy = jest.spyOn(mockTabNavigationService, 'goToPreviousTab');

      component.onPreviousTab();

      expect(prevSpy).toHaveBeenCalledWith(component.formContainer);
    });

    it('should call goToNextTab with formContainer', () => {
      const nextSpy = jest.spyOn(mockTabNavigationService, 'goToNextTab');

      component.onNextTab();

      expect(nextSpy).toHaveBeenCalledWith(component.formContainer);
    });

    it('should show error if form not found in validateForm', () => {
      component.myFormComp = null as any;
      const toastSpy = jest.spyOn(kendoNotificationServiceMock, 'showError');

      component.validateForm();

      expect(toastSpy).toHaveBeenCalledWith('Form component not found.');
    });
  });

  describe('onFormLoad', () => {
    const mockToken = 'mock-token';
    const mockDropdownKeys = ['key1', 'key2'];

    const mockFormInstance: any = {
      form: { components: ['comp1', 'comp2'] },
      _form: { title: 'Mock Form Title' },
      getComponent: jest.fn(),
      on: jest.fn(),
    };

    beforeEach(() => {
      component.myFormComp = { formio: mockFormInstance } as any;
      mockUserDetailService.getToken.mockReturnValue(mockToken);
      (processComponents as jest.Mock).mockResolvedValue(undefined);
      (getDropdownKeys as jest.Mock).mockReturnValue(mockDropdownKeys);
      mockDropdownService.injectDropdownData.mockResolvedValue(true);
      mockFormInstance.getComponent.mockReset();
      mockFormInstance.on.mockReset();
    });

    it('should initialize formInstance, load dropdowns, and set formTitle', async () => {
      await component.onFormLoad(mockFormInstance);

      expect(component.formInstance).toBe(mockFormInstance);
      expect(component.formTitle).toBe('Mock Form Title');
      expect(component.isLoading).toBe(false);

      expect(processComponents).toHaveBeenCalledWith(
        mockFormInstance.form.components,
        mockToken,
        mockDropdownService,
      );

      expect(getDropdownKeys).toHaveBeenCalledWith(mockFormInstance);

      expect(mockDropdownService.injectDropdownData).toHaveBeenCalledTimes(
        mockDropdownKeys.length,
      );

      for (const key of mockDropdownKeys) {
        expect(mockDropdownService.injectDropdownData).toHaveBeenCalledWith(
          mockFormInstance,
          key,
          component.preFillFormData,
        );
      }
    });

    it('should log error and still complete if dropdown injection fails', async () => {
      const error = new Error('Inject failed');
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockDropdownService.injectDropdownData.mockRejectedValueOnce(error);

      await component.onFormLoad(mockFormInstance);

      expect(consoleSpy).toHaveBeenCalledWith('Error during form load:', error);
      expect(component.isLoading).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should show dialog and return Promise when form is modified', () => {
      component.currentFormModified = true;

      const result = component.showCancel();

      expect(component.formModifiedDialogVisible).toBe(true);
      expect(typeof result).toBe('object'); // Promise returned
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('onFormChange', () => {
    it('should set currentFormModified to true if event.isModified is true', () => {
      component.currentFormModified = false;

      component.onFormChange({ isModified: true });

      expect(component.currentFormModified).toBe(true);
    });

    it('should not change currentFormModified if event.isModified is false or missing', () => {
      component.currentFormModified = false;

      component.onFormChange({ isModified: false });
      expect(component.currentFormModified).toBe(false);

      component.onFormChange(null);
      expect(component.currentFormModified).toBe(false);

      component.onFormChange({});
      expect(component.currentFormModified).toBe(false);
    });
  });
});
