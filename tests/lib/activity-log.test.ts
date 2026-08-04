import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { logActivity } from "@/lib/activity/log";
import { createSupabaseMock } from "../helpers/supabase-mock";

describe("logActivity", () => {
  it("inserts a row with defaults for optional fields", async () => {
    const mock = createSupabaseMock();

    await logActivity(mock.client as unknown as SupabaseClient, {
      actorId: "actor-1",
      action: "order_placed",
      targetType: "order",
    });

    expect(mock.argsFor("activity_logs", "insert")).toEqual([
      {
        actor_id: "actor-1",
        action: "order_placed",
        target_type: "order",
        target_id: null,
        metadata: {},
      },
    ]);
  });

  it("passes through target id and metadata", async () => {
    const mock = createSupabaseMock();

    await logActivity(mock.client as unknown as SupabaseClient, {
      actorId: "actor-1",
      action: "merchant_status_changed",
      targetType: "merchant",
      targetId: "merchant-9",
      metadata: { from: "pending", to: "verified" },
    });

    expect(mock.argsFor("activity_logs", "insert")).toEqual([
      {
        actor_id: "actor-1",
        action: "merchant_status_changed",
        target_type: "merchant",
        target_id: "merchant-9",
        metadata: { from: "pending", to: "verified" },
      },
    ]);
  });

  it("swallows errors so logging never breaks the caller", async () => {
    const client = {
      from: vi.fn(() => {
        throw new Error("network down");
      }),
    } as unknown as SupabaseClient;

    await expect(
      logActivity(client, { actorId: "actor-1", action: "a", targetType: "order" }),
    ).resolves.toBeUndefined();
  });
});
