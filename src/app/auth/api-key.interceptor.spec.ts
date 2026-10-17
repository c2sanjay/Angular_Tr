import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ApiKeyInterceptor } from './api-key.interceptor';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from 'src/environments/environment';
import { IndexedDBApiDataService } from '../common/services/indexeddbApiData.service';
import { Router } from '@angular/router';
import { UserDetailService } from '../shared/services/user-details.service';

describe('ApiKeyInterceptor (Jest)', () => {
    let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  const mockAuthService = {
    getAccessTokenSilently: jest
      .fn()
      .mockReturnValue(Promise.resolve('mock-token')),
    logout: jest.fn(),
  };

  const mockIndexedDB = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockUserDetailService = {
    getToken: jest.fn().mockReturnValue(null),
  };

  const mockRouter = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ApiKeyInterceptor,
          multi: true,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: IndexedDBApiDataService, useValue: mockIndexedDB },
        { provide: UserDetailService, useValue: mockUserDetailService },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const apiUrl = `${environment.TrinityURL}/sample`;

  it('should use cache when offline and return stored data', async () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const cachedData = { form: 'data' };
    mockIndexedDB.get.mockResolvedValue(cachedData);

    const result = await httpClient
      .get(`${environment.formIoUrl}/offline-form`)
      .toPromise();

    expect(result).toEqual(cachedData);
  });

  it('should set x-api-key header for formio requests', () => {
    const url = `${environment.formIoUrl}/form`;
    httpClient.get(url).subscribe();

    const req = httpMock.expectOne(url);
    expect(req.request.headers.get('x-api-key')).toBe(environment.apiKey);
    req.flush({});
  });

  it('should cache formio response when online and response is successful', () => {
    const url = `${environment.formIoUrl}/live`;
    const responseBody = { id: 'live' };

    httpClient.get(url).subscribe((res) => {
      expect(res).toEqual(responseBody);
      expect(mockIndexedDB.set).toHaveBeenCalledWith(
        `offline-cache:${url}`,
        responseBody,
      );
    });

    const req = httpMock.expectOne(url);
    req.flush(responseBody);
  });

  it('should call logout on 401 error from formio fallback', (done) => {
    const url = `${environment.formIoUrl}/unauthorized`;

    httpClient.get(url).subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
        expect(mockAuthService.logout).toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne(url);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('should throw 503 error when offline and no cached data found', async () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    mockIndexedDB.get.mockResolvedValue(undefined);

    await expect(
      httpClient.get(`${environment.formIoUrl}/offline-form`).toPromise(),
    ).rejects.toMatchObject({
      status: 503,
      statusText: 'You are offline and there is no cached data.',
    });
  });

  it('should return 503 when offline and cache miss (Trinity API)', async () => {
    const url = `${environment.TrinityURL}/no-cache`;
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    mockUserDetailService.getToken.mockReturnValue('offline-token');
    mockIndexedDB.get.mockResolvedValue(undefined);

    await expect(httpClient.get(url).toPromise()).rejects.toMatchObject({
      status: 503,
      statusText: 'You are offline and there is no cached data.',
    });
  });

  it('should return cached HttpResponse with status 200 when offline and cache hit (Trinity API)', async () => {
    const url = `${environment.TrinityURL}/cached-data`;
    const cachedData = { cached: true };
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    mockUserDetailService.getToken.mockReturnValue('offline-token');
    mockIndexedDB.get.mockResolvedValue(cachedData);

    const result = await httpClient.get(url).toPromise();

    expect(result).toEqual(cachedData); // The body of HttpResponse
  });

  it('should cache successful 200 responses', fakeAsync(() => {
    const responseBody = { data: 'cached-response' };

    httpClient.get(apiUrl).subscribe((response) => {
      expect(response).toEqual(responseBody);
      expect(mockIndexedDB.set).toHaveBeenCalledWith(
        `offline-cache:${apiUrl}`,
        responseBody,
      );
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    tick(); // flush pending promises (getAccessTokenSilently)

    const request = httpMock.expectOne(apiUrl);
    request.flush(responseBody, { status: 200, statusText: 'OK' });
  }));

  it('should call auth.logout() on 401 Unauthorized error', fakeAsync(() => {
  httpClient.get(apiUrl).subscribe({
    next: () => fail('Expected request to fail with 401'),
    error: () => {
    },
  });

  tick(); 

  const req = httpMock.expectOne(apiUrl);
  req.flush('Unauthorized', {
    status: 401,
    statusText: 'Unauthorized',
  });

  expect(mockAuthService.logout).toHaveBeenCalledWith({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });
  }));
  
});
