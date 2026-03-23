"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useAuth } from "@/context/AuthContext";
import { notificationApi, getCachedToken, getApiBaseUrl } from "@/lib/api";

// Module-level cache — survives component remounts (page navigations)
let _cachedNotifications = [];
let _cachedUnreadCount = 0;
let _cachedFullList = [];       // REST-fetched notification list
let _cachedFullListAt = null;   // Timestamp of last REST fetch
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Real-time notification hook using STOMP over WebSocket.
 * Connects to /ws with JWT auth, subscribes to /user/queue/notifications.
 * Falls back to polling every 30s if WebSocket fails to connect.
 * Module-level cache prevents refetching on page navigation.
 * Returns { unreadCount, notifications, cachedFullList, refetch, resetNotifications, fetchFullList }.
 */
export function useNotificationCount() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(_cachedUnreadCount);
  // Real-time notifications received via WebSocket — newest first
  const [notifications, setNotifications] = useState(_cachedNotifications);
  const [fullList, setFullList] = useState(_cachedFullList);
  const clientRef = useRef(null);
  const pollingRef = useRef(null);
  const wsConnectedRef = useRef(false);

  // Fetch unread count from REST (used on initial load and as polling fallback)
  const fetchCount = useCallback(async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      const count = data.unreadCount ?? 0;
      _cachedUnreadCount = count;
      setUnreadCount(count);
    } catch {
      // Silently ignore — non-critical
    }
  }, []);

  // Fetch full notification list with module-level caching
  const fetchFullList = useCallback(async (force = false) => {
    // Use cache if fresh enough
    if (!force && _cachedFullListAt && Date.now() - _cachedFullListAt < CACHE_TTL_MS && _cachedFullList.length > 0) {
      setFullList(_cachedFullList);
      return _cachedFullList;
    }
    try {
      const data = await notificationApi.getNotifications();
      _cachedFullList = data || [];
      _cachedFullListAt = Date.now();
      setFullList(_cachedFullList);
      // Reset WebSocket queue since REST data is now the source of truth
      _cachedNotifications = [];
      setNotifications([]);
      return _cachedFullList;
    } catch (err) {
      console.error("Failed to load notifications:", err);
      return _cachedFullList;
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
            // Increment unread count and prepend to list, syncing to module cache
            _cachedUnreadCount += 1;
            _cachedNotifications = [notification, ..._cachedNotifications];
            setUnreadCount(_cachedUnreadCount);
            setNotifications(_cachedNotifications);
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

      onWebSocketError: (event) => {
        console.warn("WebSocket connection failed:", event);
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
    _cachedNotifications = fresh || [];
    setNotifications(_cachedNotifications);
  }, []);

  // Sync setUnreadCount to module cache
  const setUnreadCountCached = useCallback((val) => {
    const newVal = typeof val === "function" ? val(_cachedUnreadCount) : val;
    _cachedUnreadCount = newVal;
    setUnreadCount(newVal);
  }, []);

  // Update full list cache (used by dropdown for optimistic updates)
  const setFullListCached = useCallback((updater) => {
    const newList = typeof updater === "function" ? updater(_cachedFullList) : updater;
    _cachedFullList = newList;
    setFullList(newList);
  }, []);

  // Invalidate the full list cache (e.g., after mark-all-read error)
  const invalidateCache = useCallback(() => {
    _cachedFullListAt = null;
  }, []);

  return {
    unreadCount,
    setUnreadCount: setUnreadCountCached,
    notifications,
    fullList,
    setFullList: setFullListCached,
    refetch: fetchCount,
    fetchFullList,
    resetNotifications,
    invalidateCache,
  };
}
