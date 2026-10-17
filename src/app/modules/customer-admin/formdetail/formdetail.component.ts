import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { FormioComponent, FormioModule } from '@formio/angular';
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
import {
  getDropdownKeys,
  processComponents,
} from 'src/app/common/utils/formio-utils';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { KendoLoadingDialogComponent } from 'src/app/shared/kendo-loading-dialog/kendo-loading-dialog.component';
import { validateFormLocally } from 'src/app/common/utils/validateFormLocally';

const now = new Date();
const formattedDate = formatDate(now);

@Component({
  selector: 'formdetail',
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
  templateUrl: './formdetail.component.html',
  styleUrl: './formdetail.component.scss',
})
export class FormDetailComponent implements OnInit, AfterViewInit {
  forms: any[] = [];
  formSrc: any;
  isSidebarOpen = false;
  isSyncInProgress = false;
  submissionData: any = null;
  userRole: string = '';
  isDraftDisabled: boolean = false;
  storeName = FORM_DB_NAME;
  searchId: string = '';
  isOnline: boolean = navigator.onLine;
  formPath: any;
  formInstance: any;
  formTitle: any;
  formLoaded = false;
  isLoading: boolean = true;
  isPdfDownloading: boolean = false;
  isDownloadEnabled: boolean = true;
  formOptions: any = {
    noSubmit: true,
  };
  drafts: any[] = [];
  idUrl: any;
  formUrl: string | null = null;
  formData: any = null;
  preFillFormData: any = {};
  originalFormData: any = null;
  displayType: string = '';
  selectedDraftId: number | null = null; // Selected draft ID for loading
  selectedCustomer: any;
  railYards: any[] = [];
  selectedRailYard: string | null = '';
  isRailYardLoading: boolean = false;
  updatedFormOn: any;
  public dialogVisible = false;
  private confirmResolver!: (value: boolean) => void;
  public currentFormModified: boolean = false;
  public formModifiedDialogVisible = false;
  private formModifiedDialogPromiseResolver: ((result: string) => void) | null =
    null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly httpClient: HttpClient,
    private readonly dropdownService: DropdownService,
    public auth: AuthService,
    private readonly router: Router,
    private readonly kendoNotificationService: KendoNotificationService,
    public tabNavigationService: TabNavigationService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly userDetailService: UserDetailService,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly accessRoleService: AccessRoleService,
    private readonly location: Location,
  ) {}

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

  ngOnInit() {
    this.isOnline = navigator.onLine;
    this.userRole = this.accessRoleService.getRole();

    this.route.paramMap.subscribe((params) => {
      this.formPath = params.get('formPath');
      this.idUrl = params.get('id');
      this.selectedCustomer = params.get('customerName');
      this.selectedRailYard = params.get('yardName');
      if (this.formPath)
        this.formSrc = `${environment.formIoUrl}/${this.formPath}`;
    });
    const url = `${environment.trinityRailApiUrl}/InspectionForm/InspectionFormDetailGetById?inspectionFormDetailId=${this.idUrl}`;
    this.httpClient.get<any>(url).subscribe((response) => {
      const dynamicFormName = response.Result.FormEntryDetail;
      const rawDataString = response.Result.FormEntryDetail;

      this.formUrl = `${environment.formIoUrl}/form/${dynamicFormName}`;
      this.formData = JSON.parse(rawDataString);
      this.originalFormData = JSON.parse(rawDataString);
      this.preFillFormData = {
        yardName: this.originalFormData.yardName?.name,
        customerName: this.originalFormData.customerName?.name,
      };
      this.formTitle = this.formData.formTitle;
      // Dropdowns value binding
      this.formData.productName = this.formData.productName?.name;
      this.formData.customerName = this.formData.customerName?.name;
      this.formData.yardName = this.formData.yardName?.name;
      this.formData.railCarId = this.formData.railCarId?.asset;
      if (this.originalFormData?.status === 'Submitted') {
        if (this.userRole === 'Trinity Staff') {
          this.kendoNotificationService.showWarning(
            'This form has already been submitted and cannot be edited. Navigating you back to home page.',
          );
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 3500);
        } else if (this.userRole === 'Customer Admin') {
          this.isDraftDisabled = true;
          this.kendoNotificationService.showInfo(
            'This form has already been submitted. Any changes made now, will override the last submitted version.',
          );
        }
      }
    });
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
    const formName =
      String(formData?.formName).toLowerCase() ?? 'Untitled Form';
    const userEmail = this.userDetailService.getEmail();

    const submissionWithId = {
      ...formData,
      productName:
        typeof formData.productName === 'object'
          ? formData.productName
          : {
              ...this.originalFormData.productName,
              name: formData.productName,
            },
      railCarId:
        typeof formData.railCarId === 'object'
          ? formData.railCarId
          : {
              ...this.originalFormData.railCarId,
              asset: formData.railCarId,
            },
      useremail: userEmail,
      formName,
      version: (formData?.version ?? 0) + 1,
      clientTimestamp: Date.now(),
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

    this.submitDraftHelperService.submitOrDraftHelper({
      type: 'draft',
      formName,
      submissionData: submissionWithId,
      toastrMsg: 'Draft saved successfully.',
      router: this.router,
      isOnline: this.isOnline,
      setIsLoading: (val: boolean) => (this.isLoading = val),
      setIsDownloadEnabled: (val: boolean) => (this.isDownloadEnabled = val),
      showConfirm: this.showConfirm.bind(this),
    });
  }

  validateForm() {
    (async () => {
      const form = this.myFormComp?.formio;

      if (!form) {
        this.kendoNotificationService.showError('Form component not found.');
        this.isLoading = false;
        return;
      }

      const isValid = await form.checkValidity(
        form.submission.data,
        true,
        form.data,
      );

      if (!isValid) {
        form.showErrors(true);
        this.kendoNotificationService.showError(
          'Please fill the highlighted fields before saving.',
        );
        this.isLoading = false;
        return;
      }
      this.isLoading = true;
      const formData = form.submission.data;
      this.onSubmit(formData);
    })();
  }

  onSubmit(submission: any) {
    const userEmail = this.userDetailService.getEmail();
    const formName =
      String(submission.formName).toLowerCase() ?? 'Untitled Form';

    const submissionWithId = {
      ...submission,
      productName:
        typeof submission.productName === 'object'
          ? submission.productName
          : {
              ...this.originalFormData.productName,
              name: submission.productName,
            },
      railCarId:
        typeof submission.railCarId === 'object'
          ? submission.railCarId
          : {
              ...this.originalFormData.railCarId,
              asset: submission.railCarId,
            },
      useremail: userEmail,
      formName,
      version: (submission?.version ?? 0) + 1,
      clientTimestamp: Date.now(),
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

    this.submitDraftHelperService.submitOrDraftHelper({
      type: 'submit',
      formName,
      submissionData: submissionWithId,
      toastrMsg: 'Form submitted successfully.',
      router: this.router,
      isOnline: this.isOnline,
      setIsLoading: (val: boolean) => (this.isLoading = val),
      setIsDownloadEnabled: (val: boolean) => (this.isDownloadEnabled = val),
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

  initFormListeners() {
    if (!this.formInstance) {
      this.kendoNotificationService.showError(
        'Form instance not initialized yet.',
      );
      return;
    }

    //  Disable button when user edits any field
    this.formInstance.on('change', (event: any) => {
      if (event.changed && this.isDownloadEnabled) {
        this.isDownloadEnabled = true;
      }
    });

    //  Enable button after successful form submission (status 201)
    this.formInstance.on('submit', (submission: any) => {
      this.isDownloadEnabled = true;
    });
  }

  // PDF generation logic triggered by the Download PDF button.
  async downloadPDF() {
    if (!this.formInstance) {
      this.kendoNotificationService.showError(
        'Form instance not initialized yet.',
      );
      this.isPdfDownloading = false;
      return;
    }

    this.isPdfDownloading = true;
    const container = this.formContainer.nativeElement as HTMLElement;
    const formTitle = this.formInstance?._form.title;

    try {
      await this.pdfGeneratorService.downloadPDF(
        container,
        this.formInstance,
        formTitle,
        formattedDate,
      );
    } catch (error) {
      this.kendoNotificationService.showError(`PDF download failed: ${error}`);
    } finally {
      this.isPdfDownloading = false;
      if (this.isOnline) {
        setTimeout(() => {
          location.reload();
        }, 1000);
      }
    }
  }

  // For form.io Prev and Next
  onPreviousTab() {
    this.tabNavigationService.goToPreviousTab(this.formContainer);
  }

  onNextTab() {
    this.tabNavigationService.goToNextTab(this.formContainer);
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
