import { TestBed } from '@angular/core/testing';
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

    const result = await new Promise<Healthsite[]>((resolve) => {
      service.getHealthsites().subscribe(resolve);
    });

    expect(storageService.getItem).toHaveBeenCalledWith(cacheKey);
    expect(itemsApiService.getHealthsites).not.toHaveBeenCalled();
    expect(result).toEqual(sampleHealthsites);
  });

  it('fetches from API and caches when cache is empty', async () => {
    storageService.getItem.mockReturnValue(null);
    itemsApiService.getHealthsites.mockReturnValue(of(sampleHealthsites));

    const result = await new Promise<Healthsite[]>((resolve) => {
      service.getHealthsites().subscribe(resolve);
    });

    expect(itemsApiService.getHealthsites).toHaveBeenCalled();
    expect(storageService.setItem).toHaveBeenCalledWith(
      cacheKey,
      sampleHealthsites,
      5,
    );
    expect(result).toEqual(sampleHealthsites);
  });

  it('returns empty array when API fails', async () => {
    storageService.getItem.mockReturnValue(null);
    itemsApiService.getHealthsites.mockReturnValue(
      throwError(() => new Error('network')),
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await new Promise<Healthsite[]>((resolve) => {
      service.getHealthsites().subscribe(resolve);
    });

    expect(result).toEqual([]);
    consoleError.mockRestore();
  });
});
