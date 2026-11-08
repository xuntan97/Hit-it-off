/**
 * @file board_http.c
 * @brief SoftAP + HTTP upload endpoint for the badge.
 *
 * Why Wi-Fi and not the USB cable: on this board the console UART belongs to the
 * other core. The application processor's own UART0/UART1 are not wired to the
 * USB bridge, and the SDK reserves the log port from the receive side anyway —
 * bytes written by the host simply never reach the app. The radio has no such
 * problem, and it also removes the laptop driver from the demo.
 *
 * Endpoints (all on http://192.168.50.1):
 *   GET  /ping    "ok" — the page polls this to show whether the badge is up
 *   GET  /state   "pages=<n> page=<p> person=<0|1>"
 *   POST /frame   body = [slot, pages, show, 0] + 15000 bytes of 1bpp pixels
 *   POST /clear   back to the blank badge
 *
 * The frame head travels inside the body rather than in the query string because
 * the route table matches paths exactly, and a 15 KB body has to be posted in one
 * piece anyway to keep the whole frame atomic.
 *
 * @copyright Copyright (c) 2021-2026 Tuya Inc. All Rights Reserved.
 */

#include <stdio.h>
#include <string.h>

#include "tal_api.h"
#include "tal_wifi.h"
#include "tal_network.h"
#include "http_host.h"
#include "http_site.h"

#include "epd_screens.h"
#include "board_link.h"
#include "board_http.h"

#define FRAME_HEAD_LEN 4 /* slot, pages, show, reserved */
#define WEB_PORT       80
#define REQ_MAX        (FRAME_HEAD_LEN + EPD_SCREEN_BYTES + 512)

static HTTP_HOST_HANDLE_T sg_host = NULL;
static HTTP_SITE_HANDLE_T sg_site = NULL;

static OPERATE_RET __send_all(int fd, const char *data, uint32_t len)
{
    uint32_t sent = 0;

    while (sent < len) {
        int ret = tal_net_send(fd, data + sent, len - sent);
        if (ret <= 0) {
            return OPRT_SEND_ERR;
        }
        sent += (uint32_t)ret;
    }
    return OPRT_OK;
}

/**
 * @brief Reply with CORS headers so the demo page can read the status code.
 *
 * With `mode: "no-cors"` a browser resolves the fetch even for a 400, so the
 * page had no way to distinguish "stored" from "rejected" — that is exactly the
 * kind of silence that made the first failed upload look like a success.
 */
static OPERATE_RET __reply(const HTTP_HOST_REQUEST_T *req, const char *status, const char *ctype,
                           const char *body)
{
    char     hdr[384];
    uint32_t body_len = (uint32_t)strlen(body);
    int      n;

    /* Every answer leaves a trace on the console, so "the page said nothing
     * came back" can be checked against what the badge actually sent. */
    PR_DEBUG("[http] -> %s (%u B)", status, (unsigned)body_len);

    n = snprintf(hdr, sizeof(hdr),
                                 "HTTP/1.1 %s\r\n"
                                 "Content-Type: %s\r\n"
                                 "Content-Length: %u\r\n"
                                 "Cache-Control: no-store\r\n"
                                 "Access-Control-Allow-Origin: *\r\n"
                                 "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                                 "Access-Control-Allow-Headers: Content-Type\r\n"
                                 "Connection: close\r\n\r\n",
                                 status, ctype, (unsigned)body_len);

    if (n <= 0) {
        return OPRT_INVALID_PARM;
    }
    if (OPRT_OK != __send_all(req->client_fd, hdr, (uint32_t)strlen(hdr))) {
        return OPRT_SEND_ERR;
    }
    if (body_len > 0) {
        return __send_all(req->client_fd, body, body_len);
    }
    return OPRT_OK;
}

static OPERATE_RET __reply_text(const HTTP_HOST_REQUEST_T *req, const char *status, const char *body)
{
    return __reply(req, status, "text/plain; charset=utf-8", body);
}

