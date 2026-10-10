import 'zone.js';
import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';

import { appConfig } from './app/app.config';
import { App } from './app/app';

Sentry.init({
  dsn: 'https://14b8411f09197cf89a927ecc7d0c34c0@o4511657771991040.ingest.us.sentry.io/4511657826582528',
  environment: isDevMode() ? 'development' : 'production',
  release: 'gestion-hospitalaria@1.0.0',
  sendDefaultPii: false,
});

bootstrapApplication(App, appConfig).catch(() => {
  console.error('No se pudo iniciar la aplicación.');
});
