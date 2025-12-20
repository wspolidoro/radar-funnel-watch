import { Bell, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AppNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userEmail = user?.email || '';
  const userInitial = userEmail.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-4">
      <SidebarTrigger />
      
      <div className="flex-1 flex items-center justify-between">
        {/* Organization name */}
        <div className="flex items-center gap-2">
          <span className="font-medium">RadarMail</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Quick actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/competitors/new')}>
                Novo Concorrente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/reports/new')}>
                Novo Relatório
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {userInitial}
                  </span>
                </div>
                <span className="hidden md:inline font-medium truncate max-w-[150px]">{userEmail}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="truncate">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
