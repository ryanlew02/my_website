// Strava mileage proxy — keeps the API credentials off the public site.
//
//   GET /miles?range=month  →  { "miles": 24.6, "range": "month" }
//   GET /miles?range=year   →  { "miles": 318.4, "range": "year" }
//
// Secrets (set with `wrangler secret put`): STRAVA_CLIENT_ID,
// STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN. The refresh token must carry
// the activity:read scope.

const CACHE_SECONDS = 900;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname !== '/miles') return json({ error: 'not found' }, 404);

        // 5 requests per minute per visitor IP. Counters live per Cloudflare
        // location and sync lazily, so brief bursts can slip a little over —
        // fine here, it just needs to stop someone hammering the endpoint.
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const { success } = await env.RATE_LIMITER.limit({ key: ip });
        if (!success) return json({ error: 'rate limit exceeded — try again in a minute' }, 429);

        const range = url.searchParams.get('range') === 'year' ? 'year' : 'month';

        // Serve from the edge cache so repeat visitors don't hit Strava's
        // rate limits (100 requests / 15 min).
        const cache = caches.default;
        const cacheKey = new Request(url.origin + '/miles?range=' + range);
        let response = await cache.match(cacheKey);
        if (response) return response;

        try {
            const miles = await runMiles(env, range);
            response = json({ miles, range });
            response.headers.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
            ctx.waitUntil(cache.put(cacheKey, response.clone()));
            return response;
        } catch (err) {
            return json({ error: err.message }, 502);
        }
    },
};

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

// Access tokens only live ~6 hours; trade the refresh token for a fresh one.
async function accessToken(env) {
    const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: env.STRAVA_CLIENT_ID,
            client_secret: env.STRAVA_CLIENT_SECRET,
            refresh_token: env.STRAVA_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        }),
    });
    if (!res.ok) throw new Error(`token refresh failed (HTTP ${res.status})`);
    return (await res.json()).access_token;
}

// Total run miles since the start of the current month/year, counting
// anything run-flavored (Run, TrailRun, VirtualRun).
async function runMiles(env, range) {
    const token = await accessToken(env);
    const after = periodStart(range, env.TIMEZONE || 'America/Chicago');
    let meters = 0;
    for (let page = 1; ; page++) {
        const res = await fetch(
            `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error(`activities fetch failed (HTTP ${res.status})`);
        const acts = await res.json();
        for (const a of acts) {
            if ((a.sport_type || a.type || '').includes('Run')) meters += a.distance;
        }
        if (acts.length < 200) break;
    }
    return Math.round((meters / 1609.344) * 10) / 10;
}

// Epoch seconds for midnight starting the current month/year in `tz`.
function periodStart(range, tz) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' })
            .formatToParts(new Date())
            .map((p) => [p.type, p.value]),
    );
    const y = Number(parts.year);
    const m = range === 'year' ? 0 : Number(parts.month) - 1;
    // Start from UTC midnight, then shift by the zone's offset at that
    // moment (measured against a UTC rendering so the runtime's own
    // timezone never leaks in).
    const utcMidnight = Date.UTC(y, m, 1);
    const asTz = new Date(new Date(utcMidnight).toLocaleString('en-US', { timeZone: tz }));
    const asUtc = new Date(new Date(utcMidnight).toLocaleString('en-US', { timeZone: 'UTC' }));
    return Math.floor((utcMidnight - (asTz - asUtc)) / 1000);
}
