import { Bell, Plus, FileText, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';

export const AppNavbar = () => {
  const { user, logout } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const userEmail = user?.email || '';
  const displayName = profile?.full_name || userEmail;
  const userInitial = (profile?.full_name?.charAt(0) || userEmail.charAt(0) || 'U').toUpperCase();

  return (
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
              <DropdownMenuItem onClick={() => navigate('/app/acompanhamentos/novo')}>
                <Radar className="h-4 w-4 mr-2" />
                Novo Acompanhamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/relatorios/novo')}>
                <FileText className="h-4 w-4 mr-2" />
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
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline font-medium truncate max-w-[150px]">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  {profile?.full_name && <span>{profile.full_name}</span>}
                  <span className="truncate text-muted-foreground text-xs">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/configuracoes')}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
  );
};
