export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type FetchJsonOptions = Omit<RequestInit, "body"> & {
  json?: unknown;
  fallbackError?: string;
};

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { json, fallbackError = "Request failed.", headers, ...init } = options;

  const response = await fetch(url, {
    ...init,
    headers: json === undefined ? headers : { "content-type": "application/json", ...headers },
    body: json === undefined ? undefined : JSON.stringify(json),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(body?.error ?? fallbackError, response.status);
  }

  return body as T;
}
