'use client';

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUnreadNotificationCount, useMarkNotificationsAsRead, useNotifications } from '@/hooks/use-notifications';
import { NotificationBar } from '@/components/ui/notification-bar';

export function NotificationIcon() {
  const [open, setOpen] = useState(false);
  const { data: countData } = useUnreadNotificationCount();
  const markAllAsRead = useMarkNotificationsAsRead();
  const { data: allNotificationsData } = useNotifications({
    limit: 50, // Reasonable limit for all notifications
    unread: true,
  });
  
  const unreadCount = countData || 0;
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    // Mark all as read when opening dialog
    if (isOpen && unreadCount > 0 && allNotificationsData?.data) {
      const notificationIds = allNotificationsData.data.map(notification => notification.id);
      if (notificationIds.length > 0) {
        markAllAsRead.mutate(notificationIds);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {allNotificationsData?.data && allNotificationsData.data.length > 0 ? (
            <NotificationBar maxNotifications={50} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
