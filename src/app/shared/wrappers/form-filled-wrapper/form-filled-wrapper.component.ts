import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { FormDetailsFilledComponent as AdminFormDetailsFilledComponent } from 'src/app/modules/admin/form-details-filled/form-details-filled.component';
import { FormDetailsFilledComponent as StaffFormDetailsFilledComponent } from 'src/app/modules/customer-admin/form-details-filled/form-details-filled.component';
import { FormDetailsFilledComponent as CustomerFormDetailsFilledComponent } from 'src/app/modules/customer-editor/form-details-filled/form-details-filled.component';

@Component({
  selector: 'app-form-filled-wrapper',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './form-filled-wrapper.component.html',
})
export class FormFilledWrapperComponent implements OnInit {
  componentToRender: any;

  constructor(private readonly accessRoleService: AccessRoleService) {}

  ngOnInit() {
    const role = this.accessRoleService.getRole();
    switch (role) {
      case 'Super Admin':
        this.componentToRender = AdminFormDetailsFilledComponent;
        break;
      case 'Trinity Staff':
      case 'Customer Admin':
        this.componentToRender = StaffFormDetailsFilledComponent;
        break;
      case 'Customer User':
      case 'Customer Viewer':
      default:
        this.componentToRender = CustomerFormDetailsFilledComponent;
    }
  }
}
