import { environment } from './environment';

describe('test environment', () => {
  it('usa el proxy local sin cambiar al proyecto demo de Firebase', () => {
    expect(environment.production).toBe(false);
    expect(environment.backendApiUrl).toBe('/api');
    expect(environment.firebaseConfig.projectId).toBe('tup-gestion-integral');
    expect(environment.firebaseConfig.projectId).not.toContain('demo-');
  });
});
