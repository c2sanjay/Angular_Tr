import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA, ElementRef } from '@angular/core';
import { of } from 'rxjs';
import { FormDetailComponent } from './formdetail.component';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { DropdownService } from 'src/app/common/services/dropdown.service';
import { AuthService } from '@auth0/auth0-angular';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { UserDetailService } from 'src/app/shared/services/user-details.service';
import { environment } from 'src/environments/environment';
describe('FormDetailComponent', () => {
  let component: FormDetailComponent;
  let fixture: ComponentFixture<FormDetailComponent>;
  let httpMock: HttpTestingController;

  const mockServices = {
    dropdownService: {
      injectDropdownData: jest.fn(),
      fetchAndCache: jest.fn(),
    },
    kendoNotificationServiceMock: {
      showSuccess: jest.fn(),
      showError: jest.fn(),
      showWarning: jest.fn(),
    },
    tabNavigation: {
      setupTabNavigation: jest.fn(),
      goToNextTab: jest.fn(),
      goToPreviousTab: jest.fn(),
    },
    pdfGenerator: {
      downloadPDFFilledForm: jest.fn(),
    },
    userDetail: {
      getEmail: jest.fn(() => 'test@example.com'),
      getToken: jest.fn(() => 'token'),
    },
    submitDraftHelper: {
      syncAllOfflineFormSubmissions: jest.fn(),
      submitOrDraftHelperNewForm: jest.fn(),
      submitOrDraftHelper: jest.fn(),
    },
    router: {
      navigate: jest.fn(),
    },
    activatedRoute: {
      paramMap: of({
        get: (key: string) => (key === 'formPath' ? 'testPath' : '123'),
      }),
      queryParamMap: of({ get: () => 'yard-1' }),
    },
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockServices.activatedRoute },
        { provide: Router, useValue: mockServices.router },
        {
          provide: KendoNotificationService,
          useValue: mockServices.kendoNotificationServiceMock,
        },
        { provide: PdfGeneratorService, useValue: mockServices.pdfGenerator },
        { provide: DropdownService, useValue: mockServices.dropdownService },
        { provide: AuthService, useValue: {} },
        { provide: TabNavigationService, useValue: mockServices.tabNavigation },
        {
          provide: SubmitDraftHelperService,
          useValue: mockServices.submitDraftHelper,
        },
        { provide: UserDetailService, useValue: mockServices.userDetail },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(FormDetailComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FormDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Default GET call mock with empty data to avoid open request error
    const req = httpMock.expectOne(
      `${environment.trinityRailApiUrl}/InspectionForm/InspectionFormDetailGetById?inspectionFormDetailId=123`,
    );
    req.flush({ Result: { FormEntryDetail: '{}' } });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set online/offline states and sync accordingly', () => {
    component.isOnline = false;
    const syncSpy = jest
      .spyOn(mockServices.submitDraftHelper, 'syncAllOfflineFormSubmissions')
      .mockImplementation((cb, setSync, setDownload) => {
        setSync(true);
        setDownload(true);
      });
    window.dispatchEvent(new Event('online'));
    expect(component.isOnline).toBe(true);
    expect(syncSpy).toHaveBeenCalled();
    expect(component.isSyncInProgress).toBe(true);
    expect(component.isDownloadEnabled).toBe(true);

    component.isOnline = true;
    window.dispatchEvent(new Event('offline'));
    expect(component.isOnline).toBe(false);
  });

  it('should navigate tabs correctly', () => {
    const el = new ElementRef(document.createElement('div'));
    component.formContainer = el;
    component.onPreviousTab();
    expect(mockServices.tabNavigation.goToPreviousTab).toHaveBeenCalledWith(el);
    component.onNextTab();
    expect(mockServices.tabNavigation.goToNextTab).toHaveBeenCalledWith(el);
  });

  it('should handle confirmation dialog logic', async () => {
    const promise = component.showConfirm();
    component['confirmResolver'](true);
    await expect(promise).resolves.toBe(true);
    expect(component.dialogVisible).toBe(true);

    const resolveMock = jest.fn();
    component['confirmResolver'] = resolveMock;
    component.dialogVisible = true;
    component.handleDialogClose('confirm');
    expect(resolveMock).toHaveBeenCalledWith(true);

    component.handleDialogClose('cancel');
    expect(resolveMock).toHaveBeenCalledWith(false);
  });

  it('should validate, save as draft, show errors, and submit form as expected', async () => {
    const setupFormMocks = (isValid: boolean) => {
      const mockForm = {
        checkValidity: jest.fn().mockResolvedValue(isValid),
        showErrors: jest.fn(),
        submission: { data: {} },
        data: {},
      };
      component.myFormComp = { formio: mockForm } as any;
      return mockForm;
    };

    const checkValidationError = async () => {
      const mockForm = setupFormMocks(false);
      component.isLoading = true;
      await component.saveAsDraft();
      expect(mockForm.checkValidity).toHaveBeenCalled();
      expect(mockForm.showErrors).toHaveBeenCalledWith(true);
      expect(
        mockServices.kendoNotificationServiceMock.showError,
      ).toHaveBeenCalledWith(
        'Please fill the highlighted fields before saving.',
      );
      expect(component.isLoading).toBe(false);
    };

    await checkValidationError();

    component.myFormComp = null as any;
    await component.saveAsDraft();
    expect(
      mockServices.kendoNotificationServiceMock.showError,
    ).toHaveBeenCalledWith('Form component not found.');
  });

  it('should validate form and submit if valid, otherwise show errors', async () => {
    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(true),
      submission: { data: { field1: 'value' } },
      data: {},
      showErrors: jest.fn(),
    };
    component.myFormComp = { formio: mockForm } as any;
    const onSubmitSpy = jest.spyOn(component, 'onSubmit').mockImplementation();
    component.validateForm();
    await new Promise((r) => setTimeout(r));
    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(onSubmitSpy).toHaveBeenCalledWith({ field1: 'value' });
  });

  it('should handle onSubmit logic with submitOrDraftHelper call', () => {
    const submission = {
      formName: 'MyForm',
      productName: 'Product A',
      railCarId: 'RC-101',
      version: 2,
    };
    component.originalFormData = {
      productName: { id: '123', name: '' },
      railCarId: { id: '456', asset: '' },
    };
    component.isOnline = true;
    component.formTitle = 'Test Form';
    const submitSpy = jest.spyOn(
      mockServices.submitDraftHelper,
      'submitOrDraftHelper',
    );
    component.onSubmit(submission);
    expect(mockServices.userDetail.getEmail).toHaveBeenCalled();
    expect(submitSpy).toHaveBeenCalled();
  });

  it('should handle resetForm and missing formio cases', () => {
    const resetSpy = jest.fn();
    component.myFormComp = { formio: { reset: resetSpy } } as any;
    component.resetForm();
    expect(resetSpy).toHaveBeenCalled();
    console.warn = jest.fn();
    component.myFormComp = null as any;
    component.resetForm();
    expect(console.warn).toHaveBeenCalledWith(
      'Form.io component not available!',
    );
  });

  it('should call lifecycle methods and setup listeners after view init', fakeAsync(() => {
    const mockForm = { title: 'Test Form', modified: '2025-07-10' };
    const mockFormioInstance = {
      _form: mockForm,
      on: jest.fn((event, cb) => {
        if (event === 'ready') cb();
      }),
      changed: jest.fn(),
    };
    component.formContainer = new ElementRef(document.createElement('div'));
    component.formioComponent = { formio: mockFormioInstance } as any;
    const initListenersSpy = jest.spyOn(component, 'initFormListeners');
    const tabNavSpy = jest.spyOn(
      mockServices.tabNavigation,
      'setupTabNavigation',
    );
    component.ngAfterViewInit();
    tick(400);
    expect(component.formTitle).toBe('Test Form');
    expect(initListenersSpy).toHaveBeenCalled();
    expect(tabNavSpy).toHaveBeenCalledWith(component.formContainer);
  }));

  it('should handle onFormLoad and inject dropdowns', async () => {
    const formInstanceMock: any = {
      _form: { title: 'Loaded Form', components: [] },
      form: { components: [] },
      getComponent: jest.fn(() => ({ on: jest.fn() })),
    };
    component.myFormComp = { formio: formInstanceMock } as any;
    component.preFillFormData = {};
    await component.onFormLoad(formInstanceMock);
    expect(component.formTitle).toBe('Loaded Form');
    expect(component.formInstance).toBe(formInstanceMock);
    expect(component.isLoading).toBe(false);
  });
  it('should call preventDefault and saveAsDraft if not loading', () => {
    const event = { preventDefault: jest.fn() } as any;
    component.isLoading = false;
    const saveSpy = jest.spyOn(component, 'saveAsDraft').mockImplementation();

    component.handleEnterKey(event as KeyboardEvent);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
  });

  it('should parse form data and set isLoading to false after success', fakeAsync(() => {
    const mockRawData = JSON.stringify({
      formTitle: 'Test Form',
      productName: { name: 'Product A' },
      customerName: { name: 'Customer A' },
      yardName: { name: 'Yard A' },
      railCarId: { asset: 'RC-123' },
      status: 'Pending',
    });

    const mockResponse = { Result: { FormEntryDetail: mockRawData } };

    component.idUrl = '123';
    component.isLoading = true;
    component.ngOnInit();

    const req = httpMock.expectOne(
      `${environment.trinityRailApiUrl}/InspectionForm/InspectionFormDetailGetById?inspectionFormDetailId=123`,
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);

    tick();

    expect(component.formData.formTitle).toBe('Test Form');
    expect(component.formData.productName).toBe('Product A');
    expect(component.formData.railCarId).toBe('RC-123');
  }));

  it('should show warning and navigate if form is already submitted', () => {
    jest.useFakeTimers(); // Needed for setTimeout control

    const submittedResponse = {
      Result: {
        FormEntryDetail: JSON.stringify({
          status: 'Submitted',
          formTitle: 'Test Form',
          productName: { name: 'Product A' },
          customerName: { name: 'Customer A' },
          yardName: { name: 'Yard A' },
          railCarId: { asset: 'RC-001' },
        }),
      },
    };

    component.ngOnInit();

    const req = httpMock.expectOne(
      `${environment.trinityRailApiUrl}/InspectionForm/InspectionFormDetailGetById?inspectionFormDetailId=123`,
    );
    req.flush(submittedResponse);

    expect(
      mockServices.kendoNotificationServiceMock.showWarning,
    ).toHaveBeenCalledWith(
      'This form has already been submitted and cannot be edited. Navigating you back to home page.',
    );

    jest.advanceTimersByTime(3500);

    expect(mockServices.router.navigate).toHaveBeenCalledWith(['/dashboard']);

    jest.useRealTimers(); // Cleanup
  });

  it('should prepare submissionWithId correctly and call submitOrDraftHelper', async () => {
    const mockFormData = {
      formName: 'TestForm',
      productName: 'Product A',
      railCarId: 'RC-123',
      version: 1,
    };

    const checkValidityMock = jest.fn().mockResolvedValue(true);

    component.myFormComp = {
      formio: {
        checkValidity: checkValidityMock,
        submission: { data: mockFormData },
        data: {},
        showErrors: jest.fn(),
      },
    } as any;

    component.originalFormData = {
      productName: { code: 'P1', name: 'Default Product' },
      railCarId: { asset: 'DefaultRC' },
    } as any;

    component.formTitle = 'Sample Form Title';
    component.isOnline = true;

    await component.saveAsDraft();

    expect(checkValidityMock).toHaveBeenCalled();
    expect(component.isLoading).toBe(true);

    expect(
      mockServices.submitDraftHelper.submitOrDraftHelper,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'draft',
        formName: 'testform',
        submissionData: expect.objectContaining({
          productName: { code: 'P1', name: 'Product A' },
          railCarId: { asset: 'RC-123' },
          useremail: 'test@example.com',
          formName: 'testform',
          version: 2,
          formTitle: 'Sample Form Title',
          synced: true,
          status: 'Pending',
        }),
        toastrMsg: 'Draft saved successfully.',
        isOnline: true,
        setIsLoading: expect.any(Function),
        setIsDownloadEnabled: expect.any(Function),
        showConfirm: expect.any(Function),
      }),
    );
  });
  it('should pass setIsLoading and setIsDownloadEnabled functions to submitOrDraftHelper', async () => {
    const mockFormData = {
      formName: 'TestForm',
      productName: 'Product A',
      railCarId: 'RC-123',
      version: 1,
    };

    const checkValidityMock = jest.fn().mockResolvedValue(true);

    component.myFormComp = {
      formio: {
        checkValidity: checkValidityMock,
        submission: { data: mockFormData },
        data: {},
        showErrors: jest.fn(),
      },
    } as any;

    component.originalFormData = {
      productName: { code: 'P1', name: 'Default Product' },
      railCarId: { asset: 'DefaultRC' },
    } as any;

    component.formTitle = 'Sample Form Title';
    component.isOnline = true;

    let capturedArgs: any;
    mockServices.submitDraftHelper.submitOrDraftHelper.mockImplementation(
      (args: any) => {
        capturedArgs = args;
      },
    );

    await component.saveAsDraft();

    expect(capturedArgs).toBeDefined();
    expect(typeof capturedArgs.setIsLoading).toBe('function');
    expect(typeof capturedArgs.setIsDownloadEnabled).toBe('function');
    capturedArgs.setIsLoading(true);
    expect(component.isLoading).toBe(true);

    capturedArgs.setIsLoading(false);
    expect(component.isLoading).toBe(false);
    capturedArgs.setIsDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);

    capturedArgs.setIsDownloadEnabled(false);
    expect(component.isDownloadEnabled).toBe(false);
  });
  it('should show error and set isLoading to false if form component is not found in validateForm', async () => {
    component.myFormComp = null as any; // Simulate missing form component
    component.isLoading = true; // Set initially true to check change

    component.validateForm();
    await new Promise((resolve) => setTimeout(resolve));

    expect(
      mockServices.kendoNotificationServiceMock.showError,
    ).toHaveBeenCalledWith('Form component not found.');
    expect(component.isLoading).toBe(false);
  });
  it('should show errors, kendoNotificationService message, and set isLoading to false if form is invalid in validateForm', async () => {
    const mockForm = {
      checkValidity: jest.fn().mockResolvedValue(false), // Invalid form
      showErrors: jest.fn(),
      submission: { data: {} },
      data: {},
    };
    component.myFormComp = { formio: mockForm } as any;
    component.isLoading = true;

    component.validateForm();
    await new Promise((resolve) => setTimeout(resolve));
    expect(mockForm.checkValidity).toHaveBeenCalledWith({}, true, {});
    expect(mockForm.showErrors).toHaveBeenCalledWith(true);
    expect(
      mockServices.kendoNotificationServiceMock.showError,
    ).toHaveBeenCalledWith('Please fill the highlighted fields before saving.');
    expect(component.isLoading).toBe(false);
  });
  it('should pass setIsLoading and setIsDownloadEnabled and update their values in onSubmit', () => {
    const mockSubmission = {
      formName: 'My Test Form',
      productName: 'Product A',
      railCarId: 'RC-101',
      version: 1,
    };

    component.originalFormData = {
      productName: { id: 'p1', name: '' },
      railCarId: { id: 'rc1', asset: '' },
    } as any;

    component.isOnline = true;
    component.formTitle = 'Test Form';
    component.isLoading = false;
    component.isDownloadEnabled = false;
    const submitSpy = jest
      .spyOn(mockServices.submitDraftHelper, 'submitOrDraftHelper')
      .mockImplementation((args: any) => {
        args.setIsLoading(true);
        args.setIsDownloadEnabled(true);
      });

    component.onSubmit(mockSubmission);

    expect(submitSpy).toHaveBeenCalled();
    expect(component.isLoading).toBe(true);
    expect(component.isDownloadEnabled).toBe(true);
  });
  it('should log error if formInstance is not initialized in initFormListeners', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    component.formInstance = undefined;

    component.initFormListeners();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );

    consoleErrorSpy.mockRestore();
  });
  it('should show error and set isLoading to false if formInstance is not initialized in downloadPDF', async () => {
    component.formInstance = null as any; // Simulate not initialized
    component.isLoading = false;

    await component.downloadPDF();

    expect(
      mockServices.kendoNotificationServiceMock.showError,
    ).toHaveBeenCalledWith('Form not initialized yet.');
    expect(component.isLoading).toBe(false);
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

  it('should not change currentFormModified if event is undefined', () => {
    component.currentFormModified = false;

    component.onFormChange(undefined);

    expect(component.currentFormModified).toBe(false);
  });
  it('should set formModifiedDialogVisible to true and return a Promise if currentFormModified is true', () => {
    component.currentFormModified = true;

    const result = component.showCancel();

    expect(component.formModifiedDialogVisible).toBe(true);
    expect(typeof result).toBe('object'); // Promise is an object
    expect(typeof (result as Promise<string>).then).toBe('function');
  });

  it('should call location.back if currentFormModified is false', () => {
    component.currentFormModified = false;
    const locationBackSpy = jest.spyOn(component['location'], 'back');

    const result = component.showCancel();

    expect(locationBackSpy).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
  it('should resolve the promise and reset dialog state', () => {
    component.formModifiedDialogVisible = true;
    const resolverMock = jest.fn();
    component['formModifiedDialogPromiseResolver'] = resolverMock;

    component.handleModifiedDialogClose('cancel');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(resolverMock).toHaveBeenCalledWith('cancel');
    expect(component['formModifiedDialogPromiseResolver']).toBeNull();
  });

  it('should call location.back when result is confirm', () => {
    const locationBackSpy = jest.spyOn(component['location'], 'back');
    const resolverMock = jest.fn();
    component['formModifiedDialogPromiseResolver'] = resolverMock;

    component.handleModifiedDialogClose('confirm');

    expect(locationBackSpy).toHaveBeenCalled();
  });

  it('should skip form change listener if event.changed is false in initFormListeners', () => {
    component.formInstance = {
      on: jest.fn((event, cb) => {
        if (event === 'change') cb({ changed: false });
        if (event === 'submit') cb({});
      }),
    };
    component.isDownloadEnabled = false;
    component.initFormListeners();
    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should call pdfGeneratorService.downloadPDFFilledForm successfully in downloadPDF', async () => {
    component.formInstance = {
      _form: { title: 'Test PDF' },
    } as any;
    component.formContainer = new ElementRef(document.createElement('div'));

    await component.downloadPDF();

    expect(mockServices.pdfGenerator.downloadPDFFilledForm).toHaveBeenCalled();
    expect(component.isPdfDownloading).toBe(false);
  });
});
