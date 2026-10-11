import { TestBed } from '@angular/core/testing';

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.dataLayer = [];
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('sendEvent pushes to dataLayer', () => {
    service.sendEvent('custom_event', { foo: 'bar' });

    expect(window.dataLayer).toEqual([{ event: 'custom_event', foo: 'bar' }]);
  });

  it('login pushes login_event', () => {
    service.login('user@example.com', 'google');

    expect(window.dataLayer).toEqual([
      { event: 'login_event', email: 'user@example.com', method: 'google' },
    ]);
  });

  it('featureOpened pushes feature_opened', () => {
    service.featureOpened('items');

    expect(window.dataLayer).toEqual([
      { event: 'feature_opened', feature_name: 'items' },
    ]);
  });

  it('featureTimeSpent pushes feature_time_spent', () => {
    service.featureTimeSpent('items', 120);

    expect(window.dataLayer).toEqual([
      {
        event: 'feature_time_spent',
        feature_name: 'items',
        duration_seconds: 120,
      },
    ]);
  });
});
