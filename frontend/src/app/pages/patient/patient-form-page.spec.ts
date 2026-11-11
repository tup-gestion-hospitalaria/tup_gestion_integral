import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { PatientService } from '../../services/patient.service';
import { PatientFormPage } from './patient-form-page';
import { AppToastService } from '../../shared/app-toast.service';

describe('PatientFormPage', () => {
  it('crea un paciente normalizado y vuelve al listado', () => {
    vi.useFakeTimers();
    const createPatient = vi.fn().mockReturnValue(of(null));
    const navigate = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { mode: 'create' } } } },
        { provide: Router, useValue: { navigate } },
        { provide: PatientService, useValue: { createPatient } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: AppToastService, useValue: { show: vi.fn() } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new PatientFormPage());
    component.ngOnInit();
    component.form.setValue({
      fullName: '  Ana   María ',
      lastName: ' Pérez ',
      documentNumber: '30.123.456',
      birthDate: '15-03-1990',
      email: ' ANA@EXAMPLE.COM ',
      phone: '+54 221 555-1234',
      contactPreference: 'whatsapp',
      contactHours: '9 a 18',
      city: 'La Plata',
      country: 'Argentina',
      privateCare: false,
      insuranceName: 'OSDE',
      affiliateNumber: '123456',
      plan: '210',
      picture: 'https://example.com/ana.jpg',
      active: true,
    });

    component.submit();

    expect(createPatient).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Ana María',
        documentNumber: '30123456',
        email: 'ana@example.com',
      }),
    );
    vi.advanceTimersByTime(800);
    expect(navigate).toHaveBeenCalledWith(['/items'], { queryParams: { refreshed: '1' } });

    vi.useRealTimers();
    TestBed.resetTestingModule();
  });
});
