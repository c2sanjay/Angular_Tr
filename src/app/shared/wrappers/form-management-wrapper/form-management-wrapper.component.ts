import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { FormManagementComponent as AdminFormManagementComponent } from 'src/app/modules/admin/form-management/form-management.component';
import { FormManagementComponent as StaffFormManagementComponent } from 'src/app/modules/customer-admin/form-management/form-management.component';
import { FormManagementComponent as CustomerFormManagementComponent } from 'src/app/modules/customer-editor/form-management/form-management.component';

@Component({
  selector: 'app-form-management-wrapper',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './form-management-wrapper.component.html',
})
export class FormManagementWrapperComponent implements OnInit {
  componentToRender: any;

  constructor(private readonly accessRoleService: AccessRoleService) {}

  ngOnInit() {
    const role = this.accessRoleService.getRole();
    switch (role) {
      case 'Super Admin':
        this.componentToRender = AdminFormManagementComponent;
        break;
      case 'Trinity Staff':
      case 'Customer Admin':
        this.componentToRender = StaffFormManagementComponent;
        break;
      case 'Customer User':
      case 'Customer Viewer':
      default:
        this.componentToRender = CustomerFormManagementComponent;
    }
  }
}
