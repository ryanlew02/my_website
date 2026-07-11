# strava-miles worker

Cloudflare Worker that proxies Strava for the site's `strava` terminal
command. It holds the API credentials as secrets and exposes only a mileage
number, so visitors can never pull activity or GPS data.

```
GET /miles?range=month  →  { "miles": 24.6, "range": "month" }
GET /miles?range=year   →  { "miles": 318.4, "range": "year" }
```

Responses are edge-cached for 15 minutes, and each visitor IP is limited to
5 requests per minute (429 beyond that).

## One-time setup

### 1. Get a refresh token with the right scope

The refresh token shown on https://www.strava.com/settings/api only has the
`read` scope, which cannot list activities. Mint one with `activity:read`:

1. Visit (with your client ID filled in):

   ```
   https://www.strava.com/oauth/authorize?client_id=YOUR_ID&redirect_uri=http://localhost&response_type=code&scope=activity:read
   ```

2. Approve, then copy the `code=...` value from the localhost URL you land on.

3. Exchange it:

   ```sh
   curl -X POST https://www.strava.com/oauth/token \
     -d client_id=YOUR_ID \
     -d client_secret=YOUR_SECRET \
     -d code=THE_CODE \
     -d grant_type=authorization_code
   ```

   The `refresh_token` in the response is the one to use below.

### 2. Deploy

From this directory:

```sh
npx wrangler login
npx wrangler secret put STRAVA_CLIENT_ID
npx wrangler secret put STRAVA_CLIENT_SECRET
npx wrangler secret put STRAVA_REFRESH_TOKEN
npx wrangler deploy
```

`wrangler deploy` prints the worker URL (something like
`https://strava-miles.<your-subdomain>.workers.dev`).

### 3. Point the site at it

In `script.js`, set `STRAVA_MILES_URL` to that URL plus `/miles`:

```js
var STRAVA_MILES_URL = 'https://strava-miles.<your-subdomain>.workers.dev/miles';
```

Sanity check: `curl 'https://strava-miles.<your-subdomain>.workers.dev/miles?range=year'`
