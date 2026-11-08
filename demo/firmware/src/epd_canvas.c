/**
 * @file epd_canvas.c
 * @brief 1bpp canvas on top of the TDL display stack (SSD2683 e-paper).
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#include "epd_canvas.h"

#include <string.h>

#include "tal_api.h"
#include "tdl_display_manage.h"

/***********************************************************
***********************variable define**********************
***********************************************************/
static TDL_DISP_HANDLE_T       s_disp = NULL;
static TDL_DISP_FRAME_BUFF_T  *s_fb   = NULL;

/***********************************************************
***********************function define**********************
***********************************************************/
static inline void __set_pixel(EPD_CANVAS_T *cv, int16_t x, int16_t y, uint8_t color)
{
    uint8_t *p = cv->buf + (uint32_t)y * EPD_STRIDE + (x >> 3);
    uint8_t  m = (uint8_t)(1u << (x & 7));

    if (color) {
        *p |= m;
    } else {
        *p &= (uint8_t)~m;
    }
}

OPERATE_RET epd_canvas_open(EPD_CANVAS_T *cv)
{
    if (NULL == cv) {
        return OPRT_INVALID_PARM;
    }
    memset(cv, 0, sizeof(*cv));

    if (NULL == s_disp) {
        s_disp = tdl_disp_find_dev(DISPLAY_NAME);
        if (NULL == s_disp) {
            PR_ERR("epd: display \"%s\" not registered", DISPLAY_NAME);
            return OPRT_NOT_FOUND;
        }

        OPERATE_RET rt = tdl_disp_dev_open(s_disp);
        if (OPRT_OK != rt) {
            PR_ERR("epd: open failed, rt=%d", rt);
            s_disp = NULL;
            return rt;
        }
    }

    if (NULL == s_fb) {
        s_fb = tdl_disp_create_frame_buff(DISP_FB_TP_PSRAM, EPD_STRIDE * EPD_HEIGHT);
        if (NULL == s_fb) {
            PR_ERR("epd: frame buffer allocation failed");
            return OPRT_MALLOC_FAILED;
        }

        s_fb->fmt     = TUYA_PIXEL_FMT_MONOCHROME;
        s_fb->x_start = 0;
        s_fb->y_start = 0;
        s_fb->width   = EPD_WIDTH;
        s_fb->height  = EPD_HEIGHT;
        s_fb->len     = EPD_STRIDE * EPD_HEIGHT;
    }

    cv->buf    = s_fb->frame;
    cv->width  = EPD_WIDTH;
    cv->height = EPD_HEIGHT;
    cv->priv   = s_fb;

    epd_canvas_clear(cv, EPD_WHITE);

    return OPRT_OK;
}

void epd_canvas_close(EPD_CANVAS_T *cv)
{
    if (NULL != s_fb) {
        tdl_disp_free_frame_buff(s_fb);
        s_fb = NULL;
    }
    if (NULL != s_disp) {
        tdl_disp_dev_close(s_disp);
        s_disp = NULL;
    }
    if (NULL != cv) {
        memset(cv, 0, sizeof(*cv));
    }
}

void epd_canvas_clear(EPD_CANVAS_T *cv, uint8_t color)
{
    if (NULL == cv || NULL == cv->buf) {
        return;
    }
    memset(cv->buf, color ? 0xFF : 0x00, EPD_STRIDE * (uint32_t)cv->height);
}

void epd_canvas_pixel(EPD_CANVAS_T *cv, int16_t x, int16_t y, uint8_t color)
{
    if (NULL == cv || x < 0 || y < 0 || x >= (int16_t)cv->width || y >= (int16_t)cv->height) {
        return;
    }
    __set_pixel(cv, x, y, color);
}

void epd_canvas_fill(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, uint8_t color)
{
    if (NULL == cv || w <= 0 || h <= 0) {
        return;
    }

    int16_t x0 = (x < 0) ? 0 : x;
    int16_t y0 = (y < 0) ? 0 : y;
    int16_t x1 = x + w;
    int16_t y1 = y + h;

    if (x1 > (int16_t)cv->width) {
        x1 = (int16_t)cv->width;
    }
    if (y1 > (int16_t)cv->height) {
        y1 = (int16_t)cv->height;
    }
    if (x0 >= x1 || y0 >= y1) {
        return;
    }

    for (int16_t yy = y0; yy < y1; yy++) {
        uint8_t *row = cv->buf + (uint32_t)yy * EPD_STRIDE;
        for (int16_t xx = x0; xx < x1; xx++) {
            uint8_t *p = row + (xx >> 3);
            uint8_t  m = (uint8_t)(1u << (xx & 7));
            if (color) {
                *p |= m;
            } else {
                *p &= (uint8_t)~m;
            }
        }
    }
}

void epd_canvas_frame(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, uint8_t color,
                      uint8_t thick)
{
    if (thick == 0) {
        thick = 1;
    }
    for (uint8_t i = 0; i < thick; i++) {
        epd_canvas_fill(cv, x + i, y + i, w - 2 * i, 1, color);              /* top    */
        epd_canvas_fill(cv, x + i, y + h - 1 - i, w - 2 * i, 1, color);      /* bottom */
        epd_canvas_fill(cv, x + i, y + i, 1, h - 2 * i, color);              /* left   */
        epd_canvas_fill(cv, x + w - 1 - i, y + i, 1, h - 2 * i, color);      /* right  */
    }
}

void epd_canvas_checker(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, uint8_t cell)
{
    if (cell == 0) {
        cell = 1;
    }
    for (int16_t dy = 0; dy < h; dy += cell) {
        for (int16_t dx = 0; dx < w; dx += cell) {
            bool on = (((dx / cell) + (dy / cell)) & 1) != 0;
            epd_canvas_fill(cv, x + dx, y + dy, cell, cell, on ? EPD_BLACK : EPD_WHITE);
        }
    }
}

void epd_canvas_stripes(EPD_CANVAS_T *cv, int16_t x, int16_t y, int16_t w, int16_t h, uint8_t pitch,
                        bool vertical, uint8_t color)
{
    if (pitch == 0) {
        pitch = 1;
    }
    if (vertical) {
        for (int16_t dx = 0; dx < w; dx += pitch) {
            epd_canvas_fill(cv, x + dx, y, 1, h, color);
        }
    } else {
        for (int16_t dy = 0; dy < h; dy += pitch) {
            epd_canvas_fill(cv, x, y + dy, w, 1, color);
        }
    }
}

void epd_canvas_blit(EPD_CANVAS_T *cv, const uint8_t *src)
{
    if (NULL == cv || NULL == cv->buf || NULL == src) {
        return;
    }
    memcpy(cv->buf, src, EPD_STRIDE * (uint32_t)cv->height);
}

OPERATE_RET epd_canvas_flush(EPD_CANVAS_T *cv, uint32_t *elapsed_ms)
{
    if (NULL == cv || NULL == s_disp || NULL == s_fb) {
        return OPRT_INVALID_PARM;
    }

    SYS_TIME_T  t0 = tal_system_get_millisecond();
    OPERATE_RET rt = tdl_disp_dev_flush(s_disp, s_fb);
    uint32_t    dt = (uint32_t)(tal_system_get_millisecond() - t0);

    if (NULL != elapsed_ms) {
        *elapsed_ms = dt;
    }

    return rt;
}
