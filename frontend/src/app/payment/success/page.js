"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isStripe = searchParams.get("provider") === "stripe";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#FF7927]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">You&apos;re In!</h1>
        <p className="text-gray-500 text-sm mb-6">
          {isStripe
            ? "Payment confirmed! Your ticket will appear in My Tickets within a few seconds."
            : "Your ticket has been issued. See you at the event!"}
        </p>
        <button
          onClick={() => router.push("/events")}
          className="w-full bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold py-3 rounded-full
            transition-all duration-300 hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] mb-3"
        >
          Browse More Events
        </button>
        <button
          onClick={() => router.push("/tickets")}
          className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
        >
          View My Tickets
        </button>
      </div>
    </div>
  );
}

// useSearchParams() requires a Suspense boundary in Next.js App Router
export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  );
}
