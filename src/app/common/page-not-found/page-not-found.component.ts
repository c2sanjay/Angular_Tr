import { Component } from '@angular/core';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.scss',
})
export class PageNotFoundComponent {
  constructor(
    private readonly router: Router,
    private readonly AccessRoleService: AccessRoleService,
    private readonly location: Location,
  ) {}

  redirectToDashboard() {
    this.router.navigate(['dashboard']);
  }

  goBack(): void {
    this.location.back();
  }
}
