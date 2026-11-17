import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { of, throwError } from 'rxjs';

import { Healthsite } from '../models/healthsite';
import { ItemsApiService } from './items-api.service';
import { ItemsService } from './items.service';
import { StorageService } from './storage.service';

describe('ItemsService', () => {
  const cacheKey = 'healthsites-la-plata-v4';
  const sampleHealthsites: Healthsite[] = [
    {
      id: '1',
      name: 'Centro',
      city: 'La Plata',
      address: 'Calle 1',
      type: 'hospital',
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
  ];

  let itemsApiService: { getHealthsites: ReturnType<typeof vi.fn> };
  let storageService: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
  };
  let service: ItemsService;

  beforeEach(() => {
    itemsApiService = { getHealthsites: vi.fn() };
    storageService = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ItemsService,
        { provide: ItemsApiService, useValue: itemsApiService },
        { provide: StorageService, useValue: storageService },
      ],
    });

    service = TestBed.inject(ItemsService);
  });

  it('returns cached healthsites without calling the API', async () => {
    storageService.getItem.mockReturnValue(sampleHealthsites);

    const result = await firstValueFrom(service.getHealthsites());

    expect(storageService.getItem).toHaveBeenCalledWith(cacheKey);
    expect(itemsApiService.getHealthsites).not.toHaveBeenCalled();
    expect(result).toEqual(sampleHealthsites);
  });

  it('fetches from API and caches when cache is empty', async () => {
    storageService.getItem.mockReturnValue(null);
    itemsApiService.getHealthsites.mockReturnValue(of(sampleHealthsites));

    const result = await firstValueFrom(service.getHealthsites());

    expect(itemsApiService.getHealthsites).toHaveBeenCalled();
    expect(storageService.setItem).toHaveBeenCalledWith(cacheKey, sampleHealthsites, 5);
    expect(result).toEqual(sampleHealthsites);
  });

  it('propagates API failures without caching', async () => {
    storageService.getItem.mockReturnValue(null);
    itemsApiService.getHealthsites.mockReturnValue(throwError(() => new Error('network')));

    await expect(firstValueFrom(service.getHealthsites())).rejects.toThrow('network');
    expect(storageService.setItem).not.toHaveBeenCalled();
  });

  it('bypasses cache when refresh is requested', async () => {
    storageService.getItem.mockReturnValue(sampleHealthsites);
    itemsApiService.getHealthsites.mockReturnValue(of(sampleHealthsites));

    await firstValueFrom(service.getHealthsites({ refresh: true }));

    expect(storageService.getItem).not.toHaveBeenCalled();
    expect(itemsApiService.getHealthsites).toHaveBeenCalled();
  });
});
