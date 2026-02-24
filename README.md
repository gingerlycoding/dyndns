# Dynamic DNS server

A Cloudflare Worker that updates DNS A records for gingerlycoding.com subdomains via the dyndns2 protocol. Designed for Ubiquiti Unifi gateways with WireGuard VPN that need stable hostnames despite dynamic residential IPs.

## Supported hostnames

Configured via the `ALLOWED_SUBDOMAINS` environment variable (comma-separated). Currently:

- `pawnee.gingerlycoding.com`
- `muncie.gingerlycoding.com`

## API

```
GET|POST|PUT https://dyndns.gingerlycoding.com/host/:id?ip=:ip
```

Where `:id` is `pawnee` or `muncie` and `:ip` is a valid IPv4 address.

Authentication: HTTP Basic Auth.

### Response codes (dyndns2 protocol)

| Body | Meaning |
|------|---------|
| `good <ip>` | DNS record updated |
| `nochg <ip>` | IP already matches, no change |
| `nohost` | Unknown hostname |
| `badauth` | Authentication failed (HTTP 401) |
| `badip` | Missing or invalid IP address |
| `911` | Server error |

## Development

```bash
npm install
npm test        # run tests
npm run dev     # local dev server via wrangler
```

Test with curl:
```bash
curl -u user:pass "http://localhost:8787/host/pawnee?ip=1.2.3.4"
```

## Deployment

```bash
npm run deploy
```

### Required secrets

Set via `wrangler secret put <NAME>`:

| Secret | Purpose |
|--------|---------|
| `CF_API_TOKEN` | Cloudflare API token with Zone > DNS > Edit + Read for gingerlycoding.com |
| `CF_ZONE_ID` | Zone ID for gingerlycoding.com |
| `BASIC_AUTH_USERNAME` | Basic auth username |
| `BASIC_AUTH_PASSWORD` | Basic auth password |
| `ALLOWED_SUBDOMAINS` | Comma-separated list of allowed subdomains (e.g. `pawnee,muncie`) |

## Unifi gateway configuration

Configure a custom DDNS provider on each gateway:

- **Service**: Custom
- **Hostname**: `pawnee` (or `muncie`)
- **Server**: `dyndns.gingerlycoding.com/host/%h?ip=%i`
- **Username**: value of `BASIC_AUTH_USERNAME`
- **Password**: value of `BASIC_AUTH_PASSWORD`

## Debugging

Stream live logs from the deployed worker:
```bash
npx wrangler tail
```

Test the live endpoint:
```bash
curl -u user:pass "https://dyndns.gingerlycoding.com/host/pawnee?ip=1.2.3.4"
```

Common responses to check for:
- `good <ip>` — working correctly, DNS updated
- `nochg <ip>` — working correctly, IP already current
- `badauth` — check `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` secrets
- `nohost` — the subdomain isn't in `ALLOWED_SUBDOMAINS`, or the path format is wrong
- `911` — check `CF_API_TOKEN` permissions and `CF_ZONE_ID` value via `npx wrangler tail`
