import { cache } from './cache.js';
import { getToken } from './auth.js';
import { MAX_ATTEMPTS, getDelay, wait } from './retries.js';
import { AuthError, RateLimitError, ServerError, NetworkError, HttpError } from './errors.js';

const BASE_URL = '/api';

async function request(method, endpoint, { body, headers = {}, cacheTtl, skipCache, onRetryTick } = {}) {
  if (method === 'GET' && cacheTtl && !skipCache) {
    const entry = cache.get(endpoint);
    if (entry && (Date.now() - entry.savedAt) < cacheTtl) return entry.data;
  }

  const token = getToken();
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  let lastErr;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(BASE_URL + endpoint, {
        method, headers: reqHeaders,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (res.status === 401) throw new AuthError(endpoint);
      if (res.status === 429) throw new RateLimitError(endpoint);
      if (res.status >= 500) throw new ServerError(endpoint);
      if (!res.ok) throw new HttpError(res.status, res.statusText, endpoint);

      const data = await res.json();
      if (method === 'GET' && cacheTtl) cache.set(endpoint, data);
      return data;

    } catch (err) {
      const retryable = err instanceof ServerError
                     || err instanceof RateLimitError
                     || !(err instanceof HttpError);
      if (!retryable) throw err;

      lastErr = err instanceof HttpError ? err : new NetworkError(endpoint, err);
      if (attempt < MAX_ATTEMPTS - 1) await wait(getDelay(attempt), onRetryTick);
    }
  }

  throw lastErr;
}

export const client = {
  get:    (endpoint, opts)       => request('GET',    endpoint, opts),
  post:   (endpoint, body, opts) => request('POST',   endpoint, { body, ...opts }),
  put:    (endpoint, body, opts) => request('PUT',    endpoint, { body, ...opts }),
  patch:  (endpoint, body, opts) => request('PATCH',  endpoint, { body, ...opts }),
  delete: (endpoint, opts)       => request('DELETE', endpoint, opts),
};
