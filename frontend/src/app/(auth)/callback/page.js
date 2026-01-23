'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/lib/api';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    let isCancelled = false;

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const hashParams = typeof window !== 'undefined' ? window.location.hash : '';

        console.log('=== CALLBACK STARTED ===');
        console.log('Code present:', code ? 'YES' : 'NO');
        console.log('Hash present:', hashParams ? 'YES' : 'NO');
        console.log('Full URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');

        // Step 1: Get or establish session
        setStatus('Verifying session...');
        let session = null;

        // PKCE Flow: Exchange code for session
        if (code) {
          console.log('Step 1a: Exchanging code for session (PKCE flow)...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.log('Exchange error:', exchangeError.message);
          } else {
            session = data?.session;
            console.log('Session obtained from code exchange:', !!session);
          }
        }

        // Implicit Flow: Hash contains tokens directly
        // Wait for Supabase to process the hash via onAuthStateChange
        if (!session && hashParams) {
          console.log('Step 1b: Waiting for Supabase to process hash fragment...');

          // Create a promise that resolves when auth state changes
          session = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              unsubscribe();
              resolve(null);
            }, 5000);

            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
              console.log('Auth state changed in callback:', event, !!sess);
              if (sess) {
                clearTimeout(timeout);
                subscription.unsubscribe();
                resolve(sess);
              }
            });

            const unsubscribe = () => subscription.unsubscribe();

            // Also check immediately in case it's already processed
            supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
              if (existingSession) {
                clearTimeout(timeout);
                subscription.unsubscribe();
                resolve(existingSession);
              }
            });
          });
        }

        if (isCancelled) {
          console.log('Cancelled after token processing');
          return;
        }

        // Try to get session if still none
        if (!session) {
          console.log('Step 2: Getting session...');
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          session = existingSession;
          console.log('Session found:', !!session);
        }

        if (!session) {
          throw new Error('Could not establish session. Please try logging in again.');
        }

        console.log('=== SESSION ESTABLISHED ===');
        console.log('User email:', session.user?.email);
        console.log('User ID:', session.user?.id);

        if (isCancelled) return;

        // Step 2: Create profile if metadata exists
        setStatus('Setting up your profile...');
        const metadata = session.user?.user_metadata;
        const username = metadata?.username;
        const displayName = metadata?.display_name;

        console.log('=== USER METADATA ===');
        console.log('Username:', username);
        console.log('Display Name:', displayName);

        if (username) {
          console.log('Step 4: Creating profile...');
          try {
            await authApi.createProfile({
              username,
              displayName: displayName || 'New User'
            });
            console.log('Profile created successfully!');
          } catch (createErr) {
            console.log('Profile creation error:', createErr.message);
            console.log('Profile creation status:', createErr.status);
            console.log('Profile creation data:', createErr.data);
            // Profile might already exist, that's okay
          }
        } else {
          console.log('No username in metadata, skipping profile creation');
        }

        if (isCancelled) return;

        // Step 3: Verify profile exists
        setStatus('Almost done...');
        console.log('Step 5: Fetching user data...');
        try {
          const userData = await authApi.getCurrentUser();
          console.log('User data fetched, profile username:', userData?.profile?.username);
        } catch (fetchErr) {
          console.log('Fetch user error:', fetchErr.message);
          console.log('Fetch user status:', fetchErr.status);
          console.log('Fetch user data:', fetchErr.data);
          // Continue anyway - profile fetch is not critical for redirect
        }

        if (isCancelled) return;

        // Verify session is still valid before redirecting
        console.log('Step 6: Verifying session before redirect...');
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        console.log('Final session check:', !!finalSession);
        console.log('Session access_token exists:', !!finalSession?.access_token);

        if (!finalSession) {
          throw new Error('Session was lost. Please try logging in again.');
        }

        // Step 4: Redirect
        console.log('=== REDIRECTING TO HOME ===');
        router.replace('/');

      } catch (err) {
        if (isCancelled) {
          console.log('Error occurred but cancelled, ignoring');
          return;
        }

        console.error('=== CALLBACK ERROR ===');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Full error:', err);
        setError(err.message || 'An error occurred');
      }
    };

    handleCallback();

    return () => {
      console.log('Callback cleanup - setting isCancelled');
      isCancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>

        <button
          onClick={() => router.push('/login')}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying...</h2>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
