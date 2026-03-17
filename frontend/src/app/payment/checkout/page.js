"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ticketApi, ApiError } from "@/lib/api";

export default function PaymentCheckoutPage() {
  const router = useRouter();
  const [checkout, setCheckout] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("payway_checkout");
    if (!raw) {
      router.replace("/events");
      return;
    }
    try {
      setCheckout(JSON.parse(raw));
    } catch {
      router.replace("/events");
    }
  }, [router]);

  const handleVerify = async () => {
    if (!checkout?.paywayTranId) return;
    setError(null);
    setVerifying(true);
    try {
      await ticketApi.verify(checkout.paywayTranId);
      sessionStorage.removeItem("payway_checkout");
      router.push("/payment/success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setError("Payment not confirmed yet. Please complete the payment and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (!checkout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF7927] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const amountDisplay = checkout.amountInCents
    ? `$${(checkout.amountInCents / 100).toFixed(2)}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Complete Payment</h1>
        {amountDisplay && (
          <p className="text-3xl font-bold text-[#FF7927] mb-6">{amountDisplay}</p>
        )}

        {/* QR Code */}
        {checkout.qrImage && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">
              Scan with ABA Mobile Banking to pay
            </p>
            <img
              src={checkout.qrImage}
              alt="ABA Pay QR Code"
              className="w-56 h-56 mx-auto rounded-xl border border-gray-100"
            />
          </div>
        )}

        {/* ABA Pay deeplink (mobile) */}
        {checkout.abapayDeeplink && (
          <a
            href={checkout.abapayDeeplink}
            className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full
              transition-all duration-300 mb-3"
          >
            Open ABA Mobile
          </a>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 mb-3">{error}</p>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full border-2 border-[#FF7927] text-[#FF7927] hover:bg-orange-50 font-semibold py-3 rounded-full
            transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {verifying ? "Verifying..." : "I've Paid — Confirm Ticket"}
        </button>

        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
