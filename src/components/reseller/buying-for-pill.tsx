"use client";

import { useState } from "react";
import { CustomerSelectionModal, type Customer } from "@/components/reseller/customer-selection-modal";

export type ForCustomer = { id: string; name: string; phone: string };

// Re-attributing a cart never clears its line items (Module 12, rule 8).
export function BuyingForPill({
  forCustomer,
  onChanged,
}: {
  forCustomer: ForCustomer | null;
  onChanged: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  if (!forCustomer) return null;

  async function handleSelect(customer: Customer) {
    setError("");

    try {
      const res = await fetch("/api/cart/customer", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      });
      const body = await res.json();

      if (!res.ok) throw new Error(body.error ?? "Unable to change customer.");

      setOpen(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change customer.");
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-1.5 text-sm text-red-100">
        Buying for: {forCustomer.name} · {forCustomer.phone}
      </span>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
      >
        Change
      </button>
      {error ? <span className="text-sm text-red-300">{error}</span> : null}

      <CustomerSelectionModal open={open} dismissible onClose={() => setOpen(false)} onSelect={handleSelect} />
    </div>
  );
}
