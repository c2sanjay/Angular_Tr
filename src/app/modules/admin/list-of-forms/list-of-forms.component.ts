import { ApiService } from 'src/app/auth/api.service';
import {
  Component,
  OnInit,
  HostListener,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { AdminService } from '../services/admin.service';
import { Location, CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { process, State } from '@progress/kendo-data-query';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { CustomerDetailService } from 'src/app/shared/services/customer-details.service';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-list-of-forms',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_INPUTS,
    KENDO_BUTTONS,
    DropDownsModule,
    SharedModule,
    CommonModule,
    CommonAppModule,
    ModuleLayoutComponent,
  ],
  templateUrl: './list-of-forms.component.html',
  styleUrl: './list-of-forms.component.scss',
})
export class ListOfFormsComponent implements OnInit {
  inspectionForm = false;
  notify = true;
  isSidebarOpen = false;
  selectedForms: any[] = [];
  isLoading: boolean = true;
  isYardsLoading: boolean = true;
  isSyncInProgress: boolean = false;
  formPath: any;
  forms: any[] = [];
  assignedVendorList: any;
  customerID: string | null = null;
  alreadyAssignedForms: any[] = [];
  currentCustomerDetails: any = null;

  selectedFormList: any[] = [];
  selectedFormsBg: Set<string> = new Set<string>();
  showDropdown = false;
  allSelected = false;
  yards: any[] = [];
  selectedCustomer: string = '';
  //savedFormId: any;
  selectedYards: string[] = [];
  defaultDropDownValue: any = { Name: 'Select Yard', id: null };
  selectedYard: any = null;

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
    private readonly authService: ApiService,
    private readonly adminService: AdminService,
    private readonly location: Location,
    private readonly router: Router,
    private readonly kendoNotificationService: KendoNotificationService,
    private readonly cdr: ChangeDetectorRef,
    private readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly customerDetailService: CustomerDetailService,
    private readonly commonApiService: CommonApiService,
  ) {}

  @HostListener('window:online')
  online() {
    this.submitDraftHelperService.syncAllOfflineFormSubmissions(
      () => this.ngOnInit(), // run only after sync is done
      (val: boolean) => (this.isSyncInProgress = val),
    );
  }

  @ViewChild('masterCheckbox', { static: false }) masterCheckbox!: ElementRef;

  public onDropdownChange(value: any): void {
    if (!value.Id) {
      this.kendoNotificationService.showInfo('Please select other option.');
      return;
    }
    this.selectedYard = value;
  }

  public itemDisabled(itemArgs: { dataItem: any; index: number }) {
    return itemArgs.dataItem.name === 'Select Yard';
  }

  public onDataStateChange(state: DataStateChangeEvent): void {
    this.gridState = state;
    this.loadGridData();
  }

  private loadGridData(): void {
    const result = process(this.forms, this.gridState);
    this.gridView = {
      data: result.data,
      total: result.total,
    };
  }

  ngAfterViewChecked(): void {
    if (this.masterCheckbox) {
      const validForms = this.forms.filter((f) => f?.type !== 'resource');
      const selectedCount = validForms.filter((f) =>
        this.selectedFormsBg.has(f.name),
      ).length;

      this.masterCheckbox.nativeElement.indeterminate =
        selectedCount > 0 && selectedCount < validForms.length;

      this.masterCheckbox.nativeElement.checked =
        selectedCount === validForms.length;
    }
  }
  ngOnInit() {
    const customerID = Number(this.activated.snapshot.paramMap.get('id'));
    if (!customerID) {
      this.router.navigate([`/customers`]);
    }

    this.customerID = customerID as unknown as any;
    this.getFormList();
    this.currentCustomerDetails = this.customerDetailService.getCustomerName();
    const currentCustomer = sessionStorage.getItem('currentCustomerDetails');
    if (currentCustomer) {
      this.currentCustomerDetails = JSON.parse(currentCustomer);
    }
    this.getRailYardsByCustomer(customerID);
  }

  getFormsAssignedById(): void {
    this.adminService.getFormsAssignedById(Number(this.customerID)).subscribe({
      next: (res) => {
        this.alreadyAssignedForms = res.Listofforms ?? [];
      },
      error: (error) => {
        this.kendoNotificationService.showError(
          `Error fetching Forms: ${error}`,
        );
      },
    });
  }

  isFormAlreadyAssigned(form: any): boolean {
    return this.alreadyAssignedForms.some(
      (assigned) => assigned.formpath === form.path,
    );
  }

  onSubmit() {
    if (!navigator.onLine) {
      this.kendoNotificationService.showWarning(
        '"Assign Form" feature is not available in offline mode. Please try again once you are back online.',
      );
      return;
    }
    if (!this.yards || this.yards.length === 0) {
      this.kendoNotificationService.showError(
        'There is no yard for the selected customer, so the form cannot be assigned.',
      );
      return;
    }
    if (!this.selectedYard || this.selectedYard.name === 'Select Yard') {
      this.kendoNotificationService.showInfo(
        'Please select a yard to assign form to it.',
      );
      return;
    }
    if (
      !Array.isArray(this.selectedFormList) ||
      this.selectedFormList.length === 0
    ) {
      this.kendoNotificationService.showInfo(
        'Please select at least one form to assign.',
      );
      return;
    }
    this.isLoading = true;
    const FormData = {
      CustomerId: this.customerID,
      CustomerName: JSON.parse(
        sessionStorage.getItem('currentCustomerDetails') ?? '',
      ),
      Yards: [
        {
          YardId: this.selectedYard.Id,
          YardName: this.selectedYard.Name,
        },
      ],
      forms: this.selectedFormList.map((item) => ({
        FormId: item.formId,
        FormPath: item.FormPath,
        FormTitle: item.title,
      })),
    };

    this.commonApiService._sAssignInspectionFormToCustomer(FormData).subscribe({
      next: (response: any) => {
        this.assignedVendorList = response;
        if (response?.IsSuccess === true) {
          this.kendoNotificationService.showSuccess(response?.Message);
          setTimeout(() => {
            this.router.navigate([`/customer-details/${this.customerID}`]);
          }, 1000);
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
      },
      error: (error) => {
        this.isLoading = false;
        const errorMsg =
          error?.error ?? error?.message ?? 'Server error occurred.';
        this.kendoNotificationService.showError(errorMsg);
      },
    });
  }

  getFormList() {
    this.authService.getFormListing().subscribe({
      next: (response) => {
        if (response && Array.isArray(response) && response.length > 0) {
          this.forms = [...response]
            .filter((form: any) => {
              return form && form.type !== 'resource';
            })
            .sort((a, b) => a.title.localeCompare(b.title));
          this.formPath = ''; // Set empty initially (so it updates on selection)
          this.loadGridData();
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.kendoNotificationService.showError(`Error fetching forms: ${err}`);
        this.isLoading = false;
      },
    });
  }

  goBack() {
    this.location.back();
  }

  getRailYardsByCustomer(customerId: number): void {
    this.commonApiService._sGetRailYardsByCustomer(customerId).subscribe({
      next: (yards) => {
        this.yards = yards.Result;
        this.isYardsLoading = false;
      },
      error: (error) => {
        this.kendoNotificationService.showError(
          `Failed to fetch rail yards: ${error}`,
        );
        this.isYardsLoading = false;
      },
    });
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-multiselect')) {
      this.showDropdown = false;
    }
  }

  onCheckBoxChange(event: Event, form: any, VendorId: number): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const vendorId = Number(this.customerID) || VendorId;
    const formPath = form.path ?? '';

    // Initialize the selectedFormList array if needed
    if (!Array.isArray(this.selectedFormList)) {
      this.selectedFormList = [];
    }

    if (isChecked) {
      // Add to form list if not already selected
      const alreadyExists = this.selectedFormList.some(
        (item) => item.vendorId === vendorId && item.formName === form.name,
      );

      if (!alreadyExists) {
        this.selectedFormList.push({
          vendorId,
          formName: form.name,
          FormPath: formPath,
          title: form.title,
          formId: form._id,
        });
      }

      // Add to visual selection
      this.selectedFormsBg.add(form.name);
    } else {
      // Remove from form list
      this.selectedFormList = this.selectedFormList.filter(
        (item) => !(item.vendorId === vendorId && item.formName === form.name),
      );

      // Remove from visual selection
      this.selectedFormsBg.delete(form.name);
    }

    // Persist current state to localStorage
    localStorage.setItem(
      'selectedForms',
      JSON.stringify(this.selectedFormList),
    );
  }

  // Check if all forms are selected
  isAllSelected(): boolean {
    const validForms = this.forms.filter((f) => f?.type !== 'resource');
    return (
      validForms.length > 0 &&
      validForms.every((f) => this.selectedFormsBg.has(f.name))
    );
  }

  // To implement unselect
  isIndeterminate(): boolean {
    const validForms = this.forms.filter((f) => f?.type !== 'resource');
    const selectedCount = validForms.filter((f) =>
      this.selectedFormsBg.has(f.name),
    ).length;
    return selectedCount > 0 && selectedCount < validForms.length;
  }

  toggleSelectAll(): void {
    const validForms = this.forms.filter((f) => f?.type !== 'resource');
    const selectedCount = validForms.filter((f) =>
      this.selectedFormsBg.has(f.name),
    ).length;

    const shouldDeselect = selectedCount > 0;

    if (shouldDeselect) {
      // Deselect all
      const vendorId = Number(this.customerID);

      this.selectedFormList = this.selectedFormList.filter(
        (item) =>
          !validForms.some(
            (form) =>
              (vendorId || form.customerID) === item.vendorId &&
              form.name === item.formName,
          ),
      );

      // REPLACE Set to trigger change detection even on first run
      this.selectedFormsBg = new Set(
        [...this.selectedFormsBg].filter(
          (name) => !validForms.some((form) => form.name === name),
        ),
      );
    } else {
      // Select all
      validForms.forEach((form) => {
        const vendorId = Number(this.customerID) || form.customerID;
        const formPath = form.path ?? '';

        const alreadyExists = this.selectedFormList.some(
          (item) => item.vendorId === vendorId && item.formName === form.name,
        );

        if (!alreadyExists) {
          this.selectedFormList.push({
            vendorId,
            formName: form.name,
            FormPath: formPath,
            title: form.title,
          });
        }

        this.selectedFormsBg.add(form.name);
      });
    }

    localStorage.setItem(
      'selectedForms',
      JSON.stringify(this.selectedFormList),
    );
    this.cdr.detectChanges();
  }

  createForm() {
    window.open(environment.formIoLoginUrl, '_blank', 'noopener');
  }
}
