/**
 * @file tuya_app_main.c
 * @brief 一触即合 (hit-it-off) firmware entry.
 *
 * The badge leaves the box blank. The web demo then pushes pages to it over the
 * badge's own Wi-Fi hotspot: first the owner's identity card and the two starter
 * beasts, later the 良渚 beast they claimed at the site. Nothing is compiled in
 * except the empty state, so the same firmware serves a badge with two pages and
 * one with three, and the page counter always tells the truth.
 *
 * Controls, mapped to the three buttons already registered by the board file:
 *   button1 (ENTER, P43)  switch between the identity card and the beast deck
 *   button2 (PGDN, P24)   next beast  (from the card: enter the deck)
 *   button3 (PGUP, P12)   previous beast
 *
 * A full-panel change takes 600-850 ms on this glass, so the handlers only
 * queue an event and the main loop renders one page at a time. The HTTP server
 * runs in its own task, so an upload that lands mid-refresh is still stored.
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#include <string.h>

#include "tal_api.h"
#include "tkl_output.h"
#include "board_com_api.h"
#include "tdl_button_manage.h"

#include "epd_canvas.h"
#include "epd_screens.h"
#include "epd_digits.h"
#include "board_link.h"
#include "board_http.h"

/***********************************************************
***********************variable define**********************
***********************************************************/
typedef enum {
    EV_NONE = 0,
    EV_TOGGLE, /* ENTER: card <-> deck */
    EV_NEXT,   /* PGDN */
    EV_PREV,   /* PGUP */
} EV_E;

#define EV_QUEUE_LEN 8

/* Page counter in the foot of every beast page. Big enough to read across a
 * table, small enough to sit on the same baseline as "同行中". */
#define CNT_W   9
#define CNT_H   15
#define CNT_T   2
#define CNT_GAP 4
#define CNT_Y   (EPD_HEIGHT - 27)
#define CNT_R   (EPD_WIDTH - 12)

static EPD_CANVAS_T sg_cv;

static volatile uint8_t sg_ev_queue[EV_QUEUE_LEN];
static volatile uint8_t sg_ev_head = 0;
static volatile uint8_t sg_ev_tail = 0;

static TDL_BUTTON_HANDLE sg_btn_enter = NULL;
static TDL_BUTTON_HANDLE sg_btn_next  = NULL;
static TDL_BUTTON_HANDLE sg_btn_prev  = NULL;

static uint8_t sg_last_beast = 1;

/***********************************************************
***********************function define**********************
***********************************************************/
static void __ev_push(EV_E ev)
{
    uint8_t next = (uint8_t)((sg_ev_head + 1) % EV_QUEUE_LEN);

    if (next == sg_ev_tail) {
        return; /* queue full — the user pressed faster than the glass refreshes */
    }
    sg_ev_queue[sg_ev_head] = (uint8_t)ev;
    sg_ev_head               = next;
}

static EV_E __ev_pop(void)
{
    EV_E ev;

    if (sg_ev_tail == sg_ev_head) {
        return EV_NONE;
    }
    ev         = (EV_E)sg_ev_queue[sg_ev_tail];
    sg_ev_tail = (uint8_t)((sg_ev_tail + 1) % EV_QUEUE_LEN);
    return ev;
}

/**
 * @brief Button callback — runs in the button task, so it must not flush the panel.
 */
static void __on_button(char *name, TDL_BUTTON_TOUCH_EVENT_E event, void *arg)
{
    if (TDL_BUTTON_PRESS_SINGLE_CLICK != event) {
        return;
    }

    if (0 == strcmp(name, BUTTON_NAME)) {
        __ev_push(EV_TOGGLE);
    } else if (0 == strcmp(name, BUTTON_NAME_2)) {
        __ev_push(EV_NEXT);
    } else if (0 == strcmp(name, BUTTON_NAME_3)) {
        __ev_push(EV_PREV);
    }
}

/** `cur / total` in seven-segment digits, right aligned in the text column. */
static void __draw_counter(uint8_t cur, uint8_t total)
{
    int16_t w1 = CNT_W;
    int16_t w2 = CNT_W;
    int16_t span = w1 + CNT_GAP + w2 + CNT_GAP + w2;
    int16_t x    = (int16_t)(CNT_R - span);

    epd_digit_number(&sg_cv, x, CNT_Y, CNT_W, CNT_H, CNT_T, cur, 1);
    x = (int16_t)(x + w1 + CNT_GAP);
    epd_digit_slash(&sg_cv, x, CNT_Y, 6, CNT_H, CNT_T);
    x = (int16_t)(x + 6 + CNT_GAP);
    epd_digit_number(&sg_cv, x, CNT_Y, CNT_W, CNT_H, CNT_T, total, 1);
}

static void __render(const char *why)
{
    BOARD_STATE_T *st    = board_link_state();
    const uint8_t *frame = NULL;
    uint32_t       ms    = 0;

    if (st->person_ready) {
        frame = board_link_frame(st->page);
        if (NULL == frame) {
            frame = board_link_frame(0);
        }
    }

    if (NULL == frame) {
        epd_canvas_blit(&sg_cv, g_epd_empty);
    } else {
        epd_canvas_blit(&sg_cv, frame);
        if (st->page > 0 && st->pages > 0) {
            __draw_counter(st->page, st->pages);
        }
    }

    OPERATE_RET rt = epd_canvas_flush(&sg_cv, &ms);
    PR_NOTICE("[%s] page %u/%u rt=%d %u ms", why, (unsigned)st->page, (unsigned)st->pages, rt,
              (unsigned)ms);
}

