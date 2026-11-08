/**
 * @file epd_canvas.h
 * @brief Minimal 1bpp drawing surface for the 400x300 SSD2683 e-paper panel.
 *
 * The canvas owns a MONOCHROME frame buffer in the format the TDL display
 * stack expects: 1 bit per pixel, bit order LSB first inside each byte
 * (x & 7), and 1 = black / 0 = white. tdl_disp_dev_flush() diffs it against
 * what is on the panel and picks a partial or full refresh on its own, so the
 * caller only has to draw and flush.
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#ifndef __EPD_CANVAS_H__
#define __EPD_CANVAS_H__

#include "tuya_cloud_types.h"

#ifdef __cplusplus
extern "C" {
#endif

#define EPD_WIDTH  400
#define EPD_HEIGHT 300
#define EPD_STRIDE ((EPD_WIDTH + 7) / 8)

#define EPD_WHITE 0
#define EPD_BLACK 1

typedef struct {
    uint8_t *buf;    /* 1bpp pixels, EPD_STRIDE bytes per row */
    uint16_t width;  /* pixel width  */
    uint16_t height; /* pixel height */
    void    *priv;   /* TDL frame buffer backing `buf` */
} EPD_CANVAS_T;

/**
 * @brief Opens the on-board display and allocates the canvas buffer.
 *
 * @param cv Canvas to initialise; its buffer is cleared to white.
 * @return OPRT_OK on success.
 */
OPERATE_RET epd_canvas_open(EPD_CANVAS_T *cv);

/**
 * @brief Releases the canvas buffer and closes the display device.
 */
void epd_canvas_close(EPD_CANVAS_T *cv);

/**
 * @brief Fills the whole canvas with one colour.
 */
void epd_canvas_clear(EPD_CANVAS_T *cv, uint8_t color);

void epd_canvas_pixel(EPD_CANVAS_T *cv, int16_t x, int16_t y, uint8_t color);

/** @brief Solid rectangle. Coordinates outside the panel are clipped. */
void epd_canvas_fill(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, uint8_t color);

/** @brief Rectangle outline, `thick` pixels drawn inwards. */
void epd_canvas_frame(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, uint8_t color,
                      uint8_t thick);

/** @brief Checkerboard of `cell`-pixel squares, used to judge pixel fidelity. */
void epd_canvas_checker(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, uint8_t cell);

/** @brief Vertical/horizontal 1-pixel stripes (resolution test). */
void epd_canvas_stripes(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, uint8_t pitch,
                        bool vertical, uint8_t color);

/** @brief Copies a pre-rendered 400x300 1bpp frame (EPD_SCREEN_BYTES) onto the canvas. */
void epd_canvas_blit(EPD_CANVAS_T *cv, const uint8_t *src);

/**
 * @brief Pushes the canvas to the panel and waits for the waveform to finish.
 *
 * @param[out] elapsed_ms Optional; receives the wall-clock time of the flush.
 * @return OPRT_OK on success.
 */
OPERATE_RET epd_canvas_flush(EPD_CANVAS_T *cv, uint32_t *elapsed_ms);

#ifdef __cplusplus
}
#endif

#endif /* __EPD_CANVAS_H__ */
