import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Healthsite } from '../../models/healthsite';
import { ItemsService } from '../../services/items.service';
import { ReferralCenters } from './referral-centers';

describe('ReferralCenters', () => {
  const healthsites: Healthsite[] = [
    {
      id: '1',
      name: 'Hospital Norte',
      city: 'La Plata',
      address: 'Calle 50',
      type: 'hospital',
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
    {
      id: '2',
      name: 'Farmacia Sur',
      city: 'Berisso',
      address: 'Av. 9',
      type: 'pharmacy',
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    },
  ];

  let getHealthsites: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getHealthsites = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: ItemsService, useValue: { getHealthsites } }],
    });
  });

  it('marks load error when the service fails', () => {
    getHealthsites.mockReturnValue(throwError(() => new Error('network')));

    const component = TestBed.runInInjectionContext(() => new ReferralCenters());
    component.ngOnInit();

    expect(component.hasLoadError).toBe(true);
    expect(component.isLoading).toBe(false);
    expect(component.healthsites).toEqual([]);
  });

  it('retries with refresh after a failure', () => {
    getHealthsites
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of(healthsites));

    const component = TestBed.runInInjectionContext(() => new ReferralCenters());
    component.ngOnInit();
    component.retryLoad();

    expect(getHealthsites).toHaveBeenLastCalledWith({ refresh: true });
    expect(component.hasLoadError).toBe(false);
    expect(component.healthsites).toEqual(healthsites);
  });

  it('distinguishes empty catalog from filtered results', () => {
    getHealthsites.mockReturnValue(of([]));

    const component = TestBed.runInInjectionContext(() => new ReferralCenters());
    component.ngOnInit();

    expect(component.isCatalogEmpty()).toBe(true);
    expect(component.hasFilteredResults()).toBe(false);
  });

  it('filters by name, city, address and type', () => {
    getHealthsites.mockReturnValue(of(healthsites));

    const component = TestBed.runInInjectionContext(() => new ReferralCenters());
    component.ngOnInit();

    component.filterText = 'berisso';
    component.applyFilters();
    expect(component.filteredHealthsites.map((item) => item.id)).toEqual(['2']);

    component.filterText = 'calle 50';
    component.applyFilters();
    expect(component.filteredHealthsites.map((item) => item.id)).toEqual(['1']);

    component.filterText = '';
    component.selectedType = 'pharmacy';
    component.applyFilters();
    expect(component.filteredHealthsites.map((item) => item.id)).toEqual(['2']);

    component.selectedType = 'all';
    component.selectedCity = 'La Plata';
    component.applyFilters();
    expect(component.filteredHealthsites.map((item) => item.id)).toEqual(['1']);

    component.selectedCity = 'all';
    component.filterText = 'inexistente';
    component.applyFilters();
    expect(component.hasFilteredResults()).toBe(true);
  });
});
