"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isGmailAddress = (value: string) => /@(gmail|googlemail)\.com$/i.test(value);

  async function handleSendOtp() {
    setError("");
    setMessage("");

    if (!isGmailAddress(email)) {
      setError("Please use a Gmail address ending in @gmail.com or @googlemail.com.");
      return;
    }

    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setError("Supabase credentials are not configured yet. Add your project URL and anon key to continue.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw error;
      }

      setStep("otp");
      setMessage("A one-time code was sent to your Gmail inbox. Enter it below to continue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send the one-time code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const resolvedRole = normalizedEmail === "xengco09@gmail.com" ? "super_admin" : "guest";

    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      setError("Supabase credentials are not configured yet. Add your project URL and anon key to continue.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error || !data.session) {
        throw error ?? new Error("Verification failed.");
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (user) {
        await fetch("/api/auth/profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name ?? user.email,
            role: resolvedRole,
          }),
        });
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10 sm:px-8 lg:px-10">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Passwordless access</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Sign in with Gmail OTP</h1>
        <p className="mt-3 text-zinc-300">
          The platform uses a Gmail-only OTP flow. Enter your address, confirm the code, and continue into the workspace.
        </p>

        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <label className="text-sm text-zinc-400" htmlFor="email">Gmail address</label>
          <input
            id="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none ring-0"
            placeholder="you@gmail.com"
            autoComplete="email"
          />

          {step === "otp" ? (
            <>
              <label className="mt-4 block text-sm text-zinc-400" htmlFor="otp">One-time code</label>
              <input
                id="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none ring-0"
                placeholder="Enter 6-digit code"
              />
            </>
          ) : null}

          {step === "email" ? (
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          ) : (
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
          )}
        </div>

        {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between text-sm text-zinc-400">
          <span>New merchant or reseller? Start from the dashboard.</span>
          <Link href="/dashboard" className="font-medium text-white">Continue</Link>
        </div>
      </div>
    </main>
  );
}
