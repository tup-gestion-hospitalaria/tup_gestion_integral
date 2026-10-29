import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PatientListParams, PatientPage } from '../models/patient';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.backendApiUrl}/patients`;

  getPatients(params: PatientListParams = {}): Observable<PatientPage> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    if (params.order) {
      httpParams = httpParams.set('order', params.order);
    }
    if (params.active !== undefined) {
      httpParams = httpParams.set('active', String(params.active));
    }

    return this.http.get<PatientPage>(this.apiUrl, { params: httpParams });
  }
}
