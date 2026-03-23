'use client';

import { AuthProvider } from '@/context/AuthContext';
import { AuthGateProvider } from '@/context/AuthGateContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { PostModalProvider } from '@/context/PostModalContext';
import AuthGateModal from '@/components/AuthGateModal';
import GlobalErrorToast from '@/components/GlobalErrorToast';
import GlobalSuccessToast from '@/components/GlobalSuccessToast';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <AuthGateProvider>
        <SidebarProvider>
          <PostModalProvider>
            {children}
            <AuthGateModal />
            <GlobalErrorToast />
            <GlobalSuccessToast />
          </PostModalProvider>
        </SidebarProvider>
      </AuthGateProvider>
    </AuthProvider>
  );
}
