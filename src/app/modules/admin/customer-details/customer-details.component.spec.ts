import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';
import { CustomerDetailsComponent } from './customer-details.component';
import { AdminService } from '../services/admin.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { DatePipe } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { provideMockStore } from '@ngrx/store/testing';
import { selectAllCustomers, selectSelectedCustomer } from 'src/app/store/customer-dropdown/customer-dropdown.selectors';
import { CustomerDetailService } from 'src/app/shared/services/customer-details.service';

const kendoNotificationServiceMock = {
 showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
};
const mockAdminService = {
  _sgetCustomersById: jest.fn(),
  getFormsAssignedById: jest.fn(),
};
const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn((success, progress) => {
    progress(true);
    success();
  }),
};
const mockActivatedRoute = {
  snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
  queryParams: of({ CustomerId: '123', CustomerName: 'Test Customer' }),
};
const mockRouter = { navigate: jest.fn() };
const mockCommonApiService = {
  unassignInspectionForm: jest.fn(),
  _sGetInspectionFormByCustomerId: jest.fn(),
};
const mockLocation = { back: jest.fn() };

const mockCustomerDetailService = {
  setCustomerName: jest.fn(),
};

describe('CustomerDetailsComponent', () => {
  let component: CustomerDetailsComponent;
  let fixture: ComponentFixture<CustomerDetailsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CustomerDetailsComponent, HttpClientTestingModule],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: CommonApiService, useValue: mockCommonApiService },
        { provide: Location, useValue: mockLocation },
         { provide: CustomerDetailService, useValue: mockCustomerDetailService },
         provideMockStore({
        selectors: [
          { selector: selectAllCustomers, value: [] },
          { selector: selectSelectedCustomer, value: null },
        ],
      }),
     
        DatePipe,
      ],
    })
      .overrideComponent(CustomerDetailsComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomerDetailsComponent);
    component = fixture.componentInstance;
    component.customerId = '123';
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(component, 'getCustomerDetails').mockImplementation();
    jest.spyOn(component, 'getFormsAssignedById').mockImplementation();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sync forms and reinit on online()', () => {
    const ngOnInitSpy = jest.spyOn(component, 'ngOnInit');
    component.online();
    expect(
      mockSubmitDraftHelperService.syncAllOfflineFormSubmissions,
    ).toHaveBeenCalled();
    expect(component.isSyncInProgress).toBe(true);
    expect(ngOnInitSpy).toHaveBeenCalled();
  });

  it('should navigate to form-details-form', () => {
    component.InspectionFormDetailGetById({ Path: 'form123', Id: 456 });
    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/form-details-form',
      'form123',
      456,
    ]);
  });

  it('should update gridState and call loadGridData on data state change', () => {
  const mockState = { skip: 0, take: 10 } as any; 
  const loadGridDataSpy = jest.spyOn(component, 'loadGridData');

  component.onDataStateChange(mockState);

  expect(component.gridState).toEqual(mockState);
  expect(loadGridDataSpy).toHaveBeenCalled();
});

it('should show warning if trying to unassign form while offline', async () => {
  Object.defineProperty(navigator, 'onLine', {
    value: false,
    writable: true,
  });

  const spy = jest.spyOn(kendoNotificationServiceMock, 'showWarning');

  await component.unassignInspection({ id: 1 });

  expect(spy).toHaveBeenCalledWith(
    '"Unassign Form" feature is not available in offline mode. Please try again once you are back online.',
  );
});

  describe('showConfirm()', () => {
    it('should resolve true when confirmed', async () => {
      const promise = component.showConfirm();
      component['confirmResolver'](true);
      await expect(promise).resolves.toBe(true);
    });
  });

  describe('handleDialogClose()', () => {
    it.each([
      ['confirm', true],
      ['cancel', false],
    ])('should resolve and close dialog on %s', (status, expected) => {
      const resolver = jest.fn();
      component.dialogVisible = true;
      (component as any).confirmResolver = resolver;
      component.handleDialogClose(status);
      expect(component.dialogVisible).toBe(false);
      expect(resolver).toHaveBeenCalledWith(expected);
    });
  });

  it('should navigate to form-list on assignForm()', () => {
    component.customerId = 123;
    component.assignForm();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/form-list', 123]);
  });

  it('should go back on goBack()', () => {
    const backSpy = jest.spyOn(component['location'], 'back');
    component.goBack();
    expect(backSpy).toHaveBeenCalled();
  });

  describe('formatDate()', () => {
    it.each([
      ['2025-06-27T00:00:00Z', '06/27/2025'],
      ['2023-01-01', '01/01/2023'],
      ['', ''],
    ])('should format %s to %s', (input, expected) => {
      expect(component.formatDate(input)).toBe(expected);
    });
  });

  it('should toggle selectedCustomer active state', () => {
    component.selectedCustomer = { active: false };
    component.toggleStatus({ target: { checked: true } } as any);
    expect(component.selectedCustomer.active).toBe(true);
  });

  describe('unassignInspection()', () => {
    beforeEach(() => {
      component.assignedFormsCustomer = [{ Id: 101, Path: 'form-a' }];
      jest.spyOn(component, 'showConfirm').mockResolvedValue(true);
    });

    it('should skip if confirmation is false', async () => {
      (component.showConfirm as jest.Mock).mockResolvedValue(false);
      await component.unassignInspection({ Id: 101, Path: 'form-a' });
      expect(
        mockCommonApiService.unassignInspectionForm,
      ).not.toHaveBeenCalled();
      expect(kendoNotificationServiceMock.showSuccess).not.toHaveBeenCalled();
    });
  });
});
