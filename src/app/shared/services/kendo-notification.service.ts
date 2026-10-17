import { Injectable } from '@angular/core';
import { NotificationService } from '@progress/kendo-angular-notification';

@Injectable({
  providedIn: 'root',
})
export class KendoNotificationService {
  constructor(private readonly notificationService: NotificationService) {}

  showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  showError(message: string): void {
    this.showNotification(message, 'error');
  }

  showInfo(message: string): void {
    this.showNotification(message, 'info');
  }

  showWarning(message: string): void {
    this.showNotification(message, 'warning');
  }

  private showNotification(
    content: string,
    type: 'success' | 'error' | 'info' | 'warning',
  ) {
    this.notificationService.show({
      content,
      animation: { type: 'fade', duration: 350 },
      position: { horizontal: 'right', vertical: 'top' },
      type: { style: type, icon: true },
      hideAfter: 3500,
    });
  }
}
