type LogEntry = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  order_placed: "Order placed",
  order_status_changed: "Order status changed",
};

export function ActivityLogPanel({ logs, error }: { logs: LogEntry[]; error?: string | null }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Audit trail</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Recent activity</h2>
        </div>
        <span className="text-xs font-medium text-zinc-500">{logs.length} events</span>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-red-300">Unable to load the audit trail: {error}</p>
      ) : logs.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No activity recorded yet.</p>
      ) : (
        <div className="mt-6 space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3.5">
              <div>
                <p className="text-sm font-medium text-white">{ACTION_LABEL[log.action] ?? log.action}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {log.target_type} {log.target_id?.slice(0, 8)}
                  {log.metadata?.from ? ` · ${log.metadata.from} → ${log.metadata.to}` : ""}
                </p>
              </div>
              <span className="text-xs text-zinc-500">{new Date(log.created_at).toLocaleString("en-PH")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
