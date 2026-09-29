#!/usr/bin/env python3
"""Re-split the EarlySummer webfont into unicode-range shards sized by what
pages actually use, not by an arbitrary char-set order.

Two findings drive the design (measured on this site, see note/report/perf):
  - pure frequency ordering does NOT help: an article's char set spans the whole
    frequency range, so it still touches (and downloads) nearly every shard band;
  - what cuts bytes is co-occurrence: chars that appear in the same article must
    land in the same shard, so a page pulls its own vocabulary cluster plus the
    shared high-frequency core, and nothing else.

Pipeline (deterministic, re-runnable):
  1. source font   : EarlySummerSerif 1.003 variable OTF (CFF2 + fvar wght 250-900),
                     verified glyph-identical to the shards shipped by the theme
  2. core shards   : top --core-size chars of scripts/data/zhihu-char-freq.csv
                     (7423 通用规范汉字, 600M-char Zhihu corpus), packed at --core-cap
  3. clustered     : remaining chars grouped by article co-occurrence — pages of
                     --corpus processed longest-first, their not-yet-assigned chars
                     packed at --cap into shared running chunks
  4. tail shards   : universe chars unused by any page, by codepoint, at --tail-cap
  5. universe      : old shard union (font.css) ∪ (freq ∩ cmap) ∪ (corpus ∩ cmap)
                     — never narrower than what ships today (compatibility rule)
  6. per chunk     : fontTools.subset -> woff2 (fvar kept, cmap exactness asserted),
                     filename = sha256(content)[:32], single-line @font-face output

Usage:
  python scripts/split-earlysummer.py \
      --src TEMP/font-src/VF1003/EarlySummerSerif-VF.otf \
      --out TEMP/font-split --css-out TEMP/faces.css
  # add --apply to patch src/styles/font.css and drop superseded shards from --out
"""
import argparse
import hashlib
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FACE_RE = re.compile(r'@font-face\{font-family:"EarlySummer";[^}]*\}')


def parse_old_union(css_path: Path) -> set:
    """Codepoint union of the EarlySummer faces currently in font.css."""
    union = set()
    for body in FACE_RE.findall(css_path.read_text(encoding='utf-8')):
        m = re.search(r'url\(([^)]*)\)', body)
        r = re.search(r'unicode-range:\s*([^;}]+)', body)
        if not m or 'EarlySummer-VF-Subset' in m.group(1) or not r:
            continue
        for part in r.group(1).split(','):
            mm = re.fullmatch(r'U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?', part.strip())
            if not mm:
                continue
            a = int(mm.group(1), 16)
            z = int(mm.group(2), 16) if mm.group(2) else a
            union.update(range(a, z + 1))
    return union


def load_freq(freq_path: Path) -> list:
    chars = []
    seen = set()
    for line in freq_path.read_text(encoding='utf-8-sig').splitlines()[1:]:
        if not line.strip():
            continue
        ch = line.split(',', 1)[0]
        if len(ch) == 1 and ch not in seen:
            seen.add(ch)
            chars.append(ch)
    return chars


def corpus_pages(corpus_dir: Path):
    """Article char sets, longest first (deterministic: length desc, name asc)."""
    pages = []
    for md in sorted(corpus_dir.glob('*.md')):
        text = md.read_text(encoding='utf-8')
        pages.append((md.name, {ord(c) for c in text}))
    pages.sort(key=lambda t: (-len(t[1]), t[0]))
    return pages


