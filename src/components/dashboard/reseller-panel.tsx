"use client";

import { useEffect, useState } from "react";
import { referralLink } from "@/lib/resellers/referral";

type Reseller = {
  id: string;
  display_name: string;
  referral_code: string;
  status: string;
  created_at: string;
};

type Commission = {
  id: string;
  order_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

type Totals = {
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
  walletCents: number;
  orderCount: number;
};

type ResellerResponse = {
  reseller: Reseller | null;
  commissions: Commission[];
  totals: Totals | null;
};

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const COMMISSION_TONE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  approved: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  paid: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
};

export function ResellerPanel() {
  const [data, setData] = useState<ResellerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchReseller() {
    const res = await fetch("/api/resellers/me");
    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error ?? "Unable to load your reseller profile.");
    }

    return body as ResellerResponse;
  }

  async function load() {
    setLoading(true);

    try {
      setData(await fetchReseller());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your reseller profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReseller()
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unable to load your reseller profile."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleRegister() {
    setRegistering(true);
    setError("");

    try {
      const res = await fetch("/api/resellers/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Unable to register as a reseller.");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register as a reseller.");
    } finally {
      setRegistering(false);
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Copying failed — select the link and copy it manually.");
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading your reseller workspace…</p>;
  }

  if (!data?.reseller) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">Become a reseller</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Earn 10% on every referred order</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Register to get a referral link. Anyone who opens it and checks out within 30 days earns you a commission,
          credited to your wallet once finance approves it.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Display name shown to customers"
            className="min-w-[16rem] flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus-visible:border-violet-400/40"
          />
          <button
            onClick={handleRegister}
            disabled={registering || displayName.trim().length < 2}
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-700 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {registering ? "Registering…" : "Register as reseller"}
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>
    );
  }

  const { reseller, commissions, totals } = data;
  const link = referralLink(typeof window === "undefined" ? "" : window.location.origin, reseller.referral_code);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">Reseller workspace</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{reseller.display_name}</h2>
        {reseller.status === "suspended" ? (
          <p className="mt-3 text-sm text-red-300">
            Your reseller account is suspended — referral links will not earn commissions until it is restored.
          </p>
        ) : null}

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Your referral link</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">{link}</code>
            <button
              onClick={() => copyLink(link)}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 transition hover:bg-white/10"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Code {reseller.referral_code} · attribution lasts 30 days</p>
        </div>
      </div>

      {totals ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Wallet balance", value: formatPeso(totals.walletCents) },
            { label: "Pending commission", value: formatPeso(totals.pendingCents) },
            { label: "Approved", value: formatPeso(totals.approvedCents) },
            { label: "Referred orders", value: String(totals.orderCount) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white">Commissions</h3>

        {commissions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            No commissions yet — share your referral link to start earning.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {commissions.map((commission) => (
              <div
                key={commission.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div>
                  <p className="font-medium text-white">{formatPeso(commission.amount_cents)}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Order {commission.order_id.slice(0, 8)} · {new Date(commission.created_at).toLocaleDateString("en-PH")}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs capitalize ${
                    COMMISSION_TONE[commission.status] ?? "border-white/10 bg-white/5 text-zinc-300"
                  }`}
                >
                  {commission.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
