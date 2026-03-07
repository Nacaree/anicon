"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ticketApi, ApiError } from "@/lib/api";

/**
 * Payment method selector modal — shown when a user clicks "Get Tickets" on a paid event.
 *
 * Presents two options:
 *   1. QR Code / ABA Pay  → calls PayWay, redirects to external QR page (existing flow)
 *   2. Credit / Debit Card → calls Stripe, opens StripePaymentModal (stays on site)
 *
 * Props:
 *   open            boolean
 *   onClose         () => void
 *   event           normalized event object (needs event.id, event.ticketPrice)
 *   quantity        number — how many tickets to purchase (default 1)
 *   onQrSelected    (purchaseResult) => void  — called with full PayWay purchase result
 *   onCardSelected  (clientSecret, amountInCents, transactionId) => void  — called with Stripe data
 */
export default function PaymentMethodModal({ open, onClose, event, quantity = 1, onQrSelected, onCardSelected }) {
  const [loading, setLoading] = useState(null); // "qr" | "card" | null
  const [error, setError] = useState(null);

  const handleSelect = async (method) => {
    setError(null);
    setLoading(method);
    try {
      const result = await ticketApi.purchase(event.id, method === "qr" ? "aba_pay" : "card", quantity);
      if (result.paymentProvider === "stripe") {
        // Pass transactionId so EventTicketCard can cancel it if the user leaves checkout
        onCardSelected(result.stripeClientSecret, result.amountInCents, result.transactionId);
      } else {
        onQrSelected(result);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("This event is sold out.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !loading) onClose();
  };

  const unitPrice = Number(event?.ticketPrice || 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Choose Payment Method</DialogTitle>
        </DialogHeader>

        {/* Order summary — event context + price breakdown */}
        <div className="bg-gray-50 rounded-xl px-4 py-3.5 -mt-1">
          <p className="font-semibold text-gray-900 text-base truncate">{event?.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {event?.date}{event?.time ? ` · ${event.time}` : ""}
          </p>
          <Separator className="my-3" />
          <div className="flex justify-between text-sm text-gray-500">
            <span>{quantity} × General Admission</span>
            <span>${(unitPrice * quantity).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 mt-1.5">
            <span>Total</span>
            <span>${(unitPrice * quantity).toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 mt-1">
          {/* QR / ABA Pay */}
          <button
            onClick={() => handleSelect("qr")}
            disabled={!!loading}
            className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl
              hover:border-[#FF7927] hover:bg-orange-50 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed text-left group"
          >
            <div className="w-12 h-12 bg-orange-100 group-hover:bg-orange-200 rounded-xl
              flex items-center justify-center flex-shrink-0 transition-colors duration-200">
              <svg className="w-6 h-6 text-[#FF7927]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01
                     M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5
                     a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5
                     a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-base">
                {loading === "qr" ? "Loading..." : "QR Code / ABA Pay"}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">ABA Pay, KHQR — redirects to scan &amp; pay</p>
            </div>
            {loading === "qr" && (
              <svg className="w-5 h-5 text-[#FF7927] animate-spin flex-shrink-0"
                fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </button>

          {/* Credit / Debit Card */}
          <button
            onClick={() => handleSelect("card")}
            disabled={!!loading}
            className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl
              hover:border-[#FF7927] hover:bg-orange-50 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl
              flex items-center justify-center flex-shrink-0 transition-colors duration-200">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-base">
                {loading === "card" ? "Loading..." : "Credit / Debit Card"}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">Visa, Mastercard — pay without leaving this page</p>
            </div>
            {loading === "card" && (
              <svg className="w-5 h-5 text-[#FF7927] animate-spin flex-shrink-0"
                fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
