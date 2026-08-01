"use client";

import { useEffect, useState } from "react";

type Commission = {
  id: string;
  order_id: string;
  reseller_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

type LedgerEntry = {
  id: string;
  profile_id: string;
  entry_type: string;
  amount_cents: number;
  reason: string;
  created_at: string;
};

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  paid: "border-sky-400/30 bg-sky-500/10 text-sky-300",
};

export function FinancePanel() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [commissionsRes, ledgerRes] = await Promise.all([fetch("/api/commissions"), fetch("/api/wallet-ledger")]);
      const commissionsBody = await commissionsRes.json();
      const ledgerBody = await ledgerRes.json();

      if (!commissionsRes.ok) throw new Error(commissionsBody.error ?? "Unable to load commissions.");
      if (!ledgerRes.ok) throw new Error(ledgerBody.error ?? "Unable to load wallet ledger.");

      setCommissions(commissionsBody.commissions ?? []);
      setLedger(ledgerBody.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load finance data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setApprovingId(id);

    try {
      const res = await fetch(`/api/commissions/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Unable to approve commission.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve commission.");
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading finance data…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Commission approvals</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Pending commissions</h2>
          </div>
          <span className="text-xs font-medium text-zinc-500">{commissions.length} total</span>
        </div>

        {commissions.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">
            No commissions yet — these are created automatically when an order is placed through a reseller.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {commissions.map((commission) => (
              <div
                key={commission.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <p className="font-medium text-white">{formatPeso(commission.amount_cents)}</p>
                  <p className="mt-1 text-sm text-zinc-400">Order {commission.order_id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_TONE[commission.status] ?? "border-white/10 text-zinc-300"}`}>
                    {commission.status}
                  </span>
                  {commission.status === "pending" ? (
                    <button
                      onClick={() => approve(commission.id)}
                      disabled={approvingId === commission.id}
                      className="rounded-full border border-emerald-400/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve &amp; credit wallet
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Wallet ledger</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Recent transactions</h2>
          </div>
          <span className="text-xs font-medium text-zinc-500">{ledger.length} entries</span>
        </div>

        {ledger.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">No wallet transactions yet.</p>
        ) : (
          <div className="mt-6 space-y-2">
            {ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3.5">
                <div>
                  <p className="text-sm font-medium text-white capitalize">{entry.entry_type}</p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.reason}</p>
                </div>
                <span className={`text-sm font-medium ${entry.entry_type === "credit" ? "text-emerald-300" : "text-red-300"}`}>
                  {entry.entry_type === "credit" ? "+" : "-"}
                  {formatPeso(entry.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
