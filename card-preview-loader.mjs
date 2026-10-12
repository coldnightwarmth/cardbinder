import { CARD_PREVIEW_MANIFESTS, CARD_PREVIEW_WIDTH } from './card-preview-index.mjs';

async function requestManifest(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Preview manifest: ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

// Only thumbnail consumers opt into this loader. Inspection and export continue
// to use original artwork, including original animation data.
export function createCardPreviewLoader({
  baseUrl = new URL('./', import.meta.url),
  manifests = CARD_PREVIEW_MANIFESTS,
  fetchManifest = requestManifest,
  retryDelay = 30000,
  now = Date.now,
} = {}) {
  const base = new URL(baseUrl);
  const pending = new Map();
  // A timeout during startup must not disable small previews for the entire
  // visit. Retry only when another consumer asks after a cooldown, never in a loop.
  const manifestFailures = new Map();
  const unavailable = new Map();
  const retryMs = Math.max(1000, Number.isFinite(retryDelay) ? retryDelay : 30000);
  function coolingDown(failures, key) {
    const until = failures.get(key);
    if (until === undefined) return false;
    if (now() < until) return true;
    failures.delete(key);
    return false;
  }
  function markUnavailable(preview) {
    unavailable.delete(preview);
    unavailable.set(preview, now() + retryMs);
    // The asset manifest itself remains cached, but failed image entries should
    // not accumulate if a user browses many unavailable files during an outage.
    if (unavailable.size > 256) unavailable.delete(unavailable.keys().next().value);
  }
  function reference(source) {
    let url;
    try { url = new URL(source, base); } catch { return null; }
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
    const path = url.pathname.slice(base.pathname.length);
    const prefix = path.slice(0, path.lastIndexOf('/') + 1);
    const manifest = manifests[prefix];
    return manifest ? { key: path + url.search, manifest } : null;
  }
  async function urlFor(source, { width = CARD_PREVIEW_WIDTH } = {}) {
    if (!(width > 0 && width <= CARD_PREVIEW_WIDTH)) return source;
    const ref = reference(source);
    if (!ref) return source;
    if (coolingDown(manifestFailures, ref.manifest)) return source;
    if (!pending.has(ref.manifest)) {
      const request = Promise.resolve()
        .then(() => fetchManifest(new URL(ref.manifest, base).href))
        .then(entries => {
          if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
            throw new Error('Invalid preview manifest');
          }
          return entries;
        }).catch(() => {
          pending.delete(ref.manifest);
          manifestFailures.set(ref.manifest, now() + retryMs);
          return null;
        });
      pending.set(ref.manifest, request);
    }
    const entries = await pending.get(ref.manifest);
    const asset = entries?.[ref.key];
    if (typeof asset !== 'string') return source;
    let preview;
    try { preview = new URL(asset, base).href; } catch { return source; }
    return coolingDown(unavailable, preview) ? source : preview;
  }
  async function load(source, loader, options) {
    const preview = await urlFor(source, options);
    if (preview === source) return loader(source);
    try { return await loader(preview); }
    catch {
      markUnavailable(preview);
      return loader(source);
    }
  }
  return { urlFor, load };
}

const previews = createCardPreviewLoader();
export const cardPreviewUrl = previews.urlFor;
export const loadCardPreviewImage = previews.load;
