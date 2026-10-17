import {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { AppComponent } from './app.component';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { PLATFORM_ID } from '@angular/core';
import { of, Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { AccessRoleService } from './shared/services/access-role.service';
import { UserDetailService } from './shared/services/user-details.service';
import { AuthService } from 'src/app/auth/auth.service';

jest.mock('@angular/common', () => ({
  ...jest.requireActual('@angular/common'),
  isPlatformBrowser: jest.fn(),
}));

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  const defaultUser = {
    email: 'sunny.sinha+trinity@programming.com',
    name: 'Sunny Sinha',
    customerAccess: [{ roles: [{ description: 'Trinity Staff' }] }],
    'https://services.rsinext.com/apps': ['app1', 'app2'],
  };

function configureComponentMocks(options: {
  isBrowser: boolean;
  swEnabled: boolean;
  auth0Authenticated?: boolean;
  auth0User?: any;
  waitForAuthReadyResult?: Promise<any>;
  getAccessTokenResult?: Promise<string>;
  accessRoleIsSet?: boolean;
}) {
  const {
    isBrowser,
    swEnabled,
    auth0Authenticated = true,
    auth0User = defaultUser,
    waitForAuthReadyResult = Promise.resolve(true),
    getAccessTokenResult = Promise.resolve('mock-token'),
    accessRoleIsSet = false,
  } = options;

  const versionUpdates$ = new Subject<VersionReadyEvent>();
  const activateUpdateSpy = jest.fn().mockResolvedValue(undefined);

  (isPlatformBrowser as jest.Mock).mockReturnValue(isBrowser);

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    declarations: [AppComponent],
    providers: [
      { provide: PLATFORM_ID, useValue: isBrowser ? 'browser' : 'server' },
      {
        provide: SwUpdate,
        useValue: {
          isEnabled: swEnabled,
          versionUpdates: versionUpdates$.asObservable(),
          activateUpdate: activateUpdateSpy,
        },
      },
      {
        provide: Auth0Service,
        useValue: {
          isAuthenticated$: of(auth0Authenticated),
          user$: of(auth0User),
        },
      },
      {
        provide: AuthService,
        useValue: {
          waitForAuthReady: jest.fn().mockReturnValue(waitForAuthReadyResult),
          getAccessToken: jest.fn().mockReturnValue(getAccessTokenResult),
        },
      },
      {
        provide: AccessRoleService,
        useValue: {
          isSet: jest.fn().mockReturnValue(accessRoleIsSet),
          setRole: jest.fn(),
          setRsiServices: jest.fn(),
        },
      },
      {
        provide: UserDetailService,
        useValue: {
          setDetails: jest.fn(),
        },
      },
    ],
  }).compileComponents();

  fixture = TestBed.createComponent(AppComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();

  return {
    versionUpdates$,
    activateUpdateSpy,
    mockAuthService: TestBed.inject(AuthService),
    mockAccessRoleService: TestBed.inject(AccessRoleService),
    mockUserDetailService: TestBed.inject(UserDetailService),
  };
}

  afterEach(() => jest.clearAllMocks());

  it('should create the component', () => {
    configureComponentMocks({ isBrowser: true, swEnabled: true });
    expect(component).toBeTruthy();
  });

  it('should log an error if waitForAuthReady fails', fakeAsync(() => {
    const mockError = new Error('Auth failed');
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    configureComponentMocks({
      isBrowser: true,
      swEnabled: false,
      waitForAuthReadyResult: Promise.reject(mockError),
    });

    component.ngOnInit();
    tick();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[App] Error during Auth initialization:',
      mockError
    );

    consoleErrorSpy.mockRestore();
  }));

  describe('checkForUpdates / SwUpdate behavior', () => {
    it('should call activateUpdate when VERSION_READY arrives', async () => {
      const { versionUpdates$, activateUpdateSpy } = configureComponentMocks({
        isBrowser: true,
        swEnabled: true,
      });
      versionUpdates$.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' },
      } as VersionReadyEvent);
      await Promise.resolve();
      expect(activateUpdateSpy).toHaveBeenCalled();
    });

    it('should NOT call activateUpdate if not browser', async () => {
      const { versionUpdates$, activateUpdateSpy } = configureComponentMocks({
        isBrowser: false,
        swEnabled: true,
      });
      versionUpdates$.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' },
      } as VersionReadyEvent);
      await Promise.resolve();
      expect(activateUpdateSpy).not.toHaveBeenCalled();
    });

    it('should NOT call activateUpdate if service worker is disabled', async () => {
      const { versionUpdates$, activateUpdateSpy } = configureComponentMocks({
        isBrowser: true,
        swEnabled: false,
      });
      versionUpdates$.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'old' },
        latestVersion: { hash: 'new' },
      } as VersionReadyEvent);
      await Promise.resolve();
      expect(activateUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe('loadUserRoleData behavior', () => {
    it('should skip role/data setup if not authenticated', async () => {
      const { mockAuthService, mockAccessRoleService, mockUserDetailService } =
        configureComponentMocks({
          isBrowser: true,
          swEnabled: true,
          auth0Authenticated: false,
        });

      await component.loadUserRoleData();

      expect(mockAuthService.getAccessToken).not.toHaveBeenCalled();
      expect(mockAccessRoleService.setRole).not.toHaveBeenCalled();
      expect(mockUserDetailService.setDetails).not.toHaveBeenCalled();
    });

    it('should skip role/data setup if role is already set', async () => {
      const { mockAuthService, mockAccessRoleService, mockUserDetailService } =
        configureComponentMocks({
          isBrowser: true,
          swEnabled: true,
          accessRoleIsSet: true,
        });

      await component.loadUserRoleData();

      expect(mockAuthService.getAccessToken).not.toHaveBeenCalled();
      expect(mockAccessRoleService.setRole).not.toHaveBeenCalled();
      expect(mockUserDetailService.setDetails).not.toHaveBeenCalled();
    });

    it('should set role and user details correctly', async () => {
      const { mockAccessRoleService, mockUserDetailService } =
        configureComponentMocks({
          isBrowser: true,
          swEnabled: false,
        });

      await component.loadUserRoleData();

      expect(mockAccessRoleService.setRole).toHaveBeenCalledWith('Trinity Staff');
      expect(mockAccessRoleService.setRsiServices).toHaveBeenCalledWith(['app1', 'app2']);
      expect(mockUserDetailService.setDetails).toHaveBeenCalledWith({
        email: defaultUser.email,
        username: defaultUser.name,
        token: 'mock-token',
      });
    });

    it('should default role to "Customer Viewer" for CU Viewer user', async () => {
      const { mockAccessRoleService, mockUserDetailService } =
        configureComponentMocks({
          isBrowser: true,
          swEnabled: false,
          auth0User: {
            email: 'sunny.sinha+cuviewer@programming.com',
            name: 'Sunny Viewer',
            customerAccess: [],
            'https://services.rsinext.com/apps': ['Service1'],
          },
        });

      await component.loadUserRoleData();

      expect(mockAccessRoleService.setRole).toHaveBeenCalledWith('Customer Viewer');
      expect(mockUserDetailService.setDetails).toHaveBeenCalledWith({
        email: 'sunny.sinha+cuviewer@programming.com',
        username: 'Sunny Viewer',
        token: 'mock-token',
      });
    });
  });

  describe('ngOnInit', () => {
    it('should call loadUserRoleData', async () => {
      const spy = jest.spyOn(component as any, 'loadUserRoleData');
      component.ngOnInit();
      await Promise.resolve();
      expect(spy).toHaveBeenCalled();
    });
  });
});
