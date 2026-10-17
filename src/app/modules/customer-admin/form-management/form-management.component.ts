import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { exportAsCSV, exportAsExcel, exportAsPDF } from 'src/app/lib/exportAs';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { DateTime } from 'luxon';
import { TimezoneService } from 'src/app/common/services/timezone.service';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { process, State } from '@progress/kendo-data-query';
import {
  DropDownsModule,
  ComboBoxModule,
} from '@progress/kendo-angular-dropdowns';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { EXPORT_OPTIONS } from 'src/app/shared/constants/export-options';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { DEFAULT_ALL_YARD, T_RailYard } from 'src/app/common/types';
import { KendoExportDialogComponent } from 'src/app/shared/kendo-export-dialog/kendo-export-dialog.component';
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
  selector: 'app-form-management',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_INPUTS,
    KENDO_BUTTONS,
    ComboBoxModule,
    DropDownsModule,
    SharedModule,
    CommonModule,
    CommonAppModule,
    ModuleLayoutComponent,
    KendoExportDialogComponent,
  ],
  templateUrl: './form-management.component.html',
  styleUrl: './form-management.component.scss',
})
export class FormManagementComponent implements OnInit {
  EXPORT_OPTIONS = EXPORT_OPTIONS;
  userRole: string = '';
  isLoading: boolean = true;
  isCustomersLoading: boolean = true;
  selectedRailYard: T_RailYard = DEFAULT_ALL_YARD;
  inspectionCustomersList: any[] = [];
  railYards: T_RailYard[] = [];
  selectedCustomerObj: any = {};
  allCustomers: any[] = [];
  allCustomersOriginal: any[] = [];
  isRailYardLoading: boolean = true;
  yards: any[] = [];
  isSyncInProgress: boolean = false;

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
    private readonly kendoNotificationService: KendoNotificationService,
    private readonly timezoneService: TimezoneService,
    private readonly accessRoleService: AccessRoleService,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly commonApiService: CommonApiService,
    private readonly router: Router,
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
      );
    }
  }

  ngOnInit(): void {
    this.userRole = this.accessRoleService.getRole();
    this.customersList();
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
    if (this.selectedCustomerObj?.id === customer?.id) return;
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
          const railsArr = [...yards].sort((a, b) =>
            a.Name.localeCompare(b.Name),
          );
          this.railYards = [DEFAULT_ALL_YARD, ...railsArr];
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
    const selectedYardIds: number[] = yard.Id === -1 ? [] : [yard.Id];
    this.getFormMgmtListing(this.selectedCustomerObj?.id, selectedYardIds);
  }

  //Fetch Form Management List
  getFormMgmtListing(customerId: number, yardIds?: number[]) {
    this.isLoading = true;
    this.commonApiService
      ._sGetInspectionFormList(customerId, yardIds)
      .subscribe({
        next: (res) => {
          this.inspectionCustomersList = res?.Result ?? [];
          this.loadGridData();
          this.isLoading = false;
        },
        error: (error) => {
          this.kendoNotificationService.showError(error.message);
          this.isLoading = false;
        },
      });
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

  InspectionFormDetailGetById(inspection: any): void {
    if (this.userRole === 'Customer Admin') {
      debugger
      this.router.navigate([
        '/form-details-form',
        inspection.Path,
        inspection.Id,
      ]);
    } else {
      this.router.navigate([
        '/form-details-filled',
        inspection.Path,
        this.selectedCustomerObj.name,
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
      { key: 'Title', label: 'Forms Name' },
      { key: 'YardName', label: 'Yard' },
      { key: 'AssignDate', label: 'Assigned On' },
    ];

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
