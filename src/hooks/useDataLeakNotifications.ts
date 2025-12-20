import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export const useDataLeakNotifications = () => {
  const { user } = useAuth();

  const showNotification = useCallback((alert: {
    from_email: string;
    actual_domain: string;
    severity: string | null;
  }) => {
    const severity = alert.severity || 'warning';
    const title = severity === 'critical' 
      ? '🚨 Vazamento Crítico Detectado!' 
      : '⚠️ Possível Vazamento Detectado';
    
    toast.error(title, {
      description: `Email de ${alert.from_email} recebido de domínio inesperado: ${alert.actual_domain}`,
      duration: 10000,
      action: {
        label: 'Ver Detalhes',
        onClick: () => {
          window.location.href = '/senders';
        }
      }
    });

    // Also show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: `Email de ${alert.from_email} recebido de domínio inesperado: ${alert.actual_domain}`,
        icon: '/favicon.ico',
        tag: 'data-leak-alert'
      });
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Request notification permission on mount
    requestNotificationPermission();

    // Subscribe to real-time data leak alerts
    const channel = supabase
      .channel('data-leak-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'data_leak_alerts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newAlert = payload.new as {
            from_email: string;
            actual_domain: string;
            severity: string | null;
          };
          showNotification(newAlert);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showNotification, requestNotificationPermission]);

  return {
    requestNotificationPermission
  };
};
