import { Request, Response } from "express";

const EXTERNAL_CRM_URL =
  process.env.VITE_EXTERNAL_LEAD_API?.replace(/\/$/, "") ||
  "https://jbdspower.in/LeafNetServer/api";
const CUSTOMER_ENDPOINT = `${EXTERNAL_CRM_URL}/customer`;
const LEADS_ENDPOINT = `${EXTERNAL_CRM_URL}/getAllLead`;

// In-memory cache for customer list to avoid slow external API on every load
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
// External API can return ~1.3MB+ JSON; allow enough time on slow networks
const SERVER_REQUEST_TIMEOUT_MS = 120000; // 2 minutes

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const customerCacheByKey = new Map<string, CacheEntry>();

/**
 * GET /api/crm/customers
 * Proxies to LeafNetServer customer API with caching and longer timeout
 * so companies load quickly on repeat opens and work on low internet.
 * Optional query: auth (forwarded to external API if provided).
 */
export async function getCrmCustomers(req: Request, res: Response) {
  const auth = typeof req.query.auth === "string" ? req.query.auth : undefined;
  const cacheKey = auth ?? "default";

  const now = Date.now();
  const cached = customerCacheByKey.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    res.setHeader("Cache-Control", "private, max-age=300"); // 5 min hint for client
    return res.json(cached.data);
  }

  const url = auth
    ? `${CUSTOMER_ENDPOINT}?auth=${encodeURIComponent(auth)}`
    : CUSTOMER_ENDPOINT;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SERVER_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `CRM customers proxy error: ${response.status} ${response.statusText}`,
        text?.slice(0, 200),
      );
      return res.status(response.status).json({
        error: `Upstream error: ${response.statusText}`,
      });
    }

    const data = await response.json();
    customerCacheByKey.set(cacheKey, {
      data,
      expiresAt: now + CACHE_TTL_MS,
    });
    res.setHeader("Cache-Control", "private, max-age=300");
    res.json(data);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout =
      (err as { name?: string })?.name === "AbortError" ||
      /timeout|abort/i.test(message);
    console.error("CRM customers proxy fetch failed:", message);
    return res.status(504).json({
      error: isTimeout
        ? "Request timed out. Please check your connection and try again."
        : "Failed to load companies.",
    });
  }
}

const leadsCacheByKey = new Map<string, CacheEntry>();

/**
 * GET /api/crm/leads
 * Proxies to LeafNetServer getAllLead with caching and longer timeout.
 * Optional query: auth (forwarded to external API if provided).
 */
export async function getCrmLeads(req: Request, res: Response) {
  const auth = typeof req.query.auth === "string" ? req.query.auth : undefined;
  const cacheKey = auth ?? "default";

  const now = Date.now();
  const cached = leadsCacheByKey.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.json(cached.data);
  }

  const url = auth
    ? `${LEADS_ENDPOINT}?auth=${encodeURIComponent(auth)}`
    : LEADS_ENDPOINT;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SERVER_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `CRM leads proxy error: ${response.status} ${response.statusText}`,
        text?.slice(0, 200),
      );
      return res.status(response.status).json({
        error: `Upstream error: ${response.statusText}`,
      });
    }

    const data = await response.json();
    leadsCacheByKey.set(cacheKey, {
      data,
      expiresAt: now + CACHE_TTL_MS,
    });
    res.setHeader("Cache-Control", "private, max-age=300");
    res.json(data);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout =
      (err as { name?: string })?.name === "AbortError" ||
      /timeout|abort/i.test(message);
    console.error("CRM leads proxy fetch failed:", message);
    return res.status(504).json({
      error: isTimeout
        ? "Request timed out. Please check your connection and try again."
        : "Failed to load leads.",
    });
  }
}
