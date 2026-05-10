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

export const API_BASE_URL = (globalThis as { __APP_API_URL__?: string }).__APP_API_URL__ ?? import.meta.env.VITE_API_URL ?? '/api';

export const WS_BASE_URL =
  (globalThis as { __APP_WS_URL__?: string }).__APP_WS_URL__ ??
  import.meta.env.VITE_WS_URL ??
  `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/api`;

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

  // FormData bodies skip JSON serialization so the browser can set
  // Content-Type with the multipart boundary. Used by the live
  // audio-evaluation endpoint to upload the recorded blob.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const baseHeaders: Record<string, string> = isFormData ? {} : defaultHeaders;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...baseHeaders,
      ...authHeaders,
      ...headers,
    },
    body: isFormData
      ? (body as unknown as FormData)
      : body
        ? JSON.stringify(body)
        : undefined,
    signal,
  });

  const payload = await safeJson(response);

  if (response.status === 401 && !path.includes('/auth/login')) {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

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
