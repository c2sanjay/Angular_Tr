import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { DashboardComponent as AdminDashboardComponent } from 'src/app/modules/admin/dashboard/dashboard.component';
import { DashboardComponent as CustomerDashboardComponent } from 'src/app/modules/customer-editor/dashboard/dashboard.component';
import { DashboardComponent as StaffDashboardComponent } from 'src/app/modules/customer-admin/dashboard/dashboard.component';

@Component({
  selector: 'app-dashboard-wrapper',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './dashboard-wrapper.component.html',
})
export class DashboardWrapperComponent implements OnInit {
  componentToRender: any;

  constructor(private readonly accessRoleService: AccessRoleService) {}

  ngOnInit() {
    const role = this.accessRoleService.getRole();
    switch (role) {
      case 'Super Admin':
        this.componentToRender = AdminDashboardComponent;
        break;
      case 'Trinity Staff':
      case 'Customer Admin':
        this.componentToRender = StaffDashboardComponent;
        break;
      case 'Customer User':
      case 'Customer Viewer':
      default:
        this.componentToRender = CustomerDashboardComponent;
    }
  }
}
