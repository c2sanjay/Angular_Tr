import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Component, Directive, Input } from '@angular/core';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FormDetailsFormComponent } from './form-details-form.component';
import { DropdownService } from 'src/app/common/services/dropdown.service';
import { AuthService } from '@auth0/auth0-angular';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { UserDetailService } from 'src/app/shared/services/user-details.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { processComponents } from 'src/app/common/utils/formio-utils';
@Component({ selector: 'formio', template: '' })
class MockFormioComponent {
  @Input() form: any;
  @Input() submission: any;
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

jest.mock('src/app/common/utils/formio-utils', () => ({
  processComponents: jest.fn().mockResolvedValue(true),
  getDropdownKeys: jest.fn().mockReturnValue(['dropdown1', 'dropdown2']),
}));

const mockActivatedRoute = {
  snapshot: {
    queryParams: {},
    paramMap: { get: jest.fn().mockReturnValue(null) },
  },
  paramMap: of({
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        formPath: 'test-path',
        yardName: 'yard1',
        inspectionId: '100',
      };
      return key in map ? map[key] : null;
    }),
  }),
};

const mockRouter = {
  events: of(new NavigationEnd(1, '/test', '/test')),
  navigate: jest.fn(),
};

const mockDropdownService = {
  injectDropdownData: jest.fn().mockResolvedValue(true),
};
const mockAuthService = {
  isAuthenticated$: of(true),
  user$: of({ email: 'test@example.com' }),
};
const mockCommonApiService = {
  getForm: jest.fn().mockReturnValue(of({})),
  getInspectionDetailsById: jest.fn(),
};
const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
};
const mockTabNavigationService = {
  setupTabNavigation: jest.fn(),
  goToPreviousTab: jest.fn(),
  goToNextTab: jest.fn(),
};
const mockPdfGeneratorService = {
  downloadPDF: jest.fn().mockResolvedValue(true),
  downloadPDFFilledForm: jest.fn(),
};
const mockUserDetailService = {
  getEmail: jest.fn().mockReturnValue('test@example.com'),
  getToken: jest.fn().mockReturnValue('mockToken'),
};
const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
  submitOrDraftHelperNewForm: jest.fn(),
};
const mockFormioInstance = {
  on: jest.fn(),
  setPage: jest.fn(),
  form: { display: 'form', name: 'TestForm', path: 'testform' },
  pages: [],
  reset: jest.fn(),
  checkValidity: jest.fn().mockResolvedValue(true),
  showErrors: jest.fn(),
  submission: { data: { customerName: { id: '123' } } },
  data: {},
  _form: { path: 'testform', title: 'Mock Form Title' },
};

