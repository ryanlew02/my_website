// Personal status endpoint — iOS Shortcuts automations on the phone push a
// short status string here whenever something happens (arrive at the gym,
// start a workout, alarm goes off), and the site's `status` command reads
// the latest one back. Only the derived status is ever stored or exposed —
// no coordinates.
//
//   POST /update   { "status": "lifting" }   (Bearer STATUS_TOKEN)
//   GET  /status   →  { "status": "lifting", "since": 1752264000000 }
//
// Secret (set with `wrangler secret put`): STATUS_TOKEN — shared with the
// phone's Shortcuts automations so only it can write.

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/update' && request.method === 'POST') {
            const auth = request.headers.get('Authorization') || '';
            if (auth !== `Bearer ${env.STATUS_TOKEN}`) return json({ error: 'unauthorized' }, 401);

            const body = await request.json().catch(() => ({}));
            const status = String(body.status || '').trim().slice(0, 80);
            if (!status) return json({ error: 'missing status' }, 400);

            await env.STATUS_KV.put('current', JSON.stringify({ status, since: Date.now() }));
            return json({ ok: true, status });
        }

        if (url.pathname === '/status' && request.method === 'GET') {
            // Same visitor cap as the miles endpoint: 5 reads/min per IP.
            const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
            const { success } = await env.RATE_LIMITER.limit({ key: ip });
            if (!success) return json({ error: 'rate limit exceeded — try again in a minute' }, 429);

            const override = scheduledOverride(env.TIMEZONE || 'America/Chicago');
            if (override) return json(override);

            const raw = await env.STATUS_KV.get('current');
            if (!raw) return json({ status: null });
            const { status, since } = JSON.parse(raw);
            return json({ status: display(status), since });
        }

        return json({ error: 'not found' }, 404);
    },
};

// What the raw phone status reads as on the site — the site prefixes
// "Ryan is ", so phrases must continue that sentence. Unknown statuses
// pass through unchanged.
const DISPLAY = {
    'at home': 'studying/chilling',
    'at home studying or chilling': 'studying/chilling',
    'at work': 'working',
    'at the gym': 'at the gym',
    'driving': 'driving',
    'driving from work': 'driving from work',
};

function display(raw) {
    return DISPLAY[String(raw).trim().toLowerCase()] || raw;
}

// Fixed schedule that trumps whatever the phone last pushed:
// 11pm–7am → sleeping; Tue/Thu/Sat 5–6pm → running. Times are wall-clock
// in `tz`, so DST is handled by the runtime. `since` is when the current
// window opened, so the site can show how long it's been going.
function scheduledOverride(tz, now = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short' })
            .formatToParts(now)
            .map((p) => [p.type, p.value]),
    );
    const hour = Number(parts.hour);
    const minsIntoWindow = (startHour) => ((hour - startHour + 24) % 24) * 60 + Number(parts.minute);
    if (hour >= 23 || hour < 7) {
        return { status: 'sleeping', since: now.getTime() - minsIntoWindow(23) * 60000 };
    }
    if (hour === 17 && ['Tue', 'Thu', 'Sat'].includes(parts.weekday)) {
        return { status: 'running', since: now.getTime() - minsIntoWindow(17) * 60000 };
    }
    return null;
}

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
