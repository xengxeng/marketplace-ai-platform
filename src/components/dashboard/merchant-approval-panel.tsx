"use client";

import { fetchJson } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatDate } from "@/lib/format";
import { statusBadgeClass } from "@/lib/ui/status";
import { Panel, PanelActionButton, PanelHeader, PanelMessage, PanelRow } from "./panel";

type Merchant = {
  id: string;
  owner_id: string;
  business_name: string;
  status: string;
  created_at: string;
};

const loadMerchants = () =>
  fetchJson<{ merchants: Merchant[] }>("/api/merchants", { fallbackError: "Unable to load merchants." });

export function MerchantApprovalPanel() {
  const { data, loading, error, pendingId, mutate } = useApiResource(loadMerchants, "Unable to load merchants.");

  const merchants = data?.merchants ?? [];

  function updateStatus(id: string, status: string) {
    return mutate(
      id,
      () =>
        fetchJson(`/api/merchants/${id}/status`, {
          method: "PATCH",
          json: { status },
          fallbackError: "Unable to update merchant.",
        }),
      "Unable to update merchant.",
    );
  }

  return (
    <Panel>
      <PanelHeader eyebrow="Merchant verification" title="Merchant applications" meta={`${merchants.length} total`} />

      {loading ? (
        <PanelMessage>Loading merchants…</PanelMessage>
      ) : error ? (
        <PanelMessage tone="danger">{error}</PanelMessage>
      ) : merchants.length === 0 ? (
        <PanelMessage>No merchant applications yet.</PanelMessage>
      ) : (
        <div className="mt-6 space-y-3">
          {merchants.map((merchant) => (
            <PanelRow key={merchant.id}>
              <div>
                <p className="font-medium text-white">{merchant.business_name}</p>
                <p className="mt-1 text-sm text-zinc-400">Applied {formatDate(merchant.created_at)}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className={statusBadgeClass(merchant.status)}>{merchant.status}</span>

                {merchant.status !== "verified" ? (
                  <PanelActionButton
                    tone="positive"
                    onClick={() => updateStatus(merchant.id, "verified")}
                    disabled={pendingId === merchant.id}
                  >
                    Approve
                  </PanelActionButton>
                ) : null}
                {merchant.status !== "suspended" ? (
                  <PanelActionButton
                    tone="negative"
                    onClick={() => updateStatus(merchant.id, "suspended")}
                    disabled={pendingId === merchant.id}
                  >
                    Suspend
                  </PanelActionButton>
                ) : null}
              </div>
            </PanelRow>
          ))}
        </div>
      )}
    </Panel>
  );
}
