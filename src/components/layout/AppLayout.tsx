import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';
import { useDataLeakNotifications } from '@/hooks/useDataLeakNotifications';

export const AppLayout = () => {
  // Enable real-time data leak notifications
  useDataLeakNotifications();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full">
          <AppNavbar />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
