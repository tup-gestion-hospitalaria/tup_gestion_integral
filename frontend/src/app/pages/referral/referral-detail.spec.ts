import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Patient } from '../../models/patient';
import { Referral } from '../../models/referral';
import { PatientService } from '../../services/patient.service';
import { ReferralService } from '../../services/referral.service';
import { UserService } from '../../services/user.service';
import { ReferralDetail } from './referral-detail';

describe('ReferralDetail', () => {
  it('recarga por URL, ordena el historial y muestra transiciones de admin', () => {
    const referral = sampleSubmittedReferral();
    const getById = vi.fn().mockReturnValue(of(referral));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'r-1' },
              queryParamMap: { get: () => null },
            },
          },
        },
        { provide: ReferralService, useValue: { getById } },
        { provide: PatientService, useValue: { getPatient: () => of(samplePatient()) } },
        {
          provide: UserService,
          useValue: {
            getMe: () =>
              of({
                uid: 'admin-1',
                email: 'admin@example.com',
                displayName: 'Admin',
                photoUrl: null,
                role: 'admin',
                status: 'approved',
                active: true,
              }),
          },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new ReferralDetail());
    component.ngOnInit();

    expect(getById).toHaveBeenCalledWith('r-1');
    expect(component.patient?.id).toBe('p-1');
    expect(component.history.map((event) => event.action)).toEqual([
      'referral.created',
      'referral.submitted',
    ]);
    expect(component.allowedTransitions).toEqual(['accepted', 'rejected', 'cancelled']);
  });

  it('no ofrece transiciones a un responsable que no es propietario', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'r-1' },
              queryParamMap: { get: () => null },
            },
          },
        },
        { provide: ReferralService, useValue: { getById: () => of(sampleSubmittedReferral()) } },
        { provide: PatientService, useValue: { getPatient: () => of(samplePatient()) } },
        {
          provide: UserService,
          useValue: {
            getMe: () =>
              of({
                uid: 'u-2',
                email: 'other@example.com',
                displayName: 'Responsable',
                photoUrl: null,
                role: 'user',
                status: 'approved',
                active: true,
              }),
          },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new ReferralDetail());
    component.ngOnInit();
    expect(component.allowedTransitions).toEqual([]);
  });
});

function sampleSubmittedReferral(): Referral {
  return {
    id: 'r-1',
    patientId: 'p-1',
    destination: { healthsiteId: 'h-1', name: 'Hospital', address: 'Calle 1' },
    reason: 'Evaluación especializada',
    notes: null,
    priority: 'normal',
    responsibleId: 'u-2',
    status: 'submitted',
    rejectionReason: null,
    createdAt: '2026-11-05T00:00:00.000Z',
    createdBy: 'u-1',
    updatedAt: '2026-11-05T00:01:00.000Z',
    updatedBy: 'u-1',
    submittedAt: '2026-11-05T00:01:00.000Z',
    decidedAt: null,
    closedAt: null,
    history: [
      {
        id: 'e-2',
        action: 'referral.submitted',
        at: '2026-11-05T00:01:00.000Z',
        actorId: 'u-1',
        fromStatus: 'draft',
        toStatus: 'submitted',
        changes: null,
      },
      {
        id: 'e-1',
        action: 'referral.created',
        at: '2026-11-05T00:00:00.000Z',
        actorId: 'u-1',
        fromStatus: null,
        toStatus: 'draft',
        changes: null,
      },
    ],
  };
}

function samplePatient(): Patient {
  return {
    id: 'p-1',
    fullName: 'Ana',
    lastName: 'Pérez',
    documentNumber: '30123456',
    birthDate: '15-03-1990',
    email: 'ana@example.com',
    phone: '',
    contactPreference: '',
    contactHours: '',
    city: 'La Plata',
    country: 'Argentina',
    privateCare: true,
    insuranceName: '',
    affiliateNumber: '',
    plan: '',
    picture: '',
    active: true,
  };
}
