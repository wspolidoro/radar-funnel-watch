import { 
  LayoutDashboard, 
  Users, 
  Library, 
  GitBranch, 
  FileText, 
  Settings,
  Building2,
  Inbox,
  BarChart3,
  CreditCard,
  Blocks,
  Crown,
  Shield
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
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';

// Menu items for regular users (admin role)
const userMenuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Remetentes', url: '/senders', icon: Users },
  { title: 'Biblioteca', url: '/library', icon: Library },
  { title: 'Newsletters', url: '/newsletters', icon: Inbox },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Funis', url: '/funnels', icon: GitBranch },
  { title: 'Relatórios', url: '/reports', icon: FileText },
  { title: 'Configurações', url: '/settings', icon: Settings },
];

// Additional menu items for SaaS admin (adminsaas role)
const saasAdminMenuItems = [
  { title: 'Métricas SaaS', url: '/admin/metrics', icon: BarChart3 },
  { title: 'Clientes', url: '/admin/clients', icon: Building2 },
  { title: 'Planos', url: '/admin/plans', icon: Crown },
  { title: 'Pagamentos', url: '/admin/payments', icon: CreditCard },
  { title: 'Integrações', url: '/admin/integrations', icon: Blocks },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const { isAdminSaas, isLoading } = useUserRole();
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
                {isAdminSaas && (
                  <Badge variant="outline" className="text-xs w-fit">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin SaaS
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      end={item.url === '/'}
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

        {/* SaaS Admin Section - Only visible to adminsaas */}
        {isAdminSaas && !isLoading && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Gestão SaaS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {saasAdminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
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
        )}
      </SidebarContent>
    </Sidebar>
  );
};
