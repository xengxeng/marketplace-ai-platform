export default function AdminDashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Admin workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Platform oversight and moderation</h1>
        <p className="mt-3 text-zinc-300">This space will manage merchant approvals, system controls, and escalation flows.</p>
      </div>
    </main>
  );
}
