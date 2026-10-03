export function normalize(item, v) {
  const num = (key, fallback) => {
    const value = v[key] ?? fallback;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(`Invalid ${key}`);
    return value;
  };
  const bound = (value, min, max) => Math.max(min, Math.min(max, value));
  const zoom = bound(num('zoom', 1), 1, 5);
  const scale = Math.max(2000 / item.width, 2800 / item.height) * zoom;
  const base = Math.min(1, 1440 / item.nameWidth, 176 / item.nameHeight);
  const nameZoom = bound(num('nameZoom', 1), .25, Math.min(4, 2000 / (item.nameWidth * base), 2800 / (item.nameHeight * base)));
  const nw = item.nameWidth * base * nameZoom, nh = item.nameHeight * base * nameZoom;
  const bw = 1053 / 1466 * 2000, bh = 386 / 2052 * 2800, cx = 749.5 / 1466 * 2000, cy = 1795 / 2052 * 2800;
  const bodyZoom = bound(num('bodyZoom', 1), .25, Math.min(4, 2000 / bw, 2800 / bh));
  const ink = v.ink ?? 'original';
  if (!['original', 'rainbow', 'prism', 'aurora', 'sunset', 'electric'].includes(ink)) throw Error('Unknown ink');
  return { zoom, x: bound(num('x', 0), -(item.width * scale - 2000) / 2, (item.width * scale - 2000) / 2),
    y: bound(num('y', 0), -(item.height * scale - 2800) / 2, (item.height * scale - 2800) / 2),
    nameZoom, nameX: bound(num('nameX', 0), nw / 2 - 1000, 1000 - nw / 2), nameY: bound(num('nameY', 0), nh / 2 - 207, 2800 - nh / 2 - 207),
    ink, body: v.body === true, bodyZoom,
    bodyX: bound(num('bodyX', 0), bw * bodyZoom / 2 - cx, 2000 - bw * bodyZoom / 2 - cx),
    bodyY: bound(num('bodyY', 0), bh * bodyZoom / 2 - cy, 2800 - bh * bodyZoom / 2 - cy) };
}
