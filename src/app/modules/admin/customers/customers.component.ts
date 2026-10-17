import { Component, HostListener, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TabsComponent } from 'src/app/shared/components/tabs/tabs.component';
import {
  KENDO_GRID,
  GridDataResult,
  DataStateChangeEvent,
} from '@progress/kendo-angular-grid';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_DATEINPUTS } from '@progress/kendo-angular-dateinputs';
import { KENDO_LABEL } from '@progress/kendo-angular-label';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonAppModule } from 'src/app/shared/common.module';
import { process, State } from '@progress/kendo-data-query';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { ModuleLayoutComponent } from 'src/app/shared/module-layout/module-layout.component';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import {
  ICustomer,
  setCustomers,
} from 'src/app/store/customer-dropdown/customer-dropdown.actions';
import { selectAllCustomers } from 'src/app/store/customer-dropdown/customer-dropdown.selectors';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    KENDO_GRID,
    KENDO_BUTTONS,
    KENDO_LABEL,
    KENDO_DATEINPUTS,
    SharedModule,
    CommonModule,
    CommonAppModule,
    ModuleLayoutComponent,
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent {
  inspectionForm = false;
  notify = true;
  customers: any[] = [];
  deletedCustomers: any[] = [];
  searchTerm: string = '';
  sortColumn: string = '';
  isSyncInProgress: boolean = false;
  sortDirection: boolean = true;
  isSidebarOpen = false;
  isExpanded = false;
  isLoading: boolean = true;
  filteredList: any[] = [];
  filteredCustomers: any;
  currentPage: number = 1;
  totalPages: number = 0;
  pages: number[] = [];

  dateRangeSelected: 'today' | 'last7days' | 'last30days' | 'custom' = 'custom';

  startDateKendo: Date = new Date('2000-01-01T00:00:00');
  endDateKendo: Date = new Date();

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
    private readonly router: Router,
    public readonly submitDraftHelperService: SubmitDraftHelperService,
    private readonly commonApiService: CommonApiService,
    private readonly store: Store,
    private readonly kendoNotificationService: KendoNotificationService,
  ) {}

  @HostListener('window:online')
  online() {
    this.submitDraftHelperService.syncAllOfflineFormSubmissions(
      () => this.ngOnInit(), // run only after sync is done
      (val: boolean) => (this.isSyncInProgress = val),
    );
  }

  @ViewChild(TabsComponent) tabsComponent!: TabsComponent;

  ngOnInit(): void {
    this.endDateKendo.setHours(23, 59, 59, 999);
    this.filterCustomersByDateRange(
      'custom',
      this.startDateKendo,
      this.endDateKendo,
      true,
    );
  }

  public onDataStateChange(state: DataStateChangeEvent): void {
    this.gridState = state;
    this.loadGridData();
  }

  private loadGridData(): void {
    const result = process(this.filteredCustomers, this.gridState);
    this.gridView = {
      data: result.data,
      total: result.total,
    };
  }

  onBtnGroupClick(value: typeof this.dateRangeSelected): void {
    if (this.dateRangeSelected === value) return;
    this.dateRangeSelected = value;
    this.filterCustomersByDateRange(value);
  }

  public onDateChange(value: Date, type: string): void {
    this.dateRangeSelected = 'custom';
    if (type === 'startDate')
      this.filterCustomersByDateRange(
        'custom',
        new Date(value),
        new Date(this.endDateKendo),
      );
    else if (type === 'endDate')
      this.filterCustomersByDateRange(
        'custom',
        new Date(this.startDateKendo),
        new Date(value),
      );
  }

  filterCustomersByDateRange(
    dateFilter: typeof this.dateRangeSelected,
    start?: Date,
    end?: Date,
    isFirstLoad?: boolean,
  ): void {
    this.isLoading = true;

    let from: Date = new Date();
    let to: Date = new Date();
    if (!isFirstLoad) {
      this.startDateKendo = from;
      this.endDateKendo = to;
    }

    if (dateFilter !== 'custom') {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    }

    switch (dateFilter) {
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
          from = new Date(start);
          to = new Date(end);
        }
        break;
    }

    this.startDateKendo = from;
    this.endDateKendo = to;

    this.store
      .select(selectAllCustomers)
      .pipe(take(1))
      .subscribe((customers: ICustomer[]) => {
        if (customers?.length > 0) {
          this.filteredCustomers = this.dateRangeSelected
            ? this.filterByDateRange(customers, from, to)
            : customers;
          this.loadGridData();
          this.isLoading = false;
        }

        this.commonApiService._sCustomerListing().subscribe({
          next: (data: ICustomer[]) => {
            this.store.dispatch(setCustomers({ customers: data }));
            this.filteredCustomers = this.dateRangeSelected
              ? this.filterByDateRange(data, from, to)
              : data;
            this.loadGridData();
            this.isLoading = false;
          },
          error: (err) => {
            this.kendoNotificationService.showError(err);
            this.isLoading = false;
          },
        });
      });
  }

  private filterByDateRange(
    customers: ICustomer[],
    from: any,
    to: any,
  ): ICustomer[] {
    return customers.filter((customer: any) => {
      const createdDate = new Date(customer.createdOn);
      return createdDate >= from && createdDate <= to;
    });
  }

  viewCustomerDetails(customerId: number): void {
    if (customerId) {
      this.router.navigate(['/customer-details', customerId]);
    } else {
      this.kendoNotificationService.showError(
        `Invalid customerId: ${customerId}`,
      );
    }
  }
}
