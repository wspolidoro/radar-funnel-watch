import { 
  LayoutDashboard,
  Building2,
  BarChart3,
  CreditCard,
  Blocks,
  Crown,
  Shield,
  AlertTriangle,
  Settings,
  Mail,
  Globe,
  FileText,
  Activity,
  HelpCircle
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Saúde do Sistema', url: '/admin/health', icon: Activity },
  { title: 'Métricas SaaS', url: '/admin/metrics', icon: BarChart3 },
  { title: 'Clientes', url: '/admin/clients', icon: Building2 },
  { title: 'Alertas Vazamento', url: '/admin/alerts', icon: AlertTriangle },
  { title: 'Planos', url: '/admin/plans', icon: Crown },
  { title: 'Pagamentos', url: '/admin/payments', icon: CreditCard },
  { title: 'Domínios Plataforma', url: '/admin/domains', icon: Globe },
  { title: 'Logs de Email', url: '/admin/logs', icon: FileText },
  { title: 'Integrações', url: '/admin/integrations', icon: Blocks },
  { title: 'Config. Email', url: '/admin/email-setup', icon: Mail },
  { title: 'Guia Maileroo', url: '/admin/maileroo', icon: HelpCircle },
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
];

export const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RM</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-lg">RadarMail</span>
                <Badge variant="outline" className="text-xs w-fit">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin SaaS
                </Badge>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Gestão SaaS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      end={item.url === '/admin'}
                      className={({ isActive }) =>
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
