const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_TRACKED_CLIENTS = 10_000;

const requestsByClient = new Map<string, number[]>();
let requestsSinceCleanup = 0;

export function checkMailRateLimit(
  clientId: string,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const windowStart = now - WINDOW_MS;
  const recentRequests = (requestsByClient.get(clientId) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  if (recentRequests.length >= MAX_REQUESTS) {
    requestsByClient.set(clientId, recentRequests);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((recentRequests[0] + WINDOW_MS - now) / 1000),
      ),
    };
  }

  recentRequests.push(now);
  requestsByClient.set(clientId, recentRequests);
  requestsSinceCleanup += 1;

  if (requestsSinceCleanup >= 128 || requestsByClient.size > MAX_TRACKED_CLIENTS) {
    requestsSinceCleanup = 0;
    for (const [key, timestamps] of requestsByClient) {
      if (timestamps.every((timestamp) => timestamp <= windowStart)) {
        requestsByClient.delete(key);
      }
    }

    while (requestsByClient.size > MAX_TRACKED_CLIENTS) {
      const oldestClient = requestsByClient.keys().next().value;
      if (oldestClient === undefined) break;
      requestsByClient.delete(oldestClient);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
