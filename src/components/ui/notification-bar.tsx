'use client';

import React from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useNotifications, useMarkNotificationAsRead } from '@/hooks/use-notifications';
import { NotificationType } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBarProps {
  className?: string;
  maxNotifications?: number;
}

export function NotificationBar({ 
  className = '', 
  maxNotifications = 3 
}: NotificationBarProps) {
  const { data: notificationsData, isLoading, error } = useNotifications({
    unread: true,
    limit: maxNotifications,
  });
  
  const markAsRead = useMarkNotificationAsRead();

  // Safely extract notifications with proper fallback and type checking
  const notifications = React.useMemo(() => {
    if (!notificationsData?.data) return [];
    if (!Array.isArray(notificationsData.data)) return [];
    return notificationsData.data;
  }, [notificationsData]);

  if (isLoading || error || notifications.length === 0) {
    return null;
  }

  const handleDismiss = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={() => handleDismiss(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationCardProps {
  notification: any; // Notification with relations
  onDismiss: () => void;
}

function NotificationCard({ notification, onDismiss }: NotificationCardProps) {
  const icon = getNotificationIcon(notification.type);
  const variant = getNotificationVariant(notification.type);
  
  return (
    <Card className={`border-l-4 ${getBorderColor(notification.type)} bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex-shrink-0 ${getIconColor(notification.type)}`}>
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground">
                {notification.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </p>
              
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={variant} className="text-xs">
                  {getNotificationTypeLabel(notification.type)}
                </Badge>
                
                {notification.pdr && (
                  <span className="text-xs text-muted-foreground">
                    FY {notification.pdr.fyLabel}
                  </span>
                )}
                
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0 hover:bg-background/80"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss notification</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'PDR_LOCKED':
      return <AlertCircle className="h-5 w-5" />;
    case 'PDR_SUBMITTED':
      return <CheckCircle className="h-5 w-5" />;
    case 'PDR_REMINDER':
      return <Bell className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
}

function getNotificationVariant(type: NotificationType): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (type) {
    case 'PDR_LOCKED':
      return 'destructive';
    case 'PDR_SUBMITTED':
      return 'default';
    case 'PDR_REMINDER':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getBorderColor(type: NotificationType): string {
  switch (type) {
    case 'PDR_LOCKED':
      return 'border-l-red-500';
    case 'PDR_SUBMITTED':
      return 'border-l-green-500';
    case 'PDR_REMINDER':
      return 'border-l-blue-500';
    default:
      return 'border-l-gray-500';
  }
}

function getIconColor(type: NotificationType): string {
  switch (type) {
    case 'PDR_LOCKED':
      return 'text-red-500';
    case 'PDR_SUBMITTED':
      return 'text-green-500';
    case 'PDR_REMINDER':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
}

function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'PDR_LOCKED':
      return 'Locked';
    case 'PDR_SUBMITTED':
      return 'Submitted';
    case 'PDR_REMINDER':
      return 'Reminder';
    default:
      return 'Notification';
  }
}
