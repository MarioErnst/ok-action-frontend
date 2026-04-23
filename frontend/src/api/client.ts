export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiRequestOptions<TBody = unknown> = {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = (globalThis as { __APP_API_URL__?: string }).__APP_API_URL__ ?? import.meta.env.VITE_API_URL ?? '/api';

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

const safeJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
};

export const apiRequest = async <TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> => {
  const { method = 'GET', body, headers, signal } = options;

  const token = localStorage.getItem('auth_token');
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...defaultHeaders,
      ...authHeaders,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const payload = await safeJson(response);

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Record<string, unknown>;
    throw new ApiError(
      response.status,
      String(errorPayload.code ?? 'unknown_error'),
      String(errorPayload.message ?? 'Error de infraestructura'),
      errorPayload.details,
    );
  }

  return payload as TResponse;
};
