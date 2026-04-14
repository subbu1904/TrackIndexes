import { computeSnapshotAgeSeconds } from "./normalize.js";
import { readLatestQuoteSnapshot } from "./d1.js";
import { refreshLatestQuoteSnapshot, shouldRefreshMarketSnapshot } from "./scheduled.js";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, x-refresh-token"
};

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    responseHeaders.set(key, value);
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders
  });
}

export function buildQuotesApiPayload(snapshot, { now = () => Date.now() } = {}) {
  if (!snapshot) {
    return {
      success: false,
      data: null,
      meta: {
        stale: true
      },
      error: "No market data is currently available."
    };
  }

  const ageSeconds = computeSnapshotAgeSeconds(snapshot.fetchedAt, { now });

  return {
    success: true,
    data: snapshot.quotes,
    meta: {
      fetchedAt: snapshot.fetchedAt,
      stale: snapshot.isStale || (typeof ageSeconds === "number" && ageSeconds > 900),
      ageSeconds
    },
    error: null
  };
}

async function handleQuotesRequest(env) {
  const snapshot = await readLatestQuoteSnapshot(env.DB);

  if (!snapshot) {
    return jsonResponse(buildQuotesApiPayload(null), {
      status: 503,
      headers: {
        "cache-control": "no-store"
      }
    });
  }

  return jsonResponse(buildQuotesApiPayload(snapshot), {
    headers: {
      "cache-control": "public, max-age=15, stale-while-revalidate=45"
    }
  });
}

function isAuthorizedRefreshRequest(request, env) {
  const configuredToken = env.ADMIN_REFRESH_TOKEN;
  if (!configuredToken) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const headerToken = request.headers.get("x-refresh-token");

  return bearerToken === configuredToken || headerToken === configuredToken;
}

async function handleRefreshRequest(request, env) {
  if (!env.ADMIN_REFRESH_TOKEN) {
    return jsonResponse(
      {
        success: false,
        data: null,
        meta: null,
        error: "ADMIN_REFRESH_TOKEN is not configured."
      },
      { status: 501 }
    );
  }

  if (!isAuthorizedRefreshRequest(request, env)) {
    return jsonResponse(
      {
        success: false,
        data: null,
        meta: null,
        error: "Unauthorized refresh request."
      },
      { status: 401 }
    );
  }

  const snapshot = await refreshLatestQuoteSnapshot(env);
  return jsonResponse(buildQuotesApiPayload(snapshot));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/quotes") {
      return handleQuotesRequest(env);
    }

    if (request.method === "POST" && url.pathname === "/api/admin/refresh") {
      return handleRefreshRequest(request, env);
    }

    return jsonResponse(
      {
        success: false,
        data: null,
        meta: null,
        error: "Route not found."
      },
      { status: 404 }
    );
  },
  async scheduled(_controller, env, ctx) {
    if (!shouldRefreshMarketSnapshot(new Date())) {
      return;
    }

    ctx.waitUntil(refreshLatestQuoteSnapshot(env));
  }
};