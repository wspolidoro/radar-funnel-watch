import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  // Client routes
  app: 'App',
  dashboard: 'Dashboard',
  newsletters: 'Newsletters',
  senders: 'Remetentes',
  funnels: 'Funis',
  library: 'Biblioteca',
  analytics: 'Analytics',
  reports: 'Relatórios',
  'new-report': 'Novo Relatório',
  settings: 'Configurações',
  alerts: 'Alertas',
  // Admin routes
  admin: 'Admin',
  clients: 'Clientes',
  'data-leak-alerts': 'Alertas de Vazamento',
  payments: 'Pagamentos',
  plans: 'Planos',
  'saas-metrics': 'Métricas SaaS',
  integrations: 'Integrações',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Skip if we're at root
  if (pathSegments.length === 0) {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === pathSegments.length - 1;

    return { path, label, isLast, segment };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home icon */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={pathSegments[0] === 'admin' ? '/admin' : '/app'} className="flex items-center">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map((item, index) => {
          // Skip the first segment (app or admin) as we already have home icon
          if (index === 0) return null;

          return (
            <span key={item.path} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {item.isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.path}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
