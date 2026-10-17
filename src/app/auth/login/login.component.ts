import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AuthService as Auth0Service,
  LogoutOptions,
} from '@auth0/auth0-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KendoLoadingDialogComponent } from 'src/app/shared/kendo-loading-dialog/kendo-loading-dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [KENDO_BUTTONS, CommonModule, KendoLoadingDialogComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public isLoading: boolean = false;

  constructor(
    public auth0: Auth0Service,
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  login(): void {
    this.isLoading = true;
    this.auth0.loginWithRedirect({
      appState: { target: '/auth/callback' },
    });
  }

  ngOnInit(): void {
    this.checkLoginAndRedirect();
  }

  async checkLoginAndRedirect(): Promise<void> {
    try {
      const isAuthenticated = await firstValueFrom(this.auth0.isAuthenticated$);

      if (isAuthenticated) {
        this.isLoading = true;
        const result = await this.authService.validateUserFlow();

        if (!result.valid) {
          this.isLoading = false;
          return;
        }

        if (result.valid && result.role) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          this.router.navigate(['dashboard']);
        }
      }
    } catch (err: any) {
      console.log(
        '🚀 ~ login.component.ts:57 ~ LoginComponent ~ checkLoginAndRedirect ~ err:',
        err,
      );
      if (err?.message?.includes('invalid refresh token')) {
        this.auth0.logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        } as LogoutOptions);
      }
    } finally {
      this.isLoading = false;
    }
  }
}
