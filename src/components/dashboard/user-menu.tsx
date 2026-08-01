"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function UserMenu({ name, initial }: { name: string; initial: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3.5 transition hover:bg-white/10"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-xs font-semibold text-white">
          {initial}
        </div>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-white sm:inline">{name}</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl"
          >
            <div className="truncate px-3 py-2 text-xs text-zinc-500">{name}</div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
