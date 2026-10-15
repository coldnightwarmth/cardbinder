#!/usr/bin/env python3
"""Losslessly share identical GLB buffer-view payloads; leave sampler IDs intact.

Usage:
  python3 scripts/showroom-assets/optimize_drifmaker_glb.py input.glb --dry-run
  python3 scripts/showroom-assets/optimize_drifmaker_glb.py input.glb output.glb \
      --max-bytes 52428800

This changes only bufferViews[*].byteOffset and buffers[0].byteLength. Every
view keeps its index, length, stride, target, extensions and exact bytes. Thus
accessors, images, animation channels/samplers, skinning and geometry retain
their values without quantization, resampling, image conversion or compression
extensions. Verification is mandatory before output is written. Input files
are never overwritten, and existing destination files are not replaced.
"""
import argparse
import copy
import hashlib
import json
import pathlib
import struct
import sys

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942
# Deliberate loading budget, not a claim about the hosting provider's file cap.
TRANSFER_BUDGET = 50 * 1024 * 1024


def parse_glb(data):
    if len(data) < 20 or struct.unpack_from('<4sII', data) != (b'glTF', 2, len(data)):
        raise ValueError('Expected a complete glTF 2.0 binary with a valid length.')
    chunks, offset = [], 12
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError('Truncated GLB chunk header.')
        length, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        if length % 4 or offset + length > len(data):
            raise ValueError('Invalid or truncated GLB chunk length.')
        chunks.append((kind, data[offset:offset + length]))
        offset += length
    if chunks[0][0] != JSON_CHUNK or sum(kind == JSON_CHUNK for kind, _ in chunks) != 1 or sum(kind == BIN_CHUNK for kind, _ in chunks) != 1:
        raise ValueError('Expected exactly one leading JSON chunk and one BIN chunk.')
    document = json.loads(chunks[0][1].decode('utf-8'))
    binary = next(payload for kind, payload in chunks if kind == BIN_CHUNK)
    buffers = document.get('buffers', [])
    if len(buffers) != 1 or 'uri' in buffers[0] or not isinstance(buffers[0].get('byteLength'), int):
        raise ValueError('Only a single embedded GLB buffer is supported.')
    if not 0 <= len(binary) - buffers[0]['byteLength'] <= 3:
        raise ValueError('Embedded buffer length does not match the BIN chunk.')

    def inspect_extensions(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key == 'extensions':
                    def check_raw_offsets(extension):
                        if isinstance(extension, dict):
                            if 'buffer' in extension or 'buffers' in extension:
                                raise ValueError('An extension references a raw buffer; repacking would require extension-specific offset handling.')
                            for nested in extension.values():
                                check_raw_offsets(nested)
                        elif isinstance(extension, list):
                            for nested in extension:
                                check_raw_offsets(nested)
                    check_raw_offsets(child)
                inspect_extensions(child)
        elif isinstance(value, list):
            for child in value:
                inspect_extensions(child)

    inspect_extensions(document)
    for view in document.get('bufferViews', []):
        start, length = view.get('byteOffset', 0), view.get('byteLength')
        if view.get('buffer') != 0 or not isinstance(start, int) or not isinstance(length, int) or start < 0 or length < 0 or start + length > buffers[0]['byteLength']:
            raise ValueError('Buffer view points outside the embedded buffer.')
    return document, binary, chunks


def view_bytes(document, binary, view):
    start = view.get('byteOffset', 0)
    return binary[start:start + view['byteLength']]


def semantic_document(document):
    result = copy.deepcopy(document)
    result['buffers'][0].pop('byteLength', None)
    for view in result.get('bufferViews', []):
        view.pop('byteOffset', None)
    return result


def verify_equivalent(before, after):
    old, old_binary, old_chunks = parse_glb(before)
    new, new_binary, new_chunks = parse_glb(after)
    if semantic_document(old) != semantic_document(new):
        raise ValueError('Verification failed: semantic glTF fields changed.')
    for index, (old_view, new_view) in enumerate(zip(old.get('bufferViews', []), new.get('bufferViews', []))):
        if view_bytes(old, old_binary, old_view) != view_bytes(new, new_binary, new_view):
            raise ValueError(f'Verification failed: buffer view {index} changed bytes.')
    # Unrecognized optional GLB chunks have no standardized semantics; retain
    # their content and ordering verbatim rather than silently dropping them.
    extra = lambda chunks: [(kind, payload) for kind, payload in chunks if kind not in (JSON_CHUNK, BIN_CHUNK)]
    if extra(old_chunks) != extra(new_chunks):
        raise ValueError('Verification failed: optional GLB chunks changed.')
    return {
        'verified_buffer_views': len(old.get('bufferViews', [])),
        'verified_accessors': len(old.get('accessors', [])),
        'verified_images': len(old.get('images', [])),
        'verified_animations': len(old.get('animations', [])),
        'verified_animation_samplers': sum(len(animation['samplers']) for animation in old.get('animations', [])),
    }


def optimize_glb(data):
    document, binary, chunks = parse_glb(data)
    result = copy.deepcopy(document)
    packed = bytearray()
    seen, duplicate_views, reused_bytes = {}, 0, 0
    for view in result.get('bufferViews', []):
        payload = view_bytes(document, binary, view)
        digest = hashlib.sha256(payload).digest()
        # Compare actual bytes as well as hashes: even a hypothetical digest
        # collision cannot make this optimizer alter the source asset.
        matches = seen.setdefault(digest, [])
        offset = next((start for existing, start in matches if existing == payload), None)
        if offset is None:
            packed.extend(b'\0' * (-len(packed) % 4))
            offset = len(packed)
            packed.extend(payload)
            matches.append((payload, offset))
        else:
            duplicate_views += 1
            reused_bytes += len(payload)
        view['byteOffset'] = offset
    result['buffers'][0]['byteLength'] = len(packed)
    packed.extend(b'\0' * (-len(packed) % 4))
    encoded = json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    encoded += b' ' * (-len(encoded) % 4)
    output_chunks = []
    for kind, payload in chunks:
        payload = encoded if kind == JSON_CHUNK else bytes(packed) if kind == BIN_CHUNK else payload
        output_chunks.append(struct.pack('<II', len(payload), kind) + payload)
    length = 12 + sum(map(len, output_chunks))
    output = struct.pack('<4sII', b'glTF', 2, length) + b''.join(output_chunks)
    verified = verify_equivalent(data, output)
    report = {
        'input_bytes': len(data), 'output_bytes': len(output),
        'saved_bytes': len(data) - len(output),
        'saved_percent': round((len(data) - len(output)) * 100 / len(data), 3),
        'duplicate_views': duplicate_views, 'reused_payload_bytes': reused_bytes,
        'transfer_budget_bytes': TRANSFER_BUDGET, 'fits_transfer_budget': len(output) <= TRANSFER_BUDGET,
        'headroom_bytes': TRANSFER_BUDGET - len(output),
        'input_sha256': hashlib.sha256(data).hexdigest(),
        'output_sha256': hashlib.sha256(output).hexdigest(),
        **verified,
    }
    return output, report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('input', type=pathlib.Path)
    parser.add_argument('output', nargs='?', type=pathlib.Path)
    parser.add_argument('--dry-run', action='store_true', help='Verify and report without writing an output file.')
    parser.add_argument('--max-bytes', type=int, help='Fail without writing if optimized GLB exceeds this size.')
    args = parser.parse_args(argv)
    if not args.dry_run and args.output is None:
        parser.error('An explicit output path is required unless --dry-run is used.')
    if args.output and args.input.resolve() == args.output.resolve():
        parser.error('Input and output must differ; in-place mutation is not supported.')
    if args.max_bytes is not None and args.max_bytes < 1:
        parser.error('--max-bytes must be positive.')
    try:
        optimized, report = optimize_glb(args.input.read_bytes())
        report['input'] = str(args.input)
        report['output'] = str(args.output) if args.output else None
        report['dry_run'] = args.dry_run
        if args.max_bytes and len(optimized) > args.max_bytes:
            print(json.dumps(report, indent=2))
            raise ValueError(f'Optimized asset exceeds the requested {args.max_bytes}-byte limit; no output written.')
        if not args.dry_run:
            with args.output.open('xb') as target:
                target.write(optimized)
        print(json.dumps(report, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError, struct.error) as error:
        print(f'GLB optimization failed: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
