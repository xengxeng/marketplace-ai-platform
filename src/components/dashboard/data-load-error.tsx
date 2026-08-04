export function DataLoadError({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-[1.75rem] border border-red-400/30 bg-red-500/5 p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Something went wrong</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm text-zinc-400">
        {message ?? "Please retry in a moment. If it keeps happening, contact platform support."}
      </p>
    </div>
  );
}
