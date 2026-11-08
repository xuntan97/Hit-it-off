#!/usr/bin/env python3
"""Render the 400x300 e-paper screens for 一触即合.

Everything is composed at the panel's native resolution in 1 bit per pixel, so
what you see in the PNG is exactly what the SSD2683 will show (no anti
aliasing survives). The same module exports the frames as a C array that the
firmware blits straight into its TDL frame buffer.

Layout rule for every screen: art owns the left ~63% of the panel, identity or
lore text sits in a narrow right column, separated by a single hairline. That
keeps the picture big enough to read on a 400x300 1-bit panel while still
saying who this is.

Usage:
    python3 tools/epd_render.py preview [a|b]   # contact sheet + individual PNGs
    python3 tools/epd_render.py frames  [a|b]   # frames/ .bin + board-frames.js
"""

from __future__ import annotations

import base64
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 400, 300
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
OUT = os.path.join(ROOT, "epd-out")

CN_FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"
EN_FONT = "/System/Library/Fonts/HelveticaNeue.ttc"

# Panel split: art panel on the left, text column on the right.
ART_W = 252
COL_X = ART_W + 13
COL_R = W - 12
COL_W = COL_R - COL_X  # 123 px of usable text width

BRAND = "一触即合"

# Two people, two badges. Same hardware, same firmware — only this data differs,
# so `emit a` / `emit b` decides which one gets flashed.
PROFILES = {
    "a": {
        "name": "谈轩庭",
        "mbti": "ENFJ",
        "zodiac": "双鱼座",
        "tags": ["徒步", "篮球", "狼人杀"],
        "serial": "No.0001",
        "art": "card-me.jpg",
        "art_zoom": 1.04,
        "art_anchor": (0.47, 0.40),
        "deck": ["baize", "qingluan"],
        # Pages the badge can be sent over USB. 琮光 is not part of the starter
        # gift: it only exists once the owner has walked 良渚 and claimed it in
        # the web demo, which is what the live demo is for.
        "transfer": ["baize", "qingluan", "congguang"],
    },
    "b": {
        "name": "爱吃香菜",
        "mbti": "INFP",
        "zodiac": "巨蟹座",
        "tags": ["咖啡", "国漫", "植物"],
        "serial": "No.0002",
        "art": "card-other.jpg",
        "art_zoom": 1.02,
        "art_anchor": (0.50, 0.42),
        "deck": ["baize", "qingluan", "xinggui"],
        "transfer": ["baize", "qingluan", "xinggui"],
    },
}

# Every beast that can appear on a badge. A profile's `deck` picks which ones.
BEASTS = {
    "baize": {
        "name": "白泽", "role": "司好奇与提问", "series": "五灵 · 注册礼",
        "verse": "「一问万象开。」", "todo": "问一个好问题",
        "art": "beast-baize.jpg",
    },
    "qingluan": {
        "name": "青鸾", "role": "司表达与知音", "series": "五灵 · 注册礼",
        "verse": "「山有回音，人有回响。」", "todo": "先开口",
        "art": "beast-qingluan.jpg",
    },
    "xinggui": {
        "name": "星轨青鸾", "role": "司召唤同好", "series": "联动限定",
        "verse": "「在另一个世界，也要主动开口。」", "todo": "喊出你的本命",
        "art": "beast-xinggui.jpg",
    },
    "congguang": {
        "name": "琮光", "role": "司守护与来处", "series": "良渚限定",
        "verse": "「把走过的路，刻成身上的纹。」", "todo": "讲一个你走过的故事",
        "art": "beast-congguang.jpg",
    },
}


# --------------------------------------------------------------------------
# dithering
# --------------------------------------------------------------------------
def bayer_matrix(n: int) -> list[list[int]]:
    m = [[0]]
    size = 1
    while size < n:
        m = [[4 * v for v in row] + [4 * v + 2 for v in row] for row in m] + [
            [4 * v + 3 for v in row] + [4 * v + 1 for v in row] for row in m
        ]
        size *= 2
    return m


BAYER8 = bayer_matrix(8)


def dither_bayer(img: Image.Image) -> Image.Image:
    """Ordered dithering — regular dot screen, reads as print, stable on e-ink."""
    g = img.convert("L")
    px = g.load()
    out = Image.new("1", g.size, 1)
    op = out.load()
    for y in range(g.height):
        for x in range(g.width):
            t = (BAYER8[y % 8][x % 8] + 0.5) / 64.0 * 255.0
            op[x, y] = 0 if px[x, y] < t else 1
    return out


