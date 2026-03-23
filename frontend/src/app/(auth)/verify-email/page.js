'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { verifyOtp, resendVerification } = useAuth();

  // 6-digit OTP code state
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle single digit input
  const handleDigitChange = (index, value) => {
    // Only allow single digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setVerifyError('');

    // Auto-advance to next input when a digit is entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste — fill all 6 inputs from clipboard
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    setVerifyError('');

    // Focus the input after the last pasted digit
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // Handle backspace — move focus to previous input
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Submit on Enter if all digits are filled
    if (e.key === 'Enter') {
      const code = digits.join('');
      if (code.length === 6) {
        handleVerify();
      }
    }
  };

  // Verify the OTP code
  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== 6 || !email) return;

    setIsVerifying(true);
    setVerifyError('');

    try {
      await verifyOtp(email, code);
      // Force full page reload to commit session cookies before middleware runs
      // (same pattern as login page)
      window.location.href = '/';
    } catch (err) {
      setVerifyError(err.message || 'Invalid or expired code. Please try again.');
      setIsVerifying(false);
    }
  };

  // Resend verification email
  const handleResend = async () => {
    if (!email || countdown > 0) return;

    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      await resendVerification(email);
      setResendSuccess(true);
      setCountdown(60);
      // Clear any old code
      setDigits(['', '', '', '', '', '']);
      setVerifyError('');
      inputRefs.current[0]?.focus();
    } catch (err) {
      setResendError(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const code = digits.join('');
  const isCodeComplete = code.length === 6;

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h2>
        <p className="text-gray-600 mb-1">
          We sent a 6-digit code to
        </p>
        {email && (
          <p className="font-medium text-gray-900 mb-4">{email}</p>
        )}
        <p className="text-gray-500 text-sm">
          Enter the code below to verify your account.
        </p>
      </div>

      {/* 6-digit OTP input */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold border-2 rounded-xl outline-none transition-all ${
              verifyError
                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : digit
                ? 'border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {verifyError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {verifyError}
        </div>
      )}

      {/* Resend success message */}
      {resendSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          New code sent! Check your inbox.
        </div>
      )}

      {/* Resend error message */}
      {resendError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {resendError}
        </div>
      )}

      <div className="space-y-3">
        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={!isCodeComplete || isVerifying || !email}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Verifying...' : 'Verify'}
        </button>

        {/* Resend button */}
        <button
          onClick={handleResend}
          disabled={isResending || countdown > 0 || !email}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending
            ? 'Sending...'
            : countdown > 0
            ? `Resend code in ${countdown}s`
            : 'Resend code'}
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
          <strong>Didn&apos;t receive the code?</strong>
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
