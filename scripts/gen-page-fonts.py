#!/usr/bin/env python3
"""Generate per-page exact webfont subsets for every built page where they beat
the unicode-range shards (composite optimization on top of the sharded faces).

How it works:
  - reads the BUILT html pages (run `pnpm build` first), extracts each page's
    visible character set, and subsets scripts/data/EarlySummer-universe.woff2
    (glyph-identical to the shipped shards, verified) down to exactly those chars
  - writes public/fonts/earlysummer-pages/<sha256[:16]>.woff2 plus a manifest
  - a page gets an entry only when the subset is SMALLER than the shard traffic
    it displaces — aggregate pages (index, tag hubs) keep the shard mechanism
  - scripts/apply-page-fonts.mjs injects the matching @font-face into built html
    at the end of `pnpm build`; pages missing from a stale subset fall through to
    the shards by cmap fallback, so staleness is self-healing, never broken

Run locally after content changes (requires python + fontTools + brotli):
  pnpm build && python scripts/gen-page-fonts.py
  (then commit the regenerated fonts + manifest; CI builds need no python)
"""
import argparse
import hashlib
import html as htmllib
import json
import re
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FACE_RE = re.compile(r'@font-face\{font-family:"EarlySummer";[^}]*\}')
TAG_RE = re.compile(r'<[^>]+>')
SCRIPT_RE = re.compile(r'<script[\s\S]*?</script>', re.I)
STYLE_RE = re.compile(r'<style[\s\S]*?</style>', re.I)
COMMENT_RE = re.compile(r'<!--[\s\S]*?-->')


def visible_chars(html_text: str) -> set:
    text = SCRIPT_RE.sub(' ', html_text)
    text = STYLE_RE.sub(' ', text)
    text = COMMENT_RE.sub(' ', text)
    text = TAG_RE.sub(' ', text)
    text = htmllib.unescape(text)
    return {ord(c) for c in text}


def shard_faces(css_path: Path):
    """[(filename, frozenset(cps))] for every ranged EarlySummer face."""
    faces = []
    for body in FACE_RE.findall(css_path.read_text(encoding='utf-8')):
        m = re.search(r'url\(([^)]*)\)', body)
        r = re.search(r'unicode-range:\s*([^;}]+)', body)
        if not m or not r:
            continue
        fname = m.group(1).strip().strip('"').split('/')[-1]
        if fname.startswith('EarlySummer-VF-Subset'):
            continue
        cps = set()
        for part in r.group(1).split(','):
            mm = re.fullmatch(r'U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?', part.strip())
            if not mm:
                continue
            a = int(mm.group(1), 16)
            z = int(mm.group(2), 16) if mm.group(2) else a
            cps.update(range(a, z + 1))
        faces.append((fname, cps))
    return faces


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist', default='dist')
    ap.add_argument('--universe', default='scripts/data/EarlySummer-universe.woff2')
    ap.add_argument('--css', default='src/styles/font.css')
    ap.add_argument('--out', default='public/fonts/earlysummer-pages')
    args = ap.parse_args()

    dist = Path(args.dist)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    faces = shard_faces(Path(args.css))
    shard_sizes = {}
    for fname, _ in faces:
        p = dist / 'fonts' / 'EarlySummer-VF-Split' / fname
        shard_sizes[fname] = p.stat().st_size if p.exists() else 0

    universe_font = TTFont(args.universe)
    universe_cmap = set(universe_font.getBestCmap())

    manifest = {}
    html_files = sorted(dist.rglob('*.html'))
    for hp in html_files:
        rel = hp.relative_to(dist).as_posix()
        cps = visible_chars(hp.read_text(encoding='utf-8')) & universe_cmap
        if len(cps) < 40:
            continue
        # shard traffic this page would trigger
        touched = {fname for fname, fcps in faces if cps & fcps}
        shard_bytes = sum(shard_sizes.get(f, 0) for f in touched)

        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.desubroutinize = False
        font = subset.load_font(args.universe, opts)
        ss = subset.Subsetter(opts)
        ss.populate(unicodes=sorted(cps))
        ss.subset(font)
        tmp = out_dir / 'page.tmp.woff2'
        subset.save_font(font, tmp, opts)
        data = tmp.read_bytes()
        if len(data) >= shard_bytes:
            tmp.unlink(missing_ok=True)
            print(f'  skip {rel}: subset {len(data) / 1024:.0f}KB >= shards {shard_bytes / 1024:.0f}KB')
            continue
        name = hashlib.sha256(data).hexdigest()[:16] + '.woff2'
        (out_dir / name).write_bytes(data)
        tmp.unlink(missing_ok=True)
        manifest[rel] = {
            'font': name,
            'bytes': len(data),
            'shardBytes': shard_bytes,
            'chars': len(cps),
        }
        print(f'  page {rel}: {len(data) / 1024:.0f}KB for {len(cps)} chars '
              f'(shards would be {shard_bytes / 1024:.0f}KB)')

    (out_dir / 'manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    keep = {'manifest.json', 'README.md'} | {v['font'] for v in manifest.values()}
    removed = 0
    for f in out_dir.glob('*'):
        if f.name not in keep:
            f.unlink()
            removed += 1
    total = sum(v['bytes'] for v in manifest.values())
    print(f'manifest: {len(manifest)} pages, {total / 1048576:.2f}MB page fonts; '
          f'removed {removed} stale files -> {args.out}/manifest.json')


if __name__ == '__main__':
    main()
