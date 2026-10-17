import {ComponentFixture,TestBed,fakeAsync, tick, flushMicrotasks} from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

describe('LoginComponent (Standalone)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let mockAuth0: any;
  let mockAuthService: any;
  let mockRouter: any;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(true);
    mockAuth0 = {
      loginWithRedirect: jest.fn(),
     isAuthenticated$: isAuthenticatedSubject.asObservable(),
      logout: jest.fn(),
    };

    mockAuthService = {
     validateUserFlow: jest.fn().mockResolvedValue({ valid: true, role: 'Customer User' }),
    };

    mockRouter = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: Auth0Service, useValue: mockAuth0 },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call loginWithRedirect and set loading', () => {
    component.login();
    expect(component.isLoading).toBe(true);
    expect(mockAuth0.loginWithRedirect).toHaveBeenCalledWith({
      appState: { target: '/auth/callback' },
    });
  });

  

   it('should validate and redirect based on role', fakeAsync(async () => {
     isAuthenticatedSubject.next(true);
     const promise = component.checkLoginAndRedirect();
    await Promise.resolve();
     jest.advanceTimersByTime(2000);
     await promise;
    expect(mockAuthService.validateUserFlow).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['dashboard']);
  }));

  it('should not redirect if validateUserFlow is invalid', fakeAsync(() => {
      mockAuthService.validateUserFlow.mockResolvedValueOnce({ valid: false });
      component.checkLoginAndRedirect();
      flushMicrotasks();
      tick(2000);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));

it('should logout if isAuthenticated$ throws with invalid refresh token', async () => {
  const error = new Error('invalid refresh token');

  const mockAuth0 = {
    isAuthenticated$: {
      subscribe: jest.fn(() => { throw error; }), 
    },
    logout: jest.fn(),
  };

  const component = new LoginComponent(
    mockAuth0 as any,
    {} as any, // authService
    {} as any  // router
  );

  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  await component.checkLoginAndRedirect();

  expect(consoleSpy).toHaveBeenCalledWith(
    '🚀 ~ login.component.ts:57 ~ LoginComponent ~ checkLoginAndRedirect ~ err:',
    error
  );

  expect(mockAuth0.logout).toHaveBeenCalledWith({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });

  expect(component.isLoading).toBe(false);

  consoleSpy.mockRestore();
});
    
});
