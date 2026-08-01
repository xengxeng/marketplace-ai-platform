export function AccessRestricted({ requiredRoles }: { requiredRoles: string[] }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Access restricted</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">This workspace requires a different role</h1>
      <p className="mt-3 text-sm text-zinc-400">
        Your account doesn&apos;t have access to this page. It requires one of: {requiredRoles.join(", ")}.
      </p>
    </div>
  );
}
