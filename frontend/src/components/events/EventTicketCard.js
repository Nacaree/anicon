"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthGate } from "@/context/AuthGateContext";
import { ticketApi, ApiError } from "@/lib/api";
import PaymentMethodModal from "@/components/payments/PaymentMethodModal";
import StripePaymentModal from "@/components/payments/StripePaymentModal";

export default function EventTicketCard({ event, loading = false }) {
  const { requireAuth } = useAuthGate();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const cardRef = useRef(null);

  // Payment modal state
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripeAmountInCents, setStripeAmountInCents] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-pulse">
          <div className="h-7 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-12 bg-gray-200 rounded-full" />
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // --- Free event: direct RSVP ---
  const handleRsvp = async () => {
    setActionError(null);
    setRsvpLoading(true);
    try {
      await ticketApi.rsvp(event.id);
      setRsvpDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError("You're already going!");
      } else {
        setActionError("Something went wrong. Please try again.");
      }
    } finally {
      setRsvpLoading(false);
    }
  };

  // --- "Get Tickets" / "RSVP" button click ---
  const handleAction = () => {
    requireAuth(() => {
      setActionError(null);
      if (event.isFree) {
        handleRsvp();
      } else {
        // Open the payment method selector first
        setMethodModalOpen(true);
      }
    });
  };

  // --- PaymentMethodModal callbacks ---

  // User picked QR/ABA Pay — use existing PayWay checkout flow
  const handleQrSelected = (purchaseResult) => {
    setMethodModalOpen(false);
    if (purchaseResult.checkoutUrl) {
      // Hosted PayWay checkout — redirect out of the site
      window.location.href = purchaseResult.checkoutUrl;
    } else {
      // QR data returned — store and go to /payment/checkout
      sessionStorage.setItem("payway_checkout", JSON.stringify({
        paywayTranId: purchaseResult.paywayTranId,
        qrImage: purchaseResult.qrImage,
        qrString: purchaseResult.qrString,
        abapayDeeplink: purchaseResult.abapayDeeplink,
        amountInCents: purchaseResult.amountInCents,
      }));
      router.push("/payment/checkout");
    }
  };

  // User picked Card — open embedded Stripe modal
  const handleCardSelected = (clientSecret, amountInCents) => {
    setMethodModalOpen(false);
    setStripeClientSecret(clientSecret);
    setStripeAmountInCents(amountInCents);
    setStripeModalOpen(true);
  };

  // Stripe confirmed payment client-side — ticket will be issued via webhook (~1-2s)
  const handleStripeSuccess = () => {
    setStripeModalOpen(false);
    setStripeClientSecret(null);
    router.push("/payment/success?provider=stripe");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
      }`}
    >
      <h2 className="text-lg font-bold text-gray-900 mb-3">
        Grab Your Tickets
      </h2>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        {/* Price */}
        <p className="text-2xl font-bold text-gray-900 mb-1">
          {event.isFree ? "Free" : `$${Number(event.ticketPrice).toFixed(2)}`}
        </p>

        {/* Date Range */}
        <p className="text-sm text-[#FF7927] font-medium mb-4">
          {event.dateRange}
        </p>

        {/* Error */}
        {actionError && (
          <p className="text-sm text-red-500 mb-3">{actionError}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAction}
            disabled={rsvpLoading || rsvpDone}
            className="flex-1 bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold py-3 rounded-full
              transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
              active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
              disabled:hover:shadow-none"
          >
            {rsvpLoading
              ? "Processing..."
              : rsvpDone
              ? "You're Going! 🎉"
              : event.isFree
              ? "I'm Going"
              : "Get Tickets"}
          </button>

          <button
            onClick={handleCopyLink}
            className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full
              transition-all duration-300 hover:scale-[1.08] active:scale-[0.95]"
          >
            {copied ? (
              <svg
                className="w-5 h-5 text-green-500 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-500 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            )}

            {/* Copied toast */}
            <span
              className={`absolute -top-9 left-1/2 -translate-x-1/2 text-xs font-medium bg-gray-900 text-white px-2.5 py-1 rounded-lg whitespace-nowrap
                transition-all duration-300 ${
                  copied
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none"
                }`}
            >
              Link copied!
            </span>
          </button>
        </div>
      </div>

      {/* Payment method selector — shown when user clicks "Get Tickets" */}
      <PaymentMethodModal
        open={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        event={event}
        onQrSelected={handleQrSelected}
        onCardSelected={handleCardSelected}
      />

      {/* Embedded Stripe card form — shown after user picks "Credit / Debit Card" */}
      <StripePaymentModal
        open={stripeModalOpen}
        onClose={() => {
          setStripeModalOpen(false);
          setStripeClientSecret(null);
        }}
        clientSecret={stripeClientSecret}
        amountInCents={stripeAmountInCents}
        onSuccess={handleStripeSuccess}
      />
    </div>
  );
}
