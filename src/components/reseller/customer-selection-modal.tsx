"use client";

import { useEffect, useState } from "react";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address_line: string | null;
  address_city: string | null;
  created_at: string;
};

type Tab = "search" | "create";

export function CustomerSelectionModal({
  open,
  dismissible = true,
  onClose,
  onSelect,
}: {
  open: boolean;
  dismissible?: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => Promise<void> | void;
}) {
  const [tab, setTab] = useState<Tab>("search");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", addressLine: "", addressCity: "" });

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const res = await fetch(`/api/customers${query}`, { signal: controller.signal });
        const body = await res.json();

        if (!res.ok) throw new Error(body.error ?? "Unable to load customers.");

        setCustomers(body.customers ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load customers.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, search]);

  if (!open) return null;

  async function handleCreate() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();

      if (!res.ok) throw new Error(body.error ?? "Unable to create customer.");

      await onSelect(body.customer as Customer);
      setForm({ name: "", phone: "", email: "", addressLine: "", addressCity: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create customer.");
    } finally {
      setSaving(false);
    }
  }

  const createValid = form.name.trim().length >= 2 && form.phone.trim().length >= 7;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-[560px] rounded-t-[1.75rem] border border-white/10 bg-zinc-950/95 p-6 shadow-2xl shadow-red-950/30 sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300">Buying for</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Select a customer</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Every reseller order is attributed to one of your customers before it reaches the cart.
            </p>
          </div>
          {dismissible ? (
            <button
              onClick={onClose}
              aria-label="Close customer selection"
              className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400 transition hover:bg-white/10"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setTab("search")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              tab === "search" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Search existing
          </button>
          <button
            onClick={() => setTab("create")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              tab === "create" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            New customer
          </button>
        </div>

        {tab === "search" ? (
          <div className="mt-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or phone number"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus-visible:border-red-400/40"
            />

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-zinc-400">Loading customers…</p>
              ) : customers.length === 0 ? (
                <div className="text-sm text-zinc-400">
                  No matching customers.{" "}
                  <button
                    onClick={() => {
                      setForm((prev) => ({ ...prev, name: search }));
                      setTab("create");
                    }}
                    className="text-red-300 underline-offset-4 hover:underline"
                  >
                    Create a new customer
                  </button>
                </div>
              ) : (
                customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-white/10 bg-white/5 p-3"
                  >
                    <div>
                      <p className="font-medium text-white">{customer.name}</p>
                      <p className="text-xs text-zinc-400">{customer.phone}</p>
                    </div>
                    <button
                      onClick={() => onSelect(customer)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
                    >
                      Continue as {customer.name.split(" ")[0]}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {(
              [
                ["name", "Name", true],
                ["phone", "Phone number", true],
                ["email", "Email (optional)", false],
                ["addressLine", "Address (optional)", false],
                ["addressCity", "City (optional)", false],
              ] as const
            ).map(([field, label]) => (
              <input
                key={field}
                value={form[field]}
                onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                placeholder={label}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus-visible:border-red-400/40"
              />
            ))}
            <button
              onClick={handleCreate}
              disabled={saving || !createValid}
              className="rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & continue"}
            </button>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>
    </div>
  );
}
