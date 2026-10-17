import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { FormioComponent, FormioModule } from '@formio/angular';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { firstValueFrom } from 'rxjs';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import { formatDate, formatDateLocal } from 'src/app/common/utils/date-utils';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { TimezoneService } from 'src/app/common/services/timezone.service';
import { DateTime } from 'luxon';
import { TabsComponent } from 'src/app/shared/components/tabs/tabs.component';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_DATEINPUTS } from '@progress/kendo-angular-dateinputs';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_LABEL } from '@progress/kendo-angular-label';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { process, State } from '@progress/kendo-data-query';
import { KENDO_TOOLTIPS } from '@progress/kendo-angular-tooltip';
import {
  DropDownsModule,
  ComboBoxModule,
} from '@progress/kendo-angular-dropdowns';
import { EXPORT_OPTIONS } from 'src/app/shared/constants/export-options';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { Router } from '@angular/router';
import { API_ENDPOINTS } from 'src/app/shared/constants/api-endpoints';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { T_RailYard, DEFAULT_ALL_YARD } from 'src/app/common/types';
import { KendoExportDialogComponent } from 'src/app/shared/kendo-export-dialog/kendo-export-dialog.component';
import { KendoConfirmDialogComponent } from 'src/app/shared/kendo-confirm-dialog/kendo-confirm-dialog.component';
import { KendoLoadingDialogComponent } from 'src/app/shared/kendo-loading-dialog/kendo-loading-dialog.component';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import {
  ICustomer,
  setCustomers,
  setSelectedCustomer,
} from 'src/app/store/customer-dropdown/customer-dropdown.actions';
import {
  selectAllCustomers,
  selectSelectedCustomer,
} from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_TOOLTIPS,
    KENDO_BUTTONS,
    KENDO_LABEL,
    KENDO_DATEINPUTS,
    KENDO_INPUTS,
    ComboBoxModule,
    DropDownsModule,
    SharedModule,
    CommonModule,
    CommonAppModule,
    FormioModule,
    ModuleLayoutComponent,
    KendoExportDialogComponent,
    KendoConfirmDialogComponent,
    KendoLoadingDialogComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  EXPORT_OPTIONS = EXPORT_OPTIONS;
  userRole: string = '';
  formPath: any;
  formTitle: any;
  formInstance: any;
  isCustomersLoading: boolean = true;
  isLoading: boolean = true;
  isPdfDownloading: boolean = false;
  formUrl: string | undefined = undefined;
  formData: any = null;
  isDownloadEnabled: boolean = true;
  isSyncInProgress: boolean = false;
  allCustomers: any[] = [];
  allCustomersOriginal: any[] = [];
  inspectionCustomersList: any[] = [];
  formReadyToRender = false;
  selectedRailYard: T_RailYard = DEFAULT_ALL_YARD;
  isRailYardLoading: boolean = true;
  railYards: T_RailYard[] = [];
  selectedCustomerObj: any = {};
  dateRangeSelected: 'today' | 'last7days' | 'last30days' | 'custom' =
    'last30days';

  lastMonthDate: Date = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last30DaysDate = new Date();
    last30DaysDate.setDate(today.getDate() - 30);
    return last30DaysDate;
  })();

  endDateKendo = new Date();
  startDateKendo = this.lastMonthDate;
  public baseUrl = environment.trinityRailApiUrl;

  public gridView: GridDataResult = { data: [], total: 0 };
  public pageSize = 15;
  public gridState: State = {
    skip: 0,
    take: this.pageSize,
    filter: undefined,
    sort: [],
  };
  public skip = 0;
  public dialogVisible = false;
  private confirmResolver!: (value: boolean) => void;
  public exportDialogVisible = false;
  private exportDialogPromiseResolver:
    | ((value: { confirmed: boolean; value?: string }) => void)
    | null = null;

  constructor(
    public readonly httpClient: HttpClient,
    public readonly cdr: ChangeDetectorRef,
    public auth: AuthService,
    public router: Router,
    public readonly kendoNotificationService: KendoNotificationService,
    private readonly accessRoleService: AccessRoleService,
    private readonly timezoneService: TimezoneService,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    public readonly commonApiService: CommonApiService,
    private readonly store: Store,
  ) {}

  @HostListener('window:online')
  online() {
    if (this.userRole === 'Trinity Staff') {
      this.ngOnInit();
    } else {
      this.submitDraftHelperService.syncAllOfflineFormSubmissions(
        () => this.ngOnInit(), // run only after sync is done
        (val: boolean) => (this.isSyncInProgress = val),
        (val: boolean) => (this.isDownloadEnabled = val),
      );
    }
  }

  @ViewChild(FormioComponent) formioComponent!: FormioComponent;
  @ViewChild('formContainer') formContainer!: ElementRef;
  @ViewChild(TabsComponent) tabsComponent!: TabsComponent;

  onFormReady(instance: any) {
    this.formInstance = instance;
  }

  public onDataStateChange(state: DataStateChangeEvent): void {
    this.gridState = state;
    this.loadGridData();
  }

  private loadGridData(): void {
    const result = process(this.inspectionCustomersList, this.gridState);
    this.gridView = {
      data: result.data,
      total: result.total,
    };
  }

  public onDropdownChange(yard: T_RailYard): void {
    this.gridState = { ...this.gridState, skip: 0 };
    this.selectYard(yard);
  }

  public onExportDropdownChange(value: any): void {
    setTimeout(() => {
      const exportState = {
        ...this.gridState,
        skip: 0,
        take: undefined,
      };

      const result = process(this.inspectionCustomersList, exportState);
      this.handleExport(value.text, result.data);
    }, 50);
  }

  public onComboBoxChange(value: any): void {
    if (value && typeof value === 'object') {
      if (
        !this.selectedCustomerObj ||
        this.selectedCustomerObj.id !== value.id
      ) {
        this.selectCustomer(value);
      }
    }
  }

  public filterChange(filter: any): void {
    if (filter.length)
      this.allCustomers = this.allCustomersOriginal.filter(
        (s) => s.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1,
      );
    else this.allCustomers = [...this.allCustomersOriginal];
  }

  public onDateChange(value: Date, type: string): void {
    this.dateRangeSelected = 'custom';
    if (type === 'startDate')
      this.filterCustomersData(
        'custom',
        new Date(value),
        new Date(this.endDateKendo),
      );
    else if (type === 'endDate')
      this.filterCustomersData(
        'custom',
        new Date(this.startDateKendo),
        new Date(value),
      );
  }

  ngAfterViewInit() {
    if (this.formioComponent) {
      const interval = setInterval(() => {
        const formioInstance = this.formioComponent.formio;
        if (formioInstance) {
          this.formInstance = formioInstance;
          this.formInstance.on('ready', () => {
            this.initFormListeners(); // Initialize form listeners when the form is ready
          });
          clearInterval(interval); // Clear the interval once the form is ready
        }
      }, 100); // Check every 100ms
    }
  }

  initFormListeners() {
    if (!this.formInstance) {
      this.kendoNotificationService.showError(
        'Form instance not initialized yet.',
      );
      return;
    }

    // Disable button when user edits any field
    this.formInstance.on('change', (event: any) => {
      if (event.changed && this.isDownloadEnabled) {
        this.isDownloadEnabled = true;
      }
    });

    // Enable button after successful form submission (status 201)
    this.formInstance.on('submit', (submission: any) => {
      this.isDownloadEnabled = true;
    });
  }

  // PDF generation logic triggered by the Download PDF button.
  async downloadPDF(formTitle: string, Id: number) {
    const url = `${this.baseUrl}/${API_ENDPOINTS.InspectionHub.InspectionFormDetailGetById}?inspectionFormDetailId=${Id}`;
    this.isPdfDownloading = true;
    this.formPath = formTitle;

    try {
      const response = await firstValueFrom(this.httpClient.get<any>(url));

      const dynamicFormName = response.Result.FormPath ?? '';
      const rawDataString = response.Result.FormEntryDetail;

      this.formUrl = `${environment.formIoUrl}/${dynamicFormName}`;
      this.formData = JSON.parse(rawDataString);
      this.formData.productName = this.formData.productName?.name;
      this.formData.customerName = this.formData.customerName?.name;
      this.formData.yardName = this.formData.yardName?.name;
      this.formData.railCarId = this.formData.railCarId?.asset;

      this.formReadyToRender = true;
      await this.waitForFormInstanceReady();
      await this.delay(300);

      const radioElements = document.querySelectorAll('.radio-custom');
      radioElements.forEach((el) => el.classList.remove('radio-custom'));
      await this.delay(300);

      const container = this.formContainer.nativeElement as HTMLElement;
      container.classList.add('force-show-radios');
      const displayType = this.formInstance.form?.display ?? 'form';

      const pdf = new jsPDF('p', 'pt', 'letter');

      if (
        displayType === 'wizard' &&
        typeof this.formInstance.setPage === 'function'
      ) {
        await this.captureWizardPages(pdf, container, true);
      } else {
        await this.captureFormTabs(pdf, container, true);
      }
      const now = new Date();
      const formattedDate = formatDate(now);
      const fileName = `${formTitle} Form ${formattedDate}.pdf`;
      const pdfBlob = pdf.output('blob');

      //  iOS-specific handling
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        //  Desktop or Android
        saveAs(pdfBlob, fileName);
      }
    } catch (err: any) {
      this.kendoNotificationService.showError(
        err?.statusText ?? 'Error trying to generate PDF.',
      );
    } finally {
      this.isPdfDownloading = false;

      setTimeout(() => {
        this.resetFormState();
      }, 500);
    }
  }

  // Simple delay function
  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public waitForFormInstanceReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Form initialization timed out')),
        10000,
      );

      const checkInterval = setInterval(() => {
        if (this.formInstance) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  // Wizard capture (existing logic)
  public async captureWizardPages(
    pdf: jsPDF,
    container: HTMLElement,
    isFirstPage: boolean,
  ): Promise<boolean> {
    const totalPages = this.formInstance.pages?.length ?? 1;
    for (let i = 0; i < totalPages; i++) {
      await this.formInstance.setPage(i, { allowInvalidSubmit: true });
      await new Promise((resolve) => setTimeout(resolve, 500));
      const bigCanvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      } as any);
      isFirstPage = await this.sliceCanvasToMultiplePages(
        pdf,
        bigCanvas,
        isFirstPage,
      );
    }
    return isFirstPage;
  }

  // Adding Header, Footer, and Watermark
  public async captureFormTabs(
    pdf: jsPDF,
    container: HTMLElement,
    isFirstPage: boolean,
  ): Promise<boolean> {
    const tabLinks: NodeListOf<HTMLElement> = container.querySelectorAll(
      'a[ref="tabLink-tabs"], button.page-link[ref^="wizard-"]',
    );
    if (tabLinks.length > 0) {
      let originalTabIndex = -1;
      tabLinks.forEach((link, idx) => {
        if (link.classList.contains('active')) {
          originalTabIndex = idx;
        }
      });
      for (const tab of Array.from(tabLinks)) {
        tab.click();
        this.cdr.detectChanges();
        await new Promise((r) => setTimeout(r, 500));

        const bigCanvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        } as any);

        isFirstPage = await this.sliceCanvasToMultiplePages(
          pdf,
          bigCanvas,
          isFirstPage,
        );
      }
      if (originalTabIndex >= 0 && originalTabIndex < tabLinks.length) {
        tabLinks[originalTabIndex].click();
      }
    } else {
      await new Promise((r) => setTimeout(r, 500));
      const bigCanvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      } as any);
      isFirstPage = await this.sliceCanvasToMultiplePages(
        pdf,
        bigCanvas,
        isFirstPage,
      );
    }
    return isFirstPage;
  }

  public async sliceCanvasToMultiplePages(
    pdf: jsPDF,
    bigCanvas: HTMLCanvasElement,
    isFirstPage: boolean,
  ): Promise<boolean> {
    const topMargin = 20,
      bottomMargin = 20,
      leftMargin = 20,
      rightMargin = 20;
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pdfWidth - (leftMargin + rightMargin);
    const contentHeight = pdfHeight - (topMargin + bottomMargin);

    const imgData = bigCanvas.toDataURL('image/jpeg', 0.8);
    const imgProps = pdf.getImageProperties(imgData);

    const canvasWidth = imgProps.width;
    const canvasHeight = imgProps.height;
    const ratio = canvasWidth / canvasHeight;

    let imgHeight = contentWidth / ratio;

    if (imgHeight > contentHeight) {
      imgHeight = contentHeight;
    }

    if (!isFirstPage) {
      pdf.addPage();
    }
    isFirstPage = false;

    pdf.addImage(
      imgData,
      'JPEG',
      leftMargin,
      topMargin,
      contentWidth,
      imgHeight,
    );

    return isFirstPage;
  }

  handleExport(value: string, data: any) {
    if (data.length <= 0) {
      this.kendoNotificationService.showWarning(
        'No data present, unable to export.',
      );
      return;
    }

    const fileNamePre = 'Inspection-Hub';
    const customHeaders = [
      { key: 'RailCarId', label: 'Railcar ID' },
      { key: 'YardName', label: 'Yard' },
      { key: 'FormName', label: 'Form Name' },
      { key: 'InspectorName', label: 'Inspector Name' },
      { key: 'UserEmail', label: 'User ID' },
      { key: 'SubmittedDate', label: 'Submitted On' },
      { key: 'UpdatedDate', label: 'Updated On' },
      { key: 'Status', label: 'Status' },
    ];

    const userTz = this.timezoneService.getTimezone() || 'UTC';
    const exportData = data.map((item: any) => ({
      ...item,
      submittedDate:
        item.Status === 'Submitted' && item.SubmittedDate
          ? `${DateTime.fromISO(item.SubmittedDate, { zone: 'utc' })
              .setZone(userTz)
              .toFormat('MM/dd/yyyy HH:mm:ss')} `
          : 'N/A',
      UpdatedDate: item.UpdatedDate
        ? `${DateTime.fromISO(item.UpdatedDate, { zone: 'utc' })
            .setZone(userTz)
            .toFormat('MM/dd/yyyy HH:mm:ss')}`
        : '',
    }));

    switch (value) {
      case 'CSV':
        exportAsCSV(exportData, fileNamePre, customHeaders);
        break;
      case 'EXCEL':
        exportAsExcel(exportData, fileNamePre, customHeaders);
        break;
      case 'PDF':
        exportAsPDF(exportData, fileNamePre, customHeaders);
        break;
    }
  }

  onBtnGroupClick(value: typeof this.dateRangeSelected): void {
    if (this.dateRangeSelected === value) return;
    this.dateRangeSelected = value;
    this.filterCustomersData(value);
  }

  filterCustomersData(
    filter: typeof this.dateRangeSelected,
    start?: Date,
    end?: Date,
  ): void {
    let from: Date = new Date();
    let to: Date = new Date();

    if (filter !== 'custom') {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    }
    switch (filter) {
      case 'today':
        break;
      case 'last7days':
        from.setDate(to.getDate() - 6);
        break;
      case 'last30days':
        from.setDate(to.getDate() - 30);
        break;
      case 'custom':
      default:
        if (start && end) {
          from = start;
          to = end;
        }
        break;
    }

    this.startDateKendo = from;
    this.endDateKendo = to;

    const selectedYards: number[] =
      typeof this.selectedRailYard === 'object' &&
      this.selectedRailYard?.Id !== -1
        ? [this.selectedRailYard.Id]
        : [];
    this.fetchDataByYards(selectedYards);
  }

  ngOnInit() {
    this.userRole = this.accessRoleService.getRole();
    this.customersList();
    this.submitDraftHelperService.clearOldOfflineData();
  }

  async deleteInspection(id: number) {
    if (!navigator.onLine) {
      this.kendoNotificationService.showWarning(
        '"Delete Form" feature is not available in offline mode. Please try again once you are back online.',
      );
      return;
    }
    const isConfirmed = await this.showConfirm();
    if (isConfirmed) {
      this.commonApiService._sDeleteInspectionRecord(id).subscribe({
        next: () => {
          this.kendoNotificationService.showSuccess(
            'Record Deleted successfully',
          );
          const newList = this.inspectionCustomersList.filter(
            (inspect) => inspect.Id !== id,
          );
          this.inspectionCustomersList = newList;
          this.loadGridData();
        },
        error: (err) => {
          this.kendoNotificationService.showError(
            'Deletion failed! Please try again later.',
          );
        },
      });
    }
  }

  customersList(): void {
    this.store
      .select(selectAllCustomers)
      .pipe(take(1))
      .subscribe((customers: ICustomer[]) => {
        let isCustomerSelected = false;
        if (customers?.length > 0) {
          this.allCustomers = [...customers];
          this.allCustomersOriginal = [...customers];
          this.isCustomersLoading = false;
        }
        this.store
          .select(selectSelectedCustomer)
          .pipe(take(1))
          .subscribe((selectedCustomer: ICustomer | null) => {
            if (selectedCustomer) {
              this.selectCustomer(selectedCustomer);
              isCustomerSelected = true;
            } else if (customers.length > 0) {
              this.selectCustomer(customers[0]);
              isCustomerSelected = true;
            }

            this.commonApiService._sCustomerListing().subscribe({
              next: (data) => {
                if (data.length > 0) {
                  this.store.dispatch(setCustomers({ customers: data }));
                  this.allCustomers = [...data];
                  this.allCustomersOriginal = [...data];
                  if (!isCustomerSelected) this.selectCustomer(data[0]);
                } else {
                  this.kendoNotificationService.showError(
                    'No customers found.',
                  );
                  this.isRailYardLoading = false;
                  this.isLoading = false;
                }
                this.isCustomersLoading = false;
              },
              error: (err) => {
                this.kendoNotificationService.showError(err);
                this.isCustomersLoading = false;
                this.isRailYardLoading = false;
                this.isLoading = false;
              },
            });
          });
      });
  }

  selectCustomer(customer: any): void {
    if (this.selectedCustomerObj === customer) return;
    this.isRailYardLoading = true;
    this.isLoading = true;
    this.railYards = [];
    this.selectedRailYard = { Id: 0, Name: '' };
    this.selectedCustomerObj = customer;
    this.store.dispatch(setSelectedCustomer({ customer }));
    this.getRailYardsByCustomerId(customer?.id);
  }

  getRailYardsByCustomerId(customerId: number): void {
    this.commonApiService._sGetRailYardsByCustomer(customerId).subscribe({
      next: (response) => {
        const yards: T_RailYard[] = response?.Result ?? [];
        if (response?.IsSuccess && yards.length > 0) {
          const yardsArr = [...yards].sort((a, b) =>
            a.Name.localeCompare(b.Name),
          );
          this.railYards = [DEFAULT_ALL_YARD, ...yardsArr];
          this.selectYard(DEFAULT_ALL_YARD);
        } else {
          this.inspectionCustomersList = [];
          this.loadGridData();
          this.isLoading = false;
        }
        this.isRailYardLoading = false;
      },
      error: (err) => {
        this.kendoNotificationService.showError(err);
        this.isRailYardLoading = false;
        this.isLoading = false;
      },
    });
  }

  selectYard(yard: T_RailYard): void {
    this.selectedRailYard = yard;
    const selectedYards: number[] = yard.Id === -1 ? [] : [yard.Id];
    this.fetchDataByYards(selectedYards);
  }

  fetchDataByYards(yardIds: number[]) {
    this.isLoading = true;
    this.commonApiService
      ._sGetInspectionCustomers(
        this.selectedCustomerObj?.id,
        formatDateLocal(this.startDateKendo),
        formatDateLocal(this.endDateKendo),
        yardIds,
      )
      .subscribe({
        next: (response) => {
          this.inspectionCustomersList = response.Result ?? [];
          this.loadGridData();
          this.isLoading = false;
        },
        error: (err) => {
          this.kendoNotificationService.showError(
            `Error fetching inspection hub records: ${err}`,
          );
          this.isLoading = false;
        },
      });
  }

  private resetFormState(): void {
    this.formReadyToRender = false;
    this.formUrl = undefined;
    this.formData = null;
    this.formInstance = null;
    this.isDownloadEnabled = true;
  }

  InspectionFormDetailGetById(inspection: any, inspectionType?: string) {
    let routePath = '/form-details-filled';
    if (this.userRole === 'Customer Admin' && inspectionType === 'edit') {
      routePath = '/form-details';
    }

    this.router.navigate([
      routePath,
      inspection.FormPath,
      inspection.Id,
      inspection.CustomerAssigned,
      inspection.YardName,
    ]);
  }

  async showExportDialog(): Promise<{ confirmed: boolean; value?: string }> {
    this.exportDialogVisible = true;
    return new Promise((resolve) => {
      this.exportDialogPromiseResolver = resolve;
    });
  }

  onExportDialogClose(result: { confirmed: boolean; value?: string }) {
    this.exportDialogVisible = false;
    this.exportDialogPromiseResolver?.(result);
    this.exportDialogPromiseResolver = null;

    if (result.confirmed) this.onExportDropdownChange(result.value);
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
}
