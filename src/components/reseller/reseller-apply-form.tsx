"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FIELDS = [
  ["fullName", "Full legal name"],
  ["phoneNumber", "Mobile number"],
  ["addressLine", "Street address (optional)"],
  ["addressCity", "City (optional)"],
  ["addressProvince", "Province (optional)"],
  ["addressPostalCode", "Postal code (optional)"],
] as const;

export function ResellerApplyForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    addressLine: "",
    addressCity: "",
    addressProvince: "",
    addressPostalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/resellers/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
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

  const valid = form.fullName.trim().length >= 2 && form.phoneNumber.trim().length >= 7;

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Reseller workspace</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Become a reseller</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
        Submit your details to start a reseller application. You can build your customer list right away — checkout on
        their behalf unlocks once an admin verifies you.
      </p>

      <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
        {FIELDS.map(([field, label]) => (
          <input
            key={field}
            value={form[field]}
            onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
            placeholder={label}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus-visible:border-red-400/40"
          />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !valid}
        className="mt-5 rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Submit application"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
