import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { PageNotFoundComponent } from 'src/app/common/page-not-found/page-not-found.component';
import { LoginComponent } from 'src/app/auth/login/login.component';
import { CallbackComponent } from 'src/app/auth/callback/callback.component';
import { DashboardWrapperComponent } from './shared/wrappers/dashboard-wrapper/dashboard-wrapper.component';
import { FormManagementWrapperComponent } from './shared/wrappers/form-management-wrapper/form-management-wrapper.component';
import { FormFilledWrapperComponent } from './shared/wrappers/form-filled-wrapper/form-filled-wrapper.component';
import { FormDetailsWrapperComponent } from './shared/wrappers/form-details-wrapper/form-details-wrapper.component';
import { FormDetailsFormWrapperComponent } from './shared/wrappers/form-details-form-wrapper/form-details-form-wrapper.component';
import { CustomersComponent } from './modules/admin/customers/customers.component';
import { AssignCustomerComponent } from './modules/admin/assign-customer/assign-customer.component';
import { CustomerDetailsComponent } from './modules/admin/customer-details/customer-details.component';
import { ListOfFormsComponent } from './modules/admin/list-of-forms/list-of-forms.component';
import { FormOverviewComponent } from './modules/admin/form-overview/form-overview.component';

const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  {
    path: 'auth',
    loadChildren: () =>
      import('src/app/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'callback',
    component: CallbackComponent,
  },
  {
    path: 'dashboard',
    component: DashboardWrapperComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'form-management',
    component: FormManagementWrapperComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'form-details-filled/:formName/:id/:customerName/:yardName',
    pathMatch: 'full',
    component: FormFilledWrapperComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'form-details-filled/:formName/:customerName/:yardName',
    pathMatch: 'full',
    component: FormFilledWrapperComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'form-details/:formPath/:id/:customerName/:yardName',
    component: FormDetailsWrapperComponent,
    canActivate: [AuthGuard],
    data: { allowedRoles: ['Customer Admin', 'Customer User', 'Super Admin'] },
  },
  {
    path: 'form-details-form/:formPath/:inspectionId',
    pathMatch: 'full',
    component: FormDetailsFormWrapperComponent,
    canActivate: [AuthGuard],
    data: { allowedRoles: ['Customer Admin', 'Customer User', 'Super Admin'] },
  },
  {
    path: 'customers',
    component: CustomersComponent,
    canActivate: [AuthGuard],
    data: { allowedRoles: ['Super Admin'] },
  },
  {
    path: 'assign-customer',
    component: AssignCustomerComponent,
    canActivate: [AuthGuard],
    data: { allowedRoles: ['Super Admin'] },
  },
  {
    path: 'customer-details/:id',
    component: CustomerDetailsComponent,
    canActivate: [AuthGuard],
    data: { allowedRoles: ['Super Admin'] },
  },
  {
    path: 'form-list/:id',
    component: ListOfFormsComponent,
    canActivate: [AuthGuard],
    data: { allowedRoles: ['Super Admin'] },
  },
  {
    path: 'form-overview/:formPath',
    component: FormOverviewComponent,
    canActivate: [AuthGuard],
    data: { allowedRoles: ['Super Admin'] },
  },
  {
    path: '**',
    component: PageNotFoundComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
