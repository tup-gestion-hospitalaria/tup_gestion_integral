import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { Healthsite } from '../../models/healthsite';
import { Patient } from '../../models/patient';
import { Referral } from '../../models/referral';
import { ItemsService } from '../../services/items.service';
import { PatientService } from '../../services/patient.service';
import { ReferralService } from '../../services/referral.service';
import { TranslateService } from '@ngx-translate/core';
import { ReferralFormPage } from './referral-form-page';

describe('ReferralFormPage', () => {
  it('carga por ID, crea una sola vez y navega al detalle persistente', () => {
    const patient = samplePatient();
    const healthsite: Healthsite = {
      id: 'h-1',
      name: 'Hospital Central',
      city: 'La Plata',
      address: 'Calle 1',
      type: 'hospital',
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
    };
    const created = sampleReferral();
    const createResult = new Subject<Referral>();
    const create = vi.fn().mockReturnValue(createResult);
    const navigate = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'p-1' } } },
        },
        { provide: Router, useValue: { navigate } },
        { provide: PatientService, useValue: { getPatient: vi.fn().mockReturnValue(of(patient)) } },
        {
          provide: ItemsService,
          useValue: { getHealthsites: vi.fn().mockReturnValue(of([healthsite])) },
        },
        { provide: ReferralService, useValue: { create } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new ReferralFormPage());
    component.ngOnInit();
    component.form.setValue({
      healthsiteId: 'h-1',
      reason: 'Evaluación especializada',
      priority: 'high',
      notes: 'Llevar estudios previos',
    });

    component.submit();
    component.submit();

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      {
        patientId: 'p-1',
        destination: {
          healthsiteId: 'h-1',
          name: 'Hospital Central',
          address: 'Calle 1',
        },
        reason: 'Evaluación especializada',
        priority: 'high',
        notes: 'Llevar estudios previos',
      },
      expect.any(String),
    );

    createResult.next(created);
    expect(navigate).toHaveBeenCalledWith(['/derivaciones', 'r-1'], {
      queryParams: { created: '1' },
    });
  });
});

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

function sampleReferral(): Referral {
  return {
    id: 'r-1',
    patientId: 'p-1',
    destination: { healthsiteId: 'h-1', name: 'Hospital Central', address: 'Calle 1' },
    reason: 'Evaluación especializada',
    notes: 'Llevar estudios previos',
    priority: 'high',
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
  };
}
