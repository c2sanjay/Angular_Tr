import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { ApiService } from 'src/app/auth/api.service';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { CommonModule, Location } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { FormioModule } from '@formio/angular';
import { process, State } from '@progress/kendo-data-query';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { UserDetailService } from 'src/app/shared/services/user-details.service';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_DIALOGS } from '@progress/kendo-angular-dialog';
import { KENDO_LABELS } from '@progress/kendo-angular-label';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import {
  ICustomer,
  setCustomers,
} from 'src/app/store/customer-dropdown/customer-dropdown.actions';
import { selectAllCustomers } from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

@Component({
  selector: 'app-assign-customer',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_BUTTONS,
    KENDO_INPUTS,
    KENDO_DIALOGS,
    KENDO_LABELS,
    DropDownsModule,
    SharedModule,
    CommonModule,
    CommonAppModule,
    FormioModule,
    ModuleLayoutComponent,
  ],
  templateUrl: './assign-customer.component.html',
  styleUrl: './assign-customer.component.scss',
})
export class AssignCustomerComponent implements OnInit {
  isLoading = true;
  isFormsLoading = true;
  isYardLoading = true;
  isSyncInProgress: boolean = false;
  customers: any[] = [];
  forms: any[] = [];
  selectedFormDetails: any = null;
  formTitle: string = '';
  formName: string = '';
  formPath: string = '';
  savedFormId: any;
  formId: string = '';
  yards: any[] = [];
  selectedCustomer: string = '';
  customerID: number | null = null;
  customerName: string = '';
  savedFormPath: string | null = '';
  customerContactName: string = '';
  customerContactPhoneNumber: number | null = null;
  customerprimaryContactEmail: string = '';
  createdBy: any;
  public gridView: GridDataResult = { data: [], total: 0 };
  public pageSize = 15;
  public gridState: State = {
    skip: 0,
    take: this.pageSize,
    filter: undefined,
    sort: [],
  };
  public skip = 0;
  public assignDialogVisible = false;
  public yardsToAssign: any;

  constructor(
    private readonly authService: ApiService,
    private readonly router: Router,
    public readonly kendoNotificationService: KendoNotificationService,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    public readonly commonApiService: CommonApiService,
    private readonly userDetailService: UserDetailService,
    private readonly location: Location,
    private readonly store: Store,
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
    const result = process(this.customers, this.gridState);
    this.gridView = {
      data: result.data,
      total: result.total,
    };
  }

  ngOnInit() {
    this.customersList();
    this.getFormList();
    this.savedFormId = sessionStorage.getItem('FormId');
    this.savedFormPath = sessionStorage.getItem('formPath');
    this.createdBy = this.userDetailService.getEmail();
  }

  customersList(): void {
    this.store
      .select(selectAllCustomers)
      .pipe(take(1))
      .subscribe((customers: ICustomer[]) => {
        if (customers?.length > 0) {
          this.customers = customers;
          this.loadGridData();
          this.isLoading = false;
        }

        this.commonApiService._sCustomerListing().subscribe({
          next: (data) => {
            this.store.dispatch(setCustomers({ customers: data }));
            this.customers = data;
            this.loadGridData();
            this.isLoading = false;
          },
          error: (error) => {
            this.kendoNotificationService.showError(
              `Error fetching customer: ${error}`,
            );
            this.isLoading = false;
          },
        });
      });
  }

  getFormList() {
    this.authService.getFormListing().subscribe({
      next: (response) => {
        if (response && Array.isArray(response) && response.length > 0) {
          this.selectedFormDetails = response.find(
            (f) => f.path === this.savedFormPath,
          );

          this.formTitle = this.selectedFormDetails.title;
          this.formName = this.selectedFormDetails.name;
          this.formPath = this.selectedFormDetails.path;
          this.forms = [...response].sort((a, b) =>
            a.title.localeCompare(b.title),
          );
        } else this.kendoNotificationService.showError('No forms found.');

        this.isFormsLoading = false;
      },
      error: (err) => {
        this.kendoNotificationService.showError(`Error fetching forms: ${err}`);
        this.isFormsLoading = false;
      },
    });
  }

