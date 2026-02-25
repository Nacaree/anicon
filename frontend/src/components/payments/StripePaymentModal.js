"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Load Stripe outside of the render cycle to avoid re-instantiation on each render.
// Stripe.js is loaded once and reused.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/**
 * Inner checkout form — must be rendered inside <Elements> to use Stripe hooks.
 *
 * Calls stripe.confirmPayment() with redirect: "if_required".
 * For cards this never redirects — it resolves immediately on the client.
 * On success, calls onSuccess() so the parent can navigate to the success page.
 */
function StripeCheckoutForm({ amountInCents, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const amountDisplay = amountInCents ? `$${(amountInCents / 100).toFixed(2)}` : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    // stripe.confirmPayment talks directly to the Stripe API from the browser.
    // redirect: "if_required" means it only redirects for methods that require it
    // (e.g. some bank redirects). Cards resolve inline — no page navigation.
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    // Payment confirmed on Stripe's side.
    // The payment_intent.succeeded webhook will issue the ticket server-side (~1-2 seconds).
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Stripe's pre-built, PCI-compliant card input */}
      <PaymentElement />

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold
          py-3 rounded-full transition-all duration-300
          hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] hover:scale-[1.02]
          active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
          disabled:hover:scale-100 disabled:hover:shadow-none"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          `Pay ${amountDisplay}`
        )}
      </button>

      <button
        type="button"
        onClick={onClose}
        disabled={processing}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
      >
        Cancel
      </button>
    </form>
  );
}

/**
 * Embedded Stripe payment modal.
 *
 * Opens after the user selects "Credit / Debit Card" in PaymentMethodModal.
 * Renders Stripe Elements (<PaymentElement>) inside the existing Dialog component.
 * The user never leaves the page — stripe.confirmPayment() handles everything in-browser.
 *
 * The ticket is issued asynchronously by the payment_intent.succeeded webhook (~1-2 seconds
 * after onSuccess() fires), so the success page shows a "your ticket will appear shortly" note.
 *
 * Props:
 *   open            boolean
 *   onClose         () => void
 *   clientSecret    string — from PurchaseResponse.stripeClientSecret
 *   amountInCents   number
 *   onSuccess       () => void — called after Stripe confirms payment locally
 */
export default function StripePaymentModal({ open, onClose, clientSecret, amountInCents, onSuccess }) {
  // Don't render the Elements provider until we have a clientSecret
  if (!clientSecret) return null;

  const appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#FF7927",
      colorBackground: "#ffffff",
      colorText: "#111827",
      borderRadius: "12px",
      fontFamily: "inherit",
    },
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Enter Card Details</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-1">
          Secure payment via Stripe
        </p>

        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <StripeCheckoutForm
            amountInCents={amountInCents}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}
