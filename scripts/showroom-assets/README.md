# Showroom exhibit assets

These are separate showroom assets; the source GLBs and individual card viewer are unchanged.

Regenerate from the repository's originals:

```sh
cd scripts/showroom-assets
npm ci
npm run build
```

The build uses meshoptimizer simplification and Draco compression. The gremlin's unused color/metallic/emissive images are removed because its showroom finish is matte orange. Its retained normal map is resized to 512px. The clear frame's disconnected per-face vertices are welded, simplified and given smooth normals. Card face/back textures are not resized.

| Exhibit | Original triangles | Near triangles | Far triangles | Near bytes | Far bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gremlin | 695,096 | 59,984 | 9,600 | 299,228 | 62,192 |
| Dratini frame | 1,147,771 | 140,000 | 22,400 | 404,804 | 83,184 |

The showroom initially loads far assets (145,376 bytes combined). Near versions are loaded one at a time when approached, with texture upload and shader compilation using the existing frame scheduler. Detail and clear-material switches have distance hysteresis. Floor reflections temporarily use far geometry and non-transmissive clear proxies; close direct views retain their physical materials.

Measured frame times select three quality tiers after 2.5-second sampling windows, with cooldowns between changes. Reflection sizes are 256/512/1024 pixels and minimum update intervals are 100/66/33ms. The existing resolution controller remains separate. Quality changes are deferred during binder interaction and doorway crossings.

Validation: showroom tests cover adaptive quality, material restoration/disposal, and asset budgets. Browser screenshots were compared with the original GLBs at matching camera positions. The frame-facing draw reported about 299k triangles with optimized assets versus 2.31m with originals in the same setup; this is geometry workload, not an FPS benchmark. Actual Surface performance still needs testing on that device.
