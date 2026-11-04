import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Patient } from '../../models/patient';
import { PatientService } from '../../services/patient.service';
import { PatientFormPage } from './patient-form-page';
import { PatientToast } from './patient-toast';

describe('PatientFormPage', () => {
  let component: PatientFormPage;
  let createPatient: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let toastShow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createPatient = vi.fn().mockReturnValue(of({ id: 'patient-1' } as Patient));
    navigate = vi.fn();
    toastShow = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { mode: 'create' },
              paramMap: convertToParamMap({}),
            },
          },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: PatientService,
          useValue: {
            createPatient,
            getPatient: vi.fn(),
            replacePatient: vi.fn(),
          },
        },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new PatientFormPage());
    component.toast = { show: toastShow } as unknown as PatientToast;
    component.ngOnInit();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('no envía un formulario inválido y muestra el resumen de errores', () => {
    component.submit();

    expect(createPatient).not.toHaveBeenCalled();
    expect(toastShow).toHaveBeenCalledWith('PATIENT.VALIDATION_SUMMARY_MANY', 'err');
  });

  it('crea un paciente con el payload normalizado y vuelve al listado', () => {
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
        phone: '542215551234',
      }),
    );
    expect(toastShow).toHaveBeenCalledWith('PATIENT.CREATE_SUCCESS', 'ok');

    vi.advanceTimersByTime(800);
    expect(navigate).toHaveBeenCalledWith(['/items'], { queryParams: { refreshed: '1' } });
  });
});
