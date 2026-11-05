import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Referral, ReferralCreatePayload } from '../models/referral';
import { ReferralService } from './referral.service';

describe('ReferralService', () => {
  let service: ReferralService;
  let httpMock: HttpTestingController;

  const referral: Referral = {
    id: 'r-1',
    patientId: 'p-1',
    destination: { healthsiteId: 'h-1', name: 'Hospital', address: 'Calle 1' },
    reason: 'Consulta especializada',
    notes: null,
    priority: 'normal',
    responsibleId: 'u-1',
    status: 'draft',
    rejectionReason: null,
    createdAt: '2026-11-05T00:00:00.000Z',
    createdBy: 'u-1',
    updatedAt: '2026-11-05T00:00:00.000Z',
    updatedBy: 'u-1',
    submittedAt: null,
    decidedAt: null,
    closedAt: null,
    history: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReferralService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('consulta derivaciones por paciente', async () => {
    const resultPromise = firstValueFrom(service.list({ patientId: 'p-1' }));
    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === `${environment.backendApiUrl}/v1/referrals` &&
        candidate.params.get('patientId') === 'p-1',
    );
    expect(request.request.method).toBe('GET');
    request.flush([referral]);
    expect(await resultPromise).toEqual([referral]);
  });

  it('crea con clave de idempotencia', async () => {
    const payload: ReferralCreatePayload = {
      patientId: 'p-1',
      destination: referral.destination,
      reason: referral.reason,
      notes: null,
      priority: 'normal',
    };
    const resultPromise = firstValueFrom(service.create(payload, 'idem-1'));
    const request = httpMock.expectOne(`${environment.backendApiUrl}/v1/referrals`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('idem-1');
    expect(request.request.body).toEqual(payload);
    request.flush(referral);
    expect(await resultPromise).toEqual(referral);
  });

  it('recarga el detalle por ID y ejecuta transiciones', async () => {
    const detailPromise = firstValueFrom(service.getById('r-1'));
    const detailRequest = httpMock.expectOne(`${environment.backendApiUrl}/v1/referrals/r-1`);
    detailRequest.flush(referral);
    expect(await detailPromise).toEqual(referral);

    const transitionPromise = firstValueFrom(service.transition('r-1', { to: 'submitted' }));
    const transitionRequest = httpMock.expectOne(
      `${environment.backendApiUrl}/v1/referrals/r-1/transitions`,
    );
    expect(transitionRequest.request.method).toBe('POST');
    expect(transitionRequest.request.body).toEqual({ to: 'submitted' });
    transitionRequest.flush({ ...referral, status: 'submitted' });
    expect((await transitionPromise).status).toBe('submitted');
  });
});
