import { isDevMode, NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
} from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import {
  provideServiceWorker,
  ServiceWorkerModule,
} from '@angular/service-worker';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgxIndexedDBModule } from 'ngx-indexed-db';
import { provideAuth0 } from '@auth0/auth0-angular';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { environment } from 'src/environments/environment';
import { NotificationModule } from '@progress/kendo-angular-notification';
import { IndexedDBConfigService } from './common/services/indexed-dbconfig.service';
import { CallbackComponent } from './auth/callback/callback.component';
import { ApiKeyInterceptor } from './auth/api-key.interceptor';
import { FORM_DB_NAME } from './shared/constants/indexed-db-names';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { dropdownReducer } from './store/customer-dropdown/customer-dropdown.reducer';

//  IndexDB Configuration
const dbConfigService = new IndexedDBConfigService();
const dbConfig = dbConfigService.generateDBConfig(FORM_DB_NAME, [
  { name: 'clientTimestamp', unique: true },
  { name: 'id' },
  { name: 'formName' },
  { name: 'version' },
]);

const routes: Routes = [];
@NgModule({
  declarations: [AppComponent, CallbackComponent],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    ButtonsModule,
    InputsModule,
    LayoutModule,
    AppRoutingModule,
    FormsModule,
    NgxIndexedDBModule.forRoot(dbConfig),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerImmediately',
    }),
    RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' }),
    NotificationModule,
    StoreModule.forRoot({
      customers: dropdownReducer,
    }),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),
  ],
  providers: [
    provideAuth0({
      domain: environment.auth0Domain,
      clientId: environment.auth0ClientId,
      authorizationParams: {
        redirect_uri: window.location.origin + '/callback',
        audience: environment.auth0Audience, //client audience
        scope: 'openid profile email offline_access',
      },
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
    }),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: ApiKeyInterceptor, multi: true },
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerImmediately',
    }),
    provideClientHydration(),
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
