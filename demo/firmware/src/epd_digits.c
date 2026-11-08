/**
 * @file epd_digits.c
 * @brief Seven-segment digits for the 1bpp canvas.
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#include "epd_digits.h"

/* Segment bits: a is the top bar, then clockwise b..f, g is the middle bar. */
#define SEG_A 0x01
#define SEG_B 0x02
#define SEG_C 0x04
#define SEG_D 0x08
#define SEG_E 0x10
#define SEG_F 0x20
#define SEG_G 0x40

static const uint8_t SG_MASK[10] = {
    /* 0 */ SEG_A | SEG_B | SEG_C | SEG_D | SEG_E | SEG_F,
    /* 1 */ SEG_B | SEG_C,
    /* 2 */ SEG_A | SEG_B | SEG_G | SEG_E | SEG_D,
    /* 3 */ SEG_A | SEG_B | SEG_G | SEG_C | SEG_D,
    /* 4 */ SEG_F | SEG_G | SEG_B | SEG_C,
    /* 5 */ SEG_A | SEG_F | SEG_G | SEG_C | SEG_D,
    /* 6 */ SEG_A | SEG_F | SEG_G | SEG_E | SEG_C | SEG_D,
    /* 7 */ SEG_A | SEG_B | SEG_C,
    /* 8 */ SEG_A | SEG_B | SEG_C | SEG_D | SEG_E | SEG_F | SEG_G,
    /* 9 */ SEG_A | SEG_B | SEG_C | SEG_D | SEG_F | SEG_G,
};

/** Vertical space each of the two stacked side segments occupies. */
static int16_t __half(int16_t h, int16_t t)
{
    int16_t v = (int16_t)((h - 3 * t) / 2);

    return (v > 0) ? v : 1;
}

int16_t epd_digit_draw(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, int16_t t,
                       uint8_t digit)
{
    uint8_t mask;
    int16_t half = __half(h, t);

    if (digit > 9 || w <= 2 * t || h <= 3 * t) {
        return w;
    }
    mask = SG_MASK[digit];

    if (mask & SEG_A) {
        epd_canvas_fill(cv, (int16_t)(x + t), y, (int16_t)(w - 2 * t), t, EPD_BLACK);
    }
    if (mask & SEG_D) {
        epd_canvas_fill(cv, (int16_t)(x + t), (int16_t)(y + h - t), (int16_t)(w - 2 * t), t, EPD_BLACK);
    }
    if (mask & SEG_G) {
        epd_canvas_fill(cv, (int16_t)(x + t), (int16_t)(y + t + half), (int16_t)(w - 2 * t), t,
                        EPD_BLACK);
    }
    if (mask & SEG_F) {
        epd_canvas_fill(cv, x, (int16_t)(y + t), t, half, EPD_BLACK);
    }
    if (mask & SEG_B) {
        epd_canvas_fill(cv, (int16_t)(x + w - t), (int16_t)(y + t), t, half, EPD_BLACK);
    }
    if (mask & SEG_E) {
        epd_canvas_fill(cv, x, (int16_t)(y + t + half + t), t, half, EPD_BLACK);
    }
    if (mask & SEG_C) {
        epd_canvas_fill(cv, (int16_t)(x + w - t), (int16_t)(y + t + half + t), t, half, EPD_BLACK);
    }
    return w;
}

int16_t epd_digit_number(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, int16_t t,
                         uint32_t value, uint8_t min_digits)
{
    uint8_t  buf[10];
    uint8_t  n = 0;
    int16_t  cx = x;
    uint8_t  pad;

    if (0 == value) {
        buf[n++] = 0;
    }
    while (value > 0 && n < sizeof(buf)) {
        buf[n++] = (uint8_t)(value % 10);
        value /= 10;
    }
    for (pad = n; pad < min_digits && pad < 10; pad++) {
        buf[pad] = 0;
    }
    if (pad > n) {
        n = pad;
    }

    while (n > 0) {
        n--;
        epd_digit_draw(cv, cx, y, w, h, t, buf[n]);
        cx = (int16_t)(cx + w + t);
    }
    return (int16_t)(cx - x);
}

void epd_digit_slash(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, int16_t t)
{
    int16_t steps = (int16_t)(h / 2);

    if (steps <= 0) {
        return;
    }
    for (int16_t i = 0; i < steps; i++) {
        int16_t px = (int16_t)(x + (w - t) - ((int32_t)(w - t) * i) / steps);
        int16_t py = (int16_t)(y + i * 2);

        epd_canvas_fill(cv, px, py, t, 2, EPD_BLACK);
    }
}