static TDL_BUTTON_HANDLE __button_init(const char *name)
{
    TDL_BUTTON_HANDLE handle = NULL;
    TDL_BUTTON_CFG_T  cfg    = {
        .long_start_valid_time     = 2000,
        .long_keep_timer           = 1000,
        .button_debounce_time      = 30,
        .button_repeat_valid_count = 3,
        .button_repeat_valid_time  = 300,
    };

    OPERATE_RET rt = tdl_button_create((char *)name, &cfg, &handle);
    if (OPRT_OK != rt) {
        PR_ERR("button \"%s\" create failed rt=%d", name, rt);
        return NULL;
    }

    tdl_button_event_register(handle, TDL_BUTTON_PRESS_SINGLE_CLICK, __on_button);
    PR_NOTICE("button \"%s\" ready", name);
    return handle;
}

static bool __handle_event(EV_E ev)
{
    BOARD_STATE_T *st = board_link_state();

    if (0 == st->pages) {
        /* Nothing written yet: the buttons have nothing to page through. */
        return false;
    }

    switch (ev) {
    case EV_TOGGLE:
        st->page = st->page ? 0 : (sg_last_beast > st->pages ? 1 : sg_last_beast);
        break;

    case EV_NEXT:
    case EV_PREV: {
        int8_t step = (EV_NEXT == ev) ? 1 : -1;

        if (0 == st->page) {
            st->page = (sg_last_beast > st->pages) ? 1 : sg_last_beast;
        } else {
            int16_t p = (int16_t)st->page + step;
            if (p < 1) {
                p = st->pages;
            } else if (p > st->pages) {
                p = 1;
            }
            st->page = (uint8_t)p;
        }
        sg_last_beast = st->page;
        break;
    }

    default:
        return false;
    }

    __render((EV_TOGGLE == ev) ? "enter" : (EV_NEXT == ev) ? "pgdn" : "pgup");
    return true;
}

static void user_main(void)
{
    SYS_TIME_T last_beat = 0;

    tal_log_init(TAL_LOG_LEVEL_DEBUG, 1024, (TAL_LOG_OUTPUT_CB)tkl_log_output);

    PR_NOTICE("==== hit-it-off ====");
    PR_NOTICE("board : %s", PLATFORM_BOARD);
    PR_NOTICE("build : %s %s", __DATE__, __TIME__);

    /* Wi-Fi needs storage for its config and a work queue for its events. The
     * examples all do this before anything else touches the network. */
    tal_kv_init(&(tal_kv_cfg_t){
        .seed = "vmlkasdh93dlvlcy",
        .key  = "dflfuap134ddlduq",
    });
    tal_sw_timer_init();
    tal_workq_init();

    OPERATE_RET rt = board_register_hardware();
    PR_NOTICE("board_register_hardware rt=%d", rt);

    rt = epd_canvas_open(&sg_cv);
    PR_NOTICE("epd_canvas_open rt=%d (%dx%d)", rt, EPD_WIDTH, EPD_HEIGHT);
    if (OPRT_OK != rt) {
        PR_ERR("display unavailable, nothing to draw");
        while (1) {
            tal_system_sleep(10000);
        }
    }

    board_link_init();

    sg_btn_enter = __button_init(BUTTON_NAME);
    sg_btn_next  = __button_init(BUTTON_NAME_2);
    sg_btn_prev  = __button_init(BUTTON_NAME_3);
    PR_NOTICE("buttons: enter=%d next=%d prev=%d", sg_btn_enter != NULL, sg_btn_next != NULL,
              sg_btn_prev != NULL);

    /* Blank screen first: starting the radio takes seconds, and a white panel
     * for that long reads as a broken badge. */
    __render("boot");

    rt = board_http_start();
    if (OPRT_OK != rt) {
        PR_ERR("upload server unavailable rt=%d — badge shows the blank state only", rt);
    }

    while (1) {
        EV_E ev = __ev_pop();

        if (EV_NONE != ev) {
            __handle_event(ev);
            continue;
        }

        if (board_link_state()->dirty) {
            board_link_clear_dirty();
            __render("wifi");
            continue;
        }

        if ((tal_system_get_millisecond() - last_beat) > 10000) {
            BOARD_STATE_T *st = board_link_state();

            last_beat = tal_system_get_millisecond();
            PR_NOTICE("[beat] person=%u pages=%u page=%u", (unsigned)st->person_ready,
                      (unsigned)st->pages, (unsigned)st->page);
        }

        tal_system_sleep(10);
    }
}

/**
 * @brief main
 */
#if OPERATING_SYSTEM == SYSTEM_LINUX
void main(int argc, char *argv[])
{
    user_main();
}
#else

static THREAD_HANDLE ty_app_thread = NULL;

static void tuya_app_thread(void *arg)
{
    user_main();

    tal_thread_delete(ty_app_thread);
    ty_app_thread = NULL;
}

void tuya_app_main(void)
{
    THREAD_CFG_T thrd_param = {0};

    thrd_param.stackDepth = 1024 * 6;
    thrd_param.priority   = THREAD_PRIO_1;
    thrd_param.thrdname   = "tuya_app_main";

    tal_thread_create_and_start(&ty_app_thread, NULL, NULL, tuya_app_thread, NULL, &thrd_param);
}
#endif
