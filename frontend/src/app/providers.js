'use client';

import { AuthProvider } from '@/context/AuthContext';
import { AuthGateProvider } from '@/context/AuthGateContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { PostModalProvider } from '@/context/PostModalContext';
import AuthGateModal from '@/components/AuthGateModal';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <AuthGateProvider>
        <SidebarProvider>
          <PostModalProvider>
            {children}
            <AuthGateModal />
          </PostModalProvider>
        </SidebarProvider>
      </AuthGateProvider>
    </AuthProvider>
  );
}
