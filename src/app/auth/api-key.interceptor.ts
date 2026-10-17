import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IndexedDBApiDataService } from '../common/services/indexeddbApiData.service';
import { AuthService, LogoutOptions } from '@auth0/auth0-angular';
import { Router } from '@angular/router';
import { UserDetailService } from '../shared/services/user-details.service';

@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {
  constructor(
    private readonly indexedDB: IndexedDBApiDataService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly userDetailService: UserDetailService,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const isApiReq =
      req.url.startsWith(environment.TrinityURL) ||
      req.url.startsWith(environment.trinityRailApiUrl);
    const isFormIoReq = req.url.startsWith(environment.formIoUrl);
    const userToken = this.userDetailService.getToken();

    if (isApiReq) {
      return from(
        userToken
          ? Promise.resolve(userToken)
          : this.auth.getAccessTokenSilently(),
      ).pipe(
        switchMap((token: string) => {
          const authReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          });

          // Offline caching key
          const cacheKey = `offline-cache:${authReq.urlWithParams}`;

          // If offline, try to serve from cache
          if (!navigator.onLine) {
            return from(this.indexedDB.get(cacheKey)).pipe(
              switchMap((cached) => {
                if (cached) {
                  return of(new HttpResponse({ status: 200, body: cached }));
                } else {
                  return throwError(
                    () =>
                      new HttpErrorResponse({
                        status: 503,
                        statusText:
                          'You are offline and there is no cached data.',
                      }),
                  );
                }
              }),
            );
          }

          return next.handle(authReq).pipe(
            tap((event) => {
              if (event instanceof HttpResponse && event.status === 200) {
                this.indexedDB.set(cacheKey, event.body);
              }
            }),
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401) {
                this.auth.logout({
                  logoutParams: {
                    returnTo: window.location.origin,
                  },
                } as LogoutOptions);
              }
              return throwError(() => error);
            }),
          );
        }),
      );
    }

    // Form.io requests use x-api-key header
    let modifiedReq = req;
    if (isFormIoReq) {
      const apiKey = environment.apiKey;
      if (apiKey) {
        modifiedReq = req.clone({
          setHeaders: {
            'x-api-key': apiKey,
          },
        });
      }
    }

    // Fallback for other requests: apply offline caching as well
    const cacheKeyFormio = `offline-cache:${modifiedReq.urlWithParams}`;

    if (!navigator.onLine) {
      // If offline, try to serve from cache
      return from(this.indexedDB.get(cacheKeyFormio)).pipe(
        switchMap((cached) => {
          if (cached) {
            return of(new HttpResponse({ status: 200, body: cached }));
          } else {
            return throwError(
              () =>
                new HttpErrorResponse({
                  status: 503,
                  statusText: 'You are offline and there is no cached data.',
                }),
            );
          }
        }),
      );
    }

    // If online, always fetch from API and update cache
    return next.handle(modifiedReq).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.status === 200) {
          this.indexedDB.set(cacheKeyFormio, event.body);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.auth.logout({
            logoutParams: {
              returnTo: window.location.origin,
            },
          } as LogoutOptions);
        }
        return throwError(() => error);
      }),
    );
  }
}
