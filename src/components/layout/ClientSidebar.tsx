import { 
  LayoutDashboard, 
  Users, 
  Library, 
  GitBranch, 
  FileText, 
  Settings,
  Inbox,
  BarChart3,
  AlertTriangle
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

const clientMenuItems = [
  { title: 'Dashboard', url: '/app', icon: LayoutDashboard },
  { title: 'Remetentes', url: '/app/senders', icon: Users },
  { title: 'Biblioteca', url: '/app/library', icon: Library },
  { title: 'Newsletters', url: '/app/newsletters', icon: Inbox },
  { title: 'Analytics', url: '/app/analytics', icon: BarChart3 },
  { title: 'Funis', url: '/app/funnels', icon: GitBranch },
  { title: 'Relatórios', url: '/app/reports', icon: FileText },
  { title: 'Alertas', url: '/app/alerts', icon: AlertTriangle },
  { title: 'Configurações', url: '/app/settings', icon: Settings },
];

export const ClientSidebar = () => {
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
              <span className="font-semibold text-lg">RadarMail</span>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clientMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      end={item.url === '/app'}
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
