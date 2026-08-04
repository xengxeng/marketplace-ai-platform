"use client";

import { useCallback, useEffect, useState } from "react";

type Reseller = {
  id: string;
  full_name: string;
  phone_number: string;
  verification_status: string;
  review_note: string | null;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-400/30 bg-red-500/10 text-red-300",
  resubmission_required: "border-amber-400/40 bg-amber-500/15 text-amber-200",
};

export function ResellerApprovalPanel() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/resellers");
      const body = await res.json();

      if (!res.ok) throw new Error(body.error ?? "Unable to load resellers.");

      setResellers(body.resellers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load resellers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, status: string) {
    setUpdatingId(id);
    setError("");

    try {
      const res = await fetch(`/api/resellers/${id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note: notes[id] ?? "" }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Unable to update reseller.");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update reseller.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Reseller verification</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Reseller applications</h2>
        </div>
        <span className="text-xs font-medium text-zinc-500">{resellers.length} total</span>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading resellers…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      ) : resellers.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No reseller applications yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {resellers.map((reseller) => (
            <div key={reseller.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-white">{reseller.full_name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {reseller.phone_number} · applied {new Date(reseller.created_at).toLocaleDateString("en-PH")}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
                    STATUS_TONE[reseller.verification_status] ?? "border-white/10 text-zinc-300"
                  }`}
                >
                  {reseller.verification_status.replace(/_/g, " ")}
                </span>
              </div>

              {reseller.review_note ? (
                <p className="mt-2 text-xs text-zinc-500">Note: {reseller.review_note}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={notes[reseller.id] ?? ""}
                  onChange={(event) => setNotes((prev) => ({ ...prev, [reseller.id]: event.target.value }))}
                  placeholder="Review note (required to reject or request changes)"
                  className="min-w-[16rem] flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus-visible:border-red-400/40"
                />
                {reseller.verification_status !== "approved" ? (
                  <button
                    onClick={() => review(reseller.id, "approved")}
                    disabled={updatingId === reseller.id}
                    className="rounded-full border border-emerald-400/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve
                  </button>
                ) : null}
                <button
                  onClick={() => review(reseller.id, "resubmission_required")}
                  disabled={updatingId === reseller.id}
                  className="rounded-full border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Request changes
                </button>
                {reseller.verification_status !== "rejected" ? (
                  <button
                    onClick={() => review(reseller.id, "rejected")}
                    disabled={updatingId === reseller.id}
                    className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
