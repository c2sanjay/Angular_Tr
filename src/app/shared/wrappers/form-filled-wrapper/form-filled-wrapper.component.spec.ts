import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormFilledWrapperComponent } from './form-filled-wrapper.component';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { FormDetailsFilledComponent as AdminFormDetailsFilledComponent } from 'src/app/modules/admin/form-details-filled/form-details-filled.component';
import { FormDetailsFilledComponent as StaffFormDetailsFilledComponent } from 'src/app/modules/customer-admin/form-details-filled/form-details-filled.component';
import { FormDetailsFilledComponent as CustomerFormDetailsFilledComponent } from 'src/app/modules/customer-editor/form-details-filled/form-details-filled.component';

describe('FormFilledWrapperComponent', () => {
  let component: FormFilledWrapperComponent;
  let fixture: ComponentFixture<FormFilledWrapperComponent>;
  let mockAccessRoleService: { getRole: jest.Mock };

  beforeEach(async () => {
    mockAccessRoleService = {
      getRole: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [FormFilledWrapperComponent],
      providers: [
        { provide: AccessRoleService, useValue: mockAccessRoleService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FormFilledWrapperComponent);
    component = fixture.componentInstance;
  });

  it('should render AdminFormDetailsFilledComponent for "Super Admin"', () => {
    mockAccessRoleService.getRole.mockReturnValue('Super Admin');
    component.ngOnInit();
    expect(component.componentToRender).toBe(AdminFormDetailsFilledComponent);
  });

  it('should render StaffFormDetailsFilledComponent for "Trinity Staff"', () => {
    mockAccessRoleService.getRole.mockReturnValue('Trinity Staff');
    component.ngOnInit();
    expect(component.componentToRender).toBe(StaffFormDetailsFilledComponent);
  });

  it('should render StaffFormDetailsFilledComponent for "Customer Admin"', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer Admin');
    component.ngOnInit();
    expect(component.componentToRender).toBe(StaffFormDetailsFilledComponent);
  });

  it('should render CustomerFormDetailsFilledComponent for "Customer User"', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer User');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerFormDetailsFilledComponent);
  });

  it('should render CustomerFormDetailsFilledComponent for unknown role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Unknown');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerFormDetailsFilledComponent);
  });
});
