import { Injectable } from '@angular/core';

interface CacheData<T> {
  data: T;
  expiration: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  setItem<T>(key: string, data: T, durationInMinutes: number): void {
    const expiration = Date.now() + durationInMinutes * 60 * 1000;

    const cacheData: CacheData<T> = {
      data,
      expiration
    };

    localStorage.setItem(key, JSON.stringify(cacheData));
  }

  getItem<T>(key: string): T | null {
    const storedData = localStorage.getItem(key);

    if (!storedData) {
      return null;
    }

    const cacheData: CacheData<T> = JSON.parse(storedData);

    if (Date.now() > cacheData.expiration) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheData.data;
  }
}