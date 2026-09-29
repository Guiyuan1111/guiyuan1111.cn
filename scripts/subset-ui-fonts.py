#!/usr/bin/env python3
"""Subset the four UI webfonts (Snell-Bold/Black, STIX, STIX-Italic) to the
characters the built site actually renders, plus a per-family safety margin
so future title/date/footer edits keep rendering in the same face.

Why: in the default sans body mode the preloaded subset of these faces is the
single largest per-page asset (~59KB of an ~84KB median page), yet they render
just the header Latin, the dates and the navbar/footer line — a few dozen
glyphs each. Since v1.0.16 each family gets the smallest charset that its
rendering role can ever need:

  - Snell-Black (font-title: the site header title only, a fixed config
    string): used ∪ digits ∪ title punctuation — no blanket ASCII.
  - Snell-Bold (font-time: dates; dateFormat variants may spell English
    months): used ∪ A-Za-z0-9 ∪ date punctuation.
  - STIX / STIX-Italic (serif-mode body Latin / navbar): used ∪ printable
    ASCII ∪ typographic extras — kept broad on purpose, serif body text may
    contain any ASCII.

After any config copy change, rerun this script (documented in
note/font-subset.md); characters outside the rebuilt subset fall back down
the font chain, and the font-cascade gate probes header rendering.

What it does:
  1. scans dist/**/*.html for text rendered with font-title / font-time /
     font-navbar classes (family → Snell-Black / Snell-Bold / STIX-Italic),
     plus every visible character for the STIX serif-mode face;
  2. charsets follow the per-family policy above, intersected with each
     source font's cmap (nothing outside the source can be kept);
  3. writes public/fonts/<stem>.subset.woff2 (originals stay untouched for
     provenance and regeneration) with red-line gates: fvar must survive iff
     the source had it, and every wanted codepoint must remain mapped;
  4. patches src/styles/font.css (src url + unicode-range per face) and the
     Snell preloads in src/layouts/Head.astro.

Run AFTER a build:  python scripts/subset-ui-fonts.py   (then rebuild so the
patched font.css/preloads flow into dist). Subset files are committed —
font.css references them directly, so CI/EdgeOne builds need them in-repo.
"""
from __future__ import annotations

import html as H
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
FONTS = ROOT / 'public' / 'fonts'
SOURCES = ROOT / 'src' / 'assets' / 'fonts'  # v1.0.17: source fonts live outside public/ (build-time only, never deployed)
FONT_CSS = ROOT / 'src' / 'styles' / 'font.css'
HEAD_ASTRO = ROOT / 'src' / 'layouts' / 'Head.astro'

# family -> (source file, dist class whose text reaches it, charset policy)
# policy 'title':   used ∪ digits ∪ title punctuation (header title is a fixed config string)
# policy 'date':    used ∪ A-Za-z0-9 ∪ date punctuation (dateFormat may spell English months)
# policy 'ascii':   used ∪ printable ASCII ∪ typographic extras (serif-mode body / navbar safety)
TARGETS = [
    ('Snell-Bold', 'Snell-Bold-SF.woff2', 'font-time', 'date'),
    ('Snell-Black', 'Snell-Black-SF.woff2', 'font-title', 'title'),
    ('STIX-Italic', 'STIX-Italic-VF.woff2', 'font-navbar', 'ascii'),
    ('STIX', 'STIX-VF.woff2', None, 'ascii'),  # serif-mode Latin: every page char counts
]

ASCII = set(range(0x20, 0x7F))
EXTRAS = '©·–—‘’“”„‹›«»•…€™№−°'
# all charsets are int codepoint sets (cmap keys are ints)
DIGITS = {ord(c) for c in '0123456789'}
LETTERS = {ord(c) for c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}
TITLE_PUNCT = {ord(c) for c in "-.,:;!?''\"()&%+·–—"}
DATE_PUNCT = {ord(c) for c in "-.,: /'’"}
TAG_RE = re.compile(r'<[^>]+>')
COMMENT_RE = re.compile(r'<!--.*?-->', re.S)
SCRIPT_RE = re.compile(r'<(script|style)\b[^>]*>.*?</\1>', re.S | re.I)


def class_chars(src: str, cls: str) -> set[int]:
    chars: set[int] = set()
    pat = re.compile(
        r'<([a-z0-9]+)[^>]*class="[^"]*\b' + cls + r'\b[^"]*"[^>]*>(.*?)</\1>',
        re.S | re.I,
    )
    for m in pat.finditer(src):
        chars.update(H.unescape(TAG_RE.sub('', m.group(2))))
    return chars


