import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Patient, PatientPage } from '../models/patient';
import { PatientService } from './patient.service';

describe('PatientService', () => {
  let service: PatientService;
  let httpMock: HttpTestingController;

  const samplePatient: Patient = {
    id: 'p-1',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    city: 'La Plata',
    country: 'Argentina',
    picture: 'https://example.com/jane.jpg',
    active: true,
    version: 1,
  };

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
      items: [samplePatient],
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

  it('fetches a patient by id', async () => {
    const resultPromise = firstValueFrom(service.getPatient('p-1'));

    const req = httpMock.expectOne(`${environment.backendApiUrl}/patients/p-1`);
    expect(req.request.method).toBe('GET');
    req.flush(samplePatient);

    expect(await resultPromise).toEqual(samplePatient);
  });

  it('creates a patient', async () => {
    const payload = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      city: 'La Plata',
      country: 'Argentina',
      picture: 'https://example.com/jane.jpg',
      active: true,
    };

    const resultPromise = firstValueFrom(service.createPatient(payload));

    const req = httpMock.expectOne(`${environment.backendApiUrl}/patients`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(samplePatient);

    expect(await resultPromise).toEqual(samplePatient);
  });

  it('replaces a patient', async () => {
    const payload = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      city: 'La Plata',
      country: 'Argentina',
      picture: 'https://example.com/jane.jpg',
      active: false,
      version: 2,
    };

    const resultPromise = firstValueFrom(service.replacePatient('p-1', payload));

    const req = httpMock.expectOne(`${environment.backendApiUrl}/patients/p-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...samplePatient, ...payload, version: 3 });

    const result = await resultPromise;
    expect(result.version).toBe(3);
  });

  it('deactivates a patient', async () => {
    const resultPromise = firstValueFrom(service.deactivatePatient('p-1', 2));

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.backendApiUrl}/patients/p-1` &&
        request.params.get('version') === '2',
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await resultPromise;
  });
});
