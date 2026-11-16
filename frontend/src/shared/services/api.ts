const apiRoot = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export function mediaUrl(relative: string) {
  if (!relative.startsWith('/api/')) return relative;
  return apiRoot + relative.slice(4);
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly requestId?: string) {
    super('API request failed');
  }
}
export function explain(error: unknown, custom: Record<number, string> = {}) {
  if (!(error instanceof ApiError)) return 'Ulanishda muammo yuz berdi. Qayta urinib ko‘ring.';
  if (error.status >= 500 && !error.requestId) return 'Serverga ulanib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.';
  return custom[error.status] ?? ({
    400: 'Ma’lumotlarni tekshirib, qayta urinib ko‘ring.',
    401: 'Kirish ma’lumotlari noto‘g‘ri yoki sessiya muddati tugagan.',
    404: 'So‘ralgan ma’lumot topilmadi.',
    409: 'Bu amalni hozir bajarib bo‘lmadi.',
    422: 'Kiritilgan ma’lumotlar talabga javob bermadi.',
    429: 'So‘rovlar ko‘payib ketdi. Birozdan keyin qayta urining.',
    503: 'Xizmat vaqtincha ishlamayapti. Birozdan keyin qayta urining.',
  } as Record<number, string>)[error.status] ?? 'So‘rovni bajarishda xatolik yuz berdi.';
}
const unauthorizedListeners = new Set<(rejectedToken: string) => void>();
export function observeUnauthorized(listener: (rejectedToken: string) => void) {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}

export async function api<T>(path: string, options: { token?: string; method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.token) headers.set('Authorization', 'Bearer ' + options.token);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(apiRoot + path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  if (response.status === 401 && options.token && !options.signal?.aborted) {
    for (const listener of unauthorizedListeners) listener(options.token);
  }
  if (!response.ok) throw new ApiError(response.status, response.headers.get('X-Request-Id') ?? undefined);
  if (response.status === 204 || (response.status === 202 && !response.headers.get('Content-Type')?.includes('json'))) return undefined as T;
  return response.json() as Promise<T>;
}