def build_chunks(freq_chars, cmap, old_union, pages, core_size, core_cap, cap, tail_cap,
                 core_page_freq, cluster_min_overlap):
    universe = old_union | {ord(c) for c in freq_chars if ord(c) in cmap}
    rank = {ord(c): i for i, c in enumerate(freq_chars)}

    # page frequency: how many corpus pages contain each character
    pagefreq = {}
    for _, chars in pages:
        for cp in chars & universe:
            pagefreq[cp] = pagefreq.get(cp, 0) + 1

    # core: general-frequency top-K plus site chars shared by >= core_page_freq pages
    core = {cp for cp in universe if rank.get(cp, 10 ** 9) < core_size}
    core |= {cp for cp, n in pagefreq.items() if n >= core_page_freq}
    core_sorted = sorted(core, key=lambda cp: (rank.get(cp, 10 ** 9), cp))
    chunks = []
    for i in range(0, len(core_sorted), core_cap):
        chunks.append(('core', core_sorted[i:i + core_cap]))

    # clustered: greedy co-occurrence — each char joins the chunk where the pages
    # containing it already have the most characters (genre clusters emerge)
    pages_of = {}
    for idx, (_, chars) in enumerate(pages):
        for cp in chars & universe:
            pages_of.setdefault(cp, []).append(idx)
    corpus_chars = set(pages_of)
    rest = sorted((set(universe) - core) & corpus_chars,
                  key=lambda cp: (-pagefreq.get(cp, 0), cp))
    members = []  # parallel to chunks beyond core: list of set(cp)
    pcount = []  # parallel: per chunk {page_idx: chars contributed}
    for cp in rest:
        mine = pages_of.get(cp, [])
        best_i, best_score = -1, 0
        for i, pc in enumerate(pcount):
            if len(members[i]) >= cap:
                continue
            score = sum(pc.get(p, 0) for p in mine)
            if score > best_score:
                best_i, best_score = i, score
        if best_i >= 0 and best_score >= cluster_min_overlap * max(1, len(mine)):
            members[best_i].add(cp)
            for p in mine:
                pcount[best_i][p] = pcount[best_i].get(p, 0) + 1
        else:
            members.append({cp})
            pcount.append({p: 1 for p in mine})
    for m in members:
        chunks.append(('corpus', sorted(m)))

    leftover = sorted(set(universe) - core - corpus_chars)
    for i in range(0, len(leftover), tail_cap):
        chunks.append(('tail', leftover[i:i + tail_cap]))

    covered = sorted(cp for _, ch in chunks for cp in ch)
    assert covered == sorted(universe), 'chunking must partition the universe exactly'
    return chunks, universe


def ranges_css(cps) -> str:
    parts = []
    start = prev = None
    for cp in sorted(cps):
        if start is None:
            start = prev = cp
        elif cp == prev + 1:
            prev = cp
        else:
            parts.append(f'U+{start:04X}' if start == prev else f'U+{start:04X}-{prev:04X}')
            start = prev = cp
    parts.append(f'U+{start:04X}' if start == prev else f'U+{start:04X}-{prev:04X}')
    return ','.join(parts)


