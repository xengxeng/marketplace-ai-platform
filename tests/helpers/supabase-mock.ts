import { vi } from "vitest";

export type QueryResult = { data?: unknown; error?: { message: string } | null };

export type TableCall = {
  table: string;
  operations: { method: string; args: unknown[] }[];
};

export type SupabaseMockOptions = {
  /** Queued results per table, consumed in order by successive `from(table)` calls. */
  tables?: Record<string, QueryResult[]>;
  /** Result of `auth.getUser()`. */
  user?: { id: string; email?: string } | null;
  userError?: { message: string } | null;
  /** Results per rpc name. */
  rpc?: Record<string, QueryResult>;
  storage?: {
    uploadError?: { message: string } | null;
    publicUrl?: string;
  };
};

const CHAIN_METHODS = ["select", "eq", "neq", "order", "limit", "insert", "update", "upsert", "delete", "in"];
const TERMINAL_METHODS = ["single", "maybeSingle", "then"];

/**
 * Minimal chainable stand-in for the Supabase JS client. Query builders resolve
 * to the queued result for their table, and every call is recorded so tests can
 * assert on the operations a route performed.
 */
export function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const queues = new Map<string, QueryResult[]>(
    Object.entries(options.tables ?? {}).map(([table, results]) => [table, [...results]]),
  );
  const calls: TableCall[] = [];

  function from(table: string) {
    const queue = queues.get(table) ?? [];
    const result: QueryResult = queue.shift() ?? { data: null, error: null };
    const normalized = { data: result.data ?? null, error: result.error ?? null };
    const call: TableCall = { table, operations: [] };
    calls.push(call);

    const chain: Record<string, unknown> = {};
    for (const method of CHAIN_METHODS) {
      chain[method] = (...args: unknown[]) => {
        call.operations.push({ method, args });
        return chain;
      };
    }
    for (const method of TERMINAL_METHODS) {
      chain[method] = (...args: unknown[]) => {
        if (method === "then") {
          return Promise.resolve(normalized).then(...(args as [never, never]));
        }
        call.operations.push({ method, args });
        return Promise.resolve(normalized);
      };
    }
    return chain;
  }

  const rpc = vi.fn(async (name: string, _args?: Record<string, unknown>) => {
    const result = options.rpc?.[name] ?? { data: null, error: null };
    return { data: result.data ?? null, error: result.error ?? null };
  });

  const upload = vi.fn(async (_path: string, _file: unknown, _options?: { contentType: string; upsert: boolean }) => ({
    error: options.storage?.uploadError ?? null,
  }));
  const getPublicUrl = vi.fn(() => ({
    data: { publicUrl: options.storage?.publicUrl ?? "https://cdn.test/file.png" },
  }));

  return {
    client: {
      from: vi.fn(from),
      rpc,
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: options.user ?? null },
          error: options.userError ?? null,
        })),
      },
      storage: { from: vi.fn(() => ({ upload, getPublicUrl })) },
    },
    calls,
    rpc,
    upload,
    getPublicUrl,
    /** Operations recorded for the nth (0-based) `from(table)` call. */
    tableCall(table: string, index = 0) {
      return calls.filter((call) => call.table === table)[index];
    },
    argsFor(table: string, method: string, index = 0) {
      const call = calls.filter((entry) => entry.table === table)[index];
      return call?.operations.find((operation) => operation.method === method)?.args;
    },
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

export function jsonRequest(body: unknown, url = "http://localhost/api/test") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
