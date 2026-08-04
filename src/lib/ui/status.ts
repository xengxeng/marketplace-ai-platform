const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  paid: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  approved: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  fulfilled: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  verified: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  cancelled: "border-red-400/30 bg-red-500/10 text-red-300",
  suspended: "border-red-400/30 bg-red-500/10 text-red-300",
};

const DEFAULT_TONE = "border-white/10 text-zinc-300";

export function statusBadgeClass(status: string) {
  return `rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_TONE[status] ?? DEFAULT_TONE}`;
}
