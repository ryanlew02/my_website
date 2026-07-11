# ryan-status worker

Cloudflare Worker behind the site's `status` terminal command. iOS Shortcuts
automations on the phone push a short status string whenever something
happens (arrive somewhere, workout starts, alarm goes off); the site reads
the latest one back. Only the status text is stored — never coordinates.

```
POST /update   { "status": "at the gym" }     Authorization: Bearer <STATUS_TOKEN>
GET  /status   →  { "status": "at the gym", "since": 1752264000000 }
```

The site prefixes "Ryan is ", and the worker maps raw phone statuses to
display phrases (`DISPLAY` in `src/index.js`): "at home" → studying/chilling,
"at work" → working, etc. Unknown statuses pass through unchanged.

A fixed schedule (in `TIMEZONE`, DST-aware) trumps the pushed status:
11pm–7am → "sleeping", Tue/Thu/Sat 5–6pm → "running", with `since` set to
the start of the window. Edit `scheduledOverride()` to change the windows.

Reads are rate-limited to 5/min per visitor IP. The write token lives in
`.status-token` (gitignored) and as the `STATUS_TOKEN` worker secret.

## Deploy

```sh
npx wrangler secret put STATUS_TOKEN   # paste the token
npx wrangler deploy
```

## Phone setup (iOS Shortcuts automations)

Each automation is a single "Get Contents of URL" action that fires on a
trigger. To create one:

1. Open **Shortcuts** → **Automation** tab → **+**.
2. Pick a trigger (e.g. **Arrive** → choose the gym). Select **Run
   Immediately** so it doesn't ask for confirmation each time.
3. Choose **New Blank Automation** → **Add Action** → search
   **Get Contents of URL** and configure it:
   - URL: `https://ryan-status.ryanlewan.workers.dev/update`
   - Expand **Show More**:
     - Method: **POST**
     - Headers: `Authorization` = `Bearer <token from .status-token>`
     - Request Body: **JSON**, one field: `status` = the text for this
       trigger (e.g. `at the gym`)
4. **Done.** Repeat for each trigger.

Suggested set: Time of Day 7am → "up and at it" · Arrive gym → "at the gym"
· Leave gym → "post-workout" · Arrive home → "at home" · Leave home → "out
and about" · Workout starts → "working out" · Sleep Focus on → "asleep" ·
CarPlay connects → "driving".

Location triggers need Shortcuts to have location permission (Settings →
Privacy → Location Services → Shortcuts → While Using / Always).

Sanity check from a laptop:

```sh
curl -X POST 'https://ryan-status.ryanlewan.workers.dev/update' \
  -H "Authorization: Bearer $(cat .status-token)" \
  -H 'Content-Type: application/json' \
  -d '{"status":"testing"}'
curl 'https://ryan-status.ryanlewan.workers.dev/status'
```
