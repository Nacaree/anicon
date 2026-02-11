'use client';

import { AuthProvider } from '@/context/AuthContext';
import { AuthGateProvider } from '@/context/AuthGateContext';
import { SidebarProvider } from '@/context/SidebarContext';
import AuthGateModal from '@/components/AuthGateModal';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <AuthGateProvider>
        <SidebarProvider>
          {children}
          <AuthGateModal />
        </SidebarProvider>
      </AuthGateProvider>
    </AuthProvider>
  );
}
