import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { Healthsite } from '../models/healthsite';

@Injectable({
  providedIn: 'root',
})
export class ItemsApiService {
  private readonly apiUrl = '/api/v3/facilities/';
  private readonly apiKey = 'ade0af6b7f80ec943d4791ee29a9f5c586c85a0e';

  constructor(private http: HttpClient) {}

  getHealthsites(): Observable<Healthsite[]> {
    const requests = [1, 2, 3].map((page) => {
      const params = new HttpParams()
        .set('api-key', this.apiKey)
        .set('extent', '-58.20,-35.10,-57.70,-34.70')
        .set('page', page.toString())
        .set('flat-properties', 'true');

      return this.http.get<{ results?: unknown[] } | unknown[]>(this.apiUrl, { params });
    });

    return forkJoin(requests).pipe(
      map((responses) => {
        const rawItems = responses.flatMap((response) =>
          Array.isArray(response) ? response : (response.results ?? []),
        );

        return this.mapHealthsites(rawItems);
      }),
    );
  }

  private mapHealthsites(items: unknown[]): Healthsite[] {
    return items.map((item, index) => {
      const healthsite = item as any;
      const properties = healthsite.attributes ?? healthsite.properties ?? healthsite;

      const coordinates =
        healthsite.centroid?.coordinates ?? healthsite.geometry?.coordinates ?? [];

      const longitude =
        coordinates[0] ??
        properties.longitude ??
        properties.lon ??
        properties.lng ??
        properties['addr:lon'] ??
        null;

      const latitude =
        coordinates[1] ?? properties.latitude ?? properties.lat ?? properties['addr:lat'] ?? null;

      const type = properties.amenity ?? properties.healthcare ?? 'hospital';

      return {
        id: healthsite.id?.toString() ?? index.toString(),
        name: properties.name || this.getDefaultName(type, index),
        city:
          properties.city || properties.addr_city || properties['addr:city'] || 'Sin información',
        address:
          properties.address ||
          properties.addr_full ||
          properties.addr_street ||
          properties['addr:street'] ||
          'Sin información',
        type,
        latitude,
        longitude,
        googleMapsUrl:
          latitude !== null && longitude !== null
            ? `https://www.google.com/maps?q=${latitude},${longitude}`
            : null,
      };
    });
  }

  private getDefaultName(type: string, index: number): string {
    const normalizedType = type.toLowerCase();

    if (normalizedType.includes('clinic')) {
      return `Clínica ${index + 1}`;
    }

    return `Hospital ${index + 1}`;
  }
}