static OPERATE_RET __on_index(const HTTP_HOST_REQUEST_T *req, void *ctx)
{
    (void)ctx;
    return __reply_text(req, "200 OK", "hit-it-off badge online\n");
}

static OPERATE_RET __on_ping(const HTTP_HOST_REQUEST_T *req, void *ctx)
{
    (void)ctx;
    return __reply_text(req, "200 OK", "ok");
}

static OPERATE_RET __on_state(const HTTP_HOST_REQUEST_T *req, void *ctx)
{
    BOARD_STATE_T *st = board_link_state();
    char           out[96];
    const char    *sep = "";

    (void)ctx;

    snprintf(out, sizeof(out), "pages=%u page=%u person=%u slots=", (unsigned)st->pages,
             (unsigned)st->page, (unsigned)st->person_ready);

    /* One digit per slot, so "which pages are actually there" is answerable
     * without a photo of the glass. */
    for (uint8_t i = 0; i < BOARD_SLOT_MAX; i++) {
        char one[3];

        snprintf(one, sizeof(one), "%s%u", sep,
                 (unsigned)(NULL != board_link_frame(i) ? 1 : 0));
        strncat(out, one, sizeof(out) - strlen(out) - 1);
        sep = ",";
    }
    strncat(out, "\n", sizeof(out) - strlen(out) - 1);

    return __reply_text(req, "200 OK", out);
}

static OPERATE_RET __on_frame(const HTTP_HOST_REQUEST_T *req, void *ctx)
{
    const uint8_t *body = (const uint8_t *)req->body;
    uint8_t        slot;
    uint8_t        pages;
    uint8_t        show;

    (void)ctx;

    if ((NULL == body) || (req->body_len != (FRAME_HEAD_LEN + EPD_SCREEN_BYTES))) {
        PR_WARN("[http] frame rejected: body_len=%u", (unsigned)req->body_len);
        return __reply_text(req, "400 Bad Request", "bad frame length");
    }

    slot  = body[0];
    pages = body[1];
    show  = body[2];

    if (!board_link_store(slot, body + FRAME_HEAD_LEN, EPD_SCREEN_BYTES, pages, show)) {
        return __reply_text(req, "400 Bad Request", "store failed");
    }
    return __reply_text(req, "200 OK", "ok");
}

static OPERATE_RET __on_clear(const HTTP_HOST_REQUEST_T *req, void *ctx)
{
    (void)ctx;
    board_link_clear_all();
    return __reply_text(req, "200 OK", "cleared");
}

/**
 * @brief Routes. Anything unknown answers 404 except GET, which falls back to
 *        the index so a stray browser tab still sees something useful.
 */
static OPERATE_RET __on_request(const HTTP_HOST_REQUEST_T *req, void *ctx)
{
    OPERATE_RET rt;

    (void)ctx;

    /* The single most useful line when an upload "does nothing": it proves
     * whether the request reached the badge at all. No such line means the
     * laptop never got a packet here, whatever the Wi-Fi icon says. */
    PR_NOTICE("[http] <- %s %s (%u B)", req->method, req->path, (unsigned)req->body_len);

    if (0 == strcmp(req->method, "OPTIONS")) {
        return __reply(req, "200 OK", "text/plain; charset=utf-8", "");
    }

    rt = http_site_dispatch(sg_site, req);
    if (OPRT_NOT_FOUND == rt) {
        if (0 == strcmp(req->method, "GET")) {
            return __reply_text(req, "200 OK", "hit-it-off badge online\n");
        }
        return __reply_text(req, "404 Not Found", "404 not found");
    }
    return rt;
}

