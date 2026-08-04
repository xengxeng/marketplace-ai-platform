"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  subtotalCents: number;
};

type AddressForm = {
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
};

const EMPTY_ADDRESS: AddressForm = {
  recipient: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
  notes: "",
};

const REQUIRED_FIELDS: (keyof AddressForm)[] = ["recipient", "phone", "line1", "city", "province", "postalCode"];

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"address" | "review">("address");
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);

  async function fetchCart() {
    const res = await fetch("/api/cart");
    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error ?? "Unable to load cart.");
    }

    return body as { items?: CartItem[]; totalCents?: number };
  }

  useEffect(() => {
    fetchCart()
      .then((body) => {
        setItems(body.items ?? []);
        setTotalCents(body.totalCents ?? 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load cart."))
      .finally(() => setLoading(false));
  }, []);

  const addressComplete = REQUIRED_FIELDS.every((field) => address[field].trim().length > 0);

  async function handlePlaceOrder() {
    setPlacing(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shippingAddress: address }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Unable to place order.");
      }

      router.push(`/orders/${body.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order.");
      setPlacing(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus-visible:border-red-400/40";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Checkout</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          {step === "address" ? "Where should we deliver?" : "Confirm your order"}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
          Step {step === "address" ? "1" : "2"} of 2
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-zinc-400">Loading order summary…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-400">Your cart is empty — nothing to check out.</p>
        ) : step === "address" ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <input
                value={address.recipient}
                onChange={(event) => setAddress({ ...address, recipient: event.target.value })}
                placeholder="Recipient name"
                className={inputClass}
              />
              <input
                value={address.phone}
                onChange={(event) => setAddress({ ...address, phone: event.target.value })}
                placeholder="Contact number"
                inputMode="tel"
                className={inputClass}
              />
              <input
                value={address.line1}
                onChange={(event) => setAddress({ ...address, line1: event.target.value })}
                placeholder="House / street"
                className={`${inputClass} sm:col-span-2`}
              />
              <input
                value={address.line2}
                onChange={(event) => setAddress({ ...address, line2: event.target.value })}
                placeholder="Barangay / building (optional)"
                className={`${inputClass} sm:col-span-2`}
              />
              <input
                value={address.city}
                onChange={(event) => setAddress({ ...address, city: event.target.value })}
                placeholder="City"
                className={inputClass}
              />
              <input
                value={address.province}
                onChange={(event) => setAddress({ ...address, province: event.target.value })}
                placeholder="Province"
                className={inputClass}
              />
              <input
                value={address.postalCode}
                onChange={(event) => setAddress({ ...address, postalCode: event.target.value })}
                placeholder="Postal code"
                inputMode="numeric"
                className={inputClass}
              />
              <input
                value={address.notes}
                onChange={(event) => setAddress({ ...address, notes: event.target.value })}
                placeholder="Delivery notes (optional)"
                className={inputClass}
              />
            </div>

            <button
              onClick={() => setStep("review")}
              disabled={!addressComplete}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Continue to review
            </button>
          </>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">Qty {item.quantity}</p>
                  </div>
                  <span className="font-medium text-white">{formatPeso(item.subtotalCents)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Deliver to</p>
              <p className="mt-2 text-white">{address.recipient}</p>
              <p className="mt-1 text-zinc-400">
                {address.phone} · {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.province} {address.postalCode}
              </p>
              {address.notes ? <p className="mt-1 text-zinc-500">{address.notes}</p> : null}
              <button
                onClick={() => setStep("address")}
                className="mt-3 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10"
              >
                Edit address
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <p className="text-sm text-zinc-400">Order total</p>
              <p className="text-2xl font-semibold text-white">{formatPeso(totalCents)}</p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {placing ? "Placing order…" : "Place order"}
            </button>
          </>
        )}

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
