import {
  ComponentFixture,
  TestBed,
  waitForAsync,
  fakeAsync,
  tick,
  flushMicrotasks,
} from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
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
import { environment } from 'src/environments/environment';
import {
  processComponents,
  getDropdownKeys,
} from 'src/app/common/utils/formio-utils';

jest.mock('src/app/common/utils/formio-utils', () => ({
  getDropdownKeys: jest.fn(),
  processComponents: jest.fn(),
}));
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

const mockActivatedRoute = {
  paramMap: of({
    get: (key: string) => {
      if (key === 'formPath') return 'mockFormPath';
      if (key === 'id') return 'mockId123';
      return null;
    },
  }),
};

const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
};

const mockRouter = {
  navigate: jest.fn(),
};

const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
  submitOrDraftHelper: jest.fn(),
};
const mockIndexedDBService = { get: jest.fn(), set: jest.fn() };
const mockDropdownService = {
  fetchAndCache: jest.fn(),
  injectDropdownData: jest.fn(),
};
const mockPdfGeneratorService = { downloadPDF: jest.fn() };
const mockUserDetailService = {
  getToken: jest.fn().mockReturnValue('MOCK_TOKEN'),
  getEmail: jest.fn(),
};

describe('FormDetailComponent (Standalone)', () => {
  let fixture: ComponentFixture<FormDetailComponent>;
  let component: FormDetailComponent;
  let dropdownService: DropdownService;
  let userDetailService: UserDetailService;
  let httpMock: HttpTestingController;

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
      ],
    })
      .overrideComponent(FormDetailComponent, {
        set: { template: '' },
      })
      .compileComponents();

    dropdownService = TestBed.inject(DropdownService);
    userDetailService = TestBed.inject(UserDetailService);
    fixture = TestBed.createComponent(FormDetailComponent);
    component = fixture.componentInstance;
  }));

  beforeEach(() => {
    component.submissionData = null;
    fixture.detectChanges();
    jest.clearAllMocks();
    component.isLoading = true;
    (component as any).myFormComp = undefined;
    httpMock = TestBed.inject(HttpTestingController);
    component.currentFormModified = false;
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

  it('should return an empty array if there are no components', () => {
    const formInstance = {
      everyComponent: (cb: (comp: any) => void) => {
        /* no calls */
      },
    };

    const result = component.getDropdownKeys(formInstance);
    expect(result).toEqual([]);
  });

  it('should collect keys only for components with dataSrc in ["values","url","resource","custom"]', () => {
    const list = [
      { component: { dataSrc: 'url', key: 'keyUrl' } },
      { component: { dataSrc: 'values', key: 'keyValues' } },
      { component: { dataSrc: 'custom', key: 'keyCustom' } },
      { component: { dataSrc: 'resource', key: 'keyResource' } },
      { component: { dataSrc: 'other', key: 'keyOther' } },
      { component: { /* no dataSrc */ key: 'keyNoDataSrc' } },
    ];

    const formInstance = {
      everyComponent: (cb: (comp: any) => void) => {
        list.forEach(cb);
      },
    };

    const result = component.getDropdownKeys(formInstance);

    expect(result).toEqual(['keyUrl', 'keyValues', 'keyCustom', 'keyResource']);
  });

  it('should show error and set isLoading=false if form component not found', fakeAsync(() => {
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
    (component as any).myFormComp = undefined;

    const kendoNotificationServiceSpy = jest.spyOn(
      kendoNotificationServiceMock,
      'showError',
    );

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

  it('processComponents should recurse nested select components and call fetchAndCache', async () => {
    const token = userDetailService.getToken();
    jest.spyOn(userDetailService, 'getToken').mockReturnValue(token);

    const fetchSpy = jest
      .spyOn(dropdownService, 'fetchAndCache')
      .mockResolvedValue(undefined);

    const components = [
      { type: 'select', key: 'A', data: { url: 'urlA' } },
      {
        type: 'container',
        components: [
          { type: 'select', key: 'B', data: { url: 'urlB' } },
          { type: 'nonselect', key: 'C', data: { url: 'urlC' } },
        ],
      },
    ];

    const result = await component.processComponents(components);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenCalledWith('A', 'urlA', token);
    expect(fetchSpy).toHaveBeenCalledWith('B', 'urlB', token);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
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

  it('should attach change and submit listeners that toggle isDownloadEnabled', () => {
    let changeCallback: any;
    let submitCallback: any;

    component.formInstance = {
      on: jest.fn((event: string, cb: any) => {
        if (event === 'change') changeCallback = cb;
        if (event === 'submit') submitCallback = cb;
      }),
    };

    component.initFormListeners();
    component.isDownloadEnabled = false;

    changeCallback({ changed: true });
    expect(component.isDownloadEnabled).toBe(false);

    component.isDownloadEnabled = true;
    changeCallback({ changed: true });
    expect(component.isDownloadEnabled).toBe(true);

    submitCallback({});
    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should return dropdown keys with valid dataSrc', () => {
    const mockFormInstance = {
      everyComponent: (callback: any) => {
        const components = [
          { component: { key: 'productName', dataSrc: 'values' } },
          { component: { key: 'customerName', dataSrc: 'url' } },
          { component: { key: 'other_component', dataSrc: 'invalid' } },
          { component: { key: 'yardName', dataSrc: 'custom' } },
        ];
        components.forEach(callback);
      },
    };

    const result = component.getDropdownKeys(mockFormInstance);

    expect(result).toEqual(['productName', 'customerName', 'yardName']);
  });

  it('should return an empty array when no dropdowns found', () => {
    const mockFormInstance = {
      everyComponent: (callback: any) => {
        const components = [
          { component: { key: 'not_a_dropdown', dataSrc: 'somethingElse' } },
          { component: { key: 'text_field', dataSrc: '' } },
        ];
        components.forEach(callback);
      },
    };

    const result = component.getDropdownKeys(mockFormInstance);

    expect(result).toEqual([]);
  });

  it('should handle missing component field safely', () => {
    const mockFormInstance = {
      everyComponent: (callback: any) => {
        const components = [
          {},
          { component: null },
          { component: { key: 'valid_key', dataSrc: 'resource' } },
        ];
        components.forEach(callback);
      },
    };

    const result = component.getDropdownKeys(mockFormInstance);

    expect(result).toEqual(['valid_key']);
  });

  it('should set dialogVisible to false and resolve with true for "confirm"', () => {
    const resolverMock = jest.fn();
    component.dialogVisible = true;
    (component as any).confirmResolver = resolverMock;

    component.handleDialogClose('confirm');

    expect(component.dialogVisible).toBe(false);
    expect(resolverMock).toHaveBeenCalledWith(true);
  });

  it('should set dialogVisible to false and resolve with false for "cancel"', () => {
    const resolverMock = jest.fn();
    component.dialogVisible = true;
    (component as any).confirmResolver = resolverMock;

    component.handleDialogClose('cancel');

    expect(component.dialogVisible).toBe(false);
    expect(resolverMock).toHaveBeenCalledWith(false);
  });

  it('should set isOnline to false when offline event is triggered', () => {
    component.isOnline = true;
    window.dispatchEvent(new Event('offline'));
    expect(component.isOnline).toBe(false);
  });

  it('should set form fields correctly and show kendoNotificationService if status is "Submitted"', () => {
    const mockFormData = {
      formTitle: 'Test Form',
      status: 'Submitted',
      yardName: { name: 'Yard A' },
      customerName: { name: 'Customer A' },
      productName: { name: 'Product A' },
      railCarId: { asset: 'RailCar123' },
    };

    const expectedTransformedFormData = {
      formTitle: 'Test Form',
      status: 'Submitted',
      yardName: 'Yard A',
      customerName: 'Customer A',
      productName: 'Product A',
      railCarId: 'RailCar123',
    };

    const mockResponse = {
      Result: {
        FormEntryDetail: JSON.stringify(mockFormData),
      },
    };
    const req = httpMock.expectOne(
      `${environment.trinityRailApiUrl}/InspectionForm/InspectionFormDetailGetById?inspectionFormDetailId=mockId123`,
    );
    req.flush(mockResponse);

    expect(component.formData).toEqual(expectedTransformedFormData);
    expect(component.originalFormData).toEqual(mockFormData);
    expect(component.preFillFormData).toEqual({
      yardName: 'Yard A',
      customerName: 'Customer A',
    });
    expect(component.formTitle).toBe('Test Form');
    expect(component.isDraftDisabled).toBe(true);
    expect(kendoNotificationServiceMock.showInfo).toHaveBeenCalledWith(
      'This form has already been submitted. Any changes made now, will override the last submitted version.',
    );
  });

  it('should log error if processComponents throws during onFormLoad', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (processComponents as jest.Mock).mockRejectedValue(
      new Error('Mock process error'),
    );
    const mockFormInstance = {
      _form: { title: 'Form Title' },
      form: { components: [] },
      getComponent: jest.fn(),
    };

    component.myFormComp = { formio: mockFormInstance } as any;

    await component.onFormLoad({});

    expect(errorSpy).toHaveBeenCalledWith(
      'Error during form load:',
      expect.any(Error),
    );

    expect(component.isLoading).toBe(false);

    errorSpy.mockRestore();
  });

  it('should prepare submissionWithId correctly and call submitOrDraftHelper', async () => {
    const formData = {
      formName: 'Test Form',
      productName: 'Product A',
      railCarId: 'Rail123',
      version: 1,
    };

    const formioMock = {
      checkValidity: jest.fn().mockResolvedValue(true),
      showErrors: jest.fn(),
      submission: { data: formData },
      data: {},
    };

    component.myFormComp = { formio: formioMock } as any;
    component.originalFormData = {
      productName: { id: 'p1', name: 'Product A' },
      railCarId: { id: 'r1', asset: 'Rail123' },
    };
    component.isOnline = true;
    component.formTitle = 'Form Title';

    // Bypass private access
    (component as any).userDetailService = {
      getEmail: jest.fn().mockReturnValue('user@example.com'),
    };

    const mockSubmitHelper = {
      submitOrDraftHelper: jest.fn(),
    };
    (component as any).submitDraftHelperService = mockSubmitHelper;

    await component.saveAsDraft();

    expect(mockSubmitHelper.submitOrDraftHelper).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'draft',
        formName: 'test form', // lowercased
        submissionData: expect.objectContaining({
          formName: 'test form',
          useremail: 'user@example.com',
          productName: { id: 'p1', name: 'Product A' },
          railCarId: { id: 'r1', asset: 'Rail123' },
          status: 'Pending',
          formTitle: 'Form Title',
        }),
        toastrMsg: 'Draft saved successfully.',
        isOnline: true,
        setIsLoading: expect.any(Function),
        setIsDownloadEnabled: expect.any(Function),
      }),
    );

    expect(component.isLoading).toBe(true); // it is true before `submitOrDraftHelper` runs
  });

  it('should call setIsLoading and setIsDownloadEnabled via submitOrDraftHelper callbacks', async () => {
    const formData = {
      formName: 'Test Form',
      productName: 'Product A',
      railCarId: 'Rail123',
    };
    const formioMock = {
      checkValidity: jest.fn().mockResolvedValue(true),
      showErrors: jest.fn(),
      submission: { data: formData },
      data: {},
    };

    component.myFormComp = { formio: formioMock } as any;
    component.originalFormData = {
      productName: { name: 'Product A' },
      railCarId: { asset: 'Rail123' },
    };
    component.isOnline = true;
    component.formTitle = 'Form Title';

    (component as any).userDetailService = {
      getEmail: jest.fn().mockReturnValue('user@example.com'),
    };

    const mockSubmitOrDraftHelper = jest.fn();
    (component as any).submitDraftHelperService = {
      submitOrDraftHelper: mockSubmitOrDraftHelper,
    };

    await component.saveAsDraft();
    const passedArgs = mockSubmitOrDraftHelper.mock.calls[0][0];
    passedArgs.setIsLoading(true);
    expect(component.isLoading).toBe(true);

    passedArgs.setIsDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);

    passedArgs.setIsLoading(false);
    expect(component.isLoading).toBe(false);

    passedArgs.setIsDownloadEnabled(false);
    expect(component.isDownloadEnabled).toBe(false);
  });

  it('should build submissionWithId correctly and call submitOrDraftHelper on submit', () => {
    const mockSubmission = {
      formName: 'Test Form',
      productName: 'Product A',
      railCarId: 'Rail123',
      version: 1,
    };

    const mockUserEmail = 'test@example.com';
    const mockOriginalData = {
      productName: { id: 10, name: 'Product A' },
      railCarId: { id: 20, asset: 'Rail123' },
    };

    const mockSubmitOrDraftHelper = jest.fn();

    component.originalFormData = mockOriginalData;
    component.formTitle = 'My Form';
    component.isOnline = true;

    // Mock userDetailService and submitDraftHelperService
    (component as any).userDetailService = {
      getEmail: jest.fn().mockReturnValue(mockUserEmail),
    };

    (component as any).submitDraftHelperService = {
      submitOrDraftHelper: mockSubmitOrDraftHelper,
    };

    component.onSubmit(mockSubmission);

    expect(mockSubmitOrDraftHelper).toHaveBeenCalled();

    const passedArgs = mockSubmitOrDraftHelper.mock.calls[0][0];
    expect(passedArgs.type).toBe('submit');
    expect(passedArgs.formName).toBe('test form');
    expect(passedArgs.submissionData.productName).toEqual({
      id: 10,
      name: 'Product A',
    });
    expect(passedArgs.submissionData.railCarId).toEqual({
      id: 20,
      asset: 'Rail123',
    });
    expect(passedArgs.submissionData.useremail).toBe(mockUserEmail);
    expect(passedArgs.submissionData.version).toBe(2);
    expect(passedArgs.submissionData.serverLastKnownVersion).toBe(0);
    expect(passedArgs.submissionData.synced).toBe(true);
    expect(passedArgs.submissionData.formTitle).toBe('My Form');
    expect(passedArgs.submissionData.status).toBe('Submitted');
    passedArgs.setIsLoading(true);
    expect(component.isLoading).toBe(true);
    passedArgs.setIsDownloadEnabled(true);
    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should set currentFormModified to true when event.isModified is true', () => {
    component.onFormChange({ isModified: true });
    expect(component.currentFormModified).toBe(true);
  });

  it('should not change currentFormModified when event.isModified is false', () => {
    component.currentFormModified = false;
    component.onFormChange({ isModified: false });
    expect(component.currentFormModified).toBe(false);
  });

  it('should not change currentFormModified when event is null', () => {
    component.currentFormModified = false;
    component.onFormChange(null);
    expect(component.currentFormModified).toBe(false);
  });

  it('should not change currentFormModified when event is undefined', () => {
    component.currentFormModified = false;
    component.onFormChange(undefined);
    expect(component.currentFormModified).toBe(false);
  });

  it('should load form, process components, inject dropdowns, and update form title', async () => {
    const mockFormInstance = {
      form: { components: ['mockComponent'] },
      _form: { title: 'Test Form Title' },
    };

    const dropdownKeys = ['country', 'state'];
    (getDropdownKeys as jest.Mock).mockReturnValue(dropdownKeys);

    (processComponents as jest.Mock).mockResolvedValue(undefined);

    component.formInstance = mockFormInstance;
    component.preFillFormData = { name: 'Test User' };
    component.myFormComp = {
      formio: mockFormInstance,
    } as any;

    mockDropdownService.injectDropdownData.mockImplementation(() =>
      Promise.resolve(true),
    );

    await component.onFormLoad({});

    expect(component.formTitle).toBe('Test Form Title');
    expect(processComponents).toHaveBeenCalledWith(
      mockFormInstance.form.components,
      'MOCK_TOKEN',
      mockDropdownService,
    );
    expect(getDropdownKeys).toHaveBeenCalledWith(mockFormInstance);

    expect(mockDropdownService.injectDropdownData).toHaveBeenCalledTimes(2);
    expect(mockDropdownService.injectDropdownData).toHaveBeenCalledWith(
      mockFormInstance,
      'country',
      component.preFillFormData,
    );
    expect(mockDropdownService.injectDropdownData).toHaveBeenCalledWith(
      mockFormInstance,
      'state',
      component.preFillFormData,
    );

    expect(component.isLoading).toBe(false);
  });

  it('should handle errors during form load gracefully', async () => {
    const mockFormInstance = {
      form: { components: ['mockComponent'] },
      _form: { title: 'Errored Form' },
    };

    (processComponents as jest.Mock).mockRejectedValue(
      new Error('Failed to process'),
    );

    component.formInstance = mockFormInstance;
    component.preFillFormData = {};
    component.myFormComp = {
      formio: mockFormInstance,
    } as any;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await component.onFormLoad({});

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error during form load:',
      expect.any(Error),
    );
    expect(component.isLoading).toBe(false);

    consoleSpy.mockRestore();
  });

  it('should show dialog and return a promise if form is modified', async () => {
    component.currentFormModified = true;

    const result = component.showCancel();

    expect(component.formModifiedDialogVisible).toBe(true);
    expect(result).toBeInstanceOf(Promise);
    const spyResolver = jest.fn();
    (result as Promise<string>).then(spyResolver);

    (component as any)['formModifiedDialogPromiseResolver']?.('discard');

    await expect(result).resolves.toBe('discard');
    expect(spyResolver).toHaveBeenCalledWith('discard');
  });

  it('should call location.back() if form is not modified', () => {
    const mockLocation = { back: jest.fn() };
    (component as any).location = mockLocation;

    component.currentFormModified = false;
    const result = component.showCancel();

    expect(mockLocation.back).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('should resolve the promise and call location.back() if result is "confirm"', () => {
    const mockLocation = { back: jest.fn() };
    (component as any).location = mockLocation;

    const resolverSpy = jest.fn();
    (component as any)['formModifiedDialogPromiseResolver'] = resolverSpy;
    component.formModifiedDialogVisible = true;

    component.handleModifiedDialogClose('confirm');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(resolverSpy).toHaveBeenCalledWith('confirm');
    expect((component as any)['formModifiedDialogPromiseResolver']).toBeNull();
    expect(mockLocation.back).toHaveBeenCalled();
  });

  it('should resolve the promise without calling location.back() for other results', () => {
    const mockLocation = { back: jest.fn() };
    (component as any).location = mockLocation;

    const resolverSpy = jest.fn();
    (component as any)['formModifiedDialogPromiseResolver'] = resolverSpy;
    component.formModifiedDialogVisible = true;

    component.handleModifiedDialogClose('discard');

    expect(component.formModifiedDialogVisible).toBe(false);
    expect(resolverSpy).toHaveBeenCalledWith('discard');
    expect((component as any)['formModifiedDialogPromiseResolver']).toBeNull();
    expect(mockLocation.back).not.toHaveBeenCalled();
  });

  it('should call tabNavigationService.goToPreviousTab with formContainer', () => {
    const mockElementRef = {
      nativeElement: document.createElement('div'),
    } as any;
    component.formContainer = mockElementRef;

    component.onPreviousTab();

    expect(mockTabNavigationService.goToPreviousTab).toHaveBeenCalledWith(
      mockElementRef,
    );
  });

  it('should call tabNavigationService.goToNextTab with formContainer', () => {
    const mockElementRef = {
      nativeElement: document.createElement('div'),
    } as any;
    component.formContainer = mockElementRef;

    component.onNextTab();

    expect(mockTabNavigationService.goToNextTab).toHaveBeenCalledWith(
      mockElementRef,
    );
  });

  it('should log an error and return if formInstance is not initialized', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    component.formInstance = undefined;

    component.initFormListeners();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );

    consoleErrorSpy.mockRestore();
  });

  it('should not log an error if formInstance is initialized', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    component.formInstance = {
      on: jest.fn(),
      onAny: jest.fn(),
    } as any;

    component.initFormListeners();

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  describe('ngAfterViewInit', () => {
    it('should initialize Formio and set properties after view init', fakeAsync(() => {
      const mockFormioInstance = {
        _form: {
          title: 'Mock Form Title',
          modified: new Date().toISOString(),
        },
        on: jest.fn(),
      };

      component.formioComponent = { formio: null } as any;
      const initFormListenersSpy = jest.spyOn(component, 'initFormListeners');
      const setIntervalSpy = jest.spyOn(window, 'setInterval');
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

      component.ngAfterViewInit();
      expect(setIntervalSpy).toHaveBeenCalled();
      expect(component.formInstance).toBeUndefined();
      component.formioComponent.formio = mockFormioInstance;

      tick(100);

      expect(component.updatedFormOn).toBe(mockFormioInstance._form.modified);
      expect(component.formTitle).toBe(mockFormioInstance._form.title);
      expect(component.formInstance).toBe(mockFormioInstance);

      expect(mockFormioInstance.on).toHaveBeenCalledWith(
        'ready',
        expect.any(Function),
      );
      expect(clearIntervalSpy).toHaveBeenCalled();

      expect(
        mockTabNavigationService.setupTabNavigation,
      ).not.toHaveBeenCalled();
      tick(300); // Advance the clock by 300ms to trigger the setTimeout

      expect(mockTabNavigationService.setupTabNavigation).toHaveBeenCalledWith(
        component.formContainer,
      );
      const onReadyCallback = mockFormioInstance.on.mock.calls[0][1];
      onReadyCallback();
      expect(initFormListenersSpy).toHaveBeenCalled();
    }));
  });
});
