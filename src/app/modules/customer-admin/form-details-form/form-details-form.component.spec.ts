import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Component, Directive, Input, ElementRef } from '@angular/core';
import { of, Subject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { NavigationEnd, Router, ActivatedRoute, Event } from '@angular/router';
import { FormDetailsFormComponent } from './form-details-form.component';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { DropdownService } from 'src/app/common/services/dropdown.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { UserDetailService } from 'src/app/shared/services/user-details.service';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { AuthService } from '@auth0/auth0-angular';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { Location } from '@angular/common';
import {
  getDropdownKeys,
  processComponents,
} from 'src/app/common/utils/formio-utils';

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
    reset: jest.fn(),
    getComponent: jest.fn().mockReturnValue({
      on: jest.fn(),
      getValue: jest.fn(),
      setValue: jest.fn(),
    }),
    submission: { data: { customerName: { id: '123' } } },
    form: {
      name: 'testform',
      path: 'testform',
      display: 'form',
      title: 'Test Form',
    },
    _form: { path: 'testform', modified: '2023-01-01', title: 'Test Form' },
    data: {},
    pages: [],
    setPage: jest.fn(),
    showErrors: jest.fn(),
    checkValidity: jest.fn(),
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

const routerEvents$ = new Subject<Event>();
const mockRouter = {
  events: routerEvents$.asObservable(),
  navigate: jest.fn(),
  navigateByUrl: jest.fn(),
  url: '/dashboard/forms/OldYard',
};

const getParamMock = jest.fn((key: string) => {
  if (key === 'formPath') return 'mockPath';
  if (key === 'inspectionId') return '123';
  return null;
});

const mockActivatedRoute = {
  snapshot: {
    queryParams: {},
    paramMap: {
      get: getParamMock,
    },
  },
  paramMap: of({
    get: getParamMock,
  }),
};

const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
};

const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
  submitOrDraftHelperNewForm: jest.fn(),
};

const mockCommonApiService = {
  getForm: jest.fn().mockReturnValue(of({})),
  getInspectionDetailsById: jest.fn().mockReturnValue(
    of({
      IsSuccess: true,
      Result: {
        YardName: 'Mock Yard',
        CustomerName: 'Mock Customer',
      },
    }),
  ),
};

const mockAuthService = {
  isAuthenticated$: of(true),
  user$: of({ email: 'test@example.com' }),
};

const mockUserDetailService = {
  getEmail: jest.fn().mockReturnValue('test@example.com'),
  getToken: jest.fn().mockReturnValue('mock-token'),
};

const mockPdfGeneratorService = {
  downloadPDF: jest.fn().mockResolvedValue(true),
  downloadPDFFilledForm: jest.fn().mockResolvedValue(true),
};

const mockDropdownService = {
  injectDropdownData: jest.fn(),
};

const mockTabNavigationService = {
  setupTabNavigation: jest.fn(),
  goToPreviousTab: jest.fn(),
  goToNextTab: jest.fn(),
};