def visible_chars(src: str) -> set[int]:
    body = COMMENT_RE.sub('', src)
    body = SCRIPT_RE.sub('', body)
    return set(ord(c) for c in H.unescape(TAG_RE.sub('', body)))


def ranges_css(cps: set[int]) -> str:
    parts = []
    run_start = run_prev = None
    for cp in sorted(cps):
        if run_start is None:
            run_start = run_prev = cp
        elif cp == run_prev + 1:
            run_prev = cp
        else:
            parts.append(f'U+{run_start:04X}' if run_start == run_prev
                         else f'U+{run_start:04X}-{run_prev:04X}')
            run_start = run_prev = cp
    parts.append(f'U+{run_start:04X}' if run_start == run_prev
                 else f'U+{run_start:04X}-{run_prev:04X}')
    return ','.join(parts)


def build_charset(policy: str, used: set[int], cmap: set[int]) -> set[int]:
    if policy == 'title':
        safety = DIGITS | TITLE_PUNCT
    elif policy == 'date':
        safety = LETTERS | DIGITS | DATE_PUNCT
    elif policy == 'ascii':
        safety = ASCII | {ord(c) for c in EXTRAS}
    else:
        raise SystemExit(f'unknown charset policy: {policy}')
    want = (used | safety) & cmap
    if not want:
        raise SystemExit('empty charset — refusing to write a useless font')
    return want


def main() -> None:
    pages = sorted(DIST.glob('**/*.html'))
    if not pages:
        raise SystemExit('no dist pages found — run `pnpm build` first')

    per_class: dict[str, set[int]] = {}
    all_text: set[int] = set()
    for hp in pages:
        src = hp.read_text(encoding='utf-8')
        all_text |= visible_chars(src)
        for _, _, cls, _ in TARGETS:
            if cls:
                per_class.setdefault(cls, set()).update(class_chars(src, cls))

    css = FONT_CSS.read_text(encoding='utf-8')
    head = HEAD_ASTRO.read_text(encoding='utf-8')
    changed_css = False
    changed_head = False

    for family, source, cls, policy in TARGETS:
        src_path = SOURCES / source
        src_font = TTFont(src_path)
        cmap = set(src_font.getBestCmap())
        had_fvar = 'fvar' in src_font
        used = per_class.get(cls, set()) if cls else all_text
        want = build_charset(policy, used, cmap)

        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.desubroutinize = False
        font = subset.load_font(str(src_path), opts)
        ss = subset.Subsetter(opts)
        ss.populate(unicodes=list(want))
        ss.subset(font)
        out = FONTS / source.replace('.woff2', '.subset.woff2')
        subset.save_font(font, out, opts)

        # gates
        check = TTFont(out)
        if had_fvar != ('fvar' in check):
            raise SystemExit(f'{family}: fvar survival mismatch (source had fvar={had_fvar}) — aborting')
        got = set(check.getBestCmap())
        missing = want - got
        if missing:
            raise SystemExit(f'{family}: cmap lost {len(missing)} of {len(want)} wanted cps — aborting')

        old_bytes = src_path.stat().st_size
        new_bytes = out.stat().st_size
        url = f'/fonts/{out.name}'
        print(f'{family}: {len(cmap)} -> {len(got)} cps, '
              f'{old_bytes / 1024:.1f}KB -> {new_bytes / 1024:.1f}KB  ({url})')

        block_re = re.compile(
            r'@font-face\s*\{[^{}]*?font-family:\s*"' + re.escape(family) + r'"[^{}]*?\}',
            re.S,
        )
        block = css and block_re.search(css)
        if not block:
            raise SystemExit(f'{family}: @font-face block not found in font.css — aborting')
        new_block = re.sub(r'url\("[^"]+"\)', f'url("{url}")', block.group(0))
        new_block = re.sub(r'unicode-range:[^;]+;', f'unicode-range:{ranges_css(got)};', new_block)
        css = css.replace(block.group(0), new_block, 1)
        changed_css = True

        preload_old = f'/fonts/{source}'
        preload_new = url
        if preload_old in head:
            head = head.replace(preload_old, preload_new)
            changed_head = True

    FONT_CSS.write_text(css, encoding='utf-8')
    HEAD_ASTRO.write_text(head, encoding='utf-8')
    print(f'patched font.css={changed_css} Head.astro={changed_head}')
    print('NOTE: rebuild (pnpm build) so the patched references land in dist')


if __name__ == '__main__':
    sys.exit(main())
