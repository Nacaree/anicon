"use client";

import { useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationApi } from "@/lib/api";
import { useNotificationCount } from "@/lib/hooks/useNotificationCount";
import NotificationItem from "./NotificationItem";

/**
 * Bell icon with unread badge + dropdown panel showing recent notifications.
 * Uses Radix Popover for accessibility and dismiss-on-click-outside.
 * Notification data is cached at module level in useNotificationCount —
 * navigating between pages does NOT refetch. Cache TTL is 5 minutes.
 */
export default function NotificationDropdown() {
  const {
    unreadCount, setUnreadCount,
    notifications: wsNotifications,
    fullList, setFullList,
    refetch, fetchFullList, resetNotifications, invalidateCache,
  } = useNotificationCount();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mark a single notification as read — optimistic update
  const handleRead = useCallback(async (notificationId) => {
    setFullList((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    try {
      await notificationApi.markAsRead(notificationId);
      refetch();
    } catch {
      setFullList((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: false } : n))
      );
    }
  }, [refetch, setFullList]);

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    setFullList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
      refetch();
    } catch {
      // Invalidate cache and refetch on error
      invalidateCache();
      await fetchFullList(true);
      refetch();
    }
  }, [refetch, setUnreadCount, setFullList, invalidateCache, fetchFullList]);

  // On open: fetch (uses module-level cache if fresh). On close: no-op.
  const handleOpenChange = useCallback(async (isOpen) => {
    setOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      await fetchFullList();
      setLoading(false);
    }
  }, [fetchFullList]);

  // Combine REST-fetched notifications with any WebSocket arrivals that came in after last fetch
  const displayNotifications = wsNotifications.length > 0
    ? [...wsNotifications, ...fullList.filter((n) => !wsNotifications.some((ws) => ws.type === n.type && ws.targetId === n.targetId))]
    : fullList;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-1rem)] sm:w-[380px] p-0 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading && fullList.length === 0 ? (
            // Skeleton loaders — only show when there's no cached data
            <div className="space-y-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                  <div className="w-2 h-2 mt-2" />
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayNotifications.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
            </div>
          ) : (
            // Notification items
            displayNotifications.map((n, i) => (
              <NotificationItem
                key={`${n.type}-${n.targetId}-${i}`}
                notification={n}
                onRead={handleRead}
                onClose={() => setOpen(false)}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
