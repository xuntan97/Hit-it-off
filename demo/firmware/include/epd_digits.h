/**
 * @file epd_digits.h
 * @brief Seven-segment digits drawn straight onto the 1bpp canvas.
 *
 * The panel is 1 bit with no grey, and hand-drawn bitmap fonts at small sizes
 * smear on this glass. Digits built from rectangles stay legible at any size and
 * need no glyph data, so the firmware can draw counters it only learns at
 * runtime — the beast deck size, for example, grows when a new beast is written
 * to the badge.
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#ifndef __EPD_DIGITS_H__
#define __EPD_DIGITS_H__

#include "epd_canvas.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Draws one digit in seven-segment style.
 *
 * @param w Total cell width in pixels (including stroke).
 * @param h Total cell height.
 * @param t Stroke thickness.
 * @return Cell width actually used, so callers can chain digits.
 */
int16_t epd_digit_draw(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, int16_t t,
                       uint8_t digit);

/**
 * @brief Draws an unsigned number, left aligned, with optional zero padding.
 *
 * @param min_digits Pads on the left with zeros when the value is shorter.
 * @return Width in pixels occupied by the number.
 */
int16_t epd_digit_number(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, int16_t t,
                         uint32_t value, uint8_t min_digits);

/** @brief Draws a single slash, for counters such as "2 / 3". */
void epd_digit_slash(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, int16_t t);

#ifdef __cplusplus
}
#endif

#endif /* __EPD_DIGITS_H__ */
