import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../services/auth.service';
import { AppToastService } from '../../shared/app-toast.service';
import { Login } from './login';

describe('Login', () => {
  it('muestra errores con toast accesible en lugar de alert nativo', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const toastShow = vi.fn();
    const instant = vi.fn((key: string) => `translated:${key}`);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            loginWithEmail: vi.fn().mockRejectedValue({ code: 'auth/invalid-credential' }),
            isApproved: () => true,
          },
        },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: TranslateService, useValue: { instant, get: () => of('') } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
        { provide: AppToastService, useValue: { show: toastShow } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new Login());
    component.email = 'user@example.com';
    component.password = 'secret';

    await component.loginWithEmail();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(toastShow).toHaveBeenCalledWith('translated:LOGIN.INVALID_CREDENTIALS', 'err');
    expect(component.loginErrorKey).toBe('LOGIN.INVALID_CREDENTIALS');

    alertSpy.mockRestore();
  });
});