describe('FormDetailsFormComponent (Standalone)', () => {
  let component: FormDetailsFormComponent;
  let fixture: ComponentFixture<FormDetailsFormComponent>;
  let mockLocation: { back: jest.Mock };
  const mockFormioBase = {
    form: { name: 'TestForm' },
    submission: { data: { customerName: { id: '123' } } },
    data: {},
    showErrors: jest.fn(),
    checkValidity: jest.fn(),
  };

  beforeEach(waitForAsync(() => {
    mockLocation = {
      back: jest.fn(),
    };
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
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        { provide: CommonApiService, useValue: mockCommonApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserDetailService, useValue: mockUserDetailService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
        { provide: DropdownService, useValue: mockDropdownService },
        { provide: TabNavigationService, useValue: mockTabNavigationService },
        { provide: Location, useValue: mockLocation },
      ],
    })
      .overrideComponent(FormDetailsFormComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    fixture = TestBed.createComponent(FormDetailsFormComponent);
    component = fixture.componentInstance;
    component.formioComponent = new MockFormioComponent() as any;
    component.formContainer = new ElementRef(document.createElement('div'));
    (processComponents as jest.Mock).mockClear();
    (getDropdownKeys as jest.Mock).mockClear();
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set isSyncInProgress and isDownloadEnabled when online is triggered', () => {
    mockSubmitDraftHelperService.syncAllOfflineFormSubmissions = jest.fn(
      (
        noop: any,
        setSyncInProgress: (val: boolean) => void,
        setDownloadEnabled: (val: boolean) => void,
      ) => {
        setSyncInProgress(true);
        expect(component.isSyncInProgress).toBe(true);

        setSyncInProgress(false);
        expect(component.isSyncInProgress).toBe(false);

        setDownloadEnabled(true);
        expect(component.isDownloadEnabled).toBe(true);

        setDownloadEnabled(false);
        expect(component.isDownloadEnabled).toBe(false);
      },
    );
    component.online();
    expect(component.isOnline).toBe(true);
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();
  });

  it('should sync drafts on online()', () => {
    component.isOnline = false;
    component.online();
    expect(component.isOnline).toBe(true);
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();
  });

  it('should prevent Enter key default when not loading', () => {
    const preventDefault = jest.fn();
    const event = { preventDefault } as unknown as KeyboardEvent;
    component.isLoading = false;
    component.saveAsDraft = jest.fn();
    component.handleEnterKey(event);
    expect(preventDefault).toHaveBeenCalled();
    expect(component.saveAsDraft).toHaveBeenCalled();
  });

  it('should not save draft if loading', () => {
    const preventDefault = jest.fn();
    const event = { preventDefault } as unknown as KeyboardEvent;
    component.isLoading = true;
    component.saveAsDraft = jest.fn();
    component.handleEnterKey(event);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(component.saveAsDraft).not.toHaveBeenCalled();
  });

  it('should clear sessionStorage on NavigationEnd', () => {
    sessionStorage.setItem('formSubmitted', 'true');
    sessionStorage.setItem('submissionTimestamp', '123');
    routerEvents$.next(new NavigationEnd(1, '/test', '/test'));
    expect(sessionStorage.getItem('formSubmitted')).toBeNull();
    expect(sessionStorage.getItem('submissionTimestamp')).toBeNull();
  });

  it('should set offline state correctly', () => {
    component.isOnline = true;
    window.dispatchEvent(new Event('offline'));
    expect(component.isOnline).toBe(false);
  });

  it('should navigate to encoded Name if form is assigned', () => {
    const mockValue = {
      Assigned: true,
      Name: 'Mock Yard/Location',
    };
    mockRouter.url = '/dashboard/forms/OldYard';
    const encodedName = encodeURIComponent(mockValue.Name);
    const expectedUrl = `/dashboard/forms/${encodedName}`;
    component.onDropdownChange(mockValue);
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith(expectedUrl);
  });

  it('should show error if form component is not found', async () => {
    (component.myFormComp as any) = null;

    component.validateForm();

    await Promise.resolve();

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Form component not found.',
    );
  });

  it('should show validation error and stop if form is invalid', async () => {
    component.myFormComp = {
      formio: {
        checkValidity: jest.fn().mockResolvedValue(false),
        showErrors: jest.fn(),
        submission: { data: {} },
        data: {},
      },
    } as any;

    component.validateForm();
    await Promise.resolve();

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Please fill the highlighted fields before saving.',
    );
    expect(component.myFormComp.formio.showErrors).toHaveBeenCalledWith(true);
    expect(component.isLoading).toBe(false);
  });

  it('should validate form and call onSubmit if valid', async () => {
    const mockFormio = {
      checkValidity: jest.fn().mockResolvedValue(true),
      submission: { data: { customerName: { id: '123' } } },
      _form: { path: 'formPath' },
      form: {},
      data: {},
    };

    component.myFormComp = {
      formio: mockFormio,
    } as any;

    const onSubmitSpy = jest.spyOn(component, 'onSubmit');

    component.validateForm();

    await new Promise((resolve) => setTimeout(resolve));

    expect(onSubmitSpy).toHaveBeenCalledWith({
      ...mockFormio.submission.data,
      formName: 'formPath',
    });
  });

  it('should handle valid draft save', async () => {
    mockSubmitDraftHelperService.submitOrDraftHelperNewForm.mockImplementation(
      ({ setIsLoading }) => {
        setIsLoading(false);
      },
    );

    const mockFormio = {
      checkValidity: jest.fn().mockResolvedValue(true),
      form: { name: 'TestForm' },
      submission: { data: { customerName: { id: '123' } } },
      showErrors: jest.fn(),
    };

    component.myFormComp = {
      formio: mockFormio,
    } as any;

    await component.saveAsDraft();

    expect(
      mockSubmitDraftHelperService.submitOrDraftHelperNewForm,
    ).toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
  });

  it('should show error when form is invalid during draft save', async () => {
    const mockFormio = {
      checkValidity: jest.fn().mockResolvedValue(false),
      showErrors: jest.fn(),
      submission: { data: {} },
      form: { name: 'TestForm' },
    };
    component.myFormComp = {
      formio: mockFormio,
    } as any;

    await component.saveAsDraft();
    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Please fill the highlighted fields before saving.',
    );
    expect(mockFormio.showErrors).toHaveBeenCalledWith(true);
  });

  it('should initialize formioComponent in ngAfterViewInit()', (done) => {
    const mockForm = {
      _form: {
        title: 'Test Form Title',
        modified: '2024-07-01T12:00:00Z',
      },
      on: jest.fn((event, cb) => {
        if (event === 'ready') {
          cb(); // simulate ready event
        }
      }),
    };
    component.formioComponent = {
      formio: mockForm,
    } as any;
    const initFormListenersSpy = jest.spyOn(component, 'initFormListeners');
    const setupTabSpy = jest.spyOn(
      mockTabNavigationService,
      'setupTabNavigation',
    );

    component.ngAfterViewInit();
    setTimeout(() => {
      expect(component.formTitle).toBe('Test Form Title');
      expect(component.updatedFormOn).toBe('2024-07-01T12:00:00Z');
      expect(component.formInstance).toBe(mockForm);
      expect(initFormListenersSpy).toHaveBeenCalled();
      expect(setupTabSpy).toHaveBeenCalledWith(component.formContainer);
      done();
    }, 500);
  });

  it('should keep isDownloadEnabled true when form change event is triggered and isDownloadEnabled is already true', () => {
    component.isDownloadEnabled = true;
    const mockOn = jest.fn((event: string, callback: Function) => {
      if (event === 'change') {
        callback({ changed: true });
      }
    });

    component.formInstance = {
      on: mockOn,
    } as any;

    component.initFormListeners();

    expect(component.isDownloadEnabled).toBe(true);
    expect(mockOn).toHaveBeenCalledWith('change', expect.any(Function));
  });

  describe('Draft Save', () => {
    it('should save valid draft', async () => {
      const now = 1720600000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const mockForm = {
        ...mockFormioBase,
        checkValidity: jest.fn().mockResolvedValue(true),
      };
      component.myFormComp = { formio: mockForm } as any;
      component.formTitle = 'My Title';
      component.isOnline = true;
      await component.saveAsDraft();
      expect(
        mockSubmitDraftHelperService.submitOrDraftHelperNewForm,
      ).toHaveBeenCalled();
    });

    it('should error if form component not found', async () => {
      component.myFormComp = undefined as any;
      await component.saveAsDraft();
      expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
        'Form component not found.',
      );
    });

    it('should show validation error for invalid form', async () => {
      const mockForm = {
        ...mockFormioBase,
        checkValidity: jest.fn().mockResolvedValue(false),
      };
      component.myFormComp = { formio: mockForm } as any;
      await component.saveAsDraft();
      expect(mockForm.showErrors).toHaveBeenCalledWith(true);
      expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
        'Please fill the highlighted fields before saving.',
      );
    });
  });

  it('should call submit helper with correct payload', () => {
    const time = 1720600000000;
    jest.spyOn(Date, 'now').mockReturnValue(time);
    component.isOnline = true;
    component.formTitle = 'My Title';
    component.onSubmit({
      formName: 'TestForm',
      customerName: { id: '456' },
      version: 1,
    });
    expect(
      mockSubmitDraftHelperService.submitOrDraftHelperNewForm,
    ).toHaveBeenCalled();
  });

  it('should reset form if present', () => {
    const reset = jest.fn();
    component.myFormComp = { formio: { reset } } as any;
    component.resetForm();
    expect(reset).toHaveBeenCalled();
  });

  it('should warn if resetForm called without formio', () => {
    console.warn = jest.fn();
    component.myFormComp = null as any;
    component.resetForm();
    expect(console.warn).toHaveBeenCalledWith(
      'Form.io component not available!',
    );
  });

  it('should init listeners', () => {
    const listeners: Record<string, Function> = {};
    component.formInstance = {
      on: (evt: any, cb: any) => (listeners[evt] = cb),
    } as any;
    component.isDownloadEnabled = true;
    component.initFormListeners();
    listeners['change']({});
    listeners['submit']({});
    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should log error if formInstance missing in initListeners', () => {
    console.error = jest.fn();
    component.formInstance = null as any;
    component.initFormListeners();
    expect(console.error).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );
  });

  it('should handle confirmation dialog', async () => {
    const confirm = component.showConfirm();
    component['confirmResolver'](true);
    await expect(confirm).resolves.toBe(true);
  });

  it('should handle dialog close with confirm', () => {
    const resolver = jest.fn();
    component.dialogVisible = true;
    component['confirmResolver'] = resolver;
    component.handleDialogClose('confirm');
    expect(resolver).toHaveBeenCalledWith(true);
    expect(component.dialogVisible).toBe(false);
  });

  it('should handle dialog close with cancel', () => {
    const resolver = jest.fn();
    component.dialogVisible = true;
    component['confirmResolver'] = resolver;
    component.handleDialogClose('cancel');
    expect(resolver).toHaveBeenCalledWith(false);
    expect(component.dialogVisible).toBe(false);
  });

  it('should handle PDF download flow and call service', async () => {
    const mockFormio = {
      _form: { title: 'Test Form' },
    };
    component.myFormComp = {
      formio: mockFormio,
    } as any;
    component.formInstance = component.myFormComp.formio;

    component.formContainer = new ElementRef(document.createElement('div'));

    await component.downloadPDF();

    expect(mockPdfGeneratorService.downloadPDFFilledForm).toHaveBeenCalledWith(
      component.formContainer.nativeElement,
      mockFormio,
      'Test Form',
      expect.any(String), // formattedDate
    );

    expect(component.isPdfDownloading).toBe(false);
  });

  it('should show warning if formInstance not available on downloadPDF', async () => {
    component.formInstance = null;
    await component.downloadPDF();
    expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
      'Form not initialized yet.',
    );
    expect(component.isPdfDownloading).toBe(false);
  });

  it('should show info kendoNotificationService if form is not assigned', () => {
    const mockValue = {
      Assigned: false,
      Name: 'Unassigned Yard',
    };

    component.onDropdownChange(mockValue);

    expect(kendoNotificationServiceMock.showInfo).toHaveBeenCalledWith(
      'The following form is not assigned to Unassigned Yard yard.',
    );
  });

  it('should process components and inject dropdowns', async () => {
    const mockDropdownKeys = ['state', 'city'];

    (processComponents as jest.Mock).mockResolvedValue(undefined);
    (getDropdownKeys as jest.Mock).mockReturnValue(mockDropdownKeys);

    const injectDropdownDataMock = jest.fn().mockResolvedValue(undefined);
    (component as any).dropdownService = {
      injectDropdownData: injectDropdownDataMock,
    };

    const formioMock = {
      form: { components: [] },
      _form: { title: 'My Form' },
      getComponent: jest.fn(),
    };

    component.myFormComp = { formio: formioMock } as any;

    await component.onFormLoad({});

    expect(component.formTitle).toBe('My Form');
    expect(processComponents).toHaveBeenCalledWith(
      formioMock.form.components,
      mockUserDetailService.getToken(),
      expect.anything(),
    );
    expect(getDropdownKeys).toHaveBeenCalledWith(formioMock);
    expect(injectDropdownDataMock).toHaveBeenCalledTimes(
      mockDropdownKeys.length,
    );
  });

  it('should call processComponents and inject dropdowns', async () => {
    const mockFormInstance = {
      form: { components: [] },
      _form: { title: 'My Form' },
      getComponent: jest.fn().mockReturnValue({
        on: jest.fn(),
        getValue: jest.fn().mockReturnValue({ id: 'C001', name: 'Customer A' }),
        setValue: jest.fn(),
      }),
    };

    component.myFormComp = { formio: mockFormInstance } as any;
    component.preFillFormData = {};

    await component.onFormLoad({});

    expect(component.formTitle).toBe('My Form');
    expect(mockUserDetailService.getToken).toHaveBeenCalled();
    expect(mockDropdownService.injectDropdownData).toHaveBeenCalled();
  });

  it('should call goToPreviousTab with formContainer', () => {
    component.formContainer = new ElementRef(document.createElement('div'));
    component.onPreviousTab();
    expect(mockTabNavigationService.goToPreviousTab).toHaveBeenCalledWith(
      component.formContainer,
    );
  });

  it('should call goToNextTab with formContainer', () => {
    component.formContainer = new ElementRef(document.createElement('div'));
    component.onNextTab();
    expect(mockTabNavigationService.goToNextTab).toHaveBeenCalledWith(
      component.formContainer,
    );
  });

  it('should log an error if processComponents throws', async () => {
    const mockError = new Error('Mock form load error');
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const mockFormInstance = {
      form: { components: [] },
      getComponent: jest.fn(),
      _form: { title: 'Test Form Title' },
    };

    component.myFormComp = { formio: mockFormInstance } as any;
    jest.mocked(processComponents).mockRejectedValue(mockError);
    await component.onFormLoad({}); // trigger with dummy event
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error during form load:',
      mockError,
    );
    consoleErrorSpy.mockRestore();
  });

  it('should update form state using setter callbacks from submitOrDraftHelperNewForm', async () => {
    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(true),
      showErrors: jest.fn(),
      submission: { data: { customerName: { id: '123' } } },
      form: { name: 'MyForm' },
      data: {},
    };
    component.myFormComp = { formio: mockForm } as any;
    component.formTitle = 'Test Form Title';
    component.isOnline = true;
    jest
      .spyOn(component['userDetailService'], 'getEmail')
      .mockReturnValue('test@example.com');

    const mockSubmitOrDraftHelper = jest
      .spyOn(
        component['submitDraftHelperService'],
        'submitOrDraftHelperNewForm',
      )
      .mockImplementation((config: any) => {
        config.setIsDownloadEnabled(true);
        config.setCurrentFormName('my-form');
        config.setCurrentCustomerId('123');
        config.setCurrentFormId(999999);

        return Promise.resolve();
      });
    await component.saveAsDraft();
    expect(mockSubmitOrDraftHelper).toHaveBeenCalled();
    expect(component.isDownloadEnabled).toBe(true);
    expect(component.currentFormName).toBe('my-form');
    expect(component.currentCustomerId).toBe('123');
    expect(component.currentFormId).toBe(999999);
  });
  it('should update form state using setter callbacks from onSubmit', () => {
    const mockSubmission = {
      formName: 'MyForm',
      customerName: { id: '456' },
      version: 2,
    };

    component.formTitle = 'Submitted Title';
    component.isOnline = true;

    jest
      .spyOn(component['userDetailService'], 'getEmail')
      .mockReturnValue('test@example.com');

    const mockSubmitOrDraftHelper = jest
      .spyOn(
        component['submitDraftHelperService'],
        'submitOrDraftHelperNewForm',
      )
      .mockImplementation((config: any) => {
        config.setIsDownloadEnabled(true);
        config.setCurrentFormName('my-form');
        config.setCurrentCustomerId('456');
        config.setCurrentFormId(987654321);

        return Promise.resolve(); // async compatible
      });
    component.onSubmit(mockSubmission);
    expect(mockSubmitOrDraftHelper).toHaveBeenCalled();
    expect(component.isDownloadEnabled).toBe(true);
    expect(component.currentFormName).toBe('my-form');
    expect(component.currentCustomerId).toBe('456');
    expect(component.currentFormId).toBe(987654321);
  });
  it('should set currentFormModified to true when event.isModified is true', () => {
    component.currentFormModified = false;

    const mockEvent = { isModified: true };
    component.onFormChange(mockEvent);

    expect(component.currentFormModified).toBe(true);
  });

  it('should not change currentFormModified when event.isModified is false or undefined', () => {
    component.currentFormModified = false;

    component.onFormChange({ isModified: false });
    expect(component.currentFormModified).toBe(false);

    component.onFormChange({});
    expect(component.currentFormModified).toBe(false);

    component.onFormChange(null);
    expect(component.currentFormModified).toBe(false);
  });
  it('should show confirmation dialog and return a Promise when form is modified', () => {
    component.currentFormModified = true;

    const promise = component.showCancel();

    expect(component.formModifiedDialogVisible).toBe(true);
    expect(typeof promise).toBe('object'); // It's a Promise
    expect(promise).toBeInstanceOf(Promise);
    expect((component as any).formModifiedDialogPromiseResolver).toBeInstanceOf(
      Function,
    );
  });

  it('should call location.back() when form is not modified', () => {
    component.currentFormModified = false;

    const locationBackSpy = jest.spyOn(component['location'], 'back');
    const result = component.showCancel();

    expect(locationBackSpy).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
  it('should resolve promise and call location.back() if result is "confirm"', () => {
    const resolverMock = jest.fn();
    (component as any).formModifiedDialogPromiseResolver = resolverMock;

    component.handleModifiedDialogClose('confirm');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(resolverMock).toHaveBeenCalledWith('confirm');
    expect(mockLocation.back).toHaveBeenCalled();
  });

  it('should resolve promise but not call location.back() if result is not "confirm"', () => {
    const resolverMock = jest.fn();
    (component as any).formModifiedDialogPromiseResolver = resolverMock;

    component.handleModifiedDialogClose('cancel');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(resolverMock).toHaveBeenCalledWith('cancel');
    expect(mockLocation.back).not.toHaveBeenCalled();
  });
});
