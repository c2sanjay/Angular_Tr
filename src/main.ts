/// <reference types="@angular/localize" />

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('ngsw-worker.js')
        .then((reg) => {
          return navigator.serviceWorker.ready;
        })
        .then((sw) => {})
        .catch((err) => {
          console.error('[Service Worker] Registration failed:', err);
        });
    });
  }
}

// Bootstrap Angular App
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
