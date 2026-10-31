import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { UserProfile } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly meUrl = `${environment.backendApiUrl}/users/me`;

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.meUrl);
  }
}
