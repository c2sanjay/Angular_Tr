import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { environment } from 'src/environments/environment';
import { FormioComponent, FormioModule } from '@formio/angular';
import { filter, takeUntil, Subject } from 'rxjs';
import { DropdownService } from 'src/app/common/services/dropdown.service';
import { AuthService } from '@auth0/auth0-angular';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { formatDate } from 'src/app/common/utils/date-utils';
import { KendoConfirmDialogComponent } from 'src/app/shared/kendo-confirm-dialog/kendo-confirm-dialog.component';
import { KendoCancelModificationDialogComponent } from 'src/app/shared/kendo-cancel-modification-dialog/kendo-cancel-modification-dialog.component';
import { UserDetailService } from 'src/app/shared/services/user-details.service';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { CommonModule, Location } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { FORM_DB_NAME } from 'src/app/shared/constants/indexed-db-names';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import {
  getDropdownKeys,
  processComponents,
} from 'src/app/common/utils/formio-utils';
import { KendoLoadingDialogComponent } from 'src/app/shared/kendo-loading-dialog/kendo-loading-dialog.component';
import { validateFormLocally } from 'src/app/common/utils/validateFormLocally';

const now = new Date();
const formattedDate = formatDate(now);

@Component({
  selector: 'app-form-details-form',
  standalone: true,
  imports: [
    KENDO_INPUTS,
    KENDO_BUTTONS,
    SharedModule,
    CommonModule,
    CommonAppModule,
    FormioModule,
    ModuleLayoutComponent,
    KendoConfirmDialogComponent,
    KendoLoadingDialogComponent,
    KendoCancelModificationDialogComponent,
  ],
  templateUrl: './form-details-form.component.html',
})
export class FormDetailsFormComponent implements OnInit, OnDestroy {
  forms: any[] = [];
  formSrc: any;
  isSidebarOpen = false;
  isSyncInProgress = false;
  submissionData: any = null;
  storeName = FORM_DB_NAME; // IndexedDB table
  searchId: string = ''; // Stores input value
  submissionId: string | null = null; // Store the ID
  isOnline: boolean = navigator.onLine;
  formPath: any;
  formInstance: any;
  formLoaded = false;
  isLoading: boolean = true;
  isPdfDownloading: boolean = false;
  isLoadingForm: boolean = false;
  draftForms: any;
  isDownloadEnabled: boolean = true;
  formOptions: any = {
    noSubmit: true,
  };
  drafts: any[] = [];
  idUrl: any;
  formUrl: string | null = null;
  formData: any = {};
  preFillFormData: any = {};
  formTitle: any;
  updatedFormOn: any;
  displayType: string = '';
  currentTabIndex: number = 0;
  totalTabs: number = 0;
  isTabNavigationVisible = false;

