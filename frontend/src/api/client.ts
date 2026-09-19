const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
      signal: init?.signal ?? controller.signal,
    });

    if (!response.ok) {
      let detail = `Request failed (${response.status})`;

      try {
        const body = await response.json();
        detail = body?.detail || detail;
      } catch {
        // Non-JSON error response.
      }

      throw new ApiError(response.status, detail);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        'Backend request timed out. Check that the API service is running.',
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const apiBaseUrl = BASE_URL;

export default request;