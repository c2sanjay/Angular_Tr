import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { AccessRoleService } from './shared/services/access-role.service';
import { UserDetailService } from './shared/services/user-details.service';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(
    private readonly authService: AuthService,
    public auth0: Auth0Service,
    private readonly updates: SwUpdate,
    private readonly accessRoleService: AccessRoleService,
    private readonly userDetailService: UserDetailService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    this.checkForUpdates();
  }

  ngOnInit(): void {
    this.authService
      .waitForAuthReady()
      .then(async () => {
        return await this.loadUserRoleData();
      })
      .catch((error) => {
        console.error('[App] Error during Auth initialization:', error);
      });
  }

  async loadUserRoleData() {
    const isAuthenticated = await firstValueFrom(this.auth0.isAuthenticated$);
    if (isAuthenticated && !this.accessRoleService.isSet()) {
      const token = await this.authService.getAccessToken();
      const user: any = await firstValueFrom(this.auth0.user$);

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

      this.accessRoleService.setRsiServices(
        user['https://services.rsinext.com/apps'],
      );
      this.accessRoleService.setRole(userAccessRole);
      this.userDetailService.setDetails({
        email: user.email,
        username: user.name,
        token,
      });
    }
  }

  private checkForUpdates() {
    if (isPlatformBrowser(this.platformId) && this.updates.isEnabled) {
      this.updates.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          // Immediately activate the new version and reload
          this.updates.activateUpdate().then(() => document.location.reload());
        }
      });
    }
  }
}
