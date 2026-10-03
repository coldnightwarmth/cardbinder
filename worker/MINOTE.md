# Shared Mi Note curator

`/minotecurator` uses the dedicated `cards-art-minote` Cloudflare Worker.
A SQLite Durable Object persists shared edits; WebSocket notifications refresh
open galleries after saves. The separate localhost:8016 studio stays local.

Anyone visiting the public curator may edit. Per-card revision checks reject
stale saves/imports instead of overwriting another visitor's work. Active drafts
are preserved when a remote update arrives; “Load saved version” resolves it.
Offline saves report failure rather than silently becoming local-only edits.

The published initial-edits.json seeds an empty store only. Existing browser
localStorage is not automatically uploaded. JSON backup imports can explicitly
bring those edits into the shared collection. The previous value of each changed
card is retained under `previous:<id>` in Durable Object storage.

From worker/: `npx wrangler deploy --config wrangler-minote.jsonc`.
Test: `node --test test/minote-studio-storage.test.mjs`.
