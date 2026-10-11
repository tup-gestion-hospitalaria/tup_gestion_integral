import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let authService: { getCurrentUser: ReturnType<typeof vi.fn> };
  let lastRequest: HttpRequest<unknown> | undefined;

  const next = (request: HttpRequest<unknown>) => {
    lastRequest = request;
    return of(new HttpResponse({ body: [] }));
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    lastRequest = undefined;
    authService = { getCurrentUser: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  async function runInterceptor(url: string) {
    const request = new HttpRequest('GET', url);
    await TestBed.runInInjectionContext(() =>
      firstValueFrom(authInterceptor(request, next)),
    );
  }

  it('does not add Authorization for non-API URLs', async () => {
    authService.getCurrentUser.mockReturnValue({
      getIdToken: vi.fn().mockResolvedValue('token'),
    });

    await runInterceptor('https://example.com/data');

    expect(lastRequest?.headers.has('Authorization')).toBe(false);
  });

  it('does not add Authorization when there is no user', async () => {
    authService.getCurrentUser.mockReturnValue(null);

    await runInterceptor(`${environment.backendApiUrl}/healthsites`);

    expect(lastRequest?.headers.has('Authorization')).toBe(false);
  });

  it('adds Bearer token for backend API requests when user is signed in', async () => {
    authService.getCurrentUser.mockReturnValue({
      getIdToken: vi.fn().mockResolvedValue('test-token'),
    });

    await runInterceptor(`${environment.backendApiUrl}/healthsites`);

    expect(lastRequest?.headers.get('Authorization')).toBe('Bearer test-token');
  });
});
