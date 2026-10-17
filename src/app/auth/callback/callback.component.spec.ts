import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CallbackComponent } from './callback.component';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';

describe('CallbackComponent', () => {
  let component: CallbackComponent;
  let fixture: ComponentFixture<CallbackComponent>;
  let authServiceMock: any;
  let routerMock: any;
  let kendoNotificationServiceMock: any;
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(async () => {
    authServiceMock = {
      waitForAuthReady: jest.fn(),
      validateUserFlow: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    kendoNotificationServiceMock = {
      showError: jest.fn(),
    };

    await TestBed.configureTestingModule({
      declarations: [CallbackComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: KendoNotificationService,
          useValue: kendoNotificationServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CallbackComponent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to dashboard if user is valid', async () => {
    authServiceMock.waitForAuthReady.mockResolvedValue(undefined);
    authServiceMock.validateUserFlow.mockResolvedValue({ valid: true });

    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 600));

    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should navigate to /dashboard if user is valid', async () => {
    authServiceMock.waitForAuthReady.mockResolvedValue(undefined);
    authServiceMock.validateUserFlow.mockResolvedValue({ valid: true });

    fixture.detectChanges();
    await Promise.resolve(); // wait for authReady
    await Promise.resolve(); // wait for validateUserFlow
    await new Promise((res) => setTimeout(res, 600));

    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show error and navigate to /auth/login if user is invalid', async () => {
    authServiceMock.waitForAuthReady.mockResolvedValue(undefined);
    authServiceMock.validateUserFlow.mockResolvedValue({
      valid: false,
      reason: 'Custom denial reason',
    });

    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((res) => setTimeout(res, 1600));

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Custom denial reason',
    );
    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should show fallback error and navigate to /auth/login when no reason provided', async () => {
    authServiceMock.waitForAuthReady.mockResolvedValue(undefined);
    authServiceMock.validateUserFlow.mockResolvedValue({
      valid: false,
      reason: undefined,
    });

    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((res) => setTimeout(res, 1600));

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'Access Denied',
    );
    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should log error if waitForAuthReady throws', async () => {
    const error = new Error('Auth init failed');
    authServiceMock.waitForAuthReady.mockRejectedValue(error);

    fixture.detectChanges();
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[App] Error during Auth initialization:',
      error,
    );
  });

  it('should show error and navigate to login if refresh token is invalid', async () => {
  const error = new Error('invalid refresh token');
  authServiceMock.waitForAuthReady.mockResolvedValue(undefined);
  authServiceMock.validateUserFlow.mockRejectedValue(error);

  // Create the component instance
  component = fixture.componentInstance;

   // @ts-ignore
  await component.handleAuthFlow();

  expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
    'Invalid refresh token. Please login again!',
  );

  expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
});

  
});
