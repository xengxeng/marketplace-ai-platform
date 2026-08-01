"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, DollarSign, PackageSearch, UserPlus, Users } from "lucide-react";

const metrics = [
  { label: "Total Revenue", value: "$248K", change: "+12.4%", up: true, icon: DollarSign, glow: "from-emerald-500/30" },
  { label: "Active Users", value: "18.2K", change: "+8.1%", up: true, icon: Users, glow: "from-sky-500/30" },
  { label: "New Customers", value: "1,284", change: "+5.7%", up: true, icon: UserPlus, glow: "from-violet-500/30" },
  { label: "Pending Orders", value: "142", change: "-2.3%", up: false, icon: PackageSearch, glow: "from-amber-500/30" },
];

const activity = [
  { title: "Merchant verification approved", time: "4 min ago", detail: "Northstar Foods completed onboarding" },
  { title: "Reseller order dispatched", time: "14 min ago", detail: "Aubrey Retail moved 24 cartons" },
  { title: "Finance payout queued", time: "34 min ago", detail: "Commission batch prepared for review" },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial="hidden"
        animate="show"
        variants={item}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Foodify dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Welcome back, Aubrey</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Your enterprise food marketplace is performing strongly across merchants, resellers, and finance
            operations.
          </p>
        </div>
        <Link
          href="/products"
          className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:border-red-400/40 hover:bg-white/10"
        >
          Browse products
        </Link>
      </motion.div>

      <motion.div initial="hidden" animate="show" variants={container} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const Trend = metric.up ? ArrowUpRight : ArrowDownRight;
          return (
            <motion.div
              key={metric.label}
              variants={item}
              className="group relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-5 transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div
                className={`pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${metric.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
              />
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${metric.up ? "text-emerald-300" : "text-amber-300"}`}>
                  <Trend className="h-3.5 w-3.5" /> {metric.change}
                </span>
              </div>
              <p className="mt-4 text-sm text-zinc-400">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{metric.value}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-red-500/10 via-black/20 to-rose-900/10 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Live operations</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Marketplace pulse</h2>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Online
            </div>
          </div>
          <div className="mt-5 flex h-48 items-center justify-center rounded-[1.2rem] border border-dashed border-white/10 bg-black/20 text-sm text-zinc-500">
            Analytics charts coming soon
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent activity</h2>
            <span className="text-xs font-medium text-zinc-500">Live</span>
          </div>
          <div className="mt-4 space-y-3">
            {activity.map((entry) => (
              <div key={entry.title} className="rounded-2xl border border-white/10 bg-black/20 p-3.5 transition hover:border-white/20">
                <p className="text-sm font-medium text-white">{entry.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{entry.detail}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-red-300">{entry.time}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
