'use client';

import { AuthProvider } from '@/context/AuthContext';
import { AuthGateProvider } from '@/context/AuthGateContext';
import AuthGateModal from '@/components/AuthGateModal';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <AuthGateProvider>
        {children}
        <AuthGateModal />
      </AuthGateProvider>
    </AuthProvider>
  );
}
