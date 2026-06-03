import { Injectable } from '@angular/core';
import { Observable, of, tap, catchError } from 'rxjs';

import { Healthsite } from '../models/healthsite';
import { ItemsApiService } from './items-api.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class ItemsService {
  private readonly cacheKey = 'healthsites-la-plata-v4';
  private readonly cacheDurationInMinutes = 5;

  constructor(
    private itemsApiService: ItemsApiService,
    private storageService: StorageService,
  ) {}

  getHealthsites(): Observable<Healthsite[]> {
    const cachedItems = this.storageService.getItem<Healthsite[]>(this.cacheKey);

    if (cachedItems) {
      return of(cachedItems);
    }

    return this.itemsApiService.getHealthsites().pipe(
      tap((items) => {
        this.storageService.setItem(this.cacheKey, items, this.cacheDurationInMinutes);
      }),
      catchError((error) => {
        console.error('Error al obtener centros de salud:', error);
        return of([]);
      }),
    );
  }
}
