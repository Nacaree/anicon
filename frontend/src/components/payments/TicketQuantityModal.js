"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

/**
 * Ticket quantity selector modal — shown when a user clicks "Get Tickets" on a paid event.
 * Lets the user pick how many tickets to buy before proceeding to payment method selection.
 *
 * Props:
 *   open        boolean
 *   onClose     () => void
 *   event       normalized event object (needs event.title, event.ticketPrice,
 *               event.maxCapacity, event.currentAttendance)
 *   onCheckout  (quantity: number) => void  — called when user clicks "Checkout"
 */
export default function TicketQuantityModal({ open, onClose, event, onCheckout }) {
  const [quantity, setQuantity] = useState(1);

  // Calculate how many tickets are still available
  // If maxCapacity is null (uncapped event), allow up to 20 per order
  const remaining =
    event?.maxCapacity != null
      ? event.maxCapacity - (event.currentAttendance ?? 0)
      : 20;
  const maxQty = Math.min(20, Math.max(1, remaining));

  const pricePerTicket = Number(event?.ticketPrice || 0);
  const total = pricePerTicket * quantity;

  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));
  const handleIncrement = () => setQuantity((q) => Math.min(maxQty, q + 1));

  const handleCheckout = () => {
    onCheckout(quantity);
  };

  // Reset quantity when modal opens so stale state doesn't carry over
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setQuantity(1);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Get Tickets</DialogTitle>
        </DialogHeader>

        {/* Order summary — event context so the user knows what they're buying */}
        <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-1">
          <p className="font-semibold text-gray-900 text-base truncate">{event?.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {event?.date}{event?.time ? ` · ${event.time}` : ""}
          </p>
        </div>

        {/* Ticket row with quantity selector */}
        <div className="flex items-center justify-between py-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <p className="font-semibold text-gray-900 text-base truncate">
              {event?.title || "Ticket"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ${pricePerTicket.toFixed(2)} per ticket
            </p>
          </div>

          {/* +/- counter — same pill style as the Eventbrite reference */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleDecrement}
              disabled={quantity <= 1}
              aria-label="Remove one ticket"
              className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center
                text-gray-700 font-semibold text-lg leading-none
                hover:border-[#FF7927] hover:text-[#FF7927] transition-colors duration-150
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-300
                disabled:hover:text-gray-700"
            >
              −
            </button>

            <span className="w-6 text-center text-base font-semibold text-gray-900 tabular-nums">
              {quantity}
            </span>

            <button
              onClick={handleIncrement}
              disabled={quantity >= maxQty}
              aria-label="Add one ticket"
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center
                text-primary-foreground font-semibold text-lg leading-none
                hover:bg-primary/90 transition-colors duration-150
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div className="py-4">
          <div className="flex justify-between items-center text-sm text-gray-500 mb-1.5">
            <span>
              {quantity} × ${pricePerTicket.toFixed(2)}
            </span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center font-bold text-gray-900 text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={quantity < 1 || remaining <= 0}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3.5 text-base rounded-full
            transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]
            active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
            disabled:hover:scale-100 disabled:hover:shadow-none"
        >
          {remaining <= 0 ? "Sold Out" : "Checkout →"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
