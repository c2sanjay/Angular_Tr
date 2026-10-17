import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';

@Component({
  selector: 'app-callback',
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.scss',
})
export class CallbackComponent implements OnInit {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly kendoNotificationService: KendoNotificationService,
  ) {}

  ngOnInit(): void {
    this.handleAuthFlow();
  }

  private async handleAuthFlow(): Promise<void> {
    try {
      await this.authService.waitForAuthReady();

      const result = await this.authService.validateUserFlow();

      if (!result.valid) {
        this.kendoNotificationService.showError(
          result.reason ?? 'Access Denied',
        );
        await this.delay(1500);
        this.router.navigate(['/auth/login']);
        return;
      }

      await this.delay(500);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('[App] Error during Auth initialization:', error);

      if (error?.message?.includes('invalid refresh token')) {
        this.kendoNotificationService.showError(
          'Invalid refresh token. Please login again!',
        );
        this.router.navigate(['/auth/login']);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
