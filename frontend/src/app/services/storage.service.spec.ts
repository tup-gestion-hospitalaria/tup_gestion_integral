import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  it('returns null when key is missing', () => {
    expect(service.getItem('missing')).toBeNull();
  });

  it('stores and retrieves data before expiration', () => {
    service.setItem('key', { value: 42 }, 5);

    expect(service.getItem<{ value: number }>('key')).toEqual({ value: 42 });
  });

  it('returns null and removes key when data is expired', () => {
    const key = 'expired-key';
    const expiration = Date.now() - 1000;
    localStorage.setItem(key, JSON.stringify({ data: 'old', expiration }));

    expect(service.getItem(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('removeItem deletes the key', () => {
    service.setItem('key', 'data', 5);
    service.removeItem('key');

    expect(localStorage.getItem('key')).toBeNull();
  });
});
