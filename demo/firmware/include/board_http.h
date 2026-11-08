/**
 * @file board_http.h
 * @brief The badge's own Wi-Fi hotspot and the upload endpoint on it.
 *
 * The badge carries its own network instead of borrowing the venue's: the demo
 * laptop joins "HitItOff" and posts pages to a fixed address, so nothing depends
 * on a router that may not allow client-to-client traffic. The address is fixed
 * on purpose — it is printed on the blank screen, and it has to be the same one
 * every time somebody re-runs the demo.
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#ifndef __BOARD_HTTP_H__
#define __BOARD_HTTP_H__

#include "tuya_cloud_types.h"

#ifdef __cplusplus
extern "C" {
#endif

#define BOARD_AP_SSID "HitItOff"
#define BOARD_AP_PASS "hititoff"
#define BOARD_AP_IP   "192.168.50.1"

/**
 * @brief Bring up the hotspot and the upload server.
 *
 * Blocks for a few seconds while the radio starts; the caller should have the
 * blank screen on the glass before calling this so the badge does not sit white.
 *
 * @return OPRT_OK when the server is listening.
 */
OPERATE_RET board_http_start(void);

#ifdef __cplusplus
}
#endif

#endif /* __BOARD_HTTP_H__ */