DITHERS = {"bayer": dither_bayer}


def halftone(w: int, h: int, ratio: float) -> Image.Image:
    """Flat field of dots at the given ink coverage (1 = solid black)."""
    out = Image.new("1", (w, h), 1)
    op = out.load()
    for y in range(h):
        for x in range(w):
            t = (BAYER8[y % 8][x % 8] + 0.5) / 64.0
            op[x, y] = 0 if t < ratio else 1
    return out


# --------------------------------------------------------------------------
# text helpers — everything is thresholded, never anti aliased
# --------------------------------------------------------------------------
_MEASURE = ImageDraw.Draw(Image.new("1", (1, 1)))


def cn(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(CN_FONT, size, index=1 if bold else 0)


def en(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(EN_FONT, size, index=1 if bold else 0)


def text_bitmap(text: str, font, weight: int = 0) -> Image.Image:
    """Render text to a hard 1-bit mask (no grey), optional 1px embolden.

    Draw white-on-black rather than black-on-white: PIL's getbbox() treats any
    non-zero pixel as content, so a white (255) background would make the bbox
    the whole canvas and every right-aligned label would drift off screen.
    """
    pad = 4
    tmp = Image.new("L", (len(text) * font.size * 2 + pad * 2, font.size * 3 + pad * 2), 0)
    d = ImageDraw.Draw(tmp)
    d.text((pad, pad), text, font=font, fill=255)
    bbox = tmp.getbbox()
    if bbox is None:
        return Image.new("1", (1, 1), 1)
    mask = tmp.crop(bbox)
    mask = mask.point(lambda v: 0 if v > 110 else 255)
    bits = mask.convert("1")
    for _ in range(weight):
        bits = bits.filter(ImageFilter.MinFilter(3))
    return bits


def stamp(dst: Image.Image, bits: Image.Image, x: int, y: int) -> None:
    """Paste a 1-bit mask 'ink' onto a 1-bit canvas (0 = black)."""
    region = dst.crop((x, y, x + bits.width, y + bits.height))
    inv = bits.point(lambda v: 255 - v)
    region.paste(0, (0, 0), inv)
    dst.paste(region, (x, y))


def put(dst, text, font, x, y, weight=0, align="left") -> int:
    bits = text_bitmap(text, font, weight)
    if align == "right":
        x -= bits.width
    elif align == "center":
        x -= bits.width // 2
    stamp(dst, bits, x, y)
    return bits.width


def text_w(text: str, font) -> float:
    return _MEASURE.textlength(text, font=font)


def wrap(text: str, font, max_w: int) -> list[str]:
    """Greedy per-character wrap, but break after punctuation when possible.

    Chinese has no spaces to break on, and a blind character wrap leaves
    orphans like a lone "。」" on the second line. When a line overflows we back
    up to the last comma or full stop (~5 chars back) and break there, which
    keeps both lines balanced and the sentence readable.
    """
    BREAK_AFTER = "，。、；：！？"
    lines: list[str] = []
    cur = ""
    for ch in text:
        if ch == "\n":
            lines.append(cur)
            cur = ""
            continue
        if cur and text_w(cur + ch, font) > max_w:
            cut = -1
            for i in range(len(cur) - 1, max(0, len(cur) - 6), -1):
                if cur[i] in BREAK_AFTER:
                    cut = i + 1
                    break
            if cut > 0:
                lines.append(cur[:cut])
                cur = cur[cut:] + ch
            else:
                lines.append(cur)
                cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


def put_wrapped(dst, text, font, x, y, max_w, lh, weight=0) -> int:
    """Draw wrapped text, return the y position just past the last line."""
    for i, line in enumerate(wrap(text, font, max_w)):
        put(dst, line, font, x, y + i * lh, weight)
    return y + len(wrap(text, font, max_w)) * lh


def fit(img: Image.Image, w: int, h: int, zoom: float = 1.0, anchor=(0.5, 0.5)) -> Image.Image:
    """Cover-crop to the target box, with an optional zoom around an anchor."""
    sw, sh = img.size
    scale = max(w / sw, h / sh) * zoom
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    cx, cy = int(nw * anchor[0]), int(nh * anchor[1])
    left = min(max(cx - w // 2, 0), max(nw - w, 0))
    top = min(max(cy - h // 2, 0), max(nh - h, 0))
    return img.crop((left, top, left + w, top + h))


def load(name: str) -> Image.Image:
    return Image.open(os.path.join(ASSETS, name)).convert("L")


# --------------------------------------------------------------------------
# layout pieces
# --------------------------------------------------------------------------
def trim_white(img: Image.Image, cut: int = 246) -> Image.Image:
    """Drop the empty margin around a line drawing so the subject can be bigger."""
    mask = img.convert("L").point(lambda v: 255 if v < cut else 0)
    box = mask.getbbox()
    return img.crop(box) if box else img


def line_art(img: Image.Image, w: int, h: int, threshold: int = 212, thicken: int = 0,
             trim: bool = True) -> Image.Image:
    """Contain-fit a line drawing and hard-threshold it, keeping strokes solid.

    Dithering a pen-and-ink beast turns the body into speckle; a threshold keeps
    the drawing readable at 400px. `thicken` erodes the grey image first, which
    widens strokes by about one pixel.
    """
    g = trim_white(img) if trim else img
    g = g.convert("L")
    sw, sh = g.size
    scale = min(w / sw, h / sh)
    nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
    g = g.resize((nw, nh), Image.LANCZOS)
    g = g.point(lambda v: max(0, min(255, int((v - 128) * 1.35 + 128))))
    for _ in range(thicken):
        g = g.filter(ImageFilter.MinFilter(3))
    return g.point(lambda v: 0 if v < threshold else 255).convert("1")


def hairline(d: ImageDraw.ImageDraw, y: int, x0: int = COL_X, x1: int = COL_R) -> None:
    d.line([x0, y, x1, y], fill=0, width=1)


def pill(d: ImageDraw.ImageDraw, cv, text: str, x: int, y: int, size: int = 11,
         pad: int = 7, h: int = 22) -> int:
    """Outlined tag starting at x; returns the x just past it."""
    w = int(text_w(text, cn(size))) + pad * 2
    d.rectangle([x, y, x + w, y + h], outline=0, width=1)
    put(cv, text, cn(size), x + pad, y + (h - size) // 2 - 1)
    return x + w


# --------------------------------------------------------------------------
# screen 1 — the person card
# --------------------------------------------------------------------------
def layout_person(p: dict, dither: str = "bayer") -> Image.Image:
    """Portrait on the left two thirds, identity column on the right."""
    cv = Image.new("1", (W, H), 1)
    d = ImageDraw.Draw(cv)
    f = DITHERS[dither]

    art = f(fit(load(p["art"]), ART_W, H, zoom=p["art_zoom"], anchor=p["art_anchor"]))
    cv.paste(art, (0, 0))
    d.line([ART_W, 0, ART_W, H], fill=0, width=1)

    put(cv, "身份板", cn(12), COL_X, 13)
    put(cv, p["serial"], en(10), COL_R, 16, align="right")

    # Long nicknames (5+ chars) would run past the column, so shrink to fit
    # rather than clip — the name is the one thing that must stay readable.
    name_size = 26
    while name_size > 17 and text_w(p["name"], cn(name_size, True)) > COL_W:
        name_size -= 1
    put(cv, p["name"], cn(name_size, True), COL_X, 34)

    hairline(d, 76)
    put(cv, p["mbti"], en(22, True), COL_X, 86)
    put(cv, p["zodiac"], cn(14), COL_X, 118)

    hairline(d, 148)
    put(cv, "兴趣", cn(12), COL_X, 155)

    ty = 176
    for t in p["tags"]:
        pill(d, cv, t, COL_X + 1, ty, size=12, h=24)
        ty += 32

    put(cv, BRAND, cn(12), COL_X, H - 26)
    return cv


# --------------------------------------------------------------------------
# screens 2..n — the beast deck
# --------------------------------------------------------------------------
def layout_beast(b: dict, dither: str = "bayer") -> Image.Image:
    """Line-art beast on the left, lore column on the right, page number on the foot."""
    cv = Image.new("1", (W, H), 1)
    d = ImageDraw.Draw(cv)
    f = DITHERS[dither]

    art = line_art(load(b["art"]), ART_W - 22, H - 26, threshold=212)
    cv.paste(art, ((ART_W - art.width) // 2, (H - art.height) // 2))

    d.line([ART_W, 0, ART_W, H], fill=0, width=1)

    put(cv, b["series"], cn(12), COL_X, 13)
    put(cv, b["name"], cn(24, True), COL_X, 32)
    hairline(d, 74)
    put_wrapped(cv, b["role"], cn(12), COL_X, 88, COL_W, 17)

    put(cv, "今日宜", cn(12), COL_X, 119)
    put_wrapped(cv, b["todo"], cn(13), COL_X, 138, COL_W, 19)

    hairline(d, 180)
    put_wrapped(cv, b["verse"], cn(12), COL_X, 192, COL_W, 18)

    # "同行中" stays, but the counter ("2 / 3") is left blank on purpose: the
    # deck grows when a beast is written over USB, so every page renumbers
    # itself and only the firmware knows the current total.
    put(cv, "同行中", cn(12), COL_X, H - 26)
    return cv


# --------------------------------------------------------------------------
# screen 0 — nothing written yet
# --------------------------------------------------------------------------
def layout_empty() -> Image.Image:
    """The badge as it ships: a frame, a slot for a card, and no content.

    Drawn as a real screen rather than left white so that a blank badge reads
    as "waiting", not "broken" — it is the first thing the audience sees.
    """
    cv = Image.new("1", (W, H), 1)
    d = ImageDraw.Draw(cv)

    d.rectangle([12, 12, W - 13, H - 13], outline=0, width=1)

    # Dashed placeholder where the card will land.
    cx, cy, side = W // 2 - 50, 62, 100
    dash, gap = 7, 6
    for x in range(0, side, dash + gap):
        d.line([cx + x, cy, cx + min(x + dash, side), cy], fill=0)
        d.line([cx + x, cy + side, cx + min(x + dash, side), cy + side], fill=0)
    for y in range(0, side, dash + gap):
        d.line([cx, cy + y, cx, cy + min(y + dash, side)], fill=0)
        d.line([cx + side, cy + y, cx + side, cy + min(y + dash, side)], fill=0)

    # Two instructions only, and the address is set larger than the hint: at
    # 12px the CJK hint is still readable on this glass, but a URL in mixed case
    # and dots needs the extra pixel to survive the threshold.
    put(cv, "等待写入", cn(18, True), W // 2, 180, align="center")
    put(cv, "连上热点 HitItOff", cn(13), W // 2, 208, align="center")
    put(cv, "http://192.168.50.1", en(14, True), W // 2, 230, align="center")
    put(cv, "HIT IT OFF", en(10), W // 2, 262, align="center")
    return cv


def build_screens(board: str) -> list:
    """Screen list for one badge: the owner's card, then their beast deck."""
    p = PROFILES[board]
    keys = ["person"] + p["deck"]
    return [(k, (lambda k=k, p=p: screen_for(k, p))) for k in keys]


def screen_for(key: str, profile: dict) -> Image.Image:
    return layout_person(profile) if key == "person" else layout_beast(BEASTS[key])


# --------------------------------------------------------------------------
# output
# --------------------------------------------------------------------------
def frame_to_c_bytes(img: Image.Image) -> list[int]:
    """1bpp, LSB first inside each byte, 1 = black — the TDL canvas layout."""
    img = img.convert("1")
    out = []
    for y in range(H):
        for bx in range(0, W, 8):
            b = 0
            for i in range(8):
                if img.getpixel((bx + i, y)) == 0:  # PIL: 0 == black
                    b |= 1 << i
            out.append(b)
    return out


HEADER = """/**
 * @file epd_screens.h
 * @brief The one screen the firmware still carries itself (generated by
 *        tools/epd_render.py frames). Everything else arrives over USB.
 */

#ifndef __EPD_SCREENS_H__
#define __EPD_SCREENS_H__

#include "tuya_cloud_types.h"

#define EPD_SCREEN_BYTES (400 * 300 / 8)

/** The badge before anything has been written: frame + empty card slot. */
extern const uint8_t g_epd_empty[EPD_SCREEN_BYTES];

#endif /* __EPD_SCREENS_H__ */
"""


def cmd_preview(board: str) -> None:
    os.makedirs(OUT, exist_ok=True)
    frames = []
    for name, fn in build_screens(board):
        img = fn()
        img.save(os.path.join(OUT, f"{board}-{name}.png"))
        frames.append(img)

    empty = layout_empty()
    empty.save(os.path.join(OUT, "empty.png"))
    frames.append(empty)

    cols = 4
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("L", (cols * (W + 10) + 10, rows * (H + 10) + 10), 205)
    for i, img in enumerate(frames):
        sheet.paste(img.convert("L"), (10 + (i % cols) * (W + 10), 10 + (i // cols) * (H + 10)))
    sheet.save(os.path.join(OUT, f"{board}-sheet.png"))
    print("wrote", OUT, f"({len(frames)} screens for board {board})")


def cmd_frames(board: str) -> None:
    """Emit the frames the badge receives over USB, plus the blank state.

    The badge no longer flashes a fixed set of screens: the browser pushes the
    card and the beast pages down the USB cable, so the same firmware serves a
    badge with two beasts and one with three.
    """
    fw = os.path.expanduser("~/TuyaOpenIDE/projects/hit-it-off/source/embedded")
    outdir = os.path.join(OUT, "frames")
    os.makedirs(outdir, exist_ok=True)

    p = PROFILES[board]
    keys = ["person"] + p["transfer"]
    encoded: dict[str, str] = {}

    for slot, key in enumerate(keys):
        img = screen_for(key, p)
        img.save(os.path.join(outdir, f"{slot}-{key}.png"))
        raw = bytes(frame_to_c_bytes(img))
        assert len(raw) == W * H // 8, f"{key}: {len(raw)} bytes"
        with open(os.path.join(outdir, f"{slot}-{key}.bin"), "wb") as fp:
            fp.write(raw)
        encoded[key] = base64.b64encode(raw).decode()
        print(f"slot {slot}  {key:<10} {len(raw)} bytes  ->  frames/{slot}-{key}.bin")

    web_js = os.path.join(ROOT, "board-frames.js")
    lines = [
        "/* Generated by `python3 tools/epd_render.py frames` — do not hand-edit.",
        " *",
        " * 400x300, 1 bit per pixel, LSB first inside each byte, 1 = black.",
        " * Base64 on purpose: the demo is opened straight from disk in some",
        " * setups, where fetch() of a sibling .bin is blocked by the browser.",
        " */",
        "",
        "window.BOARD_DECK = " + json.dumps(p["transfer"]) + ";",
        "",
        "window.BOARD_FRAMES = {",
    ]
    for key in keys:
        lines.append(f'  "{key}": "{encoded[key]}",')
    lines.append("};")
    lines.append("")
    with open(web_js, "w") as fp:
        fp.write("\n".join(lines))
    print("wrote", web_js, f"({os.path.getsize(web_js) // 1024} KB)")

    # The blank state is the only screen the firmware itself has to draw before
    # the first upload — it must survive with no browser attached.
    empty = layout_empty()
    empty.save(os.path.join(OUT, "empty.png"))
    data = frame_to_c_bytes(empty)
    body = [
        "/**",
        " * @file epd_screens.c",
        " * @brief Blank-badge screen (generated by tools/epd_render.py frames).",
        " *",
        " * Format: 1 bit per pixel, LSB first inside each byte, 1 = black.",
        " * The person card and the beast pages are not compiled in: they are",
        " * pushed over USB by the web demo at run time.",
        " */",
        "",
        '#include "epd_screens.h"',
        "",
        "const uint8_t g_epd_empty[EPD_SCREEN_BYTES] = {",
    ]
    for i in range(0, len(data), 16):
        body.append("    " + ", ".join(f"0x{v:02X}" for v in data[i:i + 16]) + ",")
    body.append("};")
    body.append("")

    src_path = os.path.join(fw, "src", "epd_screens.c")
    inc_path = os.path.join(fw, "include", "epd_screens.h")
    with open(src_path, "w") as fp:
        fp.write("\n".join(body))
    with open(inc_path, "w") as fp:
        fp.write(HEADER)
    print("wrote", src_path)
    print("wrote", inc_path)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "preview"
    board = sys.argv[2] if len(sys.argv) > 2 else "a"
    if board not in PROFILES:
        raise SystemExit(f"unknown board {board!r}, pick one of {list(PROFILES)}")
    if cmd == "preview":
        cmd_preview(board)
    elif cmd == "frames":
        cmd_frames(board)
    else:
        raise SystemExit(f"unknown command {cmd}")
