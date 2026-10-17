import { KendoNotificationService } from './kendo-notification.service';
import { NotificationService } from '@progress/kendo-angular-notification';

describe('KendoNotificationService', () => {
  let service: KendoNotificationService;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockNotificationService = {
      show: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    service = new KendoNotificationService(mockNotificationService);
  });

  const testCases = [
    { method: 'showSuccess', type: 'success' },
    { method: 'showError', type: 'error' },
    { method: 'showInfo', type: 'info' },
    { method: 'showWarning', type: 'warning' },
  ];

  testCases.forEach(({ method, type }) => {
    it(`should show a ${type} notification when ${method} is called`, () => {
      const message = `Test ${type}`;
      (service as any)[method](message);

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        content: message,
        animation: { type: 'fade', duration: 350 },
        position: { horizontal: 'right', vertical: 'top' },
        type: { style: type, icon: true },
        hideAfter: 3500,
      });
    });
  });
});
