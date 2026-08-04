"use client";

import { useEffect, useState } from "react";
import { responseError } from "@/lib/http/response-error";

type Merchant = {
  id: string;
  owner_id: string;
  business_name: string;
  status: string;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  verified: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  suspended: "border-red-400/30 bg-red-500/10 text-red-300",
};

export function MerchantApprovalPanel() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/merchants");

      if (!res.ok) {
        throw await responseError(res, "Unable to load merchants.");
      }

      const body = await res.json();

      setMerchants(body.merchants ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load merchants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);

    try {
      const res = await fetch(`/api/merchants/${id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw await responseError(res, "Unable to update merchant.");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update merchant.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Merchant verification</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Merchant applications</h2>
        </div>
        <span className="text-xs font-medium text-zinc-500">{merchants.length} total</span>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading merchants…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      ) : merchants.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No merchant applications yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {merchants.map((merchant) => (
            <div
              key={merchant.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div>
                <p className="font-medium text-white">{merchant.business_name}</p>
                <p className="mt-1 text-sm text-zinc-400">Applied {new Date(merchant.created_at).toLocaleDateString("en-PH")}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_TONE[merchant.status] ?? "border-white/10 text-zinc-300"}`}>
                  {merchant.status}
                </span>

                {merchant.status !== "verified" ? (
                  <button
                    onClick={() => updateStatus(merchant.id, "verified")}
                    disabled={updatingId === merchant.id}
                    className="rounded-full border border-emerald-400/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve
                  </button>
                ) : null}
                {merchant.status !== "suspended" ? (
                  <button
                    onClick={() => updateStatus(merchant.id, "suspended")}
                    disabled={updatingId === merchant.id}
                    className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Suspend
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
