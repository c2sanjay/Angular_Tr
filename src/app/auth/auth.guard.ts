import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';
import { KendoNotificationService } from '../shared/services/kendo-notification.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly kendoNotificationService: KendoNotificationService,
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Promise<boolean> {
    await this.authService.waitForAuthReady();
    const result = await this.authService.validateUserFlow();

    if (!result.valid) {
      this.kendoNotificationService.showError(
        result.reason ?? 'Authentication Warning: Access Denied!!',
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.router.navigate(['/auth/login']);
      return false;
    }

    const userRole = result.role;
    const allowedRoles = route.data?.['allowedRoles'] as string[] | undefined;

    // Allow all roles if allowedRoles is undefined or an empty array
    const isAccessAllowed =
      !allowedRoles ||
      allowedRoles.length === 0 ||
      allowedRoles.includes(userRole ?? '');

    // Block access if user's role is not in allowedRoles (when defined)
    if (!isAccessAllowed) {
      this.kendoNotificationService.showError(
        'You are not authorized to access this page, redirecting to home.',
      );
      this.router.navigate([`/dashboard`]);
      return false;
    }

    return true;
  }

  async canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Promise<boolean> {
    return this.canActivate(childRoute, state);
  }
}
