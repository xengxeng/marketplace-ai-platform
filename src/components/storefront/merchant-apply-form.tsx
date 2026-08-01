"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MerchantApplyForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/merchants/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessName }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Unable to submit application.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit application.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Merchant workspace</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Apply to become a merchant</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
        Submit your business name to start a merchant application. An admin will review and verify it before your products can go live.
      </p>

      <div className="mt-6 max-w-md">
        <input
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Business name"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus-visible:border-red-400/40"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || businessName.trim().length < 2}
          className="mt-4 rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit application"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </div>
    </div>
  );
}
