"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isGmailAddress = (value: string) => /@(gmail|googlemail)\.com$/i.test(value);

  // Fallback for implicit-flow links (e.g. admin-generated links), which return
  // access_token/refresh_token in the URL hash instead of a PKCE `code` query
  // param handled by /auth/callback.
  useEffect(() => {
    if (!window.location.hash.includes("access_token")) {
      return;
    }

    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      return;
    }

    supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error: sessionError }) => {
      if (sessionError || !data.user) {
        setError(sessionError?.message ?? "Unable to establish session.");
        return;
      }

      await fetch("/api/auth/profile", { method: "POST" });

      router.push("/dashboard");
    });
  }, [router]);

  async function handleSendLink() {
    setError("");

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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send the sign-in link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10 sm:px-8 lg:px-10">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Passwordless access</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Sign in with Gmail</h1>
        <p className="mt-3 text-zinc-300">
          The platform uses a Gmail-only sign-in flow. Enter your address and confirm via the link sent to your inbox.
        </p>

        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <label className="text-sm text-zinc-400" htmlFor="email">Gmail address</label>
          <input
            id="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none ring-0 disabled:opacity-60"
            placeholder="you@gmail.com"
            autoComplete="email"
            disabled={sent}
          />

          <button
            onClick={handleSendLink}
            disabled={loading || sent}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Sending..." : sent ? "Link sent" : "Send sign-in link"}
          </button>
        </div>

        {sent ? (
          <p className="mt-4 text-sm text-emerald-300">
            Check your Gmail inbox and click the sign-in link to continue. The link expires shortly and can only be used once.
          </p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between text-sm text-zinc-400">
          <span>New merchant or reseller? Start from the dashboard.</span>
          <Link href="/dashboard" className="font-medium text-white">Continue</Link>
        </div>
      </div>
    </main>
  );
}
