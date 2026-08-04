import { formatDateTime, shortId } from "@/lib/format";
import { Panel, PanelHeader, PanelMessage, PanelRow } from "./panel";

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

export function ActivityLogPanel({ logs }: { logs: LogEntry[] }) {
  return (
    <Panel>
      <PanelHeader eyebrow="Audit trail" title="Recent activity" meta={`${logs.length} events`} />

      {logs.length === 0 ? (
        <PanelMessage>No activity recorded yet.</PanelMessage>
      ) : (
        <div className="mt-6 space-y-2">
          {logs.map((log) => (
            <PanelRow key={log.id} compact>
              <div>
                <p className="text-sm font-medium text-white">{ACTION_LABEL[log.action] ?? log.action}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {log.target_type} {log.target_id ? shortId(log.target_id) : ""}
                  {log.metadata?.from ? ` · ${log.metadata.from} → ${log.metadata.to}` : ""}
                </p>
              </div>
              <span className="text-xs text-zinc-500">{formatDateTime(log.created_at)}</span>
            </PanelRow>
          ))}
        </div>
      )}
    </Panel>
  );
}
