import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { FormDetailsFormComponent as StaffFormDetailsFormComponent } from 'src/app/modules/customer-admin/form-details-form/form-details-form.component';
import { FormDetailsFormComponent as CustomerFormDetailsFormComponent } from 'src/app/modules/customer-editor/form-details-form/form-details-form.component';
import { FormDetailsFormComponent as SuperAdminFormDetailsFormComponent } from 'src/app/modules/admin/form-details-form/form-details-form.component';

@Component({
  selector: 'app-form-details-form-wrapper',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './form-details-form-wrapper.component.html',
})
export class FormDetailsFormWrapperComponent implements OnInit {
  componentToRender: any;

  constructor(private readonly accessRoleService: AccessRoleService) { }

  ngOnInit() {
    const role = this.accessRoleService.getRole();
    switch (role) {
      case 'Customer Admin':
        this.componentToRender = StaffFormDetailsFormComponent;
        break;
      case 'Customer User':
        this.componentToRender = CustomerFormDetailsFormComponent;
        break;

      case 'Super Admin':
      default:
        this.componentToRender = SuperAdminFormDetailsFormComponent;
    }
  }
}
