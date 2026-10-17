import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormDetailsFilledComponent } from './form-details-filled.component';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormioModule } from '@formio/angular';
import { of } from 'rxjs';
import { AuthService } from '@auth0/auth0-angular';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { environment } from 'src/environments/environment';

const mockActivatedRoute = {
  paramMap: of({
    get: (key: string) => {
      if (key === 'formName') return 'mockForm';
      if (key === 'id') return '123';
      return null;
    },
  }),
};

const mockLocation = {
  back: jest.fn(),
};

describe('FormDetailsFilledComponent', () => {
  let component: FormDetailsFilledComponent;
  let fixture: ComponentFixture<FormDetailsFilledComponent>;
  let pdfService: PdfGeneratorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        FormDetailsFilledComponent,
        FormioModule,
      ],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        {
          provide: AuthService,
          useValue: { isAuthenticated$: of(true), user$: of({}) },
        },
        {
          provide: TabNavigationService,
          useValue: {
            setupTabNavigation: jest.fn(),
            goToPreviousTab: jest.fn(),
            goToNextTab: jest.fn(),
          },
        },
        {
          provide: PdfGeneratorService,
          useValue: {
            downloadPDFFilledForm: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SubmitDraftHelperService,
          useValue: {
            syncAllOfflineFormSubmissions: jest.fn(),
          },
        },
        { provide: Location, useValue: mockLocation },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FormDetailsFilledComponent);
    component = fixture.componentInstance;
    pdfService = TestBed.inject(PdfGeneratorService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call ngOnInit and set formPath and idUrl', () => {
    component.ngOnInit();
    expect(component.formPath).toBe('mockForm');
    expect(component.idUrl).toBe('123');
  });

  it('should trigger PDF download', async () => {
    component.formInstance = { _form: { title: 'Sample Title' } } as any;
    component.formContainer = {
      nativeElement: document.createElement('div'),
    } as ElementRef;

    await component.downloadPDF();
    expect(pdfService.downloadPDFFilledForm).toHaveBeenCalled();
  });

  it('should call tab navigation methods', () => {
    const tabService = TestBed.inject(TabNavigationService);
    component.formContainer = {
      nativeElement: document.createElement('div'),
    } as ElementRef;

    component.onPreviousTab();
    expect(tabService.goToPreviousTab).toHaveBeenCalled();

    component.onNextTab();
    expect(tabService.goToNextTab).toHaveBeenCalled();
  });

  it('should call syncAllOfflineFormSubmissions and update isSyncInProgress, then call ngOnInit', () => {
    const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');
    const syncSpy = jest.spyOn(
      component['submitDraftHelperService'],
      'syncAllOfflineFormSubmissions',
    );

    component.online();

    expect(syncSpy).toHaveBeenCalled();
    const [callback, progressCallback] = syncSpy.mock.calls[0];

    // simulate progress update
    progressCallback(true);
    expect(component['isSyncInProgress']).toBe(true);

    // simulate sync completion
    callback();
    expect(ngOnInitSpy).toHaveBeenCalled();
  });

  it('should initialize formioComponent and setup listeners in ngAfterViewInit', fakeAsync(() => {
    const mockOn = jest.fn((event, callback) => {
      if (event === 'ready') {
        callback(); // simulate immediate ready event
      }
    });

    const mockFormio = {
      _form: { title: 'Test Form Title' },
      on: mockOn,
    };

    const setupTabSpy = jest.spyOn(
      component.tabNavigationService,
      'setupTabNavigation',
    );

    component.formioComponent = {
      formio: mockFormio,
    } as any;

    component.formContainer = {
      nativeElement: document.createElement('div'),
    } as any;

    // Trigger ngAfterViewInit and advance timers
    component.ngAfterViewInit();
    tick(500);

    expect(component.formTitle).toBe('Test Form Title');
    expect(component.formInstance).toBe(mockFormio);
    expect(mockOn).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(setupTabSpy).toHaveBeenCalledWith(component.formContainer);
  }));

  it('should attach change and submit listeners to formInstance in initFormListeners', () => {
    const changeCallbackMap: Record<string, Function> = {};

    // to capture registered callbacks
    const mockOn = jest.fn((event: string, callback: Function) => {
      changeCallbackMap[event] = callback;
    });

    component.formInstance = {
      on: mockOn,
    } as any;

    component.isDownloadEnabled = false;

    component.initFormListeners();

    // Trigger `change` event with `event.changed`
    changeCallbackMap['change']({ changed: true });
    expect(component.isDownloadEnabled).toBe(false);

    component.isDownloadEnabled = true;

    // Trigger again with flag true
    changeCallbackMap['change']({ changed: true });
    expect(component.isDownloadEnabled).toBe(true);

    // Trigger `submit` event
    changeCallbackMap['submit']({});
    expect(component.isDownloadEnabled).toBe(true);

    // Check that `on` was registered with both events
    expect(mockOn).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('submit', expect.any(Function));
  });

  it('should log error if formInstance is not set', () => {
    component.formInstance = null as any;
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    component.initFormListeners();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );

    consoleErrorSpy.mockRestore();
  });

  it('should log error and return early if formInstance is not initialized', () => {
    component.formInstance = null as any;

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    (component as any).initFormListeners?.();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );

    consoleSpy.mockRestore();
  });

  it('should log an error and return early if formInstance is not initialized', async () => {
    const component = fixture.componentInstance;
    component['formInstance'] = null;
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const pdfSpy = jest.spyOn(
      component['pdfGeneratorService'],
      'downloadPDFFilledForm',
    );

    await component.downloadPDF();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Form not initialized yet.');
    expect(pdfSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should set formUrl and transform formData correctly on API response', () => {
    const mockResponse = {
      Result: {
        FormEntryDetail: JSON.stringify({
          productName: { name: 'Product A' },
          customerName: { name: 'Customer A' },
          yardName: { name: 'Yard A' },
          railCarId: { asset: 'RC123' },
        }),
      },
    };

    component.idUrl = '123';
    jest
      .spyOn(component['httpClient'], 'get')
      .mockReturnValue(of(mockResponse));

    component.ngOnInit();

    expect(component.formUrl).toBe(
      `${environment.formIoUrl}/form/${mockResponse.Result.FormEntryDetail}`,
    );
    expect(component.formData.productName).toBe('Product A');
    expect(component.formData.customerName).toBe('Customer A');
    expect(component.formData.yardName).toBe('Yard A');
    expect(component.formData.railCarId).toBe('RC123');
  });

  it('should call location.back when goBack is invoked', () => {
    const locationSpy = jest.spyOn(component['location'], 'back');
    component.goBack();
    expect(locationSpy).toHaveBeenCalled();
  });
});
