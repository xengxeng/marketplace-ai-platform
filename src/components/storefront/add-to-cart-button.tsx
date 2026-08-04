"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CustomerSelectionModal, type Customer } from "@/components/reseller/customer-selection-modal";

export function AddToCartButton({ productId, inStock }: { productId: string; inStock: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "added" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  // The API is the authority on whether this add needs a customer attached: a
  // reseller's first add of a cart session comes back as `customer_required`,
  // which opens the picker and then retries. Subsequent adds reuse the cart's
  // already-attached customer, so the picker does not reopen.
  async function addToCart(customerId?: string) {
    setState("loading");
    setMessage("");

    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1, customerId }),
    });

    const body = await res.json();

    if (res.status === 401) {
      router.push("/auth");
      return;
    }

    if (body.code === "customer_required") {
      setState("idle");
      setPickerOpen(true);
      return;
    }

    if (!res.ok) {
      setState("error");
      setMessage(body.error ?? "Unable to add to cart.");
      return;
    }

    setState("added");
    setPickerOpen(false);
    setTimeout(() => setState("idle"), 2000);
  }

  async function handleClick() {
    try {
      await addToCart();
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Unable to add to cart.");
    }
  }

  async function handleSelect(customer: Customer) {
    try {
      await addToCart(customer.id);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Unable to add to cart.");
    }
  }

  if (!inStock) {
    return <span className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-500">Out of stock</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className={`rounded-full border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
          state === "added"
            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 text-zinc-300 hover:bg-white/10"
        }`}
      >
        {state === "loading" ? "Adding…" : state === "added" ? "Added to cart ✓" : "Add to cart"}
      </button>
      {message ? <span className="text-xs text-red-300">{message}</span> : null}

      <CustomerSelectionModal
        open={pickerOpen}
        dismissible
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
      />
    </div>
  );
}