static OPERATE_RET __site_init(void)
{
    OPERATE_RET rt = OPRT_OK;

    TUYA_CALL_ERR_RETURN(http_site_create(&sg_site, 8));
    TUYA_CALL_ERR_RETURN(http_site_add_handler(sg_site, "GET", "/", __on_index, NULL));
    TUYA_CALL_ERR_RETURN(http_site_add_handler(sg_site, "GET", "/ping", __on_ping, NULL));
    TUYA_CALL_ERR_RETURN(http_site_add_handler(sg_site, "GET", "/state", __on_state, NULL));
    TUYA_CALL_ERR_RETURN(http_site_add_handler(sg_site, "POST", "/frame", __on_frame, NULL));
    TUYA_CALL_ERR_RETURN(http_site_add_handler(sg_site, "POST", "/clear", __on_clear, NULL));
    return OPRT_OK;
}

static OPERATE_RET __ap_start(void)
{
    WF_AP_CFG_IF_S ap_cfg   = {0};
    NW_IP_S        nw_ip    = {0};
    uint32_t       ssid_len = (uint32_t)strlen(BOARD_AP_SSID);
    uint32_t       pass_len = (uint32_t)strlen(BOARD_AP_PASS);

    OPERATE_RET rt = tal_wifi_set_work_mode(WWM_SOFTAP);
    if (OPRT_OK != rt) {
        return rt;
    }

    snprintf(nw_ip.ip, sizeof(nw_ip.ip), "%s", BOARD_AP_IP);
    snprintf(nw_ip.mask, sizeof(nw_ip.mask), "255.255.255.0");
    snprintf(nw_ip.gw, sizeof(nw_ip.gw), "%s", BOARD_AP_IP);

    ap_cfg.s_len      = (uint8_t)ssid_len;
    ap_cfg.p_len      = (uint8_t)pass_len;
    ap_cfg.chan       = 6;
    ap_cfg.md         = WAAM_WPA2_PSK;
    ap_cfg.max_conn   = 4;
    ap_cfg.ms_interval = 100;
    ap_cfg.ip         = nw_ip;

    memcpy(ap_cfg.ssid, BOARD_AP_SSID, ssid_len);
    ap_cfg.ssid[ssid_len] = '\0';
    memcpy(ap_cfg.passwd, BOARD_AP_PASS, pass_len);
    ap_cfg.passwd[pass_len] = '\0';

    return tal_wifi_ap_start(&ap_cfg);
}

static void __wifi_event(WF_EVENT_E event, void *arg)
{
    (void)arg;
    PR_DEBUG("[http] wifi event %d", (int)event);
}

OPERATE_RET board_http_start(void)
{
    OPERATE_RET     rt = OPRT_OK;
    HTTP_HOST_CFG_T host_cfg = {0};

    TUYA_CALL_ERR_LOG(tal_wifi_init(__wifi_event));

    rt = __ap_start();
    PR_NOTICE("[http] softap \"%s\" rt=%d", BOARD_AP_SSID, rt);
    if (OPRT_OK != rt) {
        return rt;
    }

    rt = __site_init();
    PR_NOTICE("[http] routes rt=%d", rt);
    if (OPRT_OK != rt) {
        return rt;
    }

    host_cfg.port                      = WEB_PORT;
    host_cfg.backlog                   = 4;
    host_cfg.listen_recv_timeout_ms    = 2000;
    host_cfg.listen_send_timeout_ms    = 2000;
    host_cfg.client_recv_slice_ms      = 20;
    host_cfg.client_send_timeout_ms    = 2000;
    host_cfg.client_wait_max_rounds    = 300; /* 15 KB at 1460 B/packet needs room */
    host_cfg.max_request_size          = REQ_MAX;
    host_cfg.stack_depth               = 1024 * 6;
    host_cfg.priority                  = THREAD_PRIO_2;
    host_cfg.thread_name               = "badge_http";

    rt = http_host_start(&sg_host, &host_cfg, __on_request, NULL, NULL);
    PR_NOTICE("[http] listening on http://%s/ rt=%d (req buffer %u)", BOARD_AP_IP, rt,
              (unsigned)REQ_MAX);
    return rt;
}
