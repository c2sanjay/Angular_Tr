import { ComponentFixture,  TestBed, waitForAsync } from '@angular/core/testing';
import { Component, Directive, Input, ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ListOfFormsComponent } from './list-of-forms.component';
import { AdminService } from '../services/admin.service';
import { ApiService } from 'src/app/auth/api.service';
import { SubmitDraftHelperService } from 'src/app/helpers/submit-draft-helper.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
@Component({ selector: 'app-rsi-topbar', template: '' })
class MockTopbar {}
@Component({ selector: 'app-rsi-sidebar', template: '' })
class MockSidebar {}
@Directive({ selector: '[routerLink]' })
class MockRouterLinkDirective {
  @Input('routerLink') link: any;
}

const mockAdminService = {
  getFormsAssignedById: jest.fn().mockReturnValue(of({ Listofforms: [] })),
  assignedCustomer: jest
    .fn()
    .mockReturnValue(of({ Status: 200, Message: 'Assigned successfully' })),
};
const mockApiService = {
  getFormListing: jest.fn().mockReturnValue(of([])),
};
const mockCommonApiService = {
  _sGetRailYardsByCustomer: jest.fn().mockReturnValue(of([])),
   _sAssignInspectionFormToCustomer: jest.fn(),
};

const mockSubmitDraftHelperService = {
  syncAllOfflineFormSubmissions: jest.fn(),
};
const kendoNotificationServiceMock = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
};
const mockRouter = { navigate: jest.fn() };
const mockActivatedRoute = {
  snapshot: {
    queryParams: {},
    paramMap: { get: jest.fn().mockReturnValue('1') },
  },
};

