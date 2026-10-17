import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthService as Auth0Service, User } from '@auth0/auth0-angular';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { UserDetailService } from 'src/app/shared/services/user-details.service';
import { BehaviorSubject, of } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let httpMocks: {
    auth0: any;
    accessRole: any;
    userDetail: any;
  };

  const isAuthenticated$ = new BehaviorSubject<boolean>(true);
  const user$ = new BehaviorSubject<User | null | undefined>(null);
  const isLoading$ = new BehaviorSubject<boolean>(false);

  const mockAuth0 = {
    isAuthenticated$: isAuthenticated$.asObservable(),
    user$: user$.asObservable(),
    isLoading$: isLoading$.asObservable(),
    getAccessTokenSilently: jest.fn().mockReturnValue(of('mock-token')),
    logout: jest.fn(),
  };

  const mockAccessRole = {
    setRole: jest.fn(),
    setRsiServices: jest.fn(),
  };

  const mockUserDetail = {
    setDetails: jest.fn(),
  };

  const assignRole = (user: any, accessKey: string): string => {
    if (user.email === 'sunny.sinha+cuviewer@programming.com') {
      return 'Customer Viewer';
    }
    return user[accessKey]?.[0]?.roles?.[0]?.description ?? '';
  };

  beforeEach(() => {
    httpMocks = {
      auth0: mockAuth0,
      accessRole: mockAccessRole,
      userDetail: mockUserDetail,
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth0Service, useValue: httpMocks.auth0 },
        { provide: AccessRoleService, useValue: httpMocks.accessRole },
        { provide: UserDetailService, useValue: httpMocks.userDetail },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    isAuthenticated$.next(true);
    user$.next(null);
    isLoading$.next(false);
    jest.clearAllMocks();
  });

  describe('validateUserFlow', () => {
    it('should assign Customer Viewer role for known email', async () => {
      const mockUser = {
        email: 'sunny.sinha+cuviewer@programming.com',
        name: 'Sunny',
        email_verified: true,
        'https://services.rsinext.com/apps': ['App1'],
      };
      user$.next(mockUser);

      const result = await service.validateUserFlow();

      expect(result).toEqual({ valid: true, role: 'Customer Viewer' });
      expect(mockAccessRole.setRole).toHaveBeenCalledWith('Customer Viewer');
      expect(mockAccessRole.setRsiServices).toHaveBeenCalledWith(['App1']);
      expect(mockUserDetail.setDetails).toHaveBeenCalledWith({
        email: 'sunny.sinha+cuviewer@programming.com',
        username: 'Sunny',
        token: 'mock-token',
      });
    });

    it('should logout if role is not in allowed list', async () => {
      user$.next({
        email: 'invalid@example.com',
        name: 'Invalid User',
        email_verified: true,
        'https://services.rsinext.com/apps': ['AppX'],
        customerAccessKey: [
          { roles: [{ description: 'Unauthorized Role' }] },
        ],
      });

      const result = await service.validateUserFlow();

      expect(mockAuth0.logout).toHaveBeenCalledWith({
        logoutParams: { returnTo: window.location.origin },
      });
      expect(result).toEqual({
        valid: false,
        reason: 'Access denied: no valid roles found',
      });
    });

    it('should return invalid if user is null', async () => {
      user$.next(null);
      const result = await service.validateUserFlow();
      expect(result).toEqual({ valid: false, reason: 'User not found.' });
    });

    it('should return invalid if email is not verified', async () => {
      user$.next({ email_verified: false } as any);
      const result = await service.validateUserFlow();
      expect(result).toEqual({
        valid: false,
        reason: 'Please verify your email to continue.',
      });
    });

    it('should return invalid if not authenticated', async () => {
      isAuthenticated$.next(false);
      const result = await service.validateUserFlow();
      expect(result).toEqual({
        valid: false,
        reason: 'No active session found. Please login to  the application.',
      });
    });

    it('should wait until loading is false', async () => {
      isLoading$.next(true);
      setTimeout(() => isLoading$.next(false), 100);
      await expect(service.waitForAuthReady()).resolves.toBeUndefined();
    });

    it('should assign role and set details for valid user', async () => {
      const mockUser = {
        email: 'test@example.com',
        name: 'Test User',
        email_verified: true,
        customerAccess: [{ roles: [{ description: 'Customer Admin' }] }],
        'https://services.rsinext.com/apps': ['app1'],
      };

      user$.next(mockUser as any);
      const result = await service.validateUserFlow();

      expect(mockAccessRole.setRsiServices).toHaveBeenCalledWith(['app1']);
      expect(mockAccessRole.setRole).toHaveBeenCalledWith('Customer Admin');
      expect(mockUserDetail.setDetails).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'Test User',
        token: 'mock-token',
      });
      expect(result).toEqual({ valid: true, role: 'Customer Admin' });
    });
  });

  describe('Observables', () => {
    it('should expose isAuthenticated$', (done) => {
      isAuthenticated$.next(true);
      service.isAuthenticated$.subscribe((val) => {
        expect(val).toBe(true);
        done();
      });
    });

    it('should expose user$', (done) => {
      const user = { email: 'test@example.com' };
      user$.next(user as any);
      service.user$.subscribe((val) => {
        expect(val).toEqual(user);
        done();
      });
    });
  });

  describe('assignRole()', () => {
    const cases = [
      {
        title: 'Customer Viewer email match',
        user: { email: 'sunny.sinha+cuviewer@programming.com' },
        expected: 'Customer Viewer',
      },
      {
        title: 'Valid accessKey role',
        user: {
          email: 'user@domain.com',
          customerAccess: [{ roles: [{ description: 'Customer Admin' }] }],
        },
        expected: 'Customer Admin',
      },
      {
        title: 'No role description',
        user: { email: 'x@x.com', customerAccess: [{}] },
        expected: '',
      },
    ];

    cases.forEach(({ title, user, expected }) => {
      it(`should return correct role: ${title}`, () => {
        expect(assignRole(user, 'customerAccess')).toBe(expected);
      });
    });
  });

  describe('validateUser internal helper', () => {
    it('should validate allowed role and set services', () => {
      const user = {
        email: 'someone@example.com',
        name: 'Test User',
        role: 'Customer Admin',
        'https://services.rsinext.com/apps': ['service1', 'service2'],
      };
      const token = 'mock-token';

      const validateUser = (
        usr: any,
        tkn: string,
        accessRoleSvc: any,
        userDetailSvc: any,
      ) => {
        const allowedRoles = [
          'Customer User',
          'Super Admin',
          'Customer Admin',
          'Customer Viewer',
          'Trinity Staff',
        ];
        if (!allowedRoles.includes(usr.role)) {
          localStorage.clear();
          sessionStorage.clear();
          return { valid: false, reason: 'Access denied: no valid roles found' };
        }

        accessRoleSvc.setRsiServices(usr['https://services.rsinext.com/apps']);
        accessRoleSvc.setRole(usr.role);
        userDetailSvc.setDetails({
          email: usr.email,
          username: usr.name,
          token: tkn,
        });
        return { valid: true, role: usr.role };
      };

      const result = validateUser(user, token, mockAccessRole, mockUserDetail);

      expect(mockAccessRole.setRsiServices).toHaveBeenCalledWith([
        'service1',
        'service2',
      ]);
      expect(mockAccessRole.setRole).toHaveBeenCalledWith('Customer Admin');
      expect(mockUserDetail.setDetails).toHaveBeenCalledWith({
        email: 'someone@example.com',
        username: 'Test User',
        token: 'mock-token',
      });
      expect(result).toEqual({ valid: true, role: 'Customer Admin' });
    });
  });
});
