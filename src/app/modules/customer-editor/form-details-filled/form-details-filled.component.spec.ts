import {
  ComponentFixture,
  TestBed,
  waitForAsync,
  fakeAsync,
  tick,
  flush,
} from '@angular/core/testing';
import { Component, Directive, Input, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FormDetailsFilledComponent } from './form-details-filled.component';
import { AuthService } from '@auth0/auth0-angular';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { HttpClient } from '@angular/common/http';
@Component({ selector: 'formio', template: '' })
class MockFormioComponent {
  @Input() form: any;
  @Input() submission: any;
  formio = {
    _form: { title: 'Mock Title', modified: '2024-01-01T00:00:00Z' },
    on: jest.fn((event: string, callback: () => void) => {
      if (event === 'ready') callback();
    }),
  };
}
@Component({ selector: 'app-rsi-topbar', template: '' })
class MockTopbar {}

@Component({ selector: 'app-rsi-sidebar', template: '' })
class MockSidebar {}

@Directive({ selector: '[kendoGrid]' })
class MockKendoGridDirective {}

const mockFormResponse = {
  Result: {
    FormEntryDetail: JSON.stringify({
      productName: { name: 'Product A' },
      customerName: { name: 'Customer A' },
      yardName: { name: 'Yard A' },
      railCarId: { asset: 'Asset A' },
    }),
  },
};

const mockLocation = {
  back: jest.fn(),
};

