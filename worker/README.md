# cards.art wallet authentication backend

This Cloudflare Worker provides server-verified Sign In With Solana, host-only
cookie sessions, public binder profiles, and owner-only binder customization
storage, including public per-card trade availability metadata. The Worker also
serves uncached live wallet holdings and maintains authoritative pack/redemption
status snapshots for Card NFT 2, Poncho Drifella, and Clear Cards every 12 hours.
Wallet responses also include compact collection/card references for assets such
as Clear Cards whose on-chain mint is assigned only after a pack is opened.

## Local development

From the repository root, run `python3 scripts/serve-local.py`. The local server
applies pending D1 migrations, starts the wallet Worker on port 8787, waits for
its health check, supplies the repository's local DAS endpoint, and then serves
the site on port 8000. While the site is running, the launcher monitors the
Worker and restarts it after repeated failed health checks. It also shuts down
the Worker when the site server exits. Any loopback origin (`localhost`,
`*.localhost`, `127.0.0.0/8`, or `[::1]`) and any frontend port is accepted by
the local Worker; this exception is enabled only by the local dev command.

To run the pieces separately, run `npm install`, `npm run db:migrate:local`, and
`npm run dev` in this directory, then serve the repository root on any local
port. Use `python3 scripts/serve-local.py --no-auth` when an auth Worker is
already running on port 8787.

The browser bundle is generated with `npm run build:browser` and committed as
`../wallet-auth.js` so GitHub Pages does not need a build step.

The Worker cron runs at 00:17 and 12:17 UTC. During local development, trigger
the same status refresh manually with Wrangler's scheduled-handler URL after
applying migrations.

## Production handoff

The public `api.cards.art` domain is attached to the Cloudflare Pages project
`cards-art-wallet-auth`. Deploy this API with `npm run deploy:pages` from this
directory (production branch `main`), using `wrangler.jsonc`. This builds the
supported-card index and Pages worker while retaining the project's existing
production secrets and D1 binding.

For a new environment, apply the D1 migrations and configure `RATE_LIMIT_SALT`
and `HELIUS_RPC_URL` as Pages project secrets. Do not copy credentials into the
repository or change the existing custom domain during a routine deployment.

`npm run deploy:worker` targets the separate, preexisting standalone Worker;
it does **not** update `api.cards.art`. Showroom multiplayer has its own Worker
and is deployed separately with `npm run deploy:showroom`.

The browser uses `https://api.cards.art/api` so the host-only session cookie is
same-site with `cards.art`. Keep the exact credentialed CORS allowlist; do not
replace it with `*`.

Before publishing the static site, run `npm run build` and verify that every
binder page loads the generated `wallet-auth.js`. The production API must
not set `ALLOW_LOCALHOST_ORIGINS`; production CORS remains limited to
`https://cards.art` and `https://www.cards.art`.
