import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Referral,
  ReferralCreatePayload,
  ReferralListParams,
  ReferralTransitionPayload,
} from '../models/referral';

@Injectable({
  providedIn: 'root',
})
export class ReferralService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.backendApiUrl}/v1/referrals`;

  list(params: ReferralListParams = {}): Observable<Referral[]> {
    let httpParams = new HttpParams();
    if (params.patientId) {
      httpParams = httpParams.set('patientId', params.patientId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<Referral[]>(this.apiUrl, { params: httpParams });
  }

  getById(id: string): Observable<Referral> {
    return this.http.get<Referral>(`${this.apiUrl}/${id}`);
  }

  create(payload: ReferralCreatePayload, idempotencyKey: string): Observable<Referral> {
    const headers = new HttpHeaders().set('Idempotency-Key', idempotencyKey);
    return this.http.post<Referral>(this.apiUrl, payload, { headers });
  }

  transition(id: string, payload: ReferralTransitionPayload): Observable<Referral> {
    return this.http.post<Referral>(`${this.apiUrl}/${id}/transitions`, payload);
  }
}
