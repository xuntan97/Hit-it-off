/**
 * @file board_link.c
 * @brief Page storage for the badge.
 *
 * Four slots of 15000 bytes each (400x300 at 1bpp) allocate once at boot and
 * are then handed out by index. Slot 0 is the identity card, 1..3 are the beast
 * pages; a slot only counts as written after board_link_store() accepted a full
 * frame, so a half-uploaded page can never reach the glass.
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#include <string.h>

#include "tal_api.h"

#include "epd_screens.h"
#include "board_link.h"

#define SHOW_KEEP 0xFF

static BOARD_STATE_T sg_state;

static uint8_t *sg_slots = NULL; /* BOARD_SLOT_MAX * EPD_SCREEN_BYTES */
static uint8_t  sg_slot_ok[BOARD_SLOT_MAX];

static uint8_t *__slot_ptr(uint8_t slot)
{
    return sg_slots ? sg_slots + (uint32_t)slot * EPD_SCREEN_BYTES : NULL;
}

void board_link_init(void)
{
    memset(&sg_state, 0, sizeof(sg_state));

    if (NULL == sg_slots) {
        sg_slots = tal_malloc(BOARD_SLOT_MAX * EPD_SCREEN_BYTES);
        PR_NOTICE("[link] frame slots %u bytes -> %p", (unsigned)(BOARD_SLOT_MAX * EPD_SCREEN_BYTES),
                  sg_slots);
    }
    memset(sg_slot_ok, 0, sizeof(sg_slot_ok));
}

bool board_link_store(uint8_t slot, const uint8_t *data, uint32_t len, uint8_t pages, uint8_t show)
{
    if ((slot >= BOARD_SLOT_MAX) || (NULL == data) || (len != EPD_SCREEN_BYTES)) {
        return false;
    }
    if (NULL == __slot_ptr(slot)) {
        return false;
    }

    memcpy(__slot_ptr(slot), data, len);
    sg_slot_ok[slot] = 1;

    if (pages > (BOARD_SLOT_MAX - 1)) {
        pages = BOARD_SLOT_MAX - 1;
    }
    sg_state.pages = pages;

    if (SHOW_KEEP != show) {
        sg_state.page = show;
    }
    if (sg_state.page > sg_state.pages) {
        sg_state.page = sg_state.pages;
    }

    sg_state.person_ready = sg_slot_ok[0];
    sg_state.dirty        = 1;

    PR_NOTICE("[link] stored slot %u (%u bytes) pages=%u show=%u", (unsigned)slot, (unsigned)len,
              (unsigned)sg_state.pages, (unsigned)sg_state.page);
    return true;
}

void board_link_clear_all(void)
{
    memset(sg_slot_ok, 0, sizeof(sg_slot_ok));
    sg_state.person_ready = 0;
    sg_state.pages        = 0;
    sg_state.page         = 0;
    sg_state.dirty        = 1;
}

BOARD_STATE_T *board_link_state(void)
{
    return &sg_state;
}

const uint8_t *board_link_frame(uint8_t page)
{
    if (page >= BOARD_SLOT_MAX || !sg_slot_ok[page]) {
        return NULL;
    }
    return __slot_ptr(page);
}

void board_link_clear_dirty(void)
{
    sg_state.dirty = 0;
}
