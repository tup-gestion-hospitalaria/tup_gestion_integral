import { adminAccountGuard } from './core/guards/admin-account-guard';
import { approvedAccountGuard } from './core/guards/approved-account-guard';
import { routes } from './app.routes';

describe('patient routes', () => {
  const shell = routes.find((route) => route.path === '' && route.children);

  it('conserva las rutas de cuenta y del CRUD al integrar develop', () => {
    const paths = shell?.children?.map((route) => route.path);

    expect(paths).toContain('cuenta-estado');
    expect(paths).toContain('items');
    expect(paths).toContain('items/nuevo');
    expect(paths).toContain('items/:id');
    expect(paths).toContain('items/:id/editar');
  });

  it('permite consultar pacientes aprobados y reserva las mutaciones a admins', () => {
    const children = shell?.children ?? [];
    const list = children.find((route) => route.path === 'items');
    const detail = children.find((route) => route.path === 'items/:id');
    const create = children.find((route) => route.path === 'items/nuevo');
    const edit = children.find((route) => route.path === 'items/:id/editar');

    expect(list?.canActivate).toContain(approvedAccountGuard);
    expect(detail?.canActivate).toContain(approvedAccountGuard);
    expect(create?.canActivate).toContain(adminAccountGuard);
    expect(edit?.canActivate).toContain(adminAccountGuard);
  });
});
