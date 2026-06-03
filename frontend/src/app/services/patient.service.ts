import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { Patient } from '../models/patient';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly storageService = inject(StorageService);

  private readonly apiUrl = 'https://randomuser.me/api/?results=20';
  private readonly cacheKey = 'patients';

  getPatients(): Observable<Patient[]> {
    const cachedPatients = this.storageService.getItem<Patient[]>(this.cacheKey);

    if (cachedPatients) {
      return of(cachedPatients);
    }

    return this.http.get<any>(this.apiUrl).pipe(
      map((response) => {
        const patients = response.results.map((patient: any) => ({
          fullName: `${patient.name.first} ${patient.name.last}`,
          email: patient.email,
          city: patient.location.city,
          country: patient.location.country,
          picture: patient.picture.large,
        }));

        this.storageService.setItem(this.cacheKey, patients, 5);

        return patients;
      }),
      catchError((error) => {
        console.error('Error al obtener pacientes:', error);
        return of([]);
      }),
    );
  }
}
