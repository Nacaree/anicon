"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ticketApi, ApiError } from "@/lib/api";

// Handles the return_url redirect from PayWay after hosted checkout.
// PayWay appends tran_id as a query param: /payment/verify?tran_id=T...
function PaymentVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "failed"
  const [error, setError] = useState(null);

  useEffect(() => {
    const tranId = searchParams.get("tran_id");
    if (!tranId) {
      setStatus("failed");
      setError("No transaction ID found. Please contact support.");
      return;
    }

    ticketApi.verify(tranId)
      .then(() => {
        sessionStorage.removeItem("payway_checkout");
        setStatus("success");
        setTimeout(() => router.push("/payment/success"), 2000);
      })
      .catch((err) => {
        setStatus("failed");
        if (err instanceof ApiError && err.status === 402) {
          setError("Payment was not confirmed. If you believe this is an error, please contact support.");
        } else {
          setError("Verification failed. Please try again or contact support.");
        }
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
        {status === "verifying" && (
          <>
            <div className="w-12 h-12 border-4 border-[#FF7927] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Verifying your payment...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Payment Confirmed!</h1>
            <p className="text-sm text-gray-500">Redirecting to your ticket...</p>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <button
              onClick={() => router.push("/events")}
              className="w-full bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold py-3 rounded-full transition-all duration-300"
            >
              Back to Events
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense>
      <PaymentVerifyContent />
    </Suspense>
  );
}