describe('FormDetailsFilledComponent (Standalone)', () => {
  let fixture: ComponentFixture<FormDetailsFilledComponent>;
  let component: FormDetailsFilledComponent;

  const mockHttpClient = {
    get: jest.fn().mockReturnValue(of(mockFormResponse)),
  };

  const mockAuthService = {
    user$: of({ name: 'Test User' }),
  };

  const mockTabNavigationService = {
    setupTabNavigation: jest.fn(),
    goToNextTab: jest.fn(),
    goToPreviousTab: jest.fn(),
  };

  const mockSubmitDraftHelperService = {
    syncAllOfflineFormSubmissions: jest.fn(),
  };

  const mockPdfGeneratorService = {
    downloadPDFFilledForm: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FormDetailsFilledComponent, HttpClientTestingModule],
      declarations: [
        MockFormioComponent,
        MockTopbar,
        MockSidebar,
        MockKendoGridDirective,
      ],
      providers: [
        provideAnimations(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: TabNavigationService, useValue: mockTabNavigationService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        { provide: HttpClient, useValue: mockHttpClient },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (key: string) => {
                if (key === 'formName') return 'testForm';
                if (key === 'id') return '123';
                return 'Yard X';
              },
            }),
            queryParamMap: of({ get: () => '' }),
          },
        },
        { provide: Location, useValue: mockLocation },
      ],
    })
      .overrideComponent(FormDetailsFilledComponent, {
        set: { template: '<formio></formio><div #formContainer></div>' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormDetailsFilledComponent);
    component = fixture.componentInstance;
    component.formContainer = new ElementRef(document.createElement('div'));
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize formSrc and formData in ngOnInit', () => {
    component.ngOnInit();
    expect(component.formSrc).toContain('testForm');
    expect(component.formData.productName).toBe('Product A');
    expect(component.formData.customerName).toBe('Customer A');
    expect(component.formData.yardName).toBe('Yard A');
    expect(component.formData.railCarId).toBe('Asset A');
  });

  it('should trigger downloadPDF and call downloadPDFFilledForm', async () => {
    component.formInstance = { _form: { title: 'Form A' } } as any;
    component.formContainer = new ElementRef(document.createElement('div'));
    await component.downloadPDF();
    expect(mockPdfGeneratorService.downloadPDFFilledForm).toHaveBeenCalled();
    expect(component.isPdfDownloading).toBe(false);
  });

  it('should handle missing formInstance in downloadPDF()', async () => {
    component.formInstance = null as any;
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    await component.downloadPDF();
    expect(consoleSpy).toHaveBeenCalledWith('Form not initialized yet.');
    consoleSpy.mockRestore();
  });

  it('should update form instance and tab navigation in ngAfterViewInit()', fakeAsync(() => {
    const mockFormio = {
      _form: { title: 'Test Form', modified: '2024-01-01' },
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'ready') callback();
      }),
    };
    component.formioComponent = { formio: mockFormio } as any;
    component.ngAfterViewInit();
    tick(100);
    flush();

    expect(component.formTitle).toBe('Test Form');
    expect(component.updatedFormOn).toBe('2024-01-01');
    expect(mockFormio.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockTabNavigationService.setupTabNavigation).toHaveBeenCalled();
  }));

  it('should handle online event and execute sync callbacks', () => {
    const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');
    component.online();
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();

    const [onComplete, onProgress, onToggleDownload] =
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions.mock.calls[0];

    onComplete();
    onProgress(true);
    onToggleDownload(false);

    expect(ngOnInitSpy).toHaveBeenCalled();
    expect(component.isSyncInProgress).toBe(true);
    expect(component.isDownloadEnabled).toBe(false);
  });

  it('should register form change and submit listeners', () => {
    const onSpy = jest.fn();
    component.formInstance = { on: onSpy };
    component.initFormListeners();
    expect(onSpy).toHaveBeenCalledWith('change', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('submit', expect.any(Function));
  });

  it('should log error if formInstance is not set in initFormListeners()', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    component.formInstance = null as any;
    component.initFormListeners();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Form instance not initialized yet.',
    );
    consoleSpy.mockRestore();
  });

  it('should trigger tab navigation functions', () => {
    component.onPreviousTab();
    expect(mockTabNavigationService.goToPreviousTab).toHaveBeenCalledWith(
      component.formContainer,
    );

    component.onNextTab();
    expect(mockTabNavigationService.goToNextTab).toHaveBeenCalledWith(
      component.formContainer,
    );
  });

  it('should handle undefined formioComponent in ngAfterViewInit()', fakeAsync(() => {
    component.formioComponent = undefined as any;
    component.ngAfterViewInit();
    tick(200);
    flush();
    expect(component.formTitle).toBeUndefined();
  }));

  it('should catch errors during downloadPDFFilledForm', async () => {
    mockPdfGeneratorService.downloadPDFFilledForm = jest
      .fn()
      .mockRejectedValue('PDF_ERROR');
    component.formInstance = { _form: { title: 'Test Form' } } as any;
    const container = document.createElement('div');
    component.formContainer = new ElementRef(container);

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    await component.downloadPDF();
    expect(consoleSpy).toHaveBeenCalledWith(
      'PDF download failed:',
      'PDF_ERROR',
    );
    consoleSpy.mockRestore();
  });

  it('change event does not enable download if isDownloadEnabled was false', () => {
    component.isDownloadEnabled = false;
    const mockOn = jest.fn();
    (component as any).formInstance = { on: mockOn };

    (component as any).initFormListeners();

    // simulate change event
    const changeCallback = mockOn.mock.calls.find((c) => c[0] === 'change')[1];

    changeCallback({ changed: true });
    expect(component.isDownloadEnabled).toBe(false);
  });

  it('should call location.back when goBack is invoked', () => {
    const locationSpy = jest.spyOn(component['location'], 'back');
    component.goBack();
    expect(locationSpy).toHaveBeenCalled();
  });

  it('should keep isDownloadEnabled true on form "change" event', () => {
    const mockEventHandlerMap: Record<string, Function> = {};
    component.formInstance = {
      on: (event: string, cb: Function) => {
        mockEventHandlerMap[event] = cb;
      },
    };

    component.isDownloadEnabled = true;

    component.initFormListeners();
    mockEventHandlerMap['change']({
      changed: true,
    });

    expect(component.isDownloadEnabled).toBe(true);
  });

  it('should set isDownloadEnabled to true when submit event is triggered', () => {
    const submitCallback = jest.fn();
    component.formInstance = {
      on: jest.fn((event: string, callback: any) => {
        if (event === 'submit') {
          submitCallback.mockImplementation(callback);
        }
      }),
    } as any;
    component.isDownloadEnabled = false;
    component.initFormListeners();

    // Simulate submit event
    submitCallback({ data: {} });

    // Expect download to be enabled
    expect(component.isDownloadEnabled).toBe(true);
  });
});
