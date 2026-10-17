import { Component, HostListener, OnInit } from '@angular/core';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import { DateTime } from 'luxon';
import { TimezoneService } from 'src/app/common/services/timezone.service';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { FormioModule } from '@formio/angular';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { process, State } from '@progress/kendo-data-query';
import { EXPORT_OPTIONS } from 'src/app/shared/constants/export-options';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { Router } from '@angular/router';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { T_RailYard } from 'src/app/common/types';
import { KendoExportDialogComponent } from 'src/app/shared/kendo-export-dialog/kendo-export-dialog.component';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import {
  ICustomer,
  setCustomers,
} from 'src/app/store/customer-dropdown/customer-dropdown.actions';
import { selectAllCustomers } from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

@Component({
  selector: 'app-form-management',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_BUTTONS,
    DropDownsModule,
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
  isLoading: boolean = true;
  isSyncInProgress: boolean = false;
  selectedRailYard: T_RailYard = { Id: -1, Name: 'All' };
  railYards: T_RailYard[] = [];
  isRailYardLoading: boolean = true;
  yards: any[] = [];
  formListing: any;
  userRole: string = '';
  currentCustomerObj: any = {};

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
    private readonly timezoneService: TimezoneService,
    private readonly accessRoleService: AccessRoleService,
    private readonly kendoNotificationService: KendoNotificationService,
    private readonly router: Router,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly commonApiService: CommonApiService,
    private readonly store: Store,
  ) {}

  @HostListener('window:online')
  online() {
    this.submitDraftHelperService.syncAllOfflineFormSubmissions(
      () => this.ngOnInit(), // run only after sync is done
      (val: boolean) => (this.isSyncInProgress = val),
    );
  }

  ngOnInit(): void {
    this.userRole = this.accessRoleService.getRole();
    console.log('roles', this.userRole)
    this.loadCustomerList();
  }

  public onDataStateChange(state: DataStateChangeEvent): void {
    this.gridState = state;
    this.loadGridData();
  }

  private loadGridData(): void {
    const result = process(this.formListing, this.gridState);
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

      const result = process(this.formListing, exportState);
      this.handleExport(value.text, result.data);
    }, 50);
  }

  getRailYardsByCustomerId(customerId: number): void {
    this.commonApiService._sGetRailYardsByCustomer(customerId).subscribe({
      next: (response) => {
        const yards: T_RailYard[] = response?.Result ?? [];
        if (response?.IsSuccess && yards.length > 0) {
          const yardsArr = [...yards].sort((a, b) =>
            a.Name.localeCompare(b.Name),
          );
          this.railYards = [{ Id: -1, Name: 'All' }, ...yardsArr];
          this.selectYard({ Id: -1, Name: 'All' });
        } else this.isLoading = false;
        this.isRailYardLoading = false;
      },
      error: (err) => {
        this.kendoNotificationService.showError(err);
        this.isRailYardLoading = false;
        this.isLoading = false;
      },
    });
  }

  loadCustomerList(): void {
    this.isLoading = true;
    this.store
      .select(selectAllCustomers)
      .pipe(take(1))
      .subscribe((customers: ICustomer[]) => {
        if (customers?.length > 0) {
          this.currentCustomerObj = customers[0];
          this.getRailYardsByCustomerId(customers[0]?.id);
        }

        this.commonApiService._sCustomerListing().subscribe({
          next: (data) => {
            if (data.length > 0) {
              this.store.dispatch(setCustomers({ customers: data }));
              this.currentCustomerObj = data[0];
              if (customers?.length <= 0)
                this.getRailYardsByCustomerId(data[0]?.id);
            } else {
              this.kendoNotificationService.showError('User data not found.');
              this.isLoading = false;
              this.isRailYardLoading = false;
            }
          },
          error: (err) => {
            this.kendoNotificationService.showError(
              `Error fetching form management records: ${err}`,
            );
            this.isLoading = false;
            this.isRailYardLoading = false;
          },
        });
      });
  }

  selectYard(yard: T_RailYard): void {
    this.selectedRailYard = yard;
    const selectedYardIds: number[] = yard.Id === -1 ? [] : [yard.Id];
    this.isLoading = true;
    this.getFormMgmtListing(this.currentCustomerObj?.id, selectedYardIds);
  }

  // customer form Listing
  getFormMgmtListing(customerId: number, yardIds?: number[]) {
    this.commonApiService
      ._sGetInspectionFormList(customerId, yardIds)
      .subscribe({
        next: (res) => {
          this.formListing = res.Result;
          this.loadGridData();
          this.isLoading = false;
        },
        error: (error) => {
          this.kendoNotificationService.showError(error.message);
          this.isLoading = false;
        },
      });
  }

  InspectionFormDetailGetById(inspection: any): void {
    if (this.userRole === 'Customer User') {
      this.router.navigate([
        '/form-details-form',
        inspection.Path,
        inspection.Id,
      ]);
    } else {
      this.router.navigate([
        '/form-details-filled',
        inspection.Path,
        this.currentCustomerObj.name,
        inspection.YardName,
      ]);
    }
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
      { key: 'Title', label: 'Forms Assigned' },
      { key: 'YardName', label: 'Yard' },
      { key: 'AssignDate', label: 'Assigned On' },
    ];

    const skipColumns = ['FormPath', 'customerIds', 'CustomerCount'];
    const userTz = this.timezoneService.getTimezone() || 'UTC';

    const exportData = data.map((item: any) => ({
      ...item,
      AssignDate: item.AssignDate
        ? `${DateTime.fromISO(item.AssignDate, { zone: 'utc' })
            .setZone(userTz)
            .toFormat('MM/dd/yyyy HH:mm:ss')}`
        : '',
    }));

    switch (value) {
      case 'CSV':
        exportAsCSV(exportData, fileNamePre, customHeaders, skipColumns);
        break;
      case 'EXCEL':
        exportAsExcel(exportData, fileNamePre, customHeaders, skipColumns);
        break;
      case 'PDF':
        exportAsPDF(exportData, fileNamePre, customHeaders, skipColumns);
        break;
    }
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
