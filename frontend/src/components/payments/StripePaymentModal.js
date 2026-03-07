"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Separator } from "@/components/ui/separator";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, ShieldCheck } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  {
    developerTools: {
      assistant: {
        enabled: false,
      },
    },
  },
);

function StripeCheckoutForm({ amountInCents, quantity, event, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const amountDisplay = amountInCents
    ? `$${(amountInCents / 100).toFixed(2)}`
    : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    onSuccess();
  };

  // Unit price derived from backend-authoritative cents value
  const unitPriceDollars = amountInCents && quantity ? amountInCents / 100 / quantity : 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Order summary — shows what the user is paying for */}
      <div className="bg-gray-50 rounded-xl px-4 py-3.5">
        <p className="font-semibold text-gray-900 text-base truncate">{event?.title}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {event?.date}{event?.time ? ` · ${event.time}` : ""}
        </p>
        <Separator className="my-3" />
        <div className="flex justify-between text-sm text-gray-500">
          <span>{quantity} × General Admission</span>
          <span>${(unitPriceDollars * quantity).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 mt-1.5">
          <span>Total</span>
          <span>{amountDisplay}</span>
        </div>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold
          py-3.5 rounded-full transition-all duration-300 flex items-center justify-center gap-2
          hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] hover:scale-[1.02]
          active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
          disabled:hover:scale-100 disabled:hover:shadow-none"
      >
        {processing ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay {amountDisplay}
          </>
        )}
      </button>

      <div className="flex items-center justify-end">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          256-bit SSL encrypted
        </span>
      </div>
    </form>
  );
}

export default function StripePaymentModal({
  open,
  onClose,
  clientSecret,
  amountInCents,
  onSuccess,
  event,
  quantity,
}) {
  // Controls the "Leave checkout?" confirmation overlay
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  if (!clientSecret) return null;

  const appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#FF7927",
      colorBackground: "#ffffff",
      colorText: "#111827",
      colorTextSecondary: "#6b7280",
      colorTextPlaceholder: "#9ca3af",
      colorDanger: "#ef4444",
      borderRadius: "12px",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSizeBase: "15px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: "1px solid #e5e7eb",
        boxShadow: "none",
      },
      ".Input:focus": {
        border: "1px solid #FF7927",
        boxShadow: "0 0 0 3px rgba(255, 121, 39, 0.15)",
      },
      ".Tab": {
        border: "1px solid #e5e7eb",
        boxShadow: "none",
      },
      ".Tab:hover": {
        border: "1px solid #FF7927",
      },
      ".Tab--selected": {
        border: "1px solid #FF7927",
        boxShadow: "0 0 0 3px rgba(255, 121, 39, 0.15)",
        color: "#FF7927",
      },
      ".TabIcon--selected": {
        fill: "#FF7927",
      },
      ".TabLabel--selected": {
        color: "#FF7927",
      },
    },
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Intercept dismiss (Escape / backdrop click) — show confirmation instead of
        // immediately closing, since a pending PaymentIntent was already created
        if (!isOpen) setShowLeaveConfirm(true);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Enter Card Details
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-1">Secure payment via Stripe</p>

        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <StripeCheckoutForm
            amountInCents={amountInCents}
            quantity={quantity}
            event={event}
            onSuccess={onSuccess}
            onClose={() => setShowLeaveConfirm(true)}
          />
        </Elements>

        {/* Leave confirmation overlay — shown when user tries to dismiss mid-checkout */}
        {showLeaveConfirm && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-xl
            flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-[#FF7927]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Leave Checkout?</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Your card details will be lost and you'll need to start over.
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 bg-[#FF7927] hover:bg-[#E66B1F] text-white font-semibold
                  py-3 rounded-full transition-all duration-200 hover:scale-[1.02]
                  hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] active:scale-[0.98]"
              >
                Stay
              </button>
              <button
                onClick={() => { setShowLeaveConfirm(false); onClose(); }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold
                  py-3 rounded-full transition-all duration-200 hover:scale-[1.02]
                  hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-[0.98]"
              >
                Leave
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