def subset_chunk(src_font_path: Path, cps, out_dir: Path):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.desubroutinize = False
    font = subset.load_font(str(src_font_path), opts)
    ss = subset.Subsetter(opts)
    ss.populate(unicodes=list(cps))
    ss.subset(font)
    tmp = out_dir / 'chunk.tmp.woff2'
    subset.save_font(font, tmp, opts)
    data = tmp.read_bytes()
    name = hashlib.sha256(data).hexdigest()[:32] + '.woff2'
    final = out_dir / name
    tmp.replace(final)

    # gate 1: variation axes survive subsetting
    check = TTFont(str(final))
    if 'fvar' not in check:
        raise SystemExit(f'FVAR LOST in {name} — aborting (variable-font red line)')
    # gate 2: every requested codepoint must remain mapped
    # (the subsetter may keep extra codepoints that alias a retained glyph — harmless)
    got = set(check.getBestCmap())
    want = set(cps)
    missing = want - got
    if missing:
        raise SystemExit(f'CMAP MISMATCH in {name}: missing {len(missing)} of {len(want)} — aborting')
    return name, final.stat().st_size, ranges_css(cps)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='EarlySummerSerif-VF.otf (verified source)')
    ap.add_argument('--freq', default='scripts/data/zhihu-char-freq.csv')
    ap.add_argument('--corpus', default='src/content/posts')
    ap.add_argument('--old-css', default='src/styles/font.css')
    ap.add_argument('--out', default='public/fonts/EarlySummer-VF-Split')
    ap.add_argument('--css-out', required=True, help='where to write the new @font-face block')
    ap.add_argument('--core-size', type=int, default=1000)
    ap.add_argument('--core-cap', type=int, default=200)
    ap.add_argument('--cap', type=int, default=200)
    ap.add_argument('--tail-cap', type=int, default=400)
    ap.add_argument('--core-page-freq', type=int, default=4,
                    help='site chars present in >= N corpus pages join the core')
    ap.add_argument('--cluster-min-overlap', type=float, default=0.6,
                    help='char joins a chunk when >= this fraction of its pages overlap it')
    ap.add_argument('--apply', action='store_true', help='patch font.css + delete superseded shards')
    args = ap.parse_args()

    src = Path(args.src)
    out_dir = Path(args.out)
    old_union = parse_old_union(Path(args.old_css))
    cmap = TTFont(str(src)).getBestCmap()
    freq_chars = load_freq(Path(args.freq))
    pages = corpus_pages(Path(args.corpus))
    chunks, universe = build_chunks(freq_chars, cmap, old_union, pages,
                                    args.core_size, args.core_cap, args.cap, args.tail_cap,
                                    args.core_page_freq, args.cluster_min_overlap)
    by_kind = {}
    for kind, ch in chunks:
        by_kind.setdefault(kind, []).append(len(ch))
    print(f'old_union={len(old_union)} universe={len(universe)} pages={len(pages)}')
    print('chunks: ' + ', '.join(f'{k}={len(v)} (chars {min(v)}..{max(v)})' for k, v in by_kind.items()))

    out_dir.mkdir(parents=True, exist_ok=True)
    faces = []
    total = 0
    for i, (kind, cps) in enumerate(chunks):
        name, size, rng = subset_chunk(src, cps, out_dir)
        faces.append((name, rng))
        total += size
        print(f'  [{i + 1}/{len(chunks)}] {kind:7s} {name} {size / 1024:.1f}KB chars={len(cps)}')
    print(f'total woff2: {total / 1048576:.2f}MB in {len(chunks)} shards')

    css_lines = [
        f'@font-face{{font-family:"EarlySummer";'
        f'src: url("/fonts/EarlySummer-VF-Split/{name}")format("woff2-variations");'
        f'font-display:swap;font-weight:400 700;'
        f'unicode-range:{rng};}}'
        for name, rng in faces
    ]
    css_out = Path(args.css_out)
    css_out.parent.mkdir(parents=True, exist_ok=True)
    css_out.write_text('\n'.join(css_lines) + '\n', encoding='utf-8', newline='\n')
    print(f'faces -> {css_out}')

    if args.apply:
        css_path = Path(args.old_css)
        text = css_path.read_text(encoding='utf-8')
        old_faces = FACE_RE.findall(text)
        if len(old_faces) < 10:
            raise SystemExit(f'unexpected: only {len(old_faces)} EarlySummer faces found in font.css')
        new_block = '\n'.join(css_lines)
        state = {'n': 0}

        def repl(_m):
            state['n'] += 1
            return new_block if state['n'] == 1 else ''

        text = re.sub(r'\n{3,}', '\n\n', FACE_RE.sub(repl, text))
        css_path.write_text(text, encoding='utf-8', newline='\n')
        keep = {name for name, _ in faces} | {'EarlySummer-VF-Subset.woff2'}
        removed = 0
        for f in out_dir.glob('*.woff2'):
            if f.name not in keep:
                f.unlink()
                removed += 1
        print(f'font.css patched ({len(old_faces)} old faces -> {len(faces)}); '
              f'removed {removed} superseded shards')


if __name__ == '__main__':
    sys.exit(main())
