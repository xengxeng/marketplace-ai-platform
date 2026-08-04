"use client";

import { fetchJson } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatPeso, shortId } from "@/lib/format";
import { statusBadgeClass } from "@/lib/ui/status";
import { Panel, PanelActionButton, PanelHeader, PanelMessage, PanelRow } from "./panel";

type Commission = {
  id: string;
  order_id: string;
  reseller_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

type LedgerEntry = {
  id: string;
  profile_id: string;
  entry_type: string;
  amount_cents: number;
  reason: string;
  created_at: string;
};

async function loadFinanceData() {
  const [commissions, ledger] = await Promise.all([
    fetchJson<{ commissions: Commission[] }>("/api/commissions", { fallbackError: "Unable to load commissions." }),
    fetchJson<{ entries: LedgerEntry[] }>("/api/wallet-ledger", { fallbackError: "Unable to load wallet ledger." }),
  ]);

  return { commissions: commissions.commissions ?? [], ledger: ledger.entries ?? [] };
}

export function FinancePanel() {
  const { data, loading, error, pendingId, mutate } = useApiResource(loadFinanceData, "Unable to load finance data.");

  const commissions = data?.commissions ?? [];
  const ledger = data?.ledger ?? [];

  function approve(id: string) {
    return mutate(
      id,
      () => fetchJson(`/api/commissions/${id}/approve`, { method: "POST", fallbackError: "Unable to approve commission." }),
      "Unable to approve commission.",
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading finance data…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <Panel>
        <PanelHeader eyebrow="Commission approvals" title="Pending commissions" meta={`${commissions.length} total`} />

        {commissions.length === 0 ? (
          <PanelMessage>
            No commissions yet — these are created automatically when an order is placed through a reseller.
          </PanelMessage>
        ) : (
          <div className="mt-6 space-y-3">
            {commissions.map((commission) => (
              <PanelRow key={commission.id}>
                <div>
                  <p className="font-medium text-white">{formatPeso(commission.amount_cents)}</p>
                  <p className="mt-1 text-sm text-zinc-400">Order {shortId(commission.order_id)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={statusBadgeClass(commission.status)}>{commission.status}</span>
                  {commission.status === "pending" ? (
                    <PanelActionButton
                      tone="positive"
                      onClick={() => approve(commission.id)}
                      disabled={pendingId === commission.id}
                    >
                      Approve &amp; credit wallet
                    </PanelActionButton>
                  ) : null}
                </div>
              </PanelRow>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Wallet ledger" title="Recent transactions" meta={`${ledger.length} entries`} />

        {ledger.length === 0 ? (
          <PanelMessage>No wallet transactions yet.</PanelMessage>
        ) : (
          <div className="mt-6 space-y-2">
            {ledger.map((entry) => (
              <PanelRow key={entry.id} compact>
                <div>
                  <p className="text-sm font-medium text-white capitalize">{entry.entry_type}</p>
                  <p className="mt-1 text-xs text-zinc-500">{entry.reason}</p>
                </div>
                <span className={`text-sm font-medium ${entry.entry_type === "credit" ? "text-emerald-300" : "text-red-300"}`}>
                  {entry.entry_type === "credit" ? "+" : "-"}
                  {formatPeso(entry.amount_cents)}
                </span>
              </PanelRow>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
