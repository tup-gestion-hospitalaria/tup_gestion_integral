import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Patient } from '../../models/patient';
import { PatientService } from '../../services/patient.service';
import { UserService } from '../../services/user.service';
import { PatientDetail } from './patient-detail';
import { PatientToast } from './patient-toast';

const patient: Patient = {
  id: 'patient-1',
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
  privateCare: false,
  insuranceName: 'OSDE',
  affiliateNumber: '123456',
  plan: '',
  picture: '',
  active: true,
  version: 3,
};

describe('PatientDetail', () => {
  let component: PatientDetail;
  let deactivatePatient: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let toastShow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    deactivatePatient = vi.fn().mockReturnValue(of(undefined));
    navigate = vi.fn();
    toastShow = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: patient.id }) } },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: PatientService,
          useValue: {
            getPatient: vi.fn().mockReturnValue(of(patient)),
            deactivatePatient,
          },
        },
        {
          provide: UserService,
          useValue: { getMe: vi.fn().mockReturnValue(of({ role: 'admin' })) },
        },
        {
          provide: MatDialog,
          useValue: { open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }) },
        },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new PatientDetail());
    component.toast = { show: toastShow } as unknown as PatientToast;
    component.ngOnInit();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('confirma la baja con la versión actual y vuelve al listado', () => {
    component.deactivatePatient();

    expect(deactivatePatient).toHaveBeenCalledWith(patient.id, 3);
    expect(toastShow).toHaveBeenCalledWith('PATIENT.DEACTIVATE_SUCCESS', 'ok');

    vi.advanceTimersByTime(800);
    expect(navigate).toHaveBeenCalledWith(['/items']);
  });
});
