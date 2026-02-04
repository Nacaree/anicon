"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const AuthGateContext = createContext(null);

export function AuthGateProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const openGate = useCallback(() => setIsOpen(true), []);
  const closeGate = useCallback(() => setIsOpen(false), []);

  const requireAuth = useCallback(
    (callback) => {
      if (isAuthenticated) {
        callback();
      } else {
        openGate();
      }
    },
    [isAuthenticated, openGate],
  );

  const value = {
    isOpen,
    openGate,
    closeGate,
    requireAuth,
  };

  return (
    <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const context = useContext(AuthGateContext);
  if (!context) {
    throw new Error("useAuthGate must be used within an AuthGateProvider");
  }
  return context;
}
