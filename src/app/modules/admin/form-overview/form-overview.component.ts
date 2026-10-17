import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { FormioModule } from '@formio/angular';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { process, State } from '@progress/kendo-data-query';
import { EXPORT_OPTIONS } from 'src/app/shared/constants/export-options';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { KendoConfirmDialogComponent } from 'src/app/shared/kendo-confirm-dialog/kendo-confirm-dialog.component';
import { KendoExportDialogComponent } from 'src/app/shared/kendo-export-dialog/kendo-export-dialog.component';

@Component({
  selector: 'app-form-overview',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_INPUTS,
    KENDO_BUTTONS,
    KendoConfirmDialogComponent,
    KendoExportDialogComponent,
    SharedModule,
    CommonModule,
    CommonAppModule,
    FormioModule,
    ModuleLayoutComponent,
  ],
  templateUrl: './form-overview.component.html',
  styleUrl: './form-overview.component.scss',
})
export class FormOverviewComponent implements OnInit {
  EXPORT_OPTIONS = EXPORT_OPTIONS;
  formPath: any;
  formTitle: any;
  isLoading = true;
  isSyncInProgress: boolean = false;
  formName: any;
  formsList: any;
  public dialogVisible = false;
  private confirmResolver!: (value: boolean) => void;

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
    private readonly route: ActivatedRoute,
    private readonly kendoNotificationService: KendoNotificationService,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly commonApiService: CommonApiService,
    private readonly router: Router,
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

  private loadGridData(): void {
    const result = process(this.formsList, this.gridState);
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

      const result = process(this.formsList, exportState);
      this.handleExport(value.text, result.data);
    }, 50);
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.formPath = params.get('path');
      this.formTitle = params.get('Title');
    });
    if (this.formPath || this.formTitle) {
      this.loadCustomerData(this.formPath);
    }
  }

  loadCustomerData(formPath: string) {
    this.commonApiService._sGetCustomerByFormPath(formPath).subscribe({
      next: (data) => {
        const result = (data as { Result?: any })?.Result;
        this.formsList = result;
        this.loadGridData();
        this.isLoading = false;
      },
      error: () => {
        this.kendoNotificationService.showError('Error loading customer data');
        this.isLoading = false;
      },
    });
  }

  handleExport(value: string, data: any) {
    if (data.length <= 0) {
      this.kendoNotificationService.showWarning(
        'No data present, unable to export.',
      );
      return;
    }

    const fileNamePre = 'Form-Overview';
    const customHeaders = [
      { key: 'CustomerName', label: 'Customers Assigned' },
      { key: 'YardName', label: 'Yard' },
      { key: 'ContactPerson', label: 'Contact Person' },
      { key: 'Email', label: 'User ID' },
      { key: 'PhoneNo', label: 'Phone No.' },
    ];

    const skipColumns = ['FormPath', 'customerIds'];

    const formattedData = data.map((item: any) => ({
      ...item,
      ContactPerson: item.ContactPerson ?? 'N/A',
      PhoneNo: item.PhoneNo ?? 'N/A',
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

  goBack() {
    this.router.navigate(['/form-management']);
  }

  assignNewCustomer() {
    this.router.navigate(['/assign-customer']);
  }

  async showConfirm(): Promise<boolean> {
    this.dialogVisible = true;
    return new Promise<boolean>((resolve) => {
      this.confirmResolver = resolve;
    });
  }

  async unassignInspection(inspection: any) {
    if (!navigator.onLine) {
      this.kendoNotificationService.showWarning(
        '"Unassign Form" feature is not available in offline mode. Please try again once you are back online.',
      );
      return;
    }
    const isConfirmed = await this.showConfirm();
    if (isConfirmed) {
      this.isLoading = true;
      const payload = {
        Id: inspection.InspectionId,
        FormPath: this.formPath,
      };
      this.commonApiService.unassignInspectionForm(payload).subscribe({
        next: () => {
          this.kendoNotificationService.showSuccess(
            'Form unassigned successfully.',
          );
          this.formsList = this.formsList.filter(
            (form: any) => form.InspectionId !== payload.Id,
          );
          this.loadGridData();
          this.isLoading = false;
        },
        error: (err) => {
          this.kendoNotificationService.showError(
            `Error unassigning form: ${err}`,
          );
          this.isLoading = false;
        },
      });
    }
  }

  handleDialogClose(status: string) {
    this.dialogVisible = false;
    this.confirmResolver(status === 'confirm');
  }

  InspectionFormDetailGetById(inspection: any): void {

     this.router.navigate([
      '/form-details-form',
      this.formPath,
      inspection.InspectionId,
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
}
