import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { Healthsite, parseHealthsites } from '../models/healthsite';

@Injectable({
  providedIn: 'root',
})
export class ItemsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.backendApiUrl}/v1/healthsites`;

  getHealthsites(): Observable<Healthsite[]> {
    return this.http.get<unknown>(this.apiUrl).pipe(
      map((body) => {
        try {
          return parseHealthsites(body);
        } catch {
          throw new HttpErrorResponse({
            error: { message: 'El servicio de centros devolvió una respuesta inválida.' },
            status: 502,
            statusText: 'Bad Gateway',
            url: this.apiUrl,
          });
        }
      }),
    );
  }
}
