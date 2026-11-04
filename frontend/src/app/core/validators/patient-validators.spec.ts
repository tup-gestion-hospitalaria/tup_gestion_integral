import { FormControl } from '@angular/forms';

import {
  normalizePatientFormValue,
  patientDocumentValidator,
  patientFieldErrorKey,
  patientOptionalTextValidator,
} from './patient-validators';

describe('patient validators', () => {
  it('normaliza el payload enviado por el formulario', () => {
    const payload = normalizePatientFormValue({
      fullName: '  Ana   María ',
      lastName: ' Pérez ',
      documentNumber: '30.123.456',
      birthDate: ' 15-03-1990 ',
      email: ' ANA@EXAMPLE.COM ',
      phone: '+54 221 555-1234',
      contactPreference: ' whatsapp ',
      contactHours: ' 9 a 18 ',
      city: ' La Plata ',
      country: ' Argentina ',
      privateCare: false,
      insuranceName: ' OSDE ',
      affiliateNumber: ' 123456 ',
      plan: ' 210 ',
      picture: ' https://example.com/ana.jpg ',
      active: true,
    });

    expect(payload).toEqual({
      fullName: 'Ana María',
      lastName: 'Pérez',
      documentNumber: '30123456',
      birthDate: '15-03-1990',
      email: 'ana@example.com',
      phone: '542215551234',
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
  });

  it('limpia la obra social cuando la atención es privada', () => {
    const payload = normalizePatientFormValue({
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
      insuranceName: 'OSDE',
      affiliateNumber: '123456',
      plan: '210',
      picture: '',
      active: true,
    });

    expect(payload.insuranceName).toBe('');
    expect(payload.affiliateNumber).toBe('');
    expect(payload.plan).toBe('');
  });

  it('valida documento y usa el mensaje correcto para textos opcionales largos', () => {
    const document = new FormControl('123', [patientDocumentValidator()]);
    const optionalText = new FormControl('x'.repeat(81), [patientOptionalTextValidator()]);

    expect(document.errors).toEqual({ documentFormat: true });
    expect(optionalText.errors).toEqual({ optionalTextLength: true });
    expect(patientFieldErrorKey(optionalText.errors)).toBe('PATIENT.VALIDATION_OPTIONAL_TEXT');
  });
});
