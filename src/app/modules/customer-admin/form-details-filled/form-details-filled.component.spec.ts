import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, ElementRef } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FormioComponent, FormioModule } from '@formio/angular';
import { FormDetailsFilledComponent } from './form-details-filled.component';
import { AuthService } from '@auth0/auth0-angular';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';

describe('FormDetailsFilledComponent', () => {
  let component: FormDetailsFilledComponent;
  let fixture: ComponentFixture<FormDetailsFilledComponent>;
  let pdfService: PdfGeneratorService;

  const mockActivatedRoute = {
    paramMap: of({
      get: (key: string) =>
        (
          ({
            formName: 'mockForm',
            id: '123',
            customerName: 'Test Customer',
            yardName: 'Test Yard',
          }) as any
        )[key] || null,
    }),
  };

  const mockLocation = { back: jest.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        FormioModule,
        FormDetailsFilledComponent,
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
          useValue: { syncAllOfflineFormSubmissions: jest.fn() },
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize route params in ngOnInit', () => {
    component.ngOnInit();
    expect(component.formPath).toBe('mockForm');
    expect(component.idUrl).toBe('123');
    expect(component.selectedCustomer).toBe('Test Customer');
    expect(component.selectedRailYard).toBe('Test Yard');
  });

  describe('downloadPDF()', () => {
    beforeEach(() => {
      component.formContainer = {
        nativeElement: document.createElement('div'),
      } as ElementRef;
    });

    it('should trigger PDF download', async () => {
      component.formInstance = { _form: { title: 'Sample Title' } };
      await component.downloadPDF();
      expect(pdfService.downloadPDFFilledForm).toHaveBeenCalled();
    });

    it('should log error if formInstance is null', async () => {
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.formInstance = null as any;
      component.isPdfDownloading = true;

      await component.downloadPDF();

      expect(errorSpy).toHaveBeenCalledWith('Form not initialized yet.');
      expect(component.isPdfDownloading).toBe(false);
    });

    it('should handle download error', async () => {
      const mockError = new Error('PDF failed');
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.formInstance = { _form: { title: 'Mock Title' } } as any;

      jest
        .spyOn(pdfService, 'downloadPDFFilledForm')
        .mockRejectedValue(mockError);

      await component.downloadPDF();

      expect(errorSpy).toHaveBeenCalledWith('PDF download failed:', mockError);
      expect(component.isPdfDownloading).toBe(false);
    });
  });

  describe('ngAfterViewInit()', () => {
    it('should handle form ready state', fakeAsync(() => {
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
      const setupSpy = jest.spyOn(
        TestBed.inject(TabNavigationService),
        'setupTabNavigation',
      );

      const mockFormio = {
        _form: { title: 'Test Title' },
        on: jest.fn((event, cb) => event === 'ready' && cb()),
      };

      component.formioComponent = {
        formio: mockFormio,
      } as unknown as FormioComponent;
      component.formContainer = {
        nativeElement: document.createElement('div'),
      };

      component.ngAfterViewInit();
      tick(1000);

      expect(component.formTitle).toBe('Test Title');
      expect(component.formInstance).toBe(mockFormio);
      expect(setupSpy).toHaveBeenCalledWith(component.formContainer);
      expect(clearIntervalSpy).toHaveBeenCalled();
    }));

    it('should not fail without formioComponent', fakeAsync(() => {
      component.formioComponent = null as any;
      component.ngAfterViewInit();
      tick(1000);
      expect(component.formTitle).toBeUndefined();
    }));
  });

  it('should handle error during form data fetch', () => {
    const getSpy = jest
      .spyOn(component['httpClient'], 'get')
      .mockReturnValue(throwError(() => new Error('Network error')));
    component.ngOnInit();
    expect(getSpy).toHaveBeenCalled();
  });

  it('should parse formData fields from response', fakeAsync(() => {
    const mockData = {
      Result: {
        FormEntryDetail: JSON.stringify({
          productName: { name: 'Product A' },
          customerName: { name: 'Customer A' },
          yardName: { name: 'Yard A' },
          railCarId: { asset: 'Rail-123' },
        }),
      },
    };

    jest.spyOn(component['httpClient'], 'get').mockReturnValue(of(mockData));
    component.idUrl = '123';
    component.ngOnInit();
    tick();

    expect(component.formData.productName).toBe('Product A');
    expect(component.formData.customerName).toBe('Customer A');
    expect(component.formData.yardName).toBe('Yard A');
    expect(component.formData.railCarId).toBe('Rail-123');
  }));

  it('should call tab navigation methods', () => {
    const tabService = TestBed.inject(TabNavigationService);
    component.formContainer = {
      nativeElement: document.createElement('div'),
    } as ElementRef;

    component.onPreviousTab();
    expect(tabService.goToPreviousTab).toHaveBeenCalledWith(
      component.formContainer,
    );

    component.onNextTab();
    expect(tabService.goToNextTab).toHaveBeenCalledWith(
      component.formContainer,
    );
  });

  describe('online()', () => {
    it('should call ngOnInit for Trinity Staff', () => {
      component.userRole = 'Trinity Staff';
      const initSpy = jest.spyOn(component, 'ngOnInit');
      component.online();
      expect(initSpy).toHaveBeenCalled();
    });

    it('should sync drafts for other roles', () => {
      const roles = ['Customer', 'Customer Admin'];
      const syncService = TestBed.inject(SubmitDraftHelperService);
      const syncMock = syncService.syncAllOfflineFormSubmissions as jest.Mock;
      const initSpy = jest.spyOn(component, 'ngOnInit');

      roles.forEach((role) => {
        component.userRole = role;
        component.online();
        const [onSuccess, setSyncing, setDownload] = syncMock.mock.calls.at(-1);
        onSuccess();
        setSyncing(true);
        setDownload(true);
        expect(syncMock).toHaveBeenCalled();
        expect(initSpy).toHaveBeenCalled();
        expect(component.isSyncInProgress).toBe(true);
        expect(component.isDownloadEnabled).toBe(true);
      });
    });
  });

  it('should call location.back on goBack()', () => {
    const locationSpy = jest.spyOn(component['location'], 'back');
    component.goBack();
    expect(locationSpy).toHaveBeenCalled();
  });

  describe('initFormListeners()', () => {
    it('should register listeners', () => {
      const handlers: Record<string, Function> = {};
      component.formInstance = {
        on: jest.fn((event, cb) => (handlers[event] = cb)),
      };
      component.isDownloadEnabled = true;

      component.initFormListeners();

      handlers['change']?.({ changed: true });
      expect(component.isDownloadEnabled).toBe(true);

      handlers['submit']?.({});
      expect(component.isDownloadEnabled).toBe(true);
    });

    it('should log if formInstance is missing', () => {
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      component.formInstance = null as any;
      component.initFormListeners();
      expect(errorSpy).toHaveBeenCalledWith(
        'Form instance not initialized yet.',
      );
    });
  });
});
