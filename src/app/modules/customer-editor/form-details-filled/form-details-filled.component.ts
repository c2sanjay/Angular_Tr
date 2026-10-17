import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { FormioComponent, FormioModule } from '@formio/angular';
import { AuthService } from '@auth0/auth0-angular';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { PdfGeneratorService } from 'src/app/common/services/pdf-generator.service';
import { formatDate } from 'src/app/common/utils/date-utils';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { CommonModule, Location } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { KendoLoadingDialogComponent } from 'src/app/shared/kendo-loading-dialog/kendo-loading-dialog.component';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';

const now = new Date();
const formattedDate = formatDate(now);

@Component({
  selector: 'app-form-details-filled',
  standalone: true,
  imports: [
    KENDO_INPUTS,
    KENDO_BUTTONS,
    SharedModule,
    CommonModule,
    CommonAppModule,
    FormioModule,
    ModuleLayoutComponent,
    KendoLoadingDialogComponent,
  ],
  templateUrl: './form-details-filled.component.html',
})
export class FormDetailsFilledComponent implements OnInit, AfterViewInit {
  formSrc: any;
  formPath: any;
  formInstance: any;
  idUrl: any;
  formData: any = null;
  isDownloadEnabled: boolean = true;
  isSyncInProgress: boolean = false;
  formTitle: any;
  isPdfDownloading: boolean = false;
  updatedFormOn: any;
  disablePrevNextBtn: boolean = true;
  constructor(
    private readonly route: ActivatedRoute,
    private readonly httpClient: HttpClient,
    public auth: AuthService,
    public tabNavigationService: TabNavigationService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly location: Location,
    private readonly kendoNotificationService: KendoNotificationService,
  ) {}

  @HostListener('window:online')
  online() {
    this.submitDraftHelperService.syncAllOfflineFormSubmissions(
      () => this.ngOnInit(), // run only after sync is done
      (val: boolean) => (this.isSyncInProgress = val),
      (val: boolean) => (this.isDownloadEnabled = val),
    );
  }

  @ViewChild(FormioComponent) formioComponent!: FormioComponent;
  @ViewChild('formContainer') formContainer!: ElementRef;
  yardNameUrl: string = '';

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.formPath = params.get('formName');
      this.idUrl = params.get('id');
      this.yardNameUrl = params.get('yardName') ?? '';

      if (this.formPath) {
        this.formSrc = `${environment.formIoUrl}/${this.formPath}`;
      }
    });

    if (this.idUrl) {
      const url = `${environment.trinityRailApiUrl}/InspectionForm/InspectionFormDetailGetById?inspectionFormDetailId=${this.idUrl}`;
      this.httpClient.get<any>(url).subscribe((response) => {
        const rawDataString = response.Result.FormEntryDetail;

        this.formData = JSON.parse(rawDataString);
        this.formData.productName = this.formData.productName?.name;
        this.formData.customerName = this.formData.customerName?.name;
        this.formData.yardName = this.formData.yardName?.name;
        this.formData.railCarId = this.formData.railCarId?.asset;
      });
    }
  }

  ngAfterViewInit() {
    if (this.formioComponent) {
      const interval = setInterval(() => {
        const formioInstance = this.formioComponent?.formio;
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
      this.kendoNotificationService.showError(
        'Form instance not initialized yet.',
      );
      this.isPdfDownloading = false;
      return;
    }
    this.disablePrevNextBtn = false;
    this.isPdfDownloading = true;

    const container = this.formContainer.nativeElement as HTMLElement;
    const formTitle = this.formInstance?._form.title;

    try {
      await this.pdfGeneratorService.downloadPDFFilledForm(
        container,
        this.formInstance,
        formTitle,
        formattedDate,
      );
    } catch (error) {
      this.kendoNotificationService.showError(`PDF download failed: ${error}`);
    } finally {
      this.isPdfDownloading = false;
      if (navigator.onLine) {
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

  goBack() {
    this.location.back();
  }
}
