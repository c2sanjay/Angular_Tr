import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormManagementWrapperComponent } from './form-management-wrapper.component';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { FormManagementComponent as AdminFormManagementComponent } from 'src/app/modules/admin/form-management/form-management.component';
import { FormManagementComponent as StaffFormManagementComponent } from 'src/app/modules/customer-admin/form-management/form-management.component';
import { FormManagementComponent as CustomerFormManagementComponent } from 'src/app/modules/customer-editor/form-management/form-management.component';

describe('FormManagementWrapperComponent', () => {
  let component: FormManagementWrapperComponent;
  let fixture: ComponentFixture<FormManagementWrapperComponent>;
  let mockAccessRoleService: { getRole: jest.Mock };

  beforeEach(async () => {
    mockAccessRoleService = {
      getRole: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [FormManagementWrapperComponent],
      providers: [
        { provide: AccessRoleService, useValue: mockAccessRoleService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FormManagementWrapperComponent);
    component = fixture.componentInstance;
  });

  it('should set AdminFormManagementComponent for Super Admin role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Super Admin');
    component.ngOnInit();
    expect(component.componentToRender).toBe(AdminFormManagementComponent);
  });

  it('should set StaffFormManagementComponent for Trinity Staff role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Trinity Staff');
    component.ngOnInit();
    expect(component.componentToRender).toBe(StaffFormManagementComponent);
  });

  it('should set StaffFormManagementComponent for Customer Admin role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer Admin');
    component.ngOnInit();
    expect(component.componentToRender).toBe(StaffFormManagementComponent);
  });

  it('should set CustomerFormManagementComponent for Customer User role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer User');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerFormManagementComponent);
  });

  it('should set CustomerFormManagementComponent for unknown role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Random Role');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerFormManagementComponent);
  });
});
