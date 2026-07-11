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
            // A status pushed before (or masked by) an override "resumes"
            // when the window closes, so its age restarts at that boundary.
            const resumedAt = lastOverrideEnd(env.TIMEZONE || 'America/Chicago');
            return json({ status: display(status), since: Math.max(since, resumedAt) });
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RUN_DAYS = ['Tue', 'Thu', 'Sat'];

// Current wall-clock time in `tz` (DST handled by the runtime).
function wallClock(tz, now) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short' })
            .formatToParts(now)
            .map((p) => [p.type, p.value]),
    );
    return { hour: Number(parts.hour), minute: Number(parts.minute), weekday: parts.weekday };
}

// Fixed schedule that trumps whatever the phone last pushed:
// 11pm–7am → sleeping; Tue/Thu/Sat 5–6pm → running. `since` is when the
// current window opened, so the site can show how long it's been going.
function scheduledOverride(tz, now = new Date()) {
    const { hour, minute, weekday } = wallClock(tz, now);
    const minsIntoWindow = (startHour) => ((hour - startHour + 24) % 24) * 60 + minute;
    if (hour >= 23 || hour < 7) {
        return { status: 'sleeping', since: now.getTime() - minsIntoWindow(23) * 60000 };
    }
    if (hour === 17 && RUN_DAYS.includes(weekday)) {
        return { status: 'running', since: now.getTime() - minsIntoWindow(17) * 60000 };
    }
    return null;
}

// Epoch ms of the most recent override-window close: 7am daily (sleep),
// 6pm on run days. The fallback status's "as of" clock restarts here.
function lastOverrideEnd(tz, now = new Date()) {
    const { hour, minute, weekday } = wallClock(tz, now);
    const minsOfDay = hour * 60 + minute;

    let sleepEndAgo = minsOfDay - 7 * 60;
    if (sleepEndAgo < 0) sleepEndAgo += 24 * 60;

    let runEndAgo = Infinity;
    for (let d = 0; d < 7; d++) {
        if (RUN_DAYS.includes(DAYS[(DAYS.indexOf(weekday) - d + 7) % 7])) {
            const mins = d * 24 * 60 + (minsOfDay - 18 * 60);
            if (mins >= 0) { runEndAgo = mins; break; }
        }
    }

    return now.getTime() - Math.min(sleepEndAgo, runEndAgo) * 60000;
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
