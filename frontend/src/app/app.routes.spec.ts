import { routes } from './app.routes';

describe('rutas de GI-11', () => {
  it('expone rutas recargables para paciente, alta y detalle de derivación', () => {
    const protectedShell = routes.find((route) => Array.isArray(route.children));
    const paths = protectedShell?.children?.map((route) => route.path);

    expect(paths).toContain('pacientes/:id');
    expect(paths).toContain('pacientes/:id/derivar');
    expect(paths).toContain('derivaciones/:id');
  });
});
