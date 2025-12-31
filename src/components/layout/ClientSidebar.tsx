import { 
  LayoutDashboard, 
  Users, 
  Inbox, 
  GitBranch, 
  FileText, 
  Settings,
  BarChart3,
  AlertTriangle,
  Radar,
  ChevronDown,
  Eye
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const acompanhamentosSubItems = [
  { title: 'Visão Geral', url: '/app/acompanhamentos', icon: Eye },
  { title: 'Remetentes', url: '/app/acompanhamentos/remetentes', icon: Users },
  { title: 'Newsletters', url: '/app/acompanhamentos/newsletters', icon: Inbox },
  { title: 'Funis', url: '/app/acompanhamentos/funis', icon: GitBranch },
  { title: 'Analytics', url: '/app/acompanhamentos/analytics', icon: BarChart3 },
];

const mainMenuItems = [
  { title: 'Dashboard', url: '/app', icon: LayoutDashboard },
];

const bottomMenuItems = [
  { title: 'Relatórios', url: '/app/relatorios', icon: FileText },
  { title: 'Alertas', url: '/app/alertas', icon: AlertTriangle },
  { title: 'Configurações', url: '/app/configuracoes', icon: Settings },
];

export const ClientSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  // Check if any acompanhamentos route is active
  const isAcompanhamentosActive = location.pathname.startsWith('/app/acompanhamentos');

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
              {/* Dashboard */}
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      end
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

              {/* Acompanhamentos - Collapsible */}
              <Collapsible defaultOpen={isAcompanhamentosActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={cn(
                      "w-full justify-between",
                      isAcompanhamentosActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}>
                      <div className="flex items-center gap-2">
                        <Radar className="h-4 w-4" />
                        <span>Acompanhamentos</span>
                      </div>
                      {!collapsed && (
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-4 border-l border-sidebar-border pl-2 mt-1">
                      {acompanhamentosSubItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink 
                              to={item.url}
                              end={item.url === '/app/acompanhamentos'}
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
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Bottom items */}
              {bottomMenuItems.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  );
};
