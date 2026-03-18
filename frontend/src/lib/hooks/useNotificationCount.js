"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useAuth } from "@/context/AuthContext";
import { notificationApi, getCachedToken, getApiBaseUrl } from "@/lib/api";

/**
 * Real-time notification hook using STOMP over WebSocket.
 * Connects to /ws with JWT auth, subscribes to /user/queue/notifications.
 * Falls back to polling every 30s if WebSocket fails to connect.
 * Returns { unreadCount, notifications, refetch, resetNotifications }.
 */
export function useNotificationCount() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  // Real-time notifications received via WebSocket — newest first
  const [notifications, setNotifications] = useState([]);
  const clientRef = useRef(null);
  const pollingRef = useRef(null);
  const wsConnectedRef = useRef(false);

  // Fetch unread count from REST (used on initial load and as polling fallback)
  const fetchCount = useCallback(async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silently ignore — non-critical
    }
  }, []);

  // Start polling as a fallback when WebSocket isn't connected
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(fetchCount, 30000);
  }, [fetchCount]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    // Fetch initial count immediately
    fetchCount();

    const token = getCachedToken();
    if (!token) {
      // No token yet — fall back to polling until token is available
      startPolling();
      return () => stopPolling();
    }

    // Build WebSocket URL from the API base URL
    const baseUrl = getApiBaseUrl();
    // Convert http(s) to ws(s)
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";

    // Create STOMP client with auto-reconnect
    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      // Reconnect every 5 seconds if disconnected
      reconnectDelay: 5000,
      // No heartbeat from client — server manages timeouts
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        wsConnectedRef.current = true;
        // Stop polling — WebSocket is handling it now
        stopPolling();

        // Subscribe to user-specific notification queue
        client.subscribe("/user/queue/notifications", (message) => {
          try {
            const notification = JSON.parse(message.body);
            // Increment unread count and prepend to list
            setUnreadCount((prev) => prev + 1);
            setNotifications((prev) => [notification, ...prev]);
          } catch (e) {
            console.error("Failed to parse notification:", e);
          }
        });
      },

      onDisconnect: () => {
        wsConnectedRef.current = false;
        // Fall back to polling when WebSocket disconnects
        startPolling();
      },

      onStompError: (frame) => {
        console.warn("STOMP error:", frame.headers?.message);
        wsConnectedRef.current = false;
        startPolling();
      },

      onWebSocketError: () => {
        wsConnectedRef.current = false;
        startPolling();
      },
    });

    clientRef.current = client;
    client.activate();

    // Pause/resume on tab visibility change
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Don't disconnect WebSocket — it's lightweight. Just stop polling if active.
        stopPolling();
      } else {
        // Refetch count on tab focus in case notifications were missed
        fetchCount();
        if (!wsConnectedRef.current) {
          startPolling();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopPolling();
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      wsConnectedRef.current = false;
    };
  }, [isAuthenticated, fetchCount, startPolling, stopPolling]);

  // Reset notifications list (e.g., when dropdown fetches fresh data from REST)
  const resetNotifications = useCallback((fresh) => {
    setNotifications(fresh || []);
  }, []);

  return { unreadCount, setUnreadCount, notifications, refetch: fetchCount, resetNotifications };
}
