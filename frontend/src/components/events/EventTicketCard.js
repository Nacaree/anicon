"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { ticketApi, ApiError, getCachedEvent, updateCachedEvent } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaymentMethodModal from "@/components/payments/PaymentMethodModal";
import StripePaymentModal from "@/components/payments/StripePaymentModal";
import TicketQuantityModal from "@/components/payments/TicketQuantityModal";

export default function EventTicketCard({ event, loading = false }) {
  // isLoading: auth not yet resolved. isAuthenticated: user is logged in.
  // Both are needed to know when it's safe to fire the status fetch with a cached token.
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthGate();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [cancelRsvpLoading, setCancelRsvpLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  // How many non-cancelled tickets this user holds for this event (paid events).
  // Fetched on mount when authenticated; stays 0 for guests or on fetch error.
  const [ticketCount, setTicketCount] = useState(0);
  // True while the eventStatus fetch is in flight (or auth is still resolving).
  // Used to show a skeleton placeholder so the card height doesn't jump when the badge appears.
  const [statusLoading, setStatusLoading] = useState(true);
  const cardRef = useRef(null);

  // Payment modal state
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripeAmountInCents, setStripeAmountInCents] = useState(null);
  // Stored so we can cancel the pending PaymentIntent if the user leaves checkout
  const [stripeTransactionId, setStripeTransactionId] = useState(null);

  // Register a beforeunload guard while Stripe checkout is open.
  // This catches tab close / refresh / external navigation — the modal's own
  // leave-confirm overlay handles in-app dismiss (Escape, backdrop, Cancel).
  useEffect(() => {
    if (!stripeModalOpen) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = ""; // Required for Chrome to show the native dialog
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stripeModalOpen]);

  // Fetch personalized ticket/RSVP status.
  //
  // Strategy: fire immediately on mount using bestEffortAuth (synchronous cached-token-only path).
  // This means:
  //   - If the user navigated from another page (token already cached): request fires instantly
  //     WITH the user's token → gets real data in ~7ms.
  //   - If the user landed via direct URL (token not yet cached): request fires instantly
  //     WITHOUT a token → backend returns zeros (same as guest) → UI shows defaults.
  //
  // Re-fires when isAuthenticated flips to true so direct-URL visitors who land on the page
  // before auth resolves eventually get their real ticket count once the token is cached.
  // The [isAuthenticated] dep causes exactly one re-fire (false → true) — not a loop.
  useEffect(() => {
    if (!event?.id) return;
    ticketApi
      .eventStatus(event.id)
      .then((status) => {
        // Pre-populate rsvpDone so "You're Going!" shows on first render, not just after clicking
        if (status.hasRsvp) setRsvpDone(true);
        if (status.ticketCount > 0) setTicketCount(status.ticketCount);
      })
      .catch(() => {}) // Network error — default state is safe
      .finally(() => setStatusLoading(false));
  }, [event?.id, isAuthenticated]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
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
      // Optimistic cache update: increment cached attendance so the events page shows
      // the updated "want to go" count when the user navigates back — even before the
      // next poll fires. Reads from the raw cached object because the cache stores
      // backend field names (currentAttendance), not the normalized wantToGoCount.
      const cached = getCachedEvent(event.id);
      if (cached) {
        updateCachedEvent(event.id, {
          currentAttendance: (cached.currentAttendance || 0) + 1,
        });
      }
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

  // --- Free event: cancel RSVP (called from confirmation modal) ---
  const handleCancelRsvp = async () => {
    setActionError(null);
    setCancelRsvpLoading(true);
    try {
      await ticketApi.cancelRsvp(event.id);
      setCancelModalOpen(false);
      setRsvpDone(false);
      // Optimistic cache update: decrement attendance so the events list reflects the change
      // before the next 30s poll fires.
      const cached = getCachedEvent(event.id);
      if (cached) {
        updateCachedEvent(event.id, {
          currentAttendance: Math.max((cached.currentAttendance || 0) - 1, 0),
        });
      }
    } catch {
      setActionError("Couldn't cancel RSVP. Please try again.");
    } finally {
      setCancelRsvpLoading(false);
    }
  };

  // --- "Get Tickets" / "RSVP" button click ---
  const handleAction = () => {
    requireAuth(() => {
      setActionError(null);
      if (event.isFree) {
        handleRsvp();
      } else {
        // Open quantity selector first, then payment method modal
        setQuantityModalOpen(true);
      }
    });
  };

  // --- TicketQuantityModal callback — user confirmed quantity, move to payment method ---
  const handleQuantityCheckout = (qty) => {
    setSelectedQuantity(qty);
    setQuantityModalOpen(false);
    setMethodModalOpen(true);
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
      sessionStorage.setItem(
        "payway_checkout",
        JSON.stringify({
          paywayTranId: purchaseResult.paywayTranId,
          qrImage: purchaseResult.qrImage,
          qrString: purchaseResult.qrString,
          abapayDeeplink: purchaseResult.abapayDeeplink,
          amountInCents: purchaseResult.amountInCents,
        }),
      );
      router.push("/payment/checkout");
    }
  };

  // User picked Card — open embedded Stripe modal
  const handleCardSelected = (clientSecret, amountInCents, transactionId) => {
    setMethodModalOpen(false);
    setStripeClientSecret(clientSecret);
    setStripeAmountInCents(amountInCents);
    setStripeTransactionId(transactionId);
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
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
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

        {/* Ticket ownership badge — shown once status resolves and user has tickets.
            No skeleton: the card stays at its natural size for users without tickets.
            The fade + slide animation makes the growth smooth for users who do have tickets. */}
        {!event.isFree && !statusLoading && ticketCount > 0 && (
          <div
            className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-2.5 mb-3
            animate-in fade-in slide-in-from-top-1 duration-300"
          >
            <svg
              className="w-4 h-4 text-green-600 shrink-0"
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
            <p className="text-sm text-green-700 font-medium">
              You have {ticketCount} ticket{ticketCount !== 1 ? "s" : ""} for
              this event
            </p>
          </div>
        )}

        {/* Error */}
        {actionError && (
          <p className="text-sm text-red-500 mb-3">{actionError}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* When the user has RSVPed a free event, swap the primary button for a cancel button.
              Rose pill style matches the "Not Going" chip on the tickets page. */}
          {event.isFree && rsvpDone ? (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="flex-1 bg-rose-100 text-rose-600 hover:bg-rose-200 font-semibold py-3 rounded-full
                hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Not Going
            </button>
          ) : (
            <button
              onClick={handleAction}
              disabled={rsvpLoading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
                active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                disabled:hover:shadow-none"
            >
              {rsvpLoading
                ? "Processing..."
                : event.isFree
                  ? "I'm Going"
                  : "Get Tickets"}
            </button>
          )}

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

      {/* Cancel RSVP confirmation — opens when user clicks "Cancel RSVP" on a free event */}
      <Dialog
        open={cancelModalOpen}
        onOpenChange={(open) => { if (!cancelRsvpLoading) setCancelModalOpen(open); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Not going ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            You&apos;ll be removed from the guest list for now. You can always return later.
          </p>
          {actionError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {actionError}
            </p>
          )}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelRsvpLoading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.02]
                hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)] active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Stay on the list
            </button>
            <button
              onClick={handleCancelRsvp}
              disabled={cancelRsvpLoading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-full
                transition-all duration-300 hover:scale-[1.02]
                hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-[0.98]
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {cancelRsvpLoading ? "Removing..." : "I'm not going"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity selector — first step for paid events */}
      <TicketQuantityModal
        open={quantityModalOpen}
        onClose={() => setQuantityModalOpen(false)}
        event={event}
        onCheckout={handleQuantityCheckout}
      />

      {/* Payment method selector — shown after user picks quantity */}
      <PaymentMethodModal
        open={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        event={event}
        quantity={selectedQuantity}
        onQrSelected={handleQrSelected}
        onCardSelected={handleCardSelected}
      />

      {/* Embedded Stripe card form — shown after user picks "Credit / Debit Card" */}
      <StripePaymentModal
        open={stripeModalOpen}
        onClose={() => {
          setStripeModalOpen(false);
          setStripeClientSecret(null);
          // Best-effort cancel — fire-and-forget, don't await or surface errors.
          // Cancels the Stripe PaymentIntent and marks the DB transaction cancelled.
          // If the request fails, Stripe auto-expires the PI after 24h anyway.
          if (stripeTransactionId) {
            ticketApi.cancelStripe(stripeTransactionId).catch(() => {});
            setStripeTransactionId(null);
          }
        }}
        clientSecret={stripeClientSecret}
        amountInCents={stripeAmountInCents}
        onSuccess={handleStripeSuccess}
        event={event}
        quantity={selectedQuantity}
      />
    </div>
  );
}
