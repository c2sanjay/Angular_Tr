import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { FormDetailComponent as AdminFormDetailComponent } from 'src/app/modules/admin/formdetail/formdetail.component';
import { FormDetailComponent as StaffFormDetailComponent } from 'src/app/modules/customer-admin/formdetail/formdetail.component';
import { FormDetailComponent as CustomerFormDetailComponent } from 'src/app/modules/customer-editor/formdetail/formdetail.component';

@Component({
  selector: 'app-form-details-wrapper',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './form-details-wrapper.component.html',
})
export class FormDetailsWrapperComponent implements OnInit {
  componentToRender: any;

  constructor(private readonly accessRoleService: AccessRoleService) {}

  ngOnInit() {
    const role = this.accessRoleService.getRole();
    switch (role) {
      case 'Super Admin':
        this.componentToRender = AdminFormDetailComponent;
        break;
      case 'Customer Admin':
        this.componentToRender = StaffFormDetailComponent;
        break;
      case 'Customer User':
      default:
        this.componentToRender = CustomerFormDetailComponent;
    }
  }
}
