import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormDetailsFormWrapperComponent } from './form-details-form-wrapper.component';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { FormDetailsFormComponent as StaffFormDetailsFormComponent } from 'src/app/modules/customer-admin/form-details-form/form-details-form.component';
import { FormDetailsFormComponent as CustomerFormDetailsFormComponent } from 'src/app/modules/customer-editor/form-details-form/form-details-form.component';
import { FormDetailsFormComponent as SuperAdminFormDetailsFormComponent } from 'src/app/modules/admin/form-details-form/form-details-form.component';

describe('FormDetailsFormWrapperComponent', () => {
  let component: FormDetailsFormWrapperComponent;
  let fixture: ComponentFixture<FormDetailsFormWrapperComponent>;

  const mockAccessRoleService = {
    getRole: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormDetailsFormWrapperComponent],
      providers: [{ provide: AccessRoleService, useValue: mockAccessRoleService }],
    }).compileComponents();

    fixture = TestBed.createComponent(FormDetailsFormWrapperComponent);
    component = fixture.componentInstance;
  });

  it('should render StaffFormDetailsFormComponent for Customer Admin role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer Admin');
    component.ngOnInit();
    expect(component.componentToRender).toBe(StaffFormDetailsFormComponent);
  });

  it('should render CustomerFormDetailsFormComponent for Customer User role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer User');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerFormDetailsFormComponent);
  });
  it('should set SuperAdminFormDetailsFormComponent for Super Admin role', () => {
  mockAccessRoleService.getRole.mockReturnValue('Super Admin');
  component.ngOnInit();
  expect(component.componentToRender).toBe(SuperAdminFormDetailsFormComponent);
});

it('should set SuperAdminFormDetailsFormComponent for unknown role', () => {
  mockAccessRoleService.getRole.mockReturnValue('Random Role');
  component.ngOnInit();
  expect(component.componentToRender).toBe(SuperAdminFormDetailsFormComponent);
});

});
