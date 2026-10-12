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
} = {}) {
  const base = new URL(baseUrl);
  const pending = new Map();
  const unavailable = new Set();
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
    if (!pending.has(ref.manifest)) {
      pending.set(ref.manifest, Promise.resolve().then(() => fetchManifest(new URL(ref.manifest, base).href)).catch(() => null));
    }
    const entries = await pending.get(ref.manifest);
    const asset = entries?.[ref.key];
    if (typeof asset !== 'string') return source;
    const preview = new URL(asset, base).href;
    return unavailable.has(preview) ? source : preview;
  }
  async function load(source, loader, options) {
    const preview = await urlFor(source, options);
    if (preview === source) return loader(source);
    try { return await loader(preview); }
    catch {
      unavailable.add(preview);
      return loader(source);
    }
  }
  return { urlFor, load };
}

const previews = createCardPreviewLoader();
export const cardPreviewUrl = previews.urlFor;
export const loadCardPreviewImage = previews.load;