describe('ListOfFormsComponent (Standalone)', () => {
  let fixture: ComponentFixture<ListOfFormsComponent>;
  let component: ListOfFormsComponent;
  let detectChangesSpy: jest.SpyInstance;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ListOfFormsComponent, HttpClientTestingModule],
      declarations: [MockTopbar, MockSidebar, MockRouterLinkDirective],
      providers: [
        provideAnimations(),
        { provide: AdminService, useValue: mockAdminService },
        { provide: ApiService, useValue: mockApiService },
        { provide: CommonApiService, useValue: mockCommonApiService },
        {
          provide: SubmitDraftHelperService,
          useValue: mockSubmitDraftHelperService,
        },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jest.fn() } },
      ],
    })
      .overrideComponent(ListOfFormsComponent, { set: { template: '' } })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListOfFormsComponent);
    component = fixture.componentInstance;

    component.customerID = '123';
    component.selectedFormList = [];
    component.selectedFormsBg = new Set();
    component.selectedYard = null;
    component.forms = [
      { name: 'Form A', type: 'form', path: '/form-a', title: 'Form A Title' },
      { name: 'Form B', type: 'form', path: '/form-b', title: 'Form B Title' },
      { name: 'Resource Form', type: 'resource' },
    ];

    localStorage.clear();
    detectChangesSpy = jest.spyOn(component['cdr'], 'detectChanges');

    jest.clearAllMocks();
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('getFormList()', () => {
    it('should populate forms with only type "form" and sorted by title', () => {
      const unsortedForms = [
        { name: 'Form B', type: 'form', title: 'Zebra' },
        { name: 'Form C', type: 'form', title: 'Apple' },
      ];
      mockApiService.getFormListing.mockReturnValue(of(unsortedForms));
      component.getFormList();
      expect(component.forms.map((f) => f.title)).toEqual(['Apple', 'Zebra']);
    });

    it('should handle error in getFormList()', () => {
      mockApiService.getFormListing.mockReturnValue(throwError(() => 'error'));
      component.getFormList();
      expect(kendoNotificationServiceMock.showError).toHaveBeenCalled();
    });
  });

  describe('getFormsAssignedById()', () => {
    it('should fetch assigned forms and assign to component', () => {
      const forms = [{ formpath: 'form-a' }];
      jest
        .spyOn(mockAdminService, 'getFormsAssignedById')
        .mockReturnValue(of({ Listofforms: forms }));
      component.getFormsAssignedById();
      expect(component.alreadyAssignedForms).toEqual(forms);
    });

    it('should call kendoNotificationService.showError on error', () => {
      jest
        .spyOn(mockAdminService, 'getFormsAssignedById')
        .mockReturnValue(throwError(() => 'error'));
      component.getFormsAssignedById();
      expect(kendoNotificationServiceMock.showError).toHaveBeenCalled();
    });
  });

  it('should disable dropdown item if name is "Select Yard"', () => {
    expect(
      component.itemDisabled({ dataItem: { name: 'Select Yard' }, index: 0 }),
    ).toBe(true);
  });

  it('should enable dropdown item if name is not "Select Yard"', () => {
    expect(
      component.itemDisabled({ dataItem: { name: 'Yard' }, index: 1 }),
    ).toBe(false);
  });

  it('should update gridState on data state change', () => {
    const state = { skip: 0, take: 10, sort: [] };
    jest.spyOn(component as any, 'loadGridData');
    component.onDataStateChange(state);
    expect((component as any).loadGridData).toHaveBeenCalled();
  });

  it('should call syncAllOfflineFormSubmissions when online', () => {
    const syncSpy = jest.spyOn(
      mockSubmitDraftHelperService,
      'syncAllOfflineFormSubmissions',
    );
    component.online();
    expect(syncSpy).toHaveBeenCalled();
  });

  it('should toggle dropdown visibility', () => {
    component.showDropdown = false;
    component.toggleDropdown();
    expect(component.showDropdown).toBe(true);
  });

  it('should hide dropdown on outside click', () => {
    const div = document.createElement('div'); // not part of custom-multiselect
    document.body.appendChild(div);

    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: div });

    component.showDropdown = true;
    component.handleClickOutside(event);

    expect(component.showDropdown).toBe(false);

    document.body.removeChild(div);
  });

  it('should select all forms when toggleSelectAll() called', () => {
    component.toggleSelectAll();
    expect(component.selectedFormsBg.size).toBeGreaterThan(0);
    expect(detectChangesSpy).toHaveBeenCalled();
  });

  it('should deselect all forms when toggleSelectAll() called again', () => {
    component.toggleSelectAll(); // first select
    component.toggleSelectAll(); // then deselect
    expect(component.selectedFormsBg.size).toBe(0);
  });

  it('should show info kendoNotificationService if value.Id is not present', () => {
    const mockValue = { name: 'Invalid Yard', Id: null };

    component.onDropdownChange(mockValue);

    expect(kendoNotificationServiceMock.showInfo).toHaveBeenCalledWith(
      'Please select other option.',
    );
    expect(component.selectedYard).toBeNull();
  });

  it('should set selectedYard if value.Id is present', () => {
    const mockValue = { name: 'Valid Yard', Id: 123 };

    component.onDropdownChange(mockValue);

    expect(component.selectedYard).toEqual(mockValue);
    expect(kendoNotificationServiceMock.showInfo).not.toHaveBeenCalled();
  });

  it('should call ngOnInit after sync and update isSyncInProgress', () => {
    const syncSpy = jest.spyOn(
      mockSubmitDraftHelperService,
      'syncAllOfflineFormSubmissions',
    );
    const ngOnInitSpy = jest
      .spyOn(component, 'ngOnInit')
      .mockImplementation(() => {});

    component.online();

    expect(syncSpy).toHaveBeenCalled();

    // First callback = success callback
    const successCallback = syncSpy.mock.calls[0][0];
    successCallback();
    expect(ngOnInitSpy).toHaveBeenCalled();

    // Second callback = status update callback
    const statusCallback = syncSpy.mock.calls[0][1];
    statusCallback(true);
    expect(component.isSyncInProgress).toBe(true);

    statusCallback(false);
    expect(component.isSyncInProgress).toBe(false);
  });

  it('should set masterCheckbox indeterminate and checked based on selected forms', () => {
    const nativeElementMock = { indeterminate: false, checked: false };
    component.masterCheckbox = { nativeElement: nativeElementMock } as any;

    component.forms = [
      { name: 'Form A', type: 'form' },
      { name: 'Form B', type: 'form' },
      { name: 'Resource Form', type: 'resource' },
    ];

    // Case 1: Some forms selected (indeterminate = true, checked = false)
    component.selectedFormsBg = new Set(['Form A']);
    component.ngAfterViewChecked();

    expect(nativeElementMock.indeterminate).toBe(true);
    expect(nativeElementMock.checked).toBe(false);

    // Case 2: All forms selected (indeterminate = false, checked = true)
    component.selectedFormsBg = new Set(['Form A', 'Form B']);
    component.ngAfterViewChecked();

    expect(nativeElementMock.indeterminate).toBe(false);
    expect(nativeElementMock.checked).toBe(true);

    // Case 3: No forms selected (indeterminate = false, checked = false)
    component.selectedFormsBg = new Set();
    component.ngAfterViewChecked();

    expect(nativeElementMock.indeterminate).toBe(false);
    expect(nativeElementMock.checked).toBe(false);
  });

  it('should return true if form is already assigned', () => {
    component.alreadyAssignedForms = [{ formpath: 'form-a' }];
    const result = component.isFormAlreadyAssigned({ path: 'form-a' });
    expect(result).toBe(true);
  });

  it('should return false if form is not assigned', () => {
    component.alreadyAssignedForms = [{ formpath: 'form-b' }];
    const result = component.isFormAlreadyAssigned({ path: 'form-c' });
    expect(result).toBe(false);
  });

  it('should return false if alreadyAssignedForms is empty', () => {
    component.alreadyAssignedForms = [];
    const result = component.isFormAlreadyAssigned({ path: 'form-x' });
    expect(result).toBe(false);
  });

  it('should navigate back when goBack is called', () => {
    const backSpy = jest.spyOn(component['location'], 'back');

    component.goBack();

    expect(backSpy).toHaveBeenCalled();
  });

  it('should add form on checkbox check', () => {
    const form = {
      name: 'Form A',
      path: '/form-a',
      title: 'Form A Title',
      _id: '123',
    };
    const mockEvent = { target: { checked: true } } as unknown as Event;

    component.customerID = '1';
    component.selectedFormList = [];
    component.selectedFormsBg = new Set();

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    component.onCheckBoxChange(mockEvent, form, 0);

    expect(component.selectedFormList).toEqual([
      {
        vendorId: 1,
        formName: 'Form A',
        FormPath: '/form-a',
        title: 'Form A Title',
        formId: '123',
      },
    ]);
    expect(component.selectedFormsBg.has('Form A')).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith(
      'selectedForms',
      JSON.stringify(component.selectedFormList),
    );
  });
  it('should remove form on checkbox uncheck', () => {
    const form = {
      name: 'Form A',
      path: '/form-a',
      title: 'Form A Title',
      _id: '123',
    };
    const mockEvent = { target: { checked: false } } as unknown as Event;

    component.customerID = '1';
    component.selectedFormList = [
      {
        vendorId: 1,
        formName: 'Form A',
        FormPath: '/form-a',
        title: 'Form A Title',
        formId: '123',
      },
    ];
    component.selectedFormsBg = new Set(['Form A']);

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    component.onCheckBoxChange(mockEvent, form, 0);

    expect(component.selectedFormList).toEqual([]);
    expect(component.selectedFormsBg.has('Form A')).toBe(false);
    expect(setItemSpy).toHaveBeenCalledWith(
      'selectedForms',
      JSON.stringify([]),
    );
  });

  it('should initialize selectedFormList if it is not an array in onCheckBoxChange', () => {
    (component as any).selectedFormList = null;

    const form = { name: 'Form A', path: '/a', title: 'A' };
    const event = { target: { checked: true } } as unknown as Event;

    component.onCheckBoxChange(event, form, 1);

    expect(Array.isArray(component.selectedFormList)).toBe(true);
    expect(component.selectedFormList.length).toBe(1); // Ensure form was added
  });
  it('should NOT add form if it already exists in selectedFormList', () => {
    const form = { name: 'Form A', path: '/a', title: 'A' };
    const vendorId = 1;

    component.selectedFormList = [
      { vendorId: vendorId, formName: 'Form A', FormPath: '/a', title: 'A' },
    ];

    const event = { target: { checked: true } } as unknown as Event;

    component.customerID = vendorId.toString();

    component.onCheckBoxChange(event, form, vendorId);

    // Should still have only one item (no duplicates)
    expect(component.selectedFormList.length).toBe(1);
  });
  

  describe('isAllSelected & isIndeterminate()', () => {
    it('should return true if all valid forms are selected', () => {
      component.forms = [
        { name: 'Form A', type: 'form' },
        { name: 'Form B', type: 'form' },
      ];
      component.selectedFormsBg = new Set(['Form A', 'Form B']);
      expect(component.isAllSelected()).toBe(true);
    });

    it('should return true if some valid forms are selected (indeterminate)', () => {
      component.forms = [
        { name: 'Form A', type: 'form' },
        { name: 'Form B', type: 'form' },
      ];
      component.selectedFormsBg = new Set(['Form A']);
      expect(component.isIndeterminate()).toBe(true);
    });
  });

  describe('onCheckBoxChange()', () => {
    it('should open form.io in new tab when createForm is called', () => {
      const spy = jest.spyOn(window, 'open').mockImplementation(() => null);
      component.createForm();
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('https://portal.form.io'),
        '_blank',
        'noopener',
      );
      spy.mockRestore();
    });

    it('should show error when no yard on submit', () => {
      component.yards = [];
      component.onSubmit();
      expect(kendoNotificationServiceMock.showError).toHaveBeenCalled();
    });

    it('should show info when "Select Yard" is selected on submit', () => {
      component.yards = [{ name: 'Select Yard' }];
      component.selectedYard = { name: 'Select Yard' };
      component.onSubmit();
      expect(kendoNotificationServiceMock.showInfo).toHaveBeenCalled();
    });

    it('should show info when no forms are selected on submit', () => {
      component.yards = [{ name: 'Yard 1' }];
      component.selectedYard = { name: 'Yard 1' };
      component.selectedFormList = [];
      component.onSubmit();
      expect(kendoNotificationServiceMock.showInfo).toHaveBeenCalled();
    });

    it('should assign currentCustomerDetails from session', () => {
      sessionStorage.setItem(
        'currentCustomerDetails',
        JSON.stringify({ id: 1 }),
      );
      component.ngOnInit();
      expect(component.currentCustomerDetails).toEqual({ id: 1 });
    });

    it('should navigate to /customers if invalid customerId on init', () => {
      mockActivatedRoute.snapshot.paramMap.get = jest
        .fn()
        .mockReturnValue(null);
      component.ngOnInit();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/customers']);
    });
  });
  
  
});
