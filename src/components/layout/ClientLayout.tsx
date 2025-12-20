import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClientSidebar } from './ClientSidebar';
import { AppNavbar } from './AppNavbar';
import { Breadcrumbs } from './Breadcrumbs';

export const ClientLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-4 gap-4">
            <SidebarTrigger className="transition-transform duration-200 hover:scale-110" />
            <Breadcrumbs />
            <AppNavbar />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