  public onDropdownChange(value: any): void {
    this.formTitle = value.title;
    this.formName = value.name;
    this.formPath = value.path;
  }

  formAssign(
    customerID: number,
    customerName: string,
    customerContactName: string,
    customerContactPhoneNumber: number,
    customerprimaryContactEmail: string,
  ) {
    if (!navigator.onLine) {
      this.kendoNotificationService.showWarning(
        '"Assign Form" feature is not available in offline mode. Please try again once you are back online.',
      );
      return;
    }
    this.customerID = customerID;
    this.customerName = customerName;
    this.customerContactName = customerContactName;
    this.customerContactPhoneNumber = customerContactPhoneNumber;
    this.customerprimaryContactEmail = customerprimaryContactEmail;

    // Reset selected yards and dropdown label
    this.isYardLoading = true;
    this.yards = [];
    this.yardsToAssign = [];
    this.getRailYardsByCustomer(customerID);

    if (Object.keys(this.selectedFormDetails).length <= 0) {
      this.kendoNotificationService.showWarning(
        'Please select at least one form to assign.',
      );
      return;
    }
    this.assignDialogVisible = true;
  }

  getRailYardsByCustomer(customerId: number): void {
    this.commonApiService._sGetRailYardsByCustomer(customerId).subscribe({
      next: (yards) => {
        if (yards.IsSuccess && Array.isArray(yards.Result)) {
          this.yards = yards.Result;
        }
        this.isYardLoading = false;
      },
      error: (error) => {
        this.isYardLoading = false;
        this.kendoNotificationService.showError(
          `Failed to fetch rail yards: ${error}`,
        );
      },
    });
  }

  goBack() {
    this.location.back();
  }

  public onCancel(): void {
    this.assignDialogVisible = false;
  }

  public onConfirm(): void {
    if (
      this.yards.length > 0 &&
      (!this.yardsToAssign || this.yardsToAssign.length === 0)
    ) {
      this.kendoNotificationService.showWarning(
        'Please select at least one yard before submitting.',
      );
      return;
    }
    if (!this.yards || this.yards.length === 0) {
      this.kendoNotificationService.showWarning(
        'No yards are available, so the form cannot be assigned.',
      );
      this.onCancel();
      return;
    }

    const yardsToAssignArr = this.yardsToAssign.map((yardId: any) => {
      return this.yards.find((yard) => yard.Id === yardId);
    });

    const FormData = {
      CustomerId: this.customerID,
      CustomerName: this.customerName,
      CreatedBy: this.createdBy,
      Yards: yardsToAssignArr.map((yard: any) => {
        return {
          YardId: yard.Id,
          YardName: yard.Name,
        };
      }),
      forms: [
        {
          FormPath: this.formPath,
          FormId: this.savedFormId,
          FormTitle: this.formTitle,
        },
      ],
    };

    this.commonApiService._sAssignInspectionFormToCustomer(FormData).subscribe({
      next: (response: any) => {
        if (response?.IsSuccess === true) {
          this.kendoNotificationService.showSuccess(
            'Form assigned successfully!',
          );
          setTimeout(() => {
            this.router.navigate([`/form-overview/${this.formName}`], {
              queryParams: {
                ID: this.savedFormId,
                path: this.formPath,
                Title: this.formTitle,
              },
            });
          }, 1500);
        } else if (
          response?.IsSuccess === false ||
          response?.Message.contains('already exists')
        ) {
          this.kendoNotificationService.showInfo(response.Message);
        } else {
          this.kendoNotificationService.showError(
            'Something went wrong while assigning form.',
          );
        }
        this.isLoading = false;
        this.onCancel();
      },
      error: (error) => {
        this.isLoading = false;
        const errorMsg =
          error?.error ?? error?.message ?? 'Server error occurred.';
        this.kendoNotificationService.showError(errorMsg);
        this.onCancel();
      },
    });
  }

  toggleSelectAll(): void {
    if (this.areAllYardsSelected()) {
      this.yardsToAssign = [];
    } else {
      this.yardsToAssign = this.yards.map((y) => y.Id);
    }
  }

  areAllYardsSelected(): boolean {
    return (
      this.yards.length > 0 && this.yardsToAssign.length === this.yards.length
    );
  }
}
