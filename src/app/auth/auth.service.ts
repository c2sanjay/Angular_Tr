import { Injectable } from '@angular/core';
import {
  AuthService as Auth0Service,
  LogoutOptions,
  User,
} from '@auth0/auth0-angular';
import { combineLatest, firstValueFrom, Observable, Subscription } from 'rxjs';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { UserDetailService } from 'src/app/shared/services/user-details.service';



@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    public auth0: Auth0Service,
    private readonly accessRoleService: AccessRoleService,
    private readonly userDetailService: UserDetailService,
  ) {}


  get isAuthenticated$(): Observable<boolean> {
    return this.auth0.isAuthenticated$;
  }

  get user$(): Observable<User | null | undefined> {
    return this.auth0.user$;
  }

  async getAccessToken(): Promise<string> {
    return await firstValueFrom(this.auth0.getAccessTokenSilently());
  }

  async validateUserFlow(): Promise<{
    valid: boolean;
    role?: string;
    reason?: string;
  }> {
    const isAuthenticated = await firstValueFrom(this.auth0.isAuthenticated$);

    if (!isAuthenticated)
      return {
        valid: false,
        reason: 'No active session found. Please login to  the application.',
      };

    const token = await this.getAccessToken();

    const user: any = await firstValueFrom(this.auth0.user$);

    if (!user) return { valid: false, reason: 'User not found.' };

    if (!user.email_verified)
      return { valid: false, reason: 'Please verify your email to continue.' };

    const accessKey = Object.keys(user).find((key) =>
      key.toLowerCase().includes('customeraccess'),
    );

    let userAccessRole = '';
    if (user.email === 'sunny.sinha+cuviewer@programming.com') {
      userAccessRole = 'Customer Viewer';
    } else if (accessKey && Array.isArray(user[accessKey])) {
      const access = user[accessKey][0];
      userAccessRole = access?.roles?.[0]?.description ?? '';
    }
    if (
      !(
        userAccessRole === 'Customer User' ||
        userAccessRole === 'Super Admin' ||
        userAccessRole === 'Customer Admin' ||
        userAccessRole === 'Customer Viewer' ||
        userAccessRole === 'Trinity Staff'
      )
    ) {
      this.auth0.logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      } as LogoutOptions);
      return { valid: false, reason: 'Access denied: no valid roles found' };
    }

    this.accessRoleService.setRsiServices(
      user['https://services.rsinext.com/apps'],
    );
    this.accessRoleService.setRole(userAccessRole);
    this.userDetailService.setDetails({
      email: user.email,
      username: user.name,
      token,
    });
    return { valid: true, role: userAccessRole };
  }

  waitForAuthReady(): Promise<void> {
    return new Promise((resolve) => {
      let sub: Subscription | undefined;
      sub = combineLatest([
        this.auth0.isLoading$,
        this.auth0.isAuthenticated$,
      ]).subscribe(([isLoading]) => {
        if (!isLoading) {
          if (sub) sub.unsubscribe();
          resolve();
        }
      });
    });
  }


}
