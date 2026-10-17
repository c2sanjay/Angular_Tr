import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { CustomersComponent } from './customers.component';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { DataStateChangeEvent } from '@progress/kendo-angular-grid';
import { provideMockStore } from '@ngrx/store/testing';
import { selectAllCustomers, selectSelectedCustomer } from 'src/app/store/customer-dropdown/customer-dropdown.selectors';

describe('CustomersComponent (Standalone)', () => {
  let component: CustomersComponent;
  let fixture: ComponentFixture<CustomersComponent>;

  const mockRouter = { navigate: jest.fn() };
  const mockSubmitDraftHelperService = { syncAllOfflineFormSubmissions: jest.fn() };
  const mockCommonApiService = {
    _sCustomerListing: jest.fn().mockReturnValue(of([
      { createdOn: new Date().toISOString() },
      { createdOn: new Date().toISOString() },
    ])),
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CustomersComponent, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: SubmitDraftHelperService, useValue: mockSubmitDraftHelperService },
        { provide: CommonApiService, useValue: mockCommonApiService },
         provideMockStore({
        selectors: [
          { selector: selectAllCustomers, value: [] },
          { selector: selectSelectedCustomer, value: null },
        ],
      }),
      ],
    })
      .overrideComponent(CustomersComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should sync on online event and re-trigger ngOnInit', () => {
    const syncSpy = jest.spyOn(mockSubmitDraftHelperService, 'syncAllOfflineFormSubmissions');
    const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');

    component.online();

    const [onComplete, onProgress] = syncSpy.mock.calls[0];
    onProgress(true);
    expect(component.isSyncInProgress).toBe(true);

    onComplete();
    expect(ngOnInitSpy).toHaveBeenCalled();
  });

  describe('Date filter button group', () => {
    it('should apply new filter if selected range is different', () => {
      component.dateRangeSelected = 'today';
      const filterSpy = jest.spyOn(component, 'filterCustomersByDateRange');

      component.onBtnGroupClick('last7days');

      expect(component.dateRangeSelected).toBe('last7days');
      expect(filterSpy).toHaveBeenCalledWith('last7days');
    });

    it('should not re-apply same filter', () => {
      component.dateRangeSelected = 'last30days';
      const filterSpy = jest.spyOn(component, 'filterCustomersByDateRange');

      component.onBtnGroupClick('last30days');

      expect(filterSpy).not.toHaveBeenCalled();
    });
  });
  

  describe('onDateChange()', () => {
    it('should handle startDate updates', () => {
      component.endDateKendo = new Date('2023-06-10');
      const start = new Date('2023-06-01');
      const spy = jest.spyOn(component, 'filterCustomersByDateRange');

      component.onDateChange(start, 'startDate');

      expect(component.dateRangeSelected).toBe('custom');
      expect(spy).toHaveBeenCalledWith('custom', start, component.endDateKendo);
    });

    it('should handle endDate updates', () => {
      component.startDateKendo = new Date('2023-06-01');
      const end = new Date('2023-06-15');
      const spy = jest.spyOn(component, 'filterCustomersByDateRange');

      component.onDateChange(end, 'endDate');

      expect(component.dateRangeSelected).toBe('custom');
      expect(spy).toHaveBeenCalledWith('custom', component.startDateKendo, end);
    });
  });

  it('should update grid state and reload data', () => {
    const mockState: DataStateChangeEvent = { skip: 5, take: 10 };
    const loadSpy = jest.spyOn(component as any, 'loadGridData');

    component.filteredCustomers = [
      { name: 'Customer A', createdOn: new Date().toISOString() },
      { name: 'Customer B', createdOn: new Date().toISOString() },
    ];

    component.onDataStateChange(mockState);

    expect(component.gridState).toEqual(mockState);
    expect(loadSpy).toHaveBeenCalled();
  });

  describe('Navigation and error logging', () => {
    it('should navigate to customer-details on valid ID', () => {
      component.viewCustomerDetails(123);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/customer-details', 123]);
    });

    it('should log error on invalid customerId', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      component.viewCustomerDetails(0);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid customerId:', 0);
    });
  });

  describe('filterCustomersByDateRange()', () => {
    it('should apply "today" filter correctly', () => {
      const today = new Date();

      component.filterCustomersByDateRange('today');

      expect(component.isLoading).toBe(true);
      expect(component.startDateKendo.toDateString()).toBe(today.toDateString());
      expect(component.endDateKendo.toDateString()).toBe(today.toDateString());
    });

    it('should apply "last30days" correctly', () => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 30);

      component.filterCustomersByDateRange('last30days');

      expect(component.isLoading).toBe(true);
      expect(component.startDateKendo.toDateString()).toBe(from.toDateString());
      expect(component.endDateKendo.toDateString()).toBe(today.toDateString());
    });

    it('should filter data within range for "custom"', fakeAsync(() => {
      const mockData = [
        { createdOn: '2024-07-20T10:00:00Z' },
        { createdOn: '2024-07-25T10:00:00Z' },
        { createdOn: '2024-07-29T10:00:00Z' }, // in range
        { createdOn: '2024-08-01T10:00:00Z' },
      ];

      jest.spyOn(component['commonApiService'], '_sCustomerListing').mockReturnValue(of(mockData));
      const loadSpy = jest.spyOn(component as any, 'loadGridData');

      component.dateRangeSelected = 'custom';
      const start = new Date('2024-07-28');
      const end = new Date('2024-07-30');

      component.filterCustomersByDateRange('custom', start, end);

      tick();

      expect(component.filteredCustomers).toEqual([
        { createdOn: '2024-07-29T10:00:00Z' },
      ]);
      expect(loadSpy).toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    }));
  });
});
