import { DatePipe, CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { process, State } from '@progress/kendo-data-query';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { KendoConfirmDialogComponent } from 'src/app/shared/kendo-confirm-dialog/kendo-confirm-dialog.component';
import { CustomerDetailService } from 'src/app/shared/services/customer-details.service';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';

@Component({
  selector: 'app-customer-details',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_INPUTS,
    KENDO_BUTTONS,
    KendoConfirmDialogComponent,
    SharedModule,
    CommonModule,
    CommonAppModule,
    ModuleLayoutComponent,
  ],
  templateUrl: './customer-details.component.html',
  styleUrl: './customer-details.component.scss',
  providers: [DatePipe],
})
export class CustomerDetailsComponent implements OnInit {
  userRole: string = '';
  isFormsLoading = false;
  isDetailsLoading = true;
  isSyncInProgress: boolean = false;
  selectedCustomer: any = null;
  allCustomers: any[] = [];
  CustomerId: any;
  CustomerName: any;
  customerId: any;
  assignedFormsCustomer: any[] = [];
  searchTerm: string = '';
  filteredFormsCustomer: any[] = [];
  currentCU: string = '';
  noFormsFound = false;
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

  constructor(
    private readonly activated: ActivatedRoute,
    private readonly adminService: AdminService,
    private readonly commonApiService: CommonApiService,
    private readonly router: Router,
    private readonly datepipe: DatePipe,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly customerDetailService: CustomerDetailService,
    private readonly kendoNotificationService: KendoNotificationService,
    private readonly location: Location,
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
    const result = process(this.assignedFormsCustomer, this.gridState);
    this.gridView = {
      data: result.data,
      total: result.total,
    };
  }

  ngOnInit(): void {
    this.activated.queryParams.subscribe((params) => {
      this.CustomerId = params['CustomerId'];
      this.CustomerName = params['CustomerName'];
    });

    this.customerId = Number(this.activated.snapshot.paramMap.get('id'));
    const vendorDetail = JSON.parse(
      sessionStorage.getItem('customer-detail') ?? '[]',
    );
    if (vendorDetail) this.allCustomers = vendorDetail;

    this.CustomerId = this.customerId;
    this.getCustomerDetails();
    this.getFormsAssignedById();
  }

  getCustomerDetails(): void {
    this.adminService._sgetCustomersById(this.customerId).subscribe({
      next: (res) => {
        this.isDetailsLoading = false;
        this.selectedCustomer = res;
        this.currentCU = this.selectedCustomer.name;
        this.customerDetailService.setCustomerName(this.selectedCustomer.name);
        sessionStorage.setItem(
          'currentCustomerDetails',
          JSON.stringify(this.selectedCustomer.name),
        );
      },
      error: (error) => {
        this.router.navigate(['/customers']);
        this.kendoNotificationService.showError(
          `Error fetching details: ${error}`,
        );
        this.isDetailsLoading = false;
      },
    });
  }

  //date format
  formatDate(dateString: string): string {
    return this.datepipe.transform(dateString, 'MM/dd/yyyy') ?? '';
  }
  //toggle for check uncheck
  toggleStatus(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.selectedCustomer.active = isChecked;
  }

  getFormsAssignedById(): void {
    this.isFormsLoading = true;
    this.commonApiService
      ._sGetInspectionFormByCustomerId(this.customerId)
      .subscribe({
        next: (res) => {
          if (res.IsSuccess === true && res.Result.length > 0) {
            this.assignedFormsCustomer = res.Result;
            this.filteredFormsCustomer = res.Result;
            this.loadGridData();
            this.isFormsLoading = false;
          }
          this.isFormsLoading = false;
        },
        error: (error) => {
          this.kendoNotificationService.showError(
            `Error fetching Forms: ${error}`,
          );
          this.isFormsLoading = false;
        },
      });
  }

  InspectionFormDetailGetById(form: any): void {
    this.router.navigate(['/form-details-form', form.Path, form.Id]);
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
      this.isFormsLoading = true;
      const payload = {
        Id: inspection.Id,
        FormPath: inspection.Path,
      };
      this.commonApiService.unassignInspectionForm(payload).subscribe({
        next: () => {
          this.kendoNotificationService.showSuccess(
            'Form unassigned successfully.',
          );
          this.assignedFormsCustomer = this.assignedFormsCustomer.filter(
            (form: any) => form.Id !== payload.Id,
          );
          this.loadGridData();
          this.isFormsLoading = false;
        },
        error: (err) => {
          this.kendoNotificationService.showError(
            `Error unassigning form: ${err}`,
          );
          this.isFormsLoading = false;
        },
      });
    }
  }

  handleDialogClose(status: string) {
    this.dialogVisible = false;
    this.confirmResolver(status === 'confirm');
  }

  goBack() {
    this.location.back();
  }

  assignForm() {
    this.router.navigate(['/form-list', this.customerId]);
  }
}