  currentCustomerId: string | null = '';
  currentFormName: string | null = '';
  currentFormId: number | null = null;
  yardNameUrl: string = '';
  public dialogVisible = false;
  private confirmResolver!: (value: boolean) => void;
  private readonly destroy$ = new Subject<void>();
  public currentFormModified: boolean = false;
  public formModifiedDialogVisible = false;
  private formModifiedDialogPromiseResolver: ((result: string) => void) | null =
    null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dropdownService: DropdownService,
    public auth: AuthService,
    private readonly router: Router,
    private readonly kendoNotificationService: KendoNotificationService,
    public tabNavigationService: TabNavigationService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly userDetailService: UserDetailService,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly commonApiService: CommonApiService,
    private readonly location: Location,
  ) {
    // Subscribe to router events
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        // Clear any stored submission state when navigation occurs
        sessionStorage.removeItem('formSubmitted');
        sessionStorage.removeItem('submissionTimestamp');
      });
  }

  @ViewChild(FormioComponent) formioComponent!: FormioComponent;
  @ViewChild('formContainer') formContainer!: ElementRef;
  @ViewChild('myForm', { static: false }) myFormComp!: FormioComponent;

  @HostListener('document:keydown.enter', ['$event'])
  handleEnterKey(event: KeyboardEvent) {
    if (!this.isLoading) {
      event.preventDefault(); // Stop form submission
      this.saveAsDraft();
    }
  }

  @HostListener('window:online')
  online() {
    this.isOnline = true;
    this.submitDraftHelperService.syncAllOfflineFormSubmissions(
      () => {},
      (val: boolean) => (this.isSyncInProgress = val),
      (val: boolean) => (this.isDownloadEnabled = val),
    );
  }

  @HostListener('window:offline') offline() {
    this.isOnline = false;
  }

  // Form Load
  async onFormLoad(event: any): Promise<void> {
    this.formInstance = this.myFormComp?.formio ?? event;
    if (this.formInstance) {
      this.formTitle = this.formInstance?._form.title;
    }

    try {
      // Optional pre-processing logic if needed
      await processComponents(
        this.formInstance.form.components,
        this.userDetailService.getToken(),
        this.dropdownService,
      );

      // Dynamically get dropdown keys from form
      const dropdownKeys = getDropdownKeys(this.formInstance);

      // Inject dropdown data for each key
      const dropdownPromises = dropdownKeys.map((key) =>
        this.dropdownService.injectDropdownData(
          this.formInstance,
          key,
          this.preFillFormData,
        ),
      );

      await Promise.all(dropdownPromises);
    } catch (error) {
      this.kendoNotificationService.showError(
        `Error during form load: ${error}`,
      );
    } finally {
      this.isLoading = false;
    }
  }

  // For form.io Prev and Next
  onPreviousTab() {
    this.tabNavigationService.goToPreviousTab(this.formContainer);
  }

  onNextTab() {
    this.tabNavigationService.goToNextTab(this.formContainer);
  }

  async saveAsDraft() {
    const form = this.myFormComp?.formio;

    if (!form) {
      this.kendoNotificationService.showError('Form component not found.');
      return;
    }

    const isValid = await form.checkValidity(
      form.submission.data,
      true,
      form.data,
    );

    if (!isValid) {
      this.kendoNotificationService.showError(
        'Please fill the highlighted fields before saving.',
      );
      form.showErrors(true);
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    const formData = form.submission.data;

    const formName = String(form?.form?.name).toLowerCase() ?? 'Untitled Form';
    const CustomerID = String(formData?.customerName?.id);
    const useremail = this.userDetailService.getEmail();

    const currentTimeInMs = Date.now();

    const submissionWithId = {
      ...formData,
      CustomerID,
      useremail,
      formName,
      version: 1,
      formId: currentTimeInMs,
      clientTimestamp: currentTimeInMs,
      serverLastKnownVersion: 0,
      formTitle: this.formTitle,
      synced: this.isOnline,
      status: 'Pending',
    };

    const { isLocalFormValid, formError } =
      validateFormLocally(submissionWithId);

    if (!isLocalFormValid) {
      this.isLoading = false;
      this.kendoNotificationService.showError(formError!);
      return;
    }

    this.submitDraftHelperService.submitOrDraftHelperNewForm({
      type: 'draft',
      formName,
      submissionData: submissionWithId,
      toastrMsg: 'Draft saved successfully.',
      router: this.router,
      isOnline: this.isOnline,
      setIsLoading: (val: boolean) => (this.isLoading = val),
      setIsDownloadEnabled: (val: boolean) => (this.isDownloadEnabled = val),
      setCurrentFormName: (val: any) => (this.currentFormName = val),
      setCurrentCustomerId: (val: string) => (this.currentCustomerId = val),
      setCurrentFormId: (val: number) => (this.currentFormId = val),
      showConfirm: this.showConfirm.bind(this),
    });
  }

  validateForm() {
    (async () => {
      const form = this.myFormComp?.formio;

      if (!form) {
        this.kendoNotificationService.showError('Form component not found.');
        return;
      }

      const isValid = await form.checkValidity(
        form.submission.data,
        true,
        form.data,
      );

      if (!isValid) {
        this.kendoNotificationService.showError(
          'Please fill the highlighted fields before saving.',
        );
        form.showErrors(true);
        this.isLoading = false;
        return;
      }

      this.isLoading = true;
      const formData = { ...form.submission.data, formName: form._form.path };
      this.onSubmit(formData);
    })();
  }

  onSubmit(submission: any) {
    const formName =
      String(submission.formName).toLowerCase() ?? 'Untitled Form';
    const CustomerID = String(submission?.customerName?.id);
    const useremail = this.userDetailService.getEmail();
    const currentTimeInMs = Date.now();

    const submissionWithId = {
      ...submission,
      CustomerID,
      useremail,
      formName,
      version: (submission?.version ?? 0) + 1,
      formId: currentTimeInMs,
      clientTimestamp: currentTimeInMs,
      serverLastKnownVersion: 0,
      synced: this.isOnline,
      formTitle: this.formTitle,
      status: 'Submitted',
    };

    const { isLocalFormValid, formError } =
      validateFormLocally(submissionWithId);

    if (!isLocalFormValid) {
      this.isLoading = false;
      this.kendoNotificationService.showError(formError!);
      return;
    }

    this.submitDraftHelperService.submitOrDraftHelperNewForm({
      type: 'submit',
      formName,
      submissionData: submissionWithId,
      toastrMsg: 'Form submitted successfully.',
      router: this.router,
      isOnline: this.isOnline,
      setIsLoading: (val: boolean) => (this.isLoading = val),
      setIsDownloadEnabled: (val: boolean) => (this.isDownloadEnabled = val),
      setCurrentFormName: (val: any) => (this.currentFormName = val),
      setCurrentCustomerId: (val: string) => (this.currentCustomerId = val),
      setCurrentFormId: (val: number) => (this.currentFormId = val),
      showConfirm: this.showConfirm.bind(this),
    });
  }

  // Method to reset the form
  resetForm() {
    if (this.myFormComp?.formio) {
      this.myFormComp.formio.reset(); // Properly call the reset method
    } else {
      console.warn('Form.io component not available!');
    }
  }

  ngOnInit() {
    this.isOnline = navigator.onLine;
    this.route.paramMap.subscribe((params) => {
      this.formPath = params.get('formPath');
      this.commonApiService
        .getInspectionDetailsById(Number(params.get('inspectionId')))
        .subscribe({
          next: (data) => {
            if (!data.IsSuccess) {
              this.kendoNotificationService.showError(data.Message);
              this.isLoading = false;
              return;
            }
            this.preFillFormData = {
              yardName: data.Result?.YardName,
              customerName: data.Result?.CustomerName,
            };
            this.yardNameUrl = data.Result?.YardName;
          },
          error: (err) => {
            this.kendoNotificationService.showError(
              `Error fetching form details: ${err}`,
            );
            this.isLoading = false;
          },
        });

      if (this.formPath)
        this.formSrc = `${environment.formIoUrl}/${this.formPath}`;
    });
  }

  ngAfterViewInit() {
    if (this.formioComponent) {
      const interval = setInterval(() => {
        const formioInstance = this.formioComponent.formio;
        this.updatedFormOn = formioInstance?._form.modified;
        if (formioInstance) {
          this.formTitle = formioInstance?._form.title;
          this.formInstance = formioInstance;
          this.formInstance.on('ready', () => {
            this.initFormListeners();
          });
          setTimeout(() => {
            this.tabNavigationService.setupTabNavigation(this.formContainer);
          }, 300); // 300ms delay usually enough
          clearInterval(interval);
        }
      }, 100);
    }
  }

  getYardFromParams() {
    this.route.queryParams.subscribe((params) => {
      const yard = params['yard'];
      if (yard) {
        this.submissionData = {
          data: {
            yardName: yard,
          },
        };
      }
    });
  }

  initFormListeners() {
    if (!this.formInstance) {
      this.kendoNotificationService.showError(
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
  }

  async downloadPDF() {
    if (!this.formInstance) {
      this.kendoNotificationService.showError('Form not initialized yet.');
      this.isPdfDownloading = false;
      return;
    }

    this.isPdfDownloading = true;

    const container = this.formContainer?.nativeElement as HTMLElement;
    const formTitle = this.formInstance?._form.title;

    try {
      await this.pdfGeneratorService.downloadPDFFilledForm(
        container,
        this.formInstance,
        formTitle,
        formattedDate,
      );
    } catch (error) {
      this.kendoNotificationService.showError(
        `PDF download failed: ${error as any}`,
      );
    } finally {
      this.isPdfDownloading = false;
      this.isDownloadEnabled = true;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async showConfirm(): Promise<boolean> {
    this.dialogVisible = true;
    return new Promise<boolean>((resolve) => {
      this.confirmResolver = resolve;
    });
  }

  handleDialogClose(status: string) {
    this.dialogVisible = false;
    this.confirmResolver(status === 'confirm');
  }

  refreshComponent(): void {
    location.reload();
  }

  onFormChange(event: any) {
    if (event?.isModified) this.currentFormModified = true;
  }

  showCancel(): Promise<string> | void {
    if (this.currentFormModified) {
      this.formModifiedDialogVisible = true;
      return new Promise((resolve) => {
        this.formModifiedDialogPromiseResolver = resolve;
      });
    }
    this.location.back();
  }

  handleModifiedDialogClose(result: string) {
    this.formModifiedDialogVisible = false;

    this.formModifiedDialogPromiseResolver?.(result);
    this.formModifiedDialogPromiseResolver = null;

    if (result === 'confirm') this.location.back();
  }
}
