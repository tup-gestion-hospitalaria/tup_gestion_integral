import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Patient } from '../models/patient';
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

  it('fetches patients from the backend API', async () => {
    const patients: Patient[] = [
      {
        id: '1',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        city: 'La Plata',
        country: 'AR',
        picture: '',
        active: true,
      },
    ];

    const resultPromise = firstValueFrom(service.getPatients());

    const req = httpMock.expectOne(`${environment.backendApiUrl}/patients`);
    expect(req.request.method).toBe('GET');
    req.flush(patients);

    expect(await resultPromise).toEqual(patients);
  });
});
