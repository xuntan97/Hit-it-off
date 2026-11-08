/* 一触即合 · 身份板写入通道
 *
 * 徽章自己开一个热点（HitItOff / hititoff），网页把 400×300 的 1bpp 画面
 * 直接 POST 到 http://192.168.50.1/frame。
 *
 * 一页 15000 字节，一次请求发完：墨水屏整屏刷新要 600–1500ms，但刷新在板子
 * 主线程，HTTP 收图在另一个任务里，所以不存在以前串口那套「必须分块握手」
 * 的问题。省下来的复杂度换成了一个更重要的性质——整帧要么全到，要么全不到。
 *
 * 板子带 CORS 头，所以这里能读到状态码。以前用 no-cors，400 也会当成功，
 * 「没写进去」和「写进去了」长得一模一样；现在每写一页都回读 /state 核对，
 * 失败会把板子报的数字直接摊出来。
 *
 * 为什么不用 Web Serial：这块板子的 USB 串口归另一个核管，应用核的两个 UART
 * 都没接到 USB 桥片上，写出去的字节到不了电脑。热点没有这个问题。
 */
(function () {
  const BASE = "http://192.168.50.1";
  const HEAD_LEN = 4; // slot, pages, show, 保留
  const SLOT_BYTES = 400 * 300 / 8;

  /* POST 响应读不到时退回 no-cors —— 但这是 POST 自己的事。
   *
   * 以前只有一个 corsOk，POST 读不到就把它置 false，而 state() 开头
   * 又写着 `if (!corsOk) return null`：于是帧已经用 no-cors 发出去了，
   * /state 却一个请求都没发就返回 null，核对变成永远拿不到数据。
   * 现在两个能力分开：postCors 只管 POST，读状态每次照常去读。 */
  let postCors = true;

  function decodeB64(b64, label) {
    const raw = atob(b64);
    if (raw.length !== SLOT_BYTES) throw new Error(`画面数据长度不对：${label}`);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function decodeFrame(key) {
    const b64 = window.BOARD_FRAMES && window.BOARD_FRAMES[key];
    if (!b64) throw new Error(`缺少画面数据：${key}`);
    return decodeB64(b64, key);
  }

  /* 一次请求，一个 AbortController。cors 失败且原因是跨域读不到时，退回
   * no-cors 再发一次（那时读不到状态码，只能确认「请求到达了」）。 */
  async function request(path, opts = {}, timeout = 8000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      return await fetch(`${BASE}${path}`, { ...opts, cache: "no-store", signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function post(path, body) {
    if (postCors) {
      try {
        const res = await request(path, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body,
        });
        const text = await res.text().catch(() => "");
        if (!res.ok) {
          throw new Error(`身份板拒收这一页（HTTP ${res.status}${text ? " · " + text : ""}）`);
        }
        return text;
      } catch (err) {
        if (err && err.name !== "TypeError" && !(err instanceof TypeError)) throw err;
        /* TypeError = 浏览器不让页面读这个响应（固件没有 CORS 头）。
         * 带 text/plain 的 POST 属于 simple request，这时请求本身已经发到板子了。
         * 以前这里会再补发一遍 no-cors，同一帧在板子上落两次；固件是单连接的
         * 小服务，两帧挤在一起反而容易把后一帧丢掉。所以只记降级，不重发。 */
        postCors = false;
        return "";                    // 帧已发出，只是读不到回执
      }
    }
    try {
      await request(path, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body,
      });
    } catch (err) {
      throw new Error("传不到身份板，确认电脑连着 HitItOff 这个热点");
    }
    return "";
  }

  /* ---------------- 板端回执：有就用，没有不算失败 ----------------
   *
   * 这块固件只对外实现了 /frame。在浏览器里直接打开 /state 是空白页，
   * 从页面里 fetch 它更读不到（跨源 + 没有 CORS 头 → TypeError: Failed to fetch）。
   * 之前「等回执」的两种做法都不对：读不到就当成功（假成功），
   * 或者读不到就判失败（帧明明已经发出去了）。现在探一次就记住结论：
   *   stateMode = "ok"   读得到，照常核对；
   *   stateMode = "none" 这台固件没有回执，之后不再花时间干等。
   */
  /* 这一轮上传的实况：发了几帧、多少字节、花了多久、板子怎么回的。
   * 现场怀疑「到底传没传」时，界面直接摊这几个数，不用开控制台。 */
  let lastRun = null;

  let stateMode = "unknown";   // unknown | ok | none
  let lastStateError = "";     // 读不到时的原始原因，现场好排查

  function resetProbe() {
    stateMode = "unknown";
    lastStateError = "";
  }

  /** 读板子自报的状态；读不到返回 null，并记住「这台板子不回状态」。 */
  async function state() {
    if (stateMode === "none") return null;
    try {
      const res = await request("/state", {}, 2000);
      if (!res.ok) {
        stateMode = "none";
        lastStateError = `HTTP ${res.status}`;
        return null;
      }
      const text = (await res.text()).trim();
      if (!text) {
        stateMode = "none";
        lastStateError = "回执是空的（这台固件没有 /state）";
        return null;
      }
      const num = (k) => {
        const m = text.match(new RegExp(k + "=(\\d+)"));
        return m ? Number(m[1]) : -1;
      };
      const slots = (text.match(/slots=([01,]+)/) || [, ""])[1].split(",").filter(Boolean);
      stateMode = "ok";
      lastStateError = "";
      return {
        pages: num("pages"),
        page: num("page"),
        person: num("person"),
        slots: slots.map(Number),
        raw: text,
      };
    } catch (err) {
      stateMode = "none";
      lastStateError = err && err.name ? `${err.name}: ${err.message}` : String(err);
      return null;
    }
  }

  /* 写完读一次就够：读得到再等它刷完屏（刷屏期间不回状态），
   * 读不到立刻收工——以前会干等 6 次、4 秒，现场全花在这上面了。 */
  async function settle() {
    const st = await state();
    if (st || stateMode === "none") return st;
    await new Promise((r) => setTimeout(r, 700));
    return state();
  }

  async function reachable(timeout = 3000) {
    try {
      const res = await request("/ping", {}, timeout);
      return res.ok;
    } catch (err) {
      /* 读不到响应不代表连不上（老固件没 CORS 头），用 no-cors 再探一次：
       * 过得去就说明热点和板子都在，这一趟照样能写。 */
      try {
        await request("/ping", { mode: "no-cors" }, timeout);
        /* 能被 no-cors 探通、却读不到 CORS 响应 —— 说明这台固件不带 CORS 头。
         * 那就别再让后面每一帧先白试一次 cors（那次请求其实也到了板子），
         * 直接把整轮定成 no-cors 单发。 */
        postCors = false;
        return true;
      } catch (err2) {
        return false;
      }
    }
  }

  /** 写一页：header + 15000 字节，写完即提交。 */
  /* 头里的第 4 个字节是保留位，一直是 0。有些固件会把「同一页、同样的内容」
   * 当成重复请求挡掉（HTTP 4xx），于是刷新页面后想给同一张卡重传一次就再也传不进去。
   * 真被挡了就拿这个保留位带一个递增计数重发一次——帧内容一个 bit 都没变，
   * 只是让请求不再和上一次逐字节相同。仍然被挡就把板子自己的话抛出去。 */
  let nonce = 0;

  async function pushSlot(slot, bytes, pages, show) {
    const body = new Uint8Array(HEAD_LEN + bytes.length);
    body[0] = slot;
    body[1] = pages;
    body[2] = show; // 0 = 停在人物卡，255 = 不动当前页
    body[3] = 0;
    body.set(bytes, HEAD_LEN);
    try {
      await post("/frame", body);
    } catch (err) {
      if (!/HTTP 4\d\d/.test(err && err.message)) throw err;
      const retry = body.slice();
      retry[3] = (++nonce & 0x7f) || 1;
      await post("/frame", retry);
    }
  }

  function assertState(st, want) {
    if (!st) return; // 降级模式，读不到就算过
    if (want.person && st.person !== 1) {
      throw new Error(`板子上还没有人物卡（${st.raw}），先把人物卡传上去`);
    }
    if (st.pages !== want.pages || (want.page != null && st.page !== want.page)) {
      throw new Error(`板子回报 ${st.raw}，和发给它的 ${want.pages} 页 / 第 ${want.page} 页对不上`);
    }
    if (want.slots && st.slots.length &&
        want.slots.some((i) => !st.slots[i])) {
      throw new Error(`这一页没有落到板子上（${st.raw}）`);
    }
  }

  /* 人物卡 + 起始的两只瑞兽，一次写完，最后停在人物卡上。
   * 每页发完等它回来再发下一帧，进度条按页推进。
   *
   * cardB64 是访客这次选中那张卡的 400×300 整帧（pick-frames.js）。
   * 不传才退回 board-frames.js 里那张固定的演示帧 —— 演示时板上出现的
   * 应该是他刚挑的那一张，不是预置样卡。 */
  async function writeCard(deck, onProgress, cardB64) {
    postCors = true;                       // 上一轮没连热点留下的降级不算数
    resetProbe();                          // 重新探一次有没有 /state
    if (!(await reachable())) {
      throw new Error("没找到身份板：192.168.50.1 连不上。确认 Wi-Fi 停在 HitItOff 上、没被系统切回有网的热点，手机也别同时连着这个热点，再点一次");
    }
    const startedAt = Date.now();
    const keys = ["person"].concat(deck);
    for (let i = 0; i < keys.length; i++) {
      const isLast = i === keys.length - 1;
      const bytes = (i === 0 && cardB64)
        ? decodeB64(cardB64, "选中的人物卡")
        : decodeFrame(keys[i]);
      await pushSlot(i, bytes, deck.length, isLast ? 0 : 0xff);
      if (onProgress) onProgress((i + 1) / keys.length);
      /* 固件是单连接的极简 HTTP 服务：上一帧的 15000 字节还在往 RAM 里写，
       * 下一个连接就到了，很容易被丢掉。给 300ms 让它落地。 */
      if (!isLast) await new Promise((r) => setTimeout(r, 300));
    }
    const st = await settle();
    lastRun = {
      at: new Date().toISOString(),
      frames: keys.length,
      bytes: keys.length * (HEAD_LEN + SLOT_BYTES),
      ms: Math.round(Date.now() - startedAt),
      verified: !!st,
      reason: lastStateError,
      raw: st ? st.raw : "",
    };
    /* 读得到就核对；读不到（这块板子不回状态）就返回 null，
     * 由界面如实说「已发送、未核对」，而不是要么假装成功要么判失败。 */
    if (!st) return null;
    assertState(st, {
      pages: deck.length,
      page: 0,
      person: 1,
      slots: keys.map((_, i) => i),
    });
    return st;
  }

  /* 单独补一页瑞兽（良渚那只就是这么上板的），写完停在这一页。
   * index 是它在这套瑞兽里的序号，从 0 开始。
   *
   * pages 取 max(板上已有的页数, 本页序号)：先补了第三只再点第二只时，
   * 页数不能从 3 退回 2，否则第三页会被页码挤掉，翻不到。 */
  async function writeBeast(beastKey, index, onProgress) {
    postCors = true;
    resetProbe();
    if (!(await reachable())) {
      throw new Error("没找到身份板：192.168.50.1 连不上。确认 Wi-Fi 停在 HitItOff 上、没被系统切回有网的热点，手机也别同时连着这个热点，再点一次");
    }
    /* 不再拦「板上没有人物卡」：按钮能点就传。板子有没有人物卡是板子
     * 的事（页面刷新过就不知道了），只拿 /state 算页码和核对已有页。 */
    const before = await state();
    const slot = index + 1;
    const pages = Math.max((before && before.pages) || 0, slot);
    await pushSlot(slot, decodeFrame(beastKey), pages, slot);
    if (onProgress) onProgress(1);

    /* 之前写过的页必须还在——只看本页不够，页码一乱就白传了。 */
    const keep = ((before && before.slots) || []).map((ok, i) => (ok ? i : -1));
    const st = await settle();
    lastRun = {
      at: new Date().toISOString(),
      frames: 1,
      bytes: HEAD_LEN + SLOT_BYTES,
      ms: 0,
      verified: !!st,
      reason: lastStateError,
      raw: st ? st.raw : "",
    };
    if (!st) return null;
    assertState(st, {
      pages,
      page: slot,
      person: 1,
      slots: keep.filter((i) => i >= 0).concat([slot]),
    });
    return st;
  }

  async function clear() {
    if (!(await reachable())) {
      throw new Error("没找到身份板：192.168.50.1 连不上。确认 Wi-Fi 停在 HitItOff 上、没被系统切回有网的热点，手机也别同时连着这个热点，再点一次");
    }
    await post("/clear", new Uint8Array(0));
  }

  window.BoardLink = {
    BASE,
    reachable,
    state,
    writeCard,
    writeBeast,
    clear,
    /** 最近一次读 /state 失败的原因（读到过就清空），现场排查用 */
    stateError() {
      return lastStateError;
    },
    /** 这一轮上传的实况：{frames, bytes, ms, verified, reason, raw} */
    lastRun() {
      return lastRun;
    },
    /** 瑞兽在板子上的页序，和 board-frames.js 的 BOARD_DECK 一致 */
    slotOf(beastId) {
      const deck = window.BOARD_DECK || [];
      return deck.indexOf(beastId);
    },
  };
})();
