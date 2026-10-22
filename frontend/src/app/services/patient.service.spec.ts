import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { PatientPage } from '../models/patient';
import { PatientService } from './patient.service';

describe('PatientService', () => {
  let service: PatientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PatientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches paginated patients from the backend API', async () => {
    const page: PatientPage = {
      items: [
        {
          id: '1',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          city: 'La Plata',
          country: 'AR',
          picture: '',
          active: true,
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    };

    const resultPromise = firstValueFrom(
      service.getPatients({ page: 1, q: 'jane', sort: 'fullName', order: 'asc' }),
    );

    const req = httpMock.expectOne((request) => {
      return (
        request.url === `${environment.backendApiUrl}/patients` &&
        request.params.get('page') === '1' &&
        request.params.get('q') === 'jane' &&
        request.params.get('sort') === 'fullName' &&
        request.params.get('order') === 'asc'
      );
    });
    expect(req.request.method).toBe('GET');
    req.flush(page);

    expect(await resultPromise).toEqual(page);
  });
});
