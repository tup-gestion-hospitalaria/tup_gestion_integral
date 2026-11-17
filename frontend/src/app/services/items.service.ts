import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

import { Healthsite } from '../models/healthsite';
import { ItemsApiService } from './items-api.service';
import { StorageService } from './storage.service';

export interface GetHealthsitesOptions {
  refresh?: boolean;
}

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

  getHealthsites(options: GetHealthsitesOptions = {}): Observable<Healthsite[]> {
    const refresh = options.refresh ?? false;

    if (!refresh) {
      const cachedItems = this.storageService.getItem<Healthsite[]>(this.cacheKey);
      if (cachedItems) {
        return of(cachedItems);
      }
    }

    return this.itemsApiService.getHealthsites().pipe(
      tap((items) => {
        this.storageService.setItem(this.cacheKey, items, this.cacheDurationInMinutes);
      }),
    );
  }
}
