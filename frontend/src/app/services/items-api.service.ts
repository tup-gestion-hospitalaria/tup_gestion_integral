import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Healthsite } from '../models/healthsite';

@Injectable({
  providedIn: 'root',
})
export class ItemsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.backendApiUrl}/healthsites`;

  getHealthsites(): Observable<Healthsite[]> {
    return this.http.get<Healthsite[]>(this.apiUrl);
  }
}