describe('FormDetailsFormComponent (Standalone)', () => {
  let fixture: ComponentFixture<FormDetailsFormComponent>;
  let component: FormDetailsFormComponent;

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
        { provide: CommonApiService, useValue: mockCommonApiService },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: TabNavigationService, useValue: mockTabNavigationService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
        { provide: UserDetailService, useValue: mockUserDetailService },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
      ],
    })
      .overrideComponent(FormDetailsFormComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormDetailsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should prevent default and call saveAsDraft when not loading', () => {
    const event = {
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;

    component.isLoading = false;
    component.saveAsDraft = jest.fn();

    component.handleEnterKey(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.saveAsDraft).toHaveBeenCalled();
  });

  it('should do nothing if isLoading is true', () => {
    const event = {
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;

    component.isLoading = true;
    component.saveAsDraft = jest.fn();

    component.handleEnterKey(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(component.saveAsDraft).not.toHaveBeenCalled();
  });

  it('should set isOnline to true and call syncAllOfflineFormSubmissions with correct callbacks', () => {
    component.isOnline = false;
    component.isSyncInProgress = false;
    component.isDownloadEnabled = false;

    component.online();

    expect(component.isOnline).toBe(true);
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();

    const [, setSyncProgress, setDownloadEnabled] =
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions.mock.calls[0];
    setSyncProgress(true);
    expect(component.isSyncInProgress).toBe(true);

    setDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should log error if formInstance is not initialized', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    component['formInstance'] = null;

    component.initFormListeners();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );
    consoleErrorSpy.mockRestore();
  });

  it('should attach change and submit listeners and update isDownloadEnabled', () => {
    const onMock = jest.fn();
    component['isDownloadEnabled'] = false;

    component['formInstance'] = {
      on: onMock,
    };

    component.initFormListeners();

    expect(onMock).toHaveBeenCalledWith('change', expect.any(Function));
    expect(onMock).toHaveBeenCalledWith('submit', expect.any(Function));

    const changeCallback = onMock.mock.calls.find(
      (call) => call[0] === 'change',
    )[1];
    component['isDownloadEnabled'] = true; // Set true to simulate valid condition
    changeCallback({ changed: true });

    expect(component['isDownloadEnabled']).toBe(true);

    const submitCallback = onMock.mock.calls.find(
      (call) => call[0] === 'submit',
    )[1];
    component['isDownloadEnabled'] = false;
    submitCallback({}); // simulate submission

    expect(component['isDownloadEnabled']).toBe(true);
  });

  it('should set isOnline to false when offline method is called', () => {
    component.isOnline = true;

    component['offline']();

    expect(component.isOnline).toBe(false);
  });

  it('should handle error during onFormLoad', async () => {
    const error = new Error('Load failed');
    (processComponents as jest.Mock).mockRejectedValueOnce(error);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockEvent = {
      form: { components: [] },
      getComponent: jest.fn(),
      _form: { title: 'Error Form' },
    };

    component.myFormComp = { formio: undefined } as any;

    await component.onFormLoad(mockEvent);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error during form load:',
      error,
    );
    expect(component.isLoading).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should call goToPreviousTab and goToNextTab', () => {
    component.formContainer = { nativeElement: {} } as any;

    component.onPreviousTab();
    expect(mockTabNavigationService.goToPreviousTab).toHaveBeenCalledWith(
      component.formContainer,
    );

    component.onNextTab();
    expect(mockTabNavigationService.goToNextTab).toHaveBeenCalledWith(
      component.formContainer,
    );
  });

  it('should prepare draft submission in saveAsDraft()', async () => {
    component.myFormComp = { formio: mockFormioInstance } as any;
    component.formTitle = 'My Form';
    component.isOnline = true;

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);

    await component.saveAsDraft();

    expect(component.isLoading).toBe(true);
    expect(
      mockSubmitDraftHelperService.submitOrDraftHelperNewForm,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'draft',
        formName: 'testform',
        submissionData: expect.objectContaining({
          CustomerID: '123',
          useremail: 'test@example.com',
          formTitle: 'My Form',
          formId: 1234567890,
          clientTimestamp: 1234567890,
          version: 1,
          status: 'Pending',
        }),
        setIsLoading: expect.any(Function),
        setIsDownloadEnabled: expect.any(Function),
        setCurrentFormName: expect.any(Function),
        setCurrentCustomerId: expect.any(Function),
        setCurrentFormId: expect.any(Function),
        showConfirm: expect.any(Function),
      }),
    );

    nowSpy.mockRestore();
  });

  it('should call submitOrDraftHelperNewForm with correct values in onSubmit()', () => {
    const now = Date.now;
    Date.now = jest.fn(() => 123456789);

    const submission = {
      formName: 'TestForm',
      customerName: { id: '123' },
      version: 1,
    };

    component.formTitle = 'My Test Form';
    component.isOnline = true;

    component.onSubmit(submission);

    expect(
      mockSubmitDraftHelperService.submitOrDraftHelperNewForm,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'submit',
        formName: 'testform',
        submissionData: expect.objectContaining({
          CustomerID: '123',
          useremail: 'test@example.com',
          formName: 'testform',
          version: 2,
          formId: 123456789,
          clientTimestamp: 123456789,
          synced: true,
          formTitle: 'My Test Form',
          status: 'Submitted',
        }),
        toastrMsg: 'Form submitted successfully.',
        isOnline: true,
        showConfirm: expect.any(Function),
      }),
    );

    Date.now = now; // Restore original
  });

  it('should call formio.reset() in resetForm()', () => {
    component.myFormComp = { formio: mockFormioInstance } as any;

    component.resetForm();

    expect(mockFormioInstance.reset).toHaveBeenCalled();
  });

  it('should warn if formio is not available in resetForm()', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    component.myFormComp = null as any;

    component.resetForm();

    expect(consoleSpy).toHaveBeenCalledWith('Form.io component not available!');
  });

  it('should set formSrc if formPath exists in route params', () => {
    component.ngOnInit();

    expect(component.formPath).toBe('test-path');
    expect(component.formSrc).toBe(`https://rhnnbdihewpekgz.form.io/test-path`); // Replace with your actual environment URL
  });

  it('should show error if formio is not available', async () => {
    component.myFormComp = null as any;
    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

    component.validateForm();

    await Promise.resolve(); // wait for the IIFE inside validateForm to run

    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Form component not found.',
    );
  });

  it('should show validation error and call showErrors if form is invalid', async () => {
    const checkValidityMock = jest.fn().mockResolvedValue(false);
    const showErrorsMock = jest.fn();

    component.myFormComp = {
      formio: {
        checkValidity: checkValidityMock,
        showErrors: showErrorsMock,
        submission: { data: {} },
        data: {},
        _form: { path: 'testform' },
      },
    } as any;

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );
    component.isLoading = true;

    component.validateForm();

    await Promise.resolve(); // Wait for async IIFE to finish

    expect(checkValidityMock).toHaveBeenCalledWith({}, true, {});
    expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
      'Please fill the highlighted fields before saving.',
    );
    expect(showErrorsMock).toHaveBeenCalledWith(true);
    expect(component.isLoading).toBe(false);
  });

  it('should call onSubmit with valid data if form is valid', async () => {
    const checkValidityMock = jest.fn().mockResolvedValue(true);
    const onSubmitSpy = jest.spyOn(component, 'onSubmit');

    const submissionData = { fieldA: 'valueA' };
    const formPath = 'testform';

    component.myFormComp = {
      formio: {
        checkValidity: checkValidityMock,
        showErrors: jest.fn(),
        submission: { data: submissionData },
        data: {},
        _form: { path: formPath },
      },
    } as any;

    component.validateForm();

    await Promise.resolve(); //  Let the async IIFE finish

    expect(component.isLoading).toBe(true);
    expect(onSubmitSpy).toHaveBeenCalledWith({
      ...submissionData,
      formName: formPath,
    });
  });

  it('should initialize form instance and listeners in ngAfterViewInit', () => {
    jest.useFakeTimers();

    const onMock = jest.fn((event: string, handler: Function) => {
      if (event === 'ready') {
        handler(); // Trigger 'ready' immediately
      }
    });

    const mockFormioInstance = {
      _form: {
        title: 'Test Title',
        modified: '2025-07-15T12:00:00Z',
      },
      on: onMock,
    };

    component.formioComponentPdf = {
      formio: mockFormioInstance,
    } as any;

    component.formContainer = { nativeElement: {} } as any;
    const tabNavSpy = jest.spyOn(
      mockTabNavigationService,
      'setupTabNavigation',
    );
    const initFormListenersSpy = jest.spyOn(component, 'initFormListeners');

    component.ngAfterViewInit();

    // Fast-forward intervals and timeouts
    jest.advanceTimersByTime(100); // run interval
    jest.advanceTimersByTime(300); // run setTimeout inside interval

    expect(component.formTitle).toBe('Test Title');
    expect(component.updatedFormOn).toBe('2025-07-15T12:00:00Z');
    expect(component.formInstance).toBe(mockFormioInstance);

    expect(onMock).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(initFormListenersSpy).toHaveBeenCalled();
    expect(tabNavSpy).toHaveBeenCalledWith(component.formContainer);

    jest.useRealTimers(); // Reset to normal
  });

  it('should default yardNameUrl to empty string if not in params', () => {
    const mockParamMap = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'formPath') return 'test-path';
        if (key === 'inspectionId') return '100';
        return null; // yardName is missing
      }),
    };

    mockActivatedRoute.paramMap = of(mockParamMap);

    component.ngOnInit();

    expect(component.yardNameUrl).toBe('');
  });

  it('should return early if selectedItem is invalid (null or non-object)', async () => {
    const mockAssetDropdown = {
      on: jest.fn((event: string, handler: Function) => {
        handler({ value: null }); // simulate invalid value
      }),
      getValue: () => null,
    };

    component.formInstance = {
      getComponent: jest.fn((key: string) =>
        key === 'CustomerName' ? mockAssetDropdown : undefined,
      ),
    };

    component.myFormComp = { formio: undefined } as any;

    await component.onFormLoad({
      form: { components: [] },
      getComponent: jest.fn(),
      _form: { title: 'Test' },
    });

    expect(component.formTitle).toBe('Test');
  });

  it('should show error if form is not present', async () => {
    component.myFormComp = null as any;

    await component.saveAsDraft();

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Form component not found.',
    );
  });

  it('should show error if form is invalid', async () => {
    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(false),
      submission: { data: {} },
      showErrors: jest.fn(),
      data: {},
    };

    component.myFormComp = { formio: mockForm } as any;

    await component.saveAsDraft();

    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Please fill the highlighted fields before saving.',
    );
    expect(mockForm.showErrors).toHaveBeenCalledWith(true);
    expect(component.isLoading).toBe(false);
  });

  it('should call submitDraftHelperService with correct setters and data', async () => {
    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(true),
      submission: {
        data: {
          customerName: { id: '456' },
        },
      },
      form: { name: 'SampleForm' },
      data: {},
    };

    component.myFormComp = { formio: mockForm } as any;
    component.formTitle = 'My Test Form';
    component.isOnline = true;

    const currentTime = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(currentTime);

    await component.saveAsDraft();

    const callArg =
      mockSubmitDraftHelperService.submitOrDraftHelperNewForm.mock.calls[0][0];

    expect(callArg.type).toBe('draft');
    expect(callArg.formName).toBe('sampleform');
    expect(callArg.toastrMsg).toBe('Draft saved successfully.');
    expect(callArg.setIsLoading).toBeDefined();
    expect(callArg.setIsDownloadEnabled).toBeDefined();
    expect(callArg.setCurrentFormName).toBeDefined();
    expect(callArg.setCurrentCustomerId).toBeDefined();
    expect(callArg.setCurrentFormId).toBeDefined();

    // Trigger each callback and test the effect
    callArg.setIsLoading(true);
    expect(component.isLoading).toBe(true);

    callArg.setIsDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);

    callArg.setCurrentFormName('new-form');
    expect(component.currentFormName).toBe('new-form');

    callArg.setCurrentCustomerId('cust123');
    expect(component.currentCustomerId).toBe('cust123');

    callArg.setCurrentFormId(123456);
    expect(component.currentFormId).toBe(123456);
  });

  it('should call state setter functions correctly in onSubmit()', () => {
    const mockSubmission = {
      formName: 'Test Form',
      customerName: { id: 'cust123' },
      version: 1,
    };

    const component = fixture.componentInstance;
    (component as any).userDetailService = mockUserDetailService;
    component.isOnline = true;
    component.formTitle = 'Inspection Form';

    // @ts-ignore
    const submitOrDraftHelperSpy = jest.spyOn(
      component.submitDraftHelperService,
      'submitOrDraftHelperNewForm',
    );
    component.onSubmit(mockSubmission);

    const callArgs = submitOrDraftHelperSpy.mock.calls[0][0];
    callArgs.setIsLoading(true);
    expect(component.isLoading).toBe(true);

    callArgs.setIsDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);

    callArgs.setCurrentFormName('test-form');
    expect(component.currentFormName).toBe('test-form');

    callArgs.setCurrentCustomerId('cust456');
    expect(component.currentCustomerId).toBe('cust456');

    callArgs.setCurrentFormId(999);
    expect(component.currentFormId).toBe(999);
  });

  it('should set currentFormModified to true if event.isModified is true', () => {
    component.currentFormModified = false;

    component.onFormChange({ isModified: true });

    expect(component.currentFormModified).toBe(true);
  });

  it('should not change currentFormModified if event.isModified is false', () => {
    component.currentFormModified = false;

    component.onFormChange({ isModified: false });

    expect(component.currentFormModified).toBe(false);
  });

  it('should not throw if event is undefined', () => {
    component.currentFormModified = false;

    expect(() => component.onFormChange(undefined)).not.toThrow();
    expect(component.currentFormModified).toBe(false);
  });

  it('should open confirmation dialog and return Promise if form is modified', () => {
    component.currentFormModified = true;
    const promise = component.showCancel();

    expect(component.formModifiedDialogVisible).toBe(true);
    expect(promise).toBeInstanceOf(Promise);
    expect(typeof component['formModifiedDialogPromiseResolver']).toBe(
      'function',
    );
  });

  it('should navigate back if form is not modified', () => {
    const backSpy = jest.spyOn(component['location'], 'back');
    component.currentFormModified = false;

    const result = component.showCancel();

    expect(backSpy).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
  it('should resolve promise with result and reset dialog state', () => {
    const resolverMock = jest.fn();
    const backSpy = jest.spyOn(component['location'], 'back');

    (component as any).formModifiedDialogPromiseResolver = resolverMock;

    component.handleModifiedDialogClose('cancel');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(resolverMock).toHaveBeenCalledWith('cancel');
    expect((component as any).formModifiedDialogPromiseResolver).toBeNull();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('should resolve promise and navigate back when result is confirm', () => {
    const resolverMock = jest.fn();
    const backSpy = jest.spyOn(component['location'], 'back');

    (component as any).formModifiedDialogPromiseResolver = resolverMock;

    component.handleModifiedDialogClose('confirm');

    expect(resolverMock).toHaveBeenCalledWith('confirm');
    expect(backSpy).toHaveBeenCalled();
  });

  describe('downloadPDF', () => {
    beforeEach(() => {
      component.isLoading = false;
      component.isDownloadEnabled = false;
      component.formContainer = {
        nativeElement: document.createElement('div'),
      } as any;
    });

    it('should show error and exit if formInstance is not available', async () => {
      component.formInstance = null as any;

      const kendoNotificationServiceSpy = jest.spyOn(
        kendoNotificationServiceMock,
        'showError',
      );

      await component.downloadPDF();

      expect(component.isLoading).toBe(false);
      expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
        'Form not initialized yet.',
      );
      expect(
        mockPdfGeneratorService.downloadPDFFilledForm,
      ).not.toHaveBeenCalled();
    });

    it('should call downloadPDFFilledForm and set flags correctly', async () => {
      const container = component.formContainer.nativeElement;

      component.formInstance = {
        _form: { title: 'Mock Form Title' },
      } as any;

      await component.downloadPDF();

      expect(
        mockPdfGeneratorService.downloadPDFFilledForm,
      ).toHaveBeenCalledWith(
        container,
        component.formInstance,
        'Mock Form Title',
        expect.any(String), // formattedDate (implicitly from closure or mock, assume handled)
      );
      expect(component.isLoading).toBe(false);
      expect(component.isDownloadEnabled).toBe(true);
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

    it('should set dialogVisible to true and resolve promise correctly', async () => {
      const confirmPromise = component.showConfirm();

      expect(component.dialogVisible).toBe(true);

      expect(typeof component['confirmResolver']).toBe('function');

      component['confirmResolver'](true);

      await expect(confirmPromise).resolves.toBe(true);
    });

    it('should resolve to false when confirmResolver is called with false', async () => {
      const confirmPromise = component.showConfirm();

      component['confirmResolver'](false);

      await expect(confirmPromise).resolves.toBe(false);
    });

    it('should resolve true and hide dialog when status is "confirm"', () => {
      const resolverMock = jest.fn();
      (component as any).confirmResolver = resolverMock;
      component.dialogVisible = true;

      component.handleDialogClose('confirm');

      expect(component.dialogVisible).toBe(false);
      expect(resolverMock).toHaveBeenCalledWith(true);
    });

    it('should resolve false and hide dialog when status is not "confirm"', () => {
      const resolverMock = jest.fn();
      (component as any).confirmResolver = resolverMock;
      component.dialogVisible = true;

      component.handleDialogClose('cancel');

      expect(component.dialogVisible).toBe(false);
      expect(resolverMock).toHaveBeenCalledWith(false);
    });

    it('should show error and return if form is not found in saveAsDraft', async () => {
      component.myFormComp = { formio: null } as any;
      const kendoNotificationServiceSpy = jest.spyOn(
        kendoNotificationServiceMock,
        'showError',
      );

      await component.saveAsDraft();

      expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
        'Form component not found.',
      );
    });

    it('should show validation error and return if form is invalid in saveAsDraft', async () => {
      component.myFormComp = {
        formio: {
          checkValidity: jest.fn().mockResolvedValue(false),
          submission: { data: {} },
          data: {},
          showErrors: jest.fn(),
        },
      } as any;

      const kendoNotificationServiceSpy = jest.spyOn(
        kendoNotificationServiceMock,
        'showError',
      );

      await component.saveAsDraft();

      expect(kendoNotificationServiceSpy).toHaveBeenCalledWith(
        'Please fill the highlighted fields before saving.',
      );
      expect(component.isLoading).toBe(false);
      expect(component.myFormComp.formio.showErrors).toHaveBeenCalledWith(true);
    });
  });
});
