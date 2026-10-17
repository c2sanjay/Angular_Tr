import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormDetailsWrapperComponent } from './form-details-wrapper.component';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { FormDetailComponent as StaffFormDetailComponent } from 'src/app/modules/customer-admin/formdetail/formdetail.component';
import { FormDetailComponent as CustomerFormDetailComponent } from 'src/app/modules/customer-editor/formdetail/formdetail.component';
import { FormDetailComponent as AdminFormDetailComponent } from 'src/app/modules/customer-admin/formdetail/formdetail.component';

describe('FormDetailsWrapperComponent', () => {
  let component: FormDetailsWrapperComponent;
  let fixture: ComponentFixture<FormDetailsWrapperComponent>;
  let mockAccessRoleService: { getRole: jest.Mock };

  beforeEach(async () => {
    mockAccessRoleService = {
      getRole: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [FormDetailsWrapperComponent],
      providers: [{ provide: AccessRoleService, useValue: mockAccessRoleService }],
    }).compileComponents();

    fixture = TestBed.createComponent(FormDetailsWrapperComponent);
    component = fixture.componentInstance;
  });

it('should set componentToRender to AdminFormDetailComponent for "Super Admin"', () => {
  mockAccessRoleService.getRole.mockReturnValue('Super Admin');
  component.ngOnInit();
  expect(component.componentToRender?.name).toBe(AdminFormDetailComponent.name);
});


  it('should set componentToRender to StaffFormDetailComponent for "Customer Admin"', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer Admin');
    component.ngOnInit();
    expect(component.componentToRender).toBe(StaffFormDetailComponent);
  });

  it('should set componentToRender to CustomerFormDetailComponent for "Customer User"', () => {
    mockAccessRoleService.getRole.mockReturnValue('Customer User');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerFormDetailComponent);
  });

  it('should set componentToRender to CustomerFormDetailComponent for unknown role', () => {
    mockAccessRoleService.getRole.mockReturnValue('Some Other Role');
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerFormDetailComponent);
  });

  it('should set componentToRender to CustomerFormDetailComponent for undefined role', () => {
    mockAccessRoleService.getRole.mockReturnValue(undefined);
    component.ngOnInit();
    expect(component.componentToRender).toBe(CustomerFormDetailComponent);
  });
});
