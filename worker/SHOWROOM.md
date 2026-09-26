# Shared showroom

The browser connects automatically to the dedicated `cards-art-showroom` Worker,
using a SQLite Durable Object named `public-v1`. It is independent of wallet auth.
No wallet connection is required and no wallet holdings are mutated.

- One shared room, at most 24 simultaneous visitors and 24 held cards per visitor.
- Capsule avatars have no player collision or names. Presence uses at most fifteen
  small updates per second while moving, with timestamped interpolation and
  bounded prediction. Three final samples settle the avatar when movement stops.
- Binder selection/open pages stay local. Held cards are lightweight two-sided models with collection-specific backs
  resolved from the site's catalog; no arbitrary remote image URLs are accepted.
- Borrowed cards have server-generated IDs. Server-serialized place/grab actions
  enforce one holder or pedestal per card. Anyone may pick up any displayed card.
- Ritual start is server-timed; an alarm clears all three slots after 6.35 seconds,
  even if no browsers remain open. Joiners receive the current ritual timestamp.
- Disconnect returns cards in that player's hand. Pedestal cards persist, and can
  be retrieved by another visitor. Reconnect automatically fetches a fresh state.
- The shared wallet seating registry is append-only and checked against the public
  binder directory. Only its physical layout is shared, not binder browsing.
- Reconnection happens automatically without a status overlay. Shared actions
  fail safely when disconnected instead of creating an incompatible local
  pedestal state.

## Commands

From `worker/`: `npm run dev:showroom` starts the local WebSocket server on port
8788. Open `http://localhost:8000/show/?multiplayerLocal` in two browser windows.
The normal `/show/` URL uses the deployed service, including from localhost:8000.

`npm run deploy:showroom` rebuilds the card ID allowlist and deploys the Worker.
Run this after adding collections/cards. The frontend is still published through
the normal repository website workflow.

Run `node --test worker/test/showroom*.test.mjs` and
`node scripts/verify-browser-runtime.mjs` from the repository root.

The service is continuously available without a computer running locally.
Cloudflare free quotas still apply; exceeding them can interrupt multiplayer.
Hibernating sockets, automatic ping replies, and no stationary position updates
avoid keeping an idle room active. No paid-plan upgrade was configured.
