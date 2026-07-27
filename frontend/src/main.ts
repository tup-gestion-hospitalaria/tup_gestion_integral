import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';

import { appConfig } from './app/app.config';
import { App } from './app/app';

Sentry.init({
  dsn: 'https://14b8411f09197cf89a927ecc7d0c34c0@o4511657771991040.ingest.us.sentry.io/4511657826582528',
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
