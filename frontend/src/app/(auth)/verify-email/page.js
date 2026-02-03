'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { resendVerification } = useAuth();

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!email || countdown > 0) return;

    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      await resendVerification(email);
      setResendSuccess(true);
      setCountdown(60); // 60 second cooldown
    } catch (err) {
      setResendError(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-600 mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="font-medium text-gray-900 mb-4">{email}</p>
        )}
        <p className="text-gray-500 text-sm">
          Click the link in the email to verify your account and complete signup.
        </p>
      </div>

      {resendSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          Verification email sent! Check your inbox.
        </div>
      )}

      {resendError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {resendError}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleResend}
          disabled={isResending || countdown > 0 || !email}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending
            ? 'Sending...'
            : countdown > 0
            ? `Resend in ${countdown}s`
            : 'Resend verification email'}
        </button>

        <Link
          href="/signup"
          className="block w-full text-center text-gray-600 hover:text-gray-800 font-medium py-2 transition-colors"
        >
          Use a different email
        </Link>

        <Link
          href="/login"
          className="block w-full text-center text-orange-500 hover:text-orange-600 font-medium py-2 transition-colors"
        >
          Back to login
        </Link>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Didn&apos;t receive the email?</strong>
        </p>
        <ul className="text-sm text-gray-500 mt-2 space-y-1">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email</li>
          <li>Wait a few minutes and try resending</li>
        </ul>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center p-8">Loading verification details...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}