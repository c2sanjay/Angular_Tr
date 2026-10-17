import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardWrapperComponent } from './dashboard-wrapper.component';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { DashboardComponent as AdminDashboardComponent } from 'src/app/modules/admin/dashboard/dashboard.component';
import { DashboardComponent as CustomerDashboardComponent } from 'src/app/modules/customer-editor/dashboard/dashboard.component';
import { DashboardComponent as StaffDashboardComponent } from 'src/app/modules/customer-admin/dashboard/dashboard.component';

describe('DashboardWrapperComponent', () => {
  let component: DashboardWrapperComponent;
  let fixture: ComponentFixture<DashboardWrapperComponent>;
  let mockAccessRoleService: { getRole: jest.Mock };

  beforeEach(async () => {
    mockAccessRoleService = {
      getRole: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardWrapperComponent],
      providers: [{ provide: AccessRoleService, useValue: mockAccessRoleService }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardWrapperComponent);
    component = fixture.componentInstance;
  });

  it('should set AdminDashboardComponent for Super Admin role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Super Admin');
    component.ngOnInit();
    expect(component.componentToRender).toBe(AdminDashboardComponent);
  });

  it('should set StaffDashboardComponent for Trinity Staff role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Trinity Staff');
    component.ngOnInit();
    expect(component.componentToRender).toBe(StaffDashboardComponent);
  });

  it('should set StaffDashboardComponent for Customer Admin role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer Admin');
    component.ngOnInit();
    expect(component.componentToRender).toBe(StaffDashboardComponent);
  });

  it('should set CustomerDashboardComponent for Customer User role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer User');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerDashboardComponent);
  });

  it('should set CustomerDashboardComponent for Customer Viewer role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer Viewer');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerDashboardComponent);
  });

  it('should set CustomerDashboardComponent as default for unknown role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Some Unknown Role');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerDashboardComponent);
  });
});
