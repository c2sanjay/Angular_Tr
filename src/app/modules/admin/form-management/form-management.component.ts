import { Component, HostListener, OnInit } from '@angular/core';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { process, State } from '@progress/kendo-data-query';
import { FormioModule } from '@formio/angular';
import { DateTime } from 'luxon';
import { TimezoneService } from 'src/app/common/services/timezone.service';
import { EXPORT_OPTIONS } from 'src/app/shared/constants/export-options';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { Router } from '@angular/router';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KendoExportDialogComponent } from 'src/app/shared/kendo-export-dialog/kendo-export-dialog.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-form-management',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_BUTTONS,
    SharedModule,
    CommonModule,
    CommonAppModule,
    FormioModule,
    ModuleLayoutComponent,
    KendoExportDialogComponent,
  ],
  templateUrl: './form-management.component.html',
  styleUrl: './form-management.component.scss',
})
export class FormManagementComponent implements OnInit {
  EXPORT_OPTIONS = EXPORT_OPTIONS;
  inspectionForm = false;
  notify = true;
  isSidebarOpen = false;
  errorMessage = '';
  isLoading: boolean = true;
  isSyncInProgress: boolean = false;
  forms: any[] = [];
  formsAssigned: any[] = [];
  railYardNames: string[] = [];
  selectedCustomer: any;
  selectedFormDetails: any;
  savedFormPath: any;
  currentTimezone: any;
  railYards: any;
  customers: any;
  yards: any[] = [];
  yardNames: string[] = [];
  formDetail: any;
  formListing: any;
  railYardsLoading = false;
  formGroup: string = '';
  createdDate: string = '';
  public gridView: GridDataResult = { data: [], total: 0 };
  public pageSize = 15;
  public gridState: State = {
    skip: 0,
    take: this.pageSize,
    filter: undefined,
    sort: [],
  };
  public skip = 0;
  public exportDialogVisible = false;
  private exportDialogPromiseResolver:
    | ((value: { confirmed: boolean; value?: string }) => void)
    | null = null;

  constructor(
    private readonly commonApiService: CommonApiService,
    private readonly router: Router,
    private readonly kendoNotificationService: KendoNotificationService,
    private readonly timezoneService: TimezoneService,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
  ) {}

  @HostListener('window:online')
  online() {
    this.submitDraftHelperService.syncAllOfflineFormSubmissions(
      () => this.ngOnInit(), // run only after sync is done
      (val: boolean) => (this.isSyncInProgress = val),
    );
  }

  public onDataStateChange(state: DataStateChangeEvent): void {
    this.gridState = state;
    this.loadGridData();
  }

  public loadGridData(): void {
    const result = process(this.formsAssigned, this.gridState);

    this.gridView = {
      data: result.data,
      total: result.total,
    };
  }

  public onExportDropdownChange(value: any): void {
    setTimeout(() => {
      const exportState = {
        ...this.gridState,
        skip: 0,
        take: undefined,
      };

      const result = process(this.formsAssigned, exportState);
      this.handleExport(value.text, result.data);
    }, 50);
  }

  ngOnInit(): void {
    this.FormManagementListing();
  }

  FormManagementListing() {
    this.commonApiService._sInspectionFormCustomerCountList().subscribe({
      next: (res) => {
        if (res.IsSuccess === true && res.Result.length > 0) {
          this.formsAssigned = res.Result;
          this.loadGridData();
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.kendoNotificationService.showError(
          `Error fetching list of forms: ${error}`,
        );
        this.isLoading = false;
      },
    });
  }

  GetCustomerListByFormPath(customer: any) {
    let routePath = '/form-overview';
    this.router.navigate([routePath, customer.Path], {
      queryParams: {
        ID: customer.FormId,
        path: customer.Path,
        Title: customer.Title,
      },
    });
    sessionStorage.setItem('formPath', customer.Path);
    sessionStorage.setItem('FormId', customer.FormId);
  }

  handleExport(value: string, data: any) {
    if (data.length <= 0) {
      this.kendoNotificationService.showWarning(
        'No data present, unable to export.',
      );
      return;
    }
    const fileNamePre = 'Form-Management';

    const customHeaders = [
      { key: 'Title', label: 'Form Name' },
      { key: 'Group', label: 'Group' },
      { key: 'Created', label: 'Created On' },
      { key: 'NoOfCustomer', label: 'No. of Customers Assigned' },
    ];

    const skipColumns = ['FormPath'];
    const userTz = this.timezoneService.getTimezone() || 'UTC';

    const formattedData = data.map((item: any) => ({
      ...item,
      CustomerCount: Array.isArray(item.customerIds)
        ? item.customerIds.length
        : 0,
      Group: 'DemoProject_1',
      Created: item.Created
        ? `${DateTime.fromISO(item.Created, { zone: 'utc' })
            .setZone(userTz)
            .toFormat('MM/dd/yyyy HH:mm:ss')} `
        : 'N/A',
    }));

    switch (value) {
      case 'CSV':
        exportAsCSV(formattedData, fileNamePre, customHeaders, skipColumns);
        break;
      case 'EXCEL':
        exportAsExcel(formattedData, fileNamePre, customHeaders, skipColumns);
        break;
      case 'PDF':
        exportAsPDF(formattedData, fileNamePre, customHeaders, skipColumns);
        break;
    }
  }

  createForm() {
    window.open(environment.formIoLoginUrl, '_blank', 'noopener');
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
}
