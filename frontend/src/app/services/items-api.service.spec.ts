import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Healthsite } from '../models/healthsite';
import { ItemsApiService } from './items-api.service';

describe('ItemsApiService', () => {
  let service: ItemsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ItemsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches healthsites from the backend API', async () => {
    const healthsites: Healthsite[] = [
      {
        id: '1',
        name: 'Centro',
        city: 'La Plata',
        address: 'Calle 1',
        type: 'hospital',
        latitude: null,
        longitude: null,
        googleMapsUrl: null,
      },
    ];

    const resultPromise = firstValueFrom(service.getHealthsites());

    const req = httpMock.expectOne(`${environment.backendApiUrl}/v1/healthsites`);
    expect(req.request.method).toBe('GET');
    req.flush(healthsites);

    expect(await resultPromise).toEqual(healthsites);
  });
});
