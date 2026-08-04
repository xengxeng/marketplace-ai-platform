import type { ReactNode } from "react";

export function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">{children}</div>;
}

export function PanelHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      </div>
      {meta ? <span className="text-xs font-medium text-zinc-500">{meta}</span> : null}
    </div>
  );
}

export function PanelRow({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3.5"
          : "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
      }
    >
      {children}
    </div>
  );
}

export function PanelMessage({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "danger" }) {
  return <p className={`mt-6 text-sm ${tone === "danger" ? "text-red-300" : "text-zinc-400"}`}>{children}</p>;
}

const ACTION_TONE = {
  positive: "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10",
  negative: "border-red-400/30 text-red-300 hover:bg-red-500/10",
};

export function PanelActionButton({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: keyof typeof ACTION_TONE;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${ACTION_TONE[tone]}`}
    >
      {children}
    </button>
  );
}
