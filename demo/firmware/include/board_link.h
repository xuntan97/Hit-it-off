/**
 * @file board_link.h
 * @brief Page storage for the badge: what is on the glass, and what could be.
 *
 * The badge ships blank. Everything after that — the owner's identity card, the
 * starter pair, the 良渚 beast picked up later — is pushed from the web demo
 * over Wi-Fi and lands in one of these slots. Nothing is compiled in except the
 * empty state, so the same firmware serves a badge with two pages and one with
 * three, and the page counter always tells the truth.
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#ifndef __BOARD_LINK_H__
#define __BOARD_LINK_H__

#include "tuya_cloud_types.h"

#ifdef __cplusplus
extern "C" {
#endif

#define BOARD_SLOT_MAX 4 /* 1 identity card + up to 3 beast pages */

typedef struct {
    uint8_t person_ready; /* slot 0 has a complete frame */
    uint8_t pages;        /* how many beast pages the badge holds, 0..3 */
    uint8_t page;         /* 0 = identity card, 1..pages = beast deck */
    uint8_t dirty;        /* something changed, redraw when convenient */
} BOARD_STATE_T;

/** Allocates the frame slots and clears the badge. */
void board_link_init(void);

/** Current badge contents, owned by this module. */
BOARD_STATE_T *board_link_state(void);

/** Buffer for a page, or NULL when that page was never written. */
const uint8_t *board_link_frame(uint8_t page);

/**
 * @brief Write one page and commit it.
 *
 * `pages` is how many beast pages exist after this write; `show` is the page to
 * put on the glass (0 = identity card, 0xFF = leave the current page alone). The
 * badge renumbers itself from `pages`, which is why a beast claimed later does
 * not require the earlier pages to be resent just to fix a "1 / 2" counter.
 *
 * @return true when the frame was accepted.
 */
bool board_link_store(uint8_t slot, const uint8_t *data, uint32_t len, uint8_t pages, uint8_t show);

/** Drops everything back to the blank state (a fresh badge, no data). */
void board_link_clear_all(void);

/** Clears the dirty flag once the caller has redrawn. */
void board_link_clear_dirty(void);

#ifdef __cplusplus
}
#endif

#endif /* __BOARD_LINK_H__ */
