"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Store, Users, Wallet } from "lucide-react";

const ICONS = { Store, Users, Wallet, ShieldCheck };

export function ComingSoonPanel({
  icon,
  eyebrow,
  title,
  description,
  highlights,
  tone,
}: {
  icon: keyof typeof ICONS;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  tone: string;
}) {
  const Icon = ICONS[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10"
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${tone} to-transparent opacity-30 blur-3xl`}
      />
      <div className="relative">
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-red-300">{eyebrow}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">{description}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {highlights.map((highlight) => (
            <span key={highlight} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-zinc-300">
              {highlight}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
