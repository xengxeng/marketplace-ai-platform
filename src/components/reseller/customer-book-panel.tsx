"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomerSelectionModal, type Customer } from "@/components/reseller/customer-selection-modal";

export function CustomerBookPanel() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/customers");
      const body = await res.json();

      if (!res.ok) throw new Error(body.error ?? "Unable to load customers.");

      setCustomers(body.customers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Customer book</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Your customers</h2>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Add customer
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading customers…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      ) : customers.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">Add your first customer to start selling on their behalf.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div>
                <p className="font-medium text-white">{customer.name}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {customer.phone}
                  {customer.address_city ? ` · ${customer.address_city}` : ""}
                </p>
              </div>
              <span className="text-xs text-zinc-500">
                Added {new Date(customer.created_at).toLocaleDateString("en-PH")}
              </span>
            </div>
          ))}
        </div>
      )}

      <CustomerSelectionModal
        open={addOpen}
        dismissible
        onClose={() => setAddOpen(false)}
        onSelect={async () => {
          setAddOpen(false);
          await load();
        }}
      />
    </div>
  );
}
