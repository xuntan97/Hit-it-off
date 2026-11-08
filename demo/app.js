/* 一触即合 · Hit it off
 * 纯前端 Demo：立名 → 结缘 → 图鉴 → 相遇。
 * 所有"写入身份板"都是网页端模拟，真实烧录接口在正式版接入。
 */

/* ---------------- 数据 ---------------- */

const MBTI = ["不确定", "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];

const ZODIAC = ["不想说", "白羊", "金牛", "双子", "巨蟹", "狮子", "处女",
  "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];

const STYLES = [
  { id: "magic", label: "魔法学院" },
  { id: "xianxia", label: "国风仙侠" },
  { id: "urban", label: "都市奇谭" },
  { id: "gothic", label: "哥特幻想" },
  { id: "manga", label: "热血漫画" },
  { id: "minimal", label: "极简线稿" },
];

const INTEREST_GROUPS = [
  { name: "文化现场", items: ["博物馆", "非遗", "国风", "历史", "古建", "戏曲"] },
  { name: "动漫游戏", items: ["国漫", "日漫", "桌游", "狼人杀", "剧本杀", "单机游戏"] },
  { name: "影音阅读", items: ["科幻", "推理", "纪录片", "Livehouse", "播客", "写作"] },
  { name: "城市生活", items: ["咖啡", "探店", "做饭", "市集", "宠物", "植物"] },
  { name: "户外运动", items: ["徒步", "Citywalk", "骑行", "露营", "篮球", "羽毛球"] },
  { name: "科技创作", items: ["AI", "编程", "硬件", "机器人", "独立开发"] },
];

const PETS = ["没有", "银渐层", "橘猫", "布偶猫", "柴犬", "金毛", "鹦鹉", "守宫"];

const BEASTS = {
  baize: {
    name: "白泽", role: "司好奇与提问", series: "五灵", img: "assets/beast-baize.jpg",
    nature: "冷静、好奇，擅长把一个模糊的兴趣问成具体的问题。",
    form: "形似狮子，头生两角，能说人话——传说里少见的「会开口」的瑞兽。",
    use: "黄帝东巡遇白泽，问知天下精怪一万一千五百二十种，据此编成《白泽图》。古人把图挂在屋里或随身带，见怪先查名，再按名驱避。",
    origin: "白泽传说与《白泽图》传统，古人心目中通晓万物情状的瑞兽。",
    todo: "问一个好问题", verse: "一问万象开。",
  },
  qingluan: {
    name: "青鸾", role: "司表达与知音", series: "五灵", img: "assets/beast-qingluan.jpg",
    nature: "热烈、敢开口，先把话说出去，再等回音。",
    form: "青色羽毛、形似凤的大鸟，传说为西王母传信的那一只。",
    use: "南朝《鸾鸟诗序》：鸾三年不鸣，悬镜照见自己的影子才开口——「鸾镜」由此而来，青鸾也就成了让人愿意开口的那只鸟。",
    origin: "青鸾传说，鸾鸟形象见于《山海经》，后世常以其喻知音与信使。",
    todo: "先开口", verse: "山有回音，人有回响。",
  },
  feifei: {
    name: "朏朏", role: "司倾听与安心", series: "五灵", img: "assets/beast-feifei.jpg",
    nature: "温柔、不抢话，让人愿意把话说完。",
    form: "形似狸猫，白尾、颈上有鬣毛，性子温顺。",
    use: "《山海经》说「养之可以已忧」——养在身边就能解忧。后世把它当作解忧与陪伴的象征，也是五灵里最安静的一只。",
    origin: "《山海经·中山经》：「其状如狸，而白尾有鬣，名曰朏朏，养之可以已忧。」",
    todo: "听完再回应", verse: "先听一会儿，再靠近一点。",
  },
  dangkang: {
    name: "当康", role: "司分享与丰足", series: "五灵", img: "assets/beast-dangkang.jpg",
    nature: "憨厚、实在，相信好东西要分着吃。",
    form: "形似小猪而生獠牙，叫声就是自己的名字，「当康、当康」。",
    use: "「见则天下大穰」——它一露面就预示丰年。农耕社会里这是最实在的吉兆：不主战、不主寿，只主今年收成好。",
    origin: "《山海经·东山经》：「其状如豚而有牙，其名曰当康，见则天下大穰。」",
    todo: "分一份好吃的", verse: "把好吃的，分给同行的人。",
  },
  wenyao: {
    name: "文鳐", role: "司远行与丰收", series: "五灵", img: "assets/beast-wenyao.jpg",
    nature: "自由、好动，对没去过的地方始终保持兴趣。",
    form: "鱼身而鸟翼，白首赤喙、身有青斑，夜里成群飞出海面。",
    use: "与当康同为丰年之兆（「见则天下大穰」）；鱼与鸟的双形，也被读作水陆两通、来去自由。",
    origin: "《山海经·西山经》：「其状如鲤鱼，鱼身而鸟翼……见则天下大穰。」",
    todo: "去没去过的地方", verse: "向远处去，也从近处看。",
  },
  congguang: {
    name: "琮光", role: "司守护与来处", series: "良渚限定", img: "assets/beast-congguang.jpg",
    nature: "沉静、庄重，记得自己从哪里来。",
    form: "以良渚玉琮为本：外方内圆，四角刻神人兽面纹，兽面之上是一张戴羽冠的脸。",
    use: "玉琮只出现在良渚的高等级墓葬里，「内圆外方」被读作天地相通。它不是日常器物，是通神的礼器——琮光守的就是这层意思。",
    useLabel: "良渚怎么用",
    origin: "以良渚玉琮「内圆外方」之形与神人兽面纹为灵感的原创守护兽，并非良渚文化中的既有神兽。",
    todo: "讲一个你走过的故事", verse: "把走过的路，刻成身上的纹。",
    hint: "去良渚古城遗址走一趟，在出口与站点相碰，它会认你。",
  },
  xinggui: {
    name: "星轨青鸾", role: "司召唤同好", series: "联动限定", img: "assets/beast-xinggui.jpg",
    nature: "热血、外放，一句「你也喜欢？」就能把同好叫到一起。",
    form: "青鸾的漫画形态：翅羽拆成分镜格，尾羽拖出一条星轨。",
    use: "它没有古代出处。我们把「鸾鸣求友」翻译成漫画语言，让它替你在展区里喊出那句「你也喜欢？」。",
    useLabel: "怎么用它",
    origin: "青鸾的动漫联动形态，原创形象，不含任何既有作品角色与标志。",
    todo: "喊出你的本命", verse: "在另一个世界，也要主动开口。",
    hint: "去动漫联动展位完成一块限定展牌上的任务。",
  },
};

/* 注册礼固定赠送的两只：白泽司问，青鸾司说 */
const STARTER_BEASTS = ["baize", "qingluan"];

const OTHER = {
  nickname: "爱吃香菜", mbti: "INFP", zodiac: "天秤", style: "xianxia",
  occupation: "纪录片剪辑",
  serial: "No.0002",
  interests: ["国风", "徒步", "纪录片", "中医文化"],
  /* 对手卡也要有这句自白：不然左边（谈轩庭）有、右边没有，
   * 相遇页两张卡的文字块一高一低，看着像两张卡不一样大。 */
  line: "我在纪录片里见过很多山河，却总被路边一株野草绊住脚",
  /* 网页上用模型原图；card-other.png 只是上板那版 252×300 抖动图 */
  beast: "feifei", avatar: "assets/card-other.jpg",
};

const PLACES = {
  liangzhu: {
    key: "liangzhu",
    tab: "良渚 · 玉琮",
    beast: "congguang",
    place: "良渚古城遗址 · 浙江余杭",
    title: "内圆外方，五千年的一双眼",
    paras: [
      "良渚文化距今约五千年，分布在长江下游的太湖流域。2019 年，良渚古城遗址列入《世界遗产名录》。",
      "玉琮是这里最重要的礼器之一：外方内圆，四角刻着神人兽面纹——一张戴着羽冠的脸，压在一双大眼之上。有人读作祖先神，有人读作沟通天地的巫师，五千年过去，它仍然没有定论。",
      "你刚走完的那段路，不会留下什么。但你可以带走一个形状。",
    ],
    meta: [
      ["年代", "约公元前 3300 — 2300 年"],
      ["地点", "浙江余杭 · 良渚古城遗址"],
      ["看什么", "玉琮 · 神人兽面纹 · 内圆外方"],
    ],
  },
  anime: {
    key: "anime",
    tab: "动漫联动展位",
    beast: "xinggui",
    place: "联动展区 · 限定展牌",
    title: "把漫画的语言，借给一只瑞兽",
    paras: [
      "展区尽头有一块限定展牌，不挂在任何一部作品下面。它是这次活动临时搭出来的一个入口。",
      "它借来的是漫画的语法：分镜框、网点、速度线——不是某个角色，也不是某个标志。",
      "照着展牌上的任务做一件事，它就会认你。",
    ],
    meta: [
      ["展位", "联动展区 · 限定展牌"],
      ["任务", "完成展位问答，与展牌相碰"],
      ["限定", "活动期间开放，结束即关闭"],
    ],
  },
};

/* ---------------- 状态 ---------------- */

const state = {
  ready: false,
  nickname: "谈轩庭",
  mbti: "ENFJ",
  zodiac: "双鱼",
  occupation: "艺术家",
  note: "我喜欢发挥想象力，喜欢挑战未知",
  style: "magic",
  interests: ["狼人杀", "篮球", "机器人"],
  pet: "银渐层",
  photo: "assets/photo-me.jpg",     // 现场演示用：前置拍的那张，写死在资源里
  avatar: "assets/card-me.jpg",     // 卡面插画，选中哪张就换成哪张
  cardTags: [],                     // 模型写的三个标签
  line: "",                         // 模型写的自白
  cardFrame: null,                  // 选中那张的上板整帧（pick-frames.js）
  serial: "",
  model: "",                        // 这一张是哪个模型画的
  starter: "baize",               // 当前同行（注册礼固定是白泽 + 青鸾）
  unlocked: [],                   // 已收藏，按获得顺序；注册时一次进两只
  syncedCard: false,
  syncedBeasts: [],
};

/* ---------------- 三个模型的预置结果 ----------------
 *
 * 现场这张卡是提前用同一张照片、同一段 brief 真跑出来的三张图，存在 assets/ 里：
 *   pick-<key>.jpg  模型原图，选图页和网页卡片都用它（1024/2048 方图）
 * 网页上永远看原图。抖动后的 252×300 只活在 pick-frames.js 的整帧里，
 * 那是推给墨水屏的东西，放大到网页上看就是一片网点。
 *
 * wait 是现场演示用的等待秒数。真实耗时是（带着这张照片做图生图）:
 *   seedream 5.0 41.8 秒 / gpt-image-2 87.6 秒 / seedream 5.0 pro 94.4 秒；
 * 讲的时候等不起一分半，这里压成 1 / 2 / 3 秒，先后顺序和真实情况一致
 * （seedream 最快、pro 最慢）。想还原真实节奏，把下面三个 wait 改成 real 的值。
 */
const PICK_OPTIONS = [
  { key: "fast", label: "seedream 5.0", model: "doubao-seedream-5-0-260128",
    raw: "assets/pick-fast.jpg?v=2", real: 41.8, wait: 1 },
  { key: "gpt", label: "gpt-image-2", model: "gpt-image-2",
    raw: "assets/pick-gpt.jpg?v=2", real: 87.6, wait: 2 },
  { key: "pro", label: "seedream 5.0 pro", model: "doubao-seedream-5-0-pro-260628",
    raw: "assets/pick-pro.jpg?v=2", real: 94.4, wait: 3 },
];

/* ---------------- 基础工具 ---------------- */

const $ = (id) => document.getElementById(id);

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("is-on"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("is-on");
    setTimeout(() => { el.hidden = true; }, 260);
  }, 2600);
}

/* ---------------- 弹层 ---------------- */

const layer = $("modal-layer");
const modal = $("modal");
const modalBody = () => modal.querySelector(".modal-body");

function openModal(html, opts = {}) {
  modal.classList.toggle("modal--narrow", !!opts.narrow);
  modal.innerHTML = `
    <button class="modal-close" data-close aria-label="关闭">×</button>
    <div class="modal-body">${html}</div>`;
  modalBody().scrollTop = 0;
  layer.hidden = false;
  document.body.classList.add("no-scroll");
  requestAnimationFrame(() => layer.classList.add("is-open"));
}

function closeModal() {
  layer.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  setTimeout(() => {
    layer.hidden = true;
    modal.innerHTML = "";
  }, 300);
}

layer.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !layer.hidden) closeModal();
});

/* ---------------- 视图切换 ---------------- */

function showView(name) {
  ["create", "identity", "beasts"].forEach((k) => {
    const el = $("screen-" + k);
    if (el) el.hidden = k !== name;
  });
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  const inApp = name !== "create";
  $("nav").hidden = !inApp;
  $("dock").hidden = !inApp;
  $("restart").hidden = !inApp;
  window.scrollTo(0, 0);
}

function updateStage() {
  $("nav-count").textContent = String(state.unlocked.length);
  $("stage-note").textContent = state.ready
    ? `已立名 · 瑞兽 ${state.unlocked.length} 只`
    : "尚未立名";
}

/* ---------------- 表单 ---------------- */

function fillSelect(id, options, selected) {
  $(id).innerHTML = options
    .map((o) => `<option ${o === selected ? "selected" : ""}>${esc(o)}</option>`)
    .join("");
}

function renderStyles() {
  $("style-tags").innerHTML = STYLES.map((s) => `
    <button class="tag ${s.id === state.style ? "selected" : ""}" data-style="${s.id}">${s.label}</button>
  `).join("");
}

function renderInterests() {
  $("interest-groups").innerHTML = INTEREST_GROUPS.map((g) => `
    <div class="tag-group">
      <div class="tag-group-name">${g.name}</div>
      <div class="tags">
        ${g.items.map((i) => `
          <button class="tag ${state.interests.includes(i) ? "selected" : ""}" data-interest="${esc(i)}">${esc(i)}</button>
        `).join("")}
      </div>
    </div>
  `).join("");
  $("interest-count").textContent = `已选 ${state.interests.length} / 6`;
}

function renderPets() {
  $("pet-tags").innerHTML = PETS.map((p) => `
    <button class="tag ${p === state.pet ? "selected" : ""}" data-pet="${esc(p)}">${esc(p)}</button>
  `).join("");
}

/* ---------------- 人物卡 ---------------- */

function styleLabel(id) {
  const s = STYLES.find((x) => x.id === id);
  return s ? s.label : "";
}

function personCardHtml(o) {
  const mini = o.size === "mini" ? " pcard--mini" : "";
  /* 生成之后卡面用模型提炼的三个词，而不是表单里勾的那几个 ——
   * 前者是从他自己写的兴趣里长出来的，更像一句自我介绍。 */
  const tags = (o.cardTags && o.cardTags.length) ? o.cardTags : o.interests;
  /* 访客自己写的那句话要出现在卡面上，不然只在表单里一闪而过。 */
  const say = o.note ? `<p class="pcard-say">${esc(o.note)}</p>` : "";
  return `
    <article class="pcard${mini}">
      <div class="pcard-frame"><img src="${o.avatar}" alt="${esc(o.nickname)} 的人物卡"></div>
      <div class="pcard-body">
        <h3 class="pcard-name">${esc(o.nickname)}</h3>
        ${o.occupation ? `<p class="pcard-job">${esc(o.occupation)}</p>` : ""}
        <p class="pcard-meta">${esc(o.mbti)} · ${esc(o.zodiac)}${o.serial ? ` · ${esc(o.serial)}` : ""}</p>
        ${say}
        <div class="pcard-tags">
          ${tags.slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("")}
        </div>
        ${o.line ? `<p class="pcard-line">「${esc(o.line)}」</p>` : ""}
      </div>
      <div class="pcard-foot"><span>${styleLabel(o.style)}</span><span>一触即合</span></div>
    </article>`;
}

/* ---------------- 写入进度 ---------------- */

/* done 只是「上次传过了」的提示，不再把按钮换掉。
 * 以前传成功一次，这里就把按钮替换成「✓ 已写入身份板 / 内容与板端一致，
 * 无需重复刷新」，刷新页面后再想传一遍就没有入口了。按钮永远留着。 */
function mountSync(el, opts) {
  const done = !!opts.done;
  el.innerHTML = `
    <div class="sync-done" ${done ? "" : "hidden"}>
      <span class="tick">✓</span>
      <div>
        <strong>已写入身份板</strong>
        <p>${opts.doneNote || "板端已收到这一份，随时可以再传一次。"}</p>
      </div>
    </div>
    <div class="sync-main">
      <button class="btn btn-primary sync-btn">${done ? "重新上传到身份板" : opts.label}</button>
      <p class="sync-hint">${opts.hint || ""}</p>
    </div>
    <div class="sync-run" hidden>
      <div class="sync-track"><i></i></div>
      <div class="sync-line"><span data-step>正在连身份板</span><span data-pct>0%</span></div>
    </div>
    <p class="sync-fine">${opts.fine || "先在电脑上连热点 HitItOff（密码 hititoff），再点上传"}</p>
    <p class="sync-diag"><a href="diag.html" target="_blank" rel="noopener">连不上？做个连接自检</a></p>
  `;

  const btn = el.querySelector(".sync-btn");
  if (btn) btn.addEventListener("click", () => startSync(el, opts));
}

const STEP_OF = (p) => (p < 0.4 ? "正在传人物卡" : p < 0.95 ? "正在传瑞兽页" : "正在刷新墨水屏");

async function startSync(el, opts) {
  const main = el.querySelector(".sync-main");
  const run = el.querySelector(".sync-run");
  const doneBox = el.querySelector(".sync-done");
  const bar = run.querySelector("i");
  const stepEl = run.querySelector("[data-step]");
  const pctEl = run.querySelector("[data-pct]");

  main.hidden = true;
  doneBox.hidden = true;
  run.hidden = false;

  const paint = (p, label) => {
    bar.style.width = Math.round(p * 100) + "%";
    pctEl.textContent = Math.round(p * 100) + "%";
    stepEl.textContent = label || STEP_OF(p);
  };

  const finish = (st) => {
    /* st 有值 = 板子回了状态并且核对通过；st 为 null = 发出去但没读到回执。
     * 两种情况都要如实说，不能混成一句「成功」。 */
    const verified = !!st;
    /* onDone 有可能把这一块整个重画，所以先回调，再按最新的 DOM 收尾。 */
    if (opts.onDone) opts.onDone(verified);
    const box = el.querySelector(".sync-done");
    const mainEl = el.querySelector(".sync-main");
    const runEl = el.querySelector(".sync-run");
    const nowBtn = el.querySelector(".sync-btn");
    if (runEl) runEl.hidden = true;
    if (mainEl) mainEl.hidden = false;
    if (nowBtn) nowBtn.textContent = "重新上传到身份板";
    if (box) {
      box.hidden = false;
      /* 没核对到就别打绿勾：勾一出现，谁都会当成「传好了」。 */
      box.classList.toggle("is-soft", !verified);
      const tick = box.querySelector(".tick");
      if (tick) tick.textContent = verified ? "✓" : "!";
      const strong = box.querySelector("strong");
      const note = box.querySelector("p");
      if (strong) strong.textContent = verified ? "已写入身份板" : "已发送，但没读到板端回执";
      if (note) {
        note.textContent = verified
          ? (opts.doneNote || "板端已收到这一份，随时可以再传一次。")
          : (() => {
              const run = window.BoardLink && window.BoardLink.lastRun ? window.BoardLink.lastRun() : null;
              const sent = run ? `${run.frames} 帧 / ${Math.round(run.bytes / 1024)} KB` : "整轮画面";
              return `${sent} 都发出去了，但这台固件不回状态，网页没法替你确认。`
                + "看一眼屏幕：已经变了就是成功；没变就把板子的电源拔掉重插，等它重新亮起来再点一次上传。";
            })();
      }
    }
    const fine = el.querySelector(".sync-fine");
    if (fine) {
      if (verified && st.raw) {
        fine.textContent = `板端回报：${st.raw}`;
      } else if (!verified && window.BoardLink && window.BoardLink.stateError) {
        const why = window.BoardLink.stateError();
        fine.textContent = `这台板子没有 /state 接口（${why || "读不到"}），状态只能看屏幕`;
      }
    }
    toast(verified ? (opts.doneToast || "已写入身份板") : "已发送，看一眼屏幕确认");
  };

  /* 没有真实画面数据的瑞兽走旧的那条演示动线，别让按钮看起来坏了。 */
  if (!opts.run) {
    let p = 0;
    paint(0);
    const timer = setInterval(() => {
      p = Math.min(1, p + 0.04 + Math.random() * 0.05);
      paint(p);
      if (p >= 1) {
        clearInterval(timer);
        setTimeout(() => finish({ raw: "" }), 320);
      }
    }, 60);
    return;
  }

  paint(0, "正在连身份板");
  try {
    const st = await opts.run((p, label) => paint(p, label));
    paint(1, "正在刷新墨水屏");
    /* 核对到了才值得等它刷完；核对不到时这份等待纯粹是干耗，
     * 以前一轮上传有 4 秒是站在这里等一个永远不会来的回执。 */
    await new Promise((r) => setTimeout(r, st ? 900 : 200));
    finish(st);
  } catch (err) {
    run.hidden = true;
    main.hidden = false;
    toast(err && err.message ? err.message : "上传失败，检查一下热点");
    /* 失败时把板子自己报的状态写在按钮下面，现场不用开控制台也能说清楚
     * 卡在哪一步（pages/page/slots 都是板端原话）。 */
    const fine = el.querySelector(".sync-fine");
    if (fine && window.BoardLink && window.BoardLink.state) {
      window.BoardLink.state().then((st) => {
        if (st) fine.textContent = `板端回报：${st.raw}`;
      });
    }
    console.warn("[board] upload failed", err);
  }
}

/* ---------------- 身份板写入 ---------------- */

/* 板端能收的页面是预生成的 1bpp 帧，所以只有 board-frames.js 里有的瑞兽
 * 才谈得上「上传」；其余还在图鉴里躺着的走演示动线。 */
function hasFrame(key) {
  return !!(window.BoardLink && window.BOARD_FRAMES && window.BOARD_FRAMES[key]);
}

/** 人物卡 + 起始两只瑞兽，一次写完，停在人物卡上。
 *  人物卡用这次选中的那一张整帧（pick-frames.js），取不到才退回演示帧。 */
function writeStarterDeck(onProgress) {
  const frame = state.cardFrame || null;
  return window.BoardLink.writeCard(STARTER_BEASTS, onProgress, frame);
}

/** 单独补一只瑞兽到它自己的页（良渚就是这么上板的）。 */
function writeBeastPage(id, onProgress) {
  const deck = window.BOARD_DECK || [];
  const index = deck.indexOf(id);
  if (index < 0) return Promise.reject(new Error(`「${BEASTS[id].name}」的画面还没生成`));
  return window.BoardLink.writeBeast(id, index, onProgress);
}

/* ---------------- 立名 ---------------- */

/* 注册礼是固定的两只：白泽 + 青鸾。
   一只负责问，一只负责说，刚好凑成一次破冰的两端；
   其余五灵（朏朏、当康、文鳐、琮光、星轨青鸾）靠探索与联动解锁。 */
function starterPair() {
  return STARTER_BEASTS.slice();
}

/* ---------------- 选图：三个模型同画一张 ----------------
 *
 * 点「生成」不是直接画一张，而是让三个模型同时画同一段描述，谁先画完谁先
 * 能点。上面一行 chip 是这次选中的信息，图下面一行是模型名 —— 访客看得见
 * 自己在等谁，也看得见自己在选什么。
 *
 * 演示版的三张图是提前用同一张照片、同一段 brief 真跑出来的（assets/pick-*.jpg），
 * 这里只模拟耗时和先后顺序：真实耗时约 42 / 88 / 94 秒，按 TIME_SCALE 压缩，
 * 现场不用干等一分钟。选中的那一张决定卡面用哪张插画，和正式版一致。
 */

/* 文案模型（gpt-4.1-mini）给这张卡写的三个标签和一句自白，同样是提前跑好的。 */
const CARD_SERIAL = "No.0001";
const CARD_COPY = {
  tags: ["狼人策略", "篮球赛场", "机器人搭建"],
  line: "我喜欢在狼人杀夜晚揣摩人心，也享受投篮时的瞬间宁静",
};

let picking = false;
let choosing = false;
let pickStarted = 0;
let pickTimers = [];
let pickTicker = null;
let pickStatus = {};      // key -> "running" | "done"
let pickDone = {};        // key -> 出图那一秒

function pickChips() {
  const fixed = [state.nickname, state.mbti, state.zodiac, state.occupation, state.pet]
    .filter(Boolean)
    .map((t) => `<span class="pk-chip">${esc(t)}</span>`);
  const tags = state.interests.map((t) => `<span class="pk-tag">${esc(t)}</span>`);
  /* 他自己写的那句话单独一行：chip 装不下一句话，而且它是这段描述里
   * 唯一完全由访客自己写的东西，值得让人看见。 */
  const say = state.note ? `<p class="pk-say">${esc(state.note)}</p>` : "";
  return fixed.concat(tags).join("") + say;
}

function pickCell(o) {
  const ready = pickStatus[o.key] === "done";
  const shot = ready
    ? `<img src="${o.raw}" alt="${esc(o.label)} 画的图">`
    : `<span class="pk-wait"><i class="pk-spin"></i>生成中</span>`;
  const status = ready ? `${pickDone[o.key]} 秒 · 点这张` : "还在画";
  return `
    <button class="pk-card${ready ? " is-ready" : ""}" data-key="${o.key}"
            ${ready ? "" : "disabled"}>
      <span class="pk-shot">${shot}</span>
      <span class="pk-model">${esc(o.label)}</span>
      <span class="pk-status">${status}</span>
    </button>`;
}

function paintGrid() {
  $("pk-grid").innerHTML = PICK_OPTIONS.map(pickCell).join("");
}

function setFoot(text) {
  $("pk-foot").textContent = text;
}

function paintFoot() {
  const done = Object.keys(pickDone).length;
  const total = PICK_OPTIONS.length;
  if (done === total) setFoot("挑一张，接着生成身份卡");
  else if (done) setFoot(`已经出来 ${done} 张，可以先选；还有 ${total - done} 张在画`);
  else setFoot(`三个模型一起在画，已经 ${Math.round((Date.now() - pickStarted) / 1000)} 秒`);
}

function openPicker() {
  picking = true;
  choosing = false;
  pickStarted = Date.now();
  pickStatus = {};
  pickDone = {};
  PICK_OPTIONS.forEach((o) => { pickStatus[o.key] = "running"; });

  $("pk-chips").innerHTML = pickChips();
  paintGrid();
  setFoot("三个模型一起在画，先出来的可以先选");
  $("picker").hidden = false;
  requestAnimationFrame(() => $("picker").classList.add("is-on"));

  pickTimers.forEach(clearTimeout);
  pickTimers = PICK_OPTIONS.map((o) => setTimeout(() => {
    pickStatus[o.key] = "done";
    pickDone[o.key] = Math.round((Date.now() - pickStarted) / 1000);
    paintGrid();
    paintFoot();
  }, o.wait * 1000));

  clearInterval(pickTicker);
  pickTicker = setInterval(paintFoot, 500);
}

function closePicker() {
  clearInterval(pickTicker);
  pickTimers.forEach(clearTimeout);
  pickTimers = [];
  picking = false;
  return new Promise((resolve) => {
    $("picker").classList.remove("is-on");
    setTimeout(() => { $("picker").hidden = true; resolve(); }, 280);
  });
}

async function choosePick(key) {
  const o = PICK_OPTIONS.find((x) => x.key === key);
  if (choosing || !o || pickStatus[key] !== "done") return;
  choosing = true;
  clearInterval(pickTicker);
  setFoot("正在把这一张排成卡面…");
  $("pk-grid").querySelectorAll(".pk-card").forEach((c) => { c.disabled = true; });

  /* 正式版这一步是服务端把选中的图裁成 252×300、抖动成 1bpp、连同文字排成整帧，
   * 大约 1 秒；这里等同样的时间，现场节奏才对得上。 */
  await new Promise((r) => setTimeout(r, 900));

  /* 网页上的卡片用模型原图（o.raw）；抖动后的 252×300 只在上板时用，
   * 放到页面上放大看就是一片网点，糊得认不出人。 */
  state.avatar = o.raw;
  state.model = o.model;
  /* 上板要的是整张 400×300 的 1bpp 帧，三张候选各烤好一份，选哪张推哪张 */
  state.cardFrame = (window.PICK_FRAMES && window.PICK_FRAMES[key]) || null;
  state.serial = CARD_SERIAL;
  state.cardTags = CARD_COPY.tags.slice();
  state.line = CARD_COPY.line;
  state.unlocked = starterPair();
  state.starter = state.unlocked[0];
  state.syncedCard = false;
  state.syncedBeasts = [];
  state.ready = true;

  /* 先把视图翻到身份页，最后才让选图遮罩淡出：
   * 反过来的话，遮罩淡出的 280ms 底下露的是还没换掉的填表页，会闪一下。 */
  updateStage();
  renderIdentity();
  renderBeasts();
  showView("identity");
  await closePicker();
  choosing = false;
  openReveal();
}

/* ---------------- 结缘揭晓 ---------------- */

function openReveal() {
  const pair = [
    { id: "baize", flag: "司问" },
    { id: "qingluan", flag: "司说" },
  ];

  openModal(`
    <div class="reveal">
      <header class="reveal-head">
        <p class="eyebrow">卷二 · 结缘</p>
        <h2>你的身份卡，已经生成</h2>
        <p class="lede">两只瑞兽一起跟来了。它们会在有人靠近时，替你先说第一句话。</p>
      </header>

      <div class="reveal-grid">
        <div id="reveal-card">
          ${personCardHtml(state)}
          ${state.photo ? `
            <div class="reveal-src">
              <img src="${state.photo}" alt="">
              <span>原图 · 已据此生成卡面</span>
            </div>` : ""}
        </div>

        <div class="reveal-beast">
          <p class="eyebrow">注册礼 · 五灵双赠</p>
          <div class="gift-pair">
            ${pair.map(({ id, flag }) => {
              const b = BEASTS[id];
              return `
                <div class="gift-card">
                  <span class="gift-flag">${flag}</span>
                  <div class="gift-media"><img src="${b.img}" alt="${b.name}"></div>
                  <p class="gift-name">${b.name}</p>
                  <p class="gift-role">${b.role}</p>
                  <p class="gift-verse">${b.verse}</p>
                  <p class="gift-origin">${b.origin}</p>
                </div>`;
            }).join("")}
          </div>
          <p class="gift-note">每位新用户都得到这两只：白泽负责问，青鸾负责说。其余五灵要靠探索与联动解锁。</p>
        </div>
      </div>

      <footer class="reveal-foot">
        <div class="sync" id="reveal-sync"></div>
        <p class="fine">卡面插画由三个模型生成，你选中的那一张会被排进卡面与身份板。</p>
      </footer>
    </div>
  `);

  mountSync($("reveal-sync"), {
    label: "上传到身份板",
    hint: "人物卡 1 页 + 瑞兽 2 页",
    run: (onProgress) => writeStarterDeck(onProgress),
    onDone: (ok) => {
      if (!ok) return;
      state.syncedCard = true;
      const card = document.querySelector("#reveal-card .pcard");
      if (card) card.classList.add("is-synced");
      renderIdentity();
      updateStage();
    },
  });
}

/* ---------------- 身份页 ---------------- */

function renderIdentity() {
  $("identity-title").textContent = `${state.nickname}，你的身份已经在这里`;

  $("id-card").innerHTML = personCardHtml(state) +
    `<p class="card-caption">${state.syncedCard ? "已写入身份板" : "尚未写入身份板"}</p>`;

  if (state.syncedCard) {
    const c = document.querySelector("#id-card .pcard");
    if (c) c.classList.add("is-synced");
  }

  const b = BEASTS[state.starter];
  $("id-beast").innerHTML = `
    <div class="current-beast">
      <img src="${b.img}" alt="${b.name}">
      <div class="cb-body">
        <h3>${b.name}</h3>
        <p class="cb-role">${b.role} · ${b.series}</p>
        <p class="cb-todo">今日宜　${b.todo}</p>
      </div>
    </div>
    <p class="cb-verse">${b.verse}</p>
  `;

  mountSync($("id-sync"), {
    label: "上传到身份板",
    hint: "人物卡 1 页 + 起始瑞兽 2 页",
    done: state.syncedCard,
    doneNote: "人物卡与起始瑞兽已在板端展示。",
    run: (onProgress) => writeStarterDeck(onProgress),
    onDone: (ok) => {
      if (!ok) return;
      state.syncedCard = true;
      renderIdentity();
    },
  });
}

/* ---------------- 瑞兽图鉴 ---------------- */

function renderBeasts() {
  const all = Object.keys(BEASTS);
  const owned = state.unlocked;
  const locked = all.filter((id) => !owned.includes(id));
  const ordered = [...owned, ...locked];

  $("beast-count").textContent = `${owned.length} / ${all.length}`;

  $("beast-grid").innerHTML = ordered.map((id) => {
    const b = BEASTS[id];
    const got = owned.includes(id);
    const isCurrent = got && state.starter === id;
    return `
      <button class="beast-tile ${got ? "" : "is-locked"}" data-beast="${id}">
        <div class="tile-media"><img src="${b.img}" alt="${b.name}"></div>
        <div class="tile-meta">
          <span class="tile-name">${b.name}</span>
          <span class="tile-series">${got ? b.series : "未解锁"}</span>
        </div>
        <p class="tile-role">${b.role}</p>
        ${isCurrent ? `<span class="tile-flag">同行中</span>` : ""}
      </button>`;
  }).join("");
}

function openBeast(id) {
  const b = BEASTS[id];
  const got = state.unlocked.includes(id);
  const isCurrent = got && state.starter === id;

  openModal(`
    <div class="bd">
      <div class="bd-media ${got ? "" : "is-locked"}"><img src="${b.img}" alt="${b.name}"></div>
      <div class="bd-body">
        <p class="eyebrow">${b.series}</p>
        <h2>${b.name}</h2>
        <p class="bd-role">${b.role}</p>
        ${got ? `
          <p class="bd-text">${b.nature}</p>
          <dl class="bd-meta">
            <div><dt>形貌</dt><dd>${b.form}</dd></div>
            <div><dt>${b.useLabel || "古人怎么用"}</dt><dd>${b.use}</dd></div>
            <div><dt>出处</dt><dd>${b.origin}</dd></div>
            <div><dt>今日宜</dt><dd>${b.todo}</dd></div>
          </dl>
          <blockquote class="bd-verse">${b.verse}</blockquote>
          <div class="bd-actions">
            <button class="btn btn-ghost" data-set="${id}" ${isCurrent ? "disabled" : ""}>
              ${isCurrent ? "正在同行" : "设为同行"}
            </button>
          </div>
          <div class="sync" id="bd-sync"></div>
        ` : `
          <p class="bd-text">这只瑞兽还没有来找你。</p>
          <dl class="bd-meta">
            <div><dt>形貌</dt><dd>${b.form}</dd></div>
            <div><dt>出处</dt><dd>${b.origin}</dd></div>
          </dl>
          <p class="bd-locked">${b.hint}</p>
          <div class="bd-actions">
            <button class="btn btn-ghost" data-close>知道了</button>
          </div>
        `}
      </div>
    </div>
  `, { narrow: true });

  if (!got) return;

  const setBtn = modal.querySelector("[data-set]");
  if (setBtn && !isCurrent) {
    setBtn.addEventListener("click", () => {
      state.starter = id;
      renderBeasts();
      renderIdentity();
      updateStage();
      openBeast(id);
      toast(`「${b.name}」已设为同行`);
    });
  }

  mountSync($("bd-sync"), {
    label: "上传到身份板",
    hint: `${b.name} · 单独一页`,
    done: state.syncedBeasts.includes(id),
    doneNote: `「${b.name}」这一页已在板端。`,
    run: hasFrame(id) ? (onProgress) => writeBeastPage(id, onProgress) : null,
    onDone: (ok) => {
      if (!ok) return;
      if (!state.syncedBeasts.includes(id)) state.syncedBeasts.push(id);
    },
  });
}

/* ---------------- 相遇 · 人 ---------------- */

function buildIcebreaker(common, mine, theirs) {
  const topic = common[0] || state.interests[0] || "徒步";
  const openings = {
    "徒步": "你走过印象最深的一条路线是哪条？我一直想找条当天能来回的。",
    "国风": "你那张卡的国风元素是自己选的吗？我最近也在看这一类的东西。",
    "纪录片": "最近有哪部纪录片，是你看完会想推荐给别人的？",
  };
  return {
    lead: `${mine.name}宜「${mine.todo}」，${theirs.name}宜「${theirs.todo}」。两只瑞兽先碰了一下，剩下的交给你们。`,
    opening: openings[topic] || `你标签里写了「${topic}」，这块我一直想找人聊聊。`,
    followups: [
      "路线聊开了，可以接着问「出门前会做攻略还是直接走」，很容易看出一个人怎么过日子。",
      "对方还有「国风」「纪录片」，可以把你看过的展或喜欢的片子带进来，看看有没有第二处重合。",
      "聊得顺就约下一次：一条路线、一个展、一场片子，都比「以后常联系」具体。",
    ],
    avoid: "别从「你是 INFP 是不是很爱幻想」开始。MBTI 只是装饰，不是判断一个人的依据。",
  };
}

/* 相遇时随卡片一起亮出来的同行瑞兽 */
function meetBeastHtml(id) {
  const b = BEASTS[id];
  return `
    <div class="meet-beast">
      <div class="mb-media"><img src="${b.img}" alt="${b.name}"></div>
      <div class="mb-text">
        <p class="mb-name">${b.name}<span>${b.role}</span></p>
        <p class="mb-todo">同行 · 今日宜「${b.todo}」</p>
      </div>
    </div>`;
}

function openMeet() {
  const mine = BEASTS[state.starter];
  const theirs = BEASTS[OTHER.beast];
  const common = state.interests.filter((i) => OTHER.interests.includes(i));
  const ice = buildIcebreaker(common, mine, theirs);

  openModal(`
    <div class="meet">
      <header class="meet-head">
        <p class="eyebrow">相遇 · 人</p>
        <h2>你们已经相碰</h2>
        <p class="lede">两块身份板贴近的一瞬，彼此愿意公开的那一面，交换了过来。</p>
      </header>

      <div class="meet-pair">
        <div class="meet-side">
          ${personCardHtml({ ...state, size: "mini" })}
          ${meetBeastHtml(state.starter)}
        </div>
        <div class="meet-seam"><span>相碰</span></div>
        <div class="meet-side">
          ${personCardHtml({ ...OTHER, size: "mini" })}
          ${meetBeastHtml(OTHER.beast)}
        </div>
      </div>

      <div class="meet-common">
        <p class="eyebrow">共同兴趣</p>
        <div class="chips">
          ${common.length
            ? common.map((c) => `<span>${esc(c)}</span>`).join("")
            : `<span>暂无重合，正好可以从差异聊起</span>`}
        </div>
      </div>

      <section class="ice">
        <p class="eyebrow">AI 破冰助手</p>
        <p class="ice-lead">${ice.lead}</p>
        <blockquote>${ice.opening}</blockquote>
        <ul>${ice.followups.map((f) => `<li>${f}</li>`).join("")}</ul>
        <p class="ice-avoid">${ice.avoid}</p>
        <p class="fine">演示版由本地规则生成；正式版读取双方授权公开的标签与瑞兽性情。</p>
      </section>
    </div>
  `);
}

/* ---------------- 相遇 · 文 ---------------- */

function jadeCongSvg() {
  return `
    <svg viewBox="46 12 128 216" fill="none" stroke="#242923" stroke-width="1.2"
         stroke-linecap="round" stroke-linejoin="round" class="draw" aria-hidden="true">
      <rect x="66" y="24" width="88" height="192" rx="3"/>
      <line x1="66" y1="88" x2="154" y2="88"/>
      <line x1="66" y1="152" x2="154" y2="152"/>
      <circle cx="110" cy="120" r="23"/>
      <path d="M96 44l-9-13"/>
      <path d="M103 44l-4-16"/>
      <path d="M110 44V27"/>
      <path d="M117 44l4-16"/>
      <path d="M124 44l9-13"/>
      <path d="M88 53q22-9 44 0"/>
      <path d="M92 68q7-7 14 0q-7 7-14 0"/>
      <path d="M114 68q7-7 14 0q-7 7-14 0"/>
      <circle cx="99" cy="68" r="2" fill="#242923"/>
      <circle cx="121" cy="68" r="2" fill="#242923"/>
      <path d="M104 80h12"/>
      <path d="M92 176q7-7 14 0q-7 7-14 0"/>
      <path d="M114 176q7-7 14 0q-7 7-14 0"/>
      <circle cx="99" cy="176" r="2" fill="#242923"/>
      <circle cx="121" cy="176" r="2" fill="#242923"/>
      <path d="M100 192h20"/>
      <path d="M103 192v-6"/>
      <path d="M117 192v-6"/>
    </svg>`;
}

function mangaSvg() {
  return `
    <svg viewBox="20 20 180 188" fill="none" stroke="#242923" stroke-width="1.2"
         stroke-linecap="round" stroke-linejoin="round" class="draw" aria-hidden="true">
      <rect x="30" y="30" width="76" height="76" rx="2"/>
      <rect x="30" y="118" width="76" height="78" rx="2"/>
      <rect x="116" y="30" width="74" height="60" rx="2"/>
      <rect x="116" y="102" width="74" height="94" rx="2"/>
      <path d="M40 92l56-16"/>
      <path d="M40 104l48-6"/>
      <path d="M40 148l58 12"/>
      <path d="M40 164l58 12"/>
      <path d="M40 176l48 10"/>
      <path d="M153 52l-13-9"/>
      <path d="M153 52l-15 5"/>
      <path d="M153 52l-6 14"/>
      <path d="M153 52l5 15"/>
      <path d="M153 52l14 9"/>
      <path d="M153 52l15-3"/>
      <circle cx="153" cy="152" r="16"/>
      <path d="M153 126v10"/>
      <path d="M153 168v10"/>
    </svg>`;
}

function openCulture(key = "liangzhu") {
  openModal(`
    <div class="culture">
      <div class="place-tabs">
        <button class="place-tab ${key === "liangzhu" ? "active" : ""}" data-place="liangzhu">良渚 · 玉琮</button>
        <button class="place-tab ${key === "anime" ? "active" : ""}" data-place="anime">动漫联动展位</button>
      </div>
      <div id="place-body"></div>
    </div>
  `);

  modal.querySelectorAll(".place-tab").forEach((tab) => {
    tab.addEventListener("click", () => openCulture(tab.dataset.place));
  });

  renderPlace(key);
}

function renderPlace(key) {
  const p = PLACES[key];
  const b = BEASTS[p.beast];
  const got = state.unlocked.includes(p.beast);

  $("place-body").innerHTML = `
    <div class="place-grid">
      <div class="place-hero">${key === "liangzhu" ? jadeCongSvg() : mangaSvg()}</div>
      <div class="place-copy">
        <p class="eyebrow">${p.place}</p>
        <h2>${p.title}</h2>
        ${p.paras.map((t) => `<p>${t}</p>`).join("")}
        <dl class="place-meta">
          ${p.meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
        </dl>
      </div>
    </div>

    <footer class="place-foot">
      ${got
        ? `<button class="btn btn-ghost" data-open-beast="${p.beast}">你已拥有 · 查看 ${b.name}</button>`
        : `<button class="btn btn-primary" id="claim">完成观察 · 领取</button>`}
      <p class="fine">地点为演示场景；瑞兽为原创设计，非历史既有形象。</p>
    </footer>
  `;

  const claim = $("claim");
  if (claim) claim.addEventListener("click", () => claimPlace(key));

  const openBtn = document.querySelector("[data-open-beast]");
  if (openBtn) openBtn.addEventListener("click", () => openBeast(p.beast));
}

function claimPlace(key) {
  const p = PLACES[key];
  const b = BEASTS[p.beast];
  const isNew = !state.unlocked.includes(p.beast);
  if (isNew) state.unlocked.push(p.beast);

  renderBeasts();
  updateStage();

  $("place-body").innerHTML = `
    <div class="claim">
      <p class="eyebrow">它认了你 · ${p.place.split(" · ")[0]}</p>
      <div class="claim-grid">
        <div>
          <div class="claim-media"><img src="${b.img}" alt="${b.name}"></div>
          <p class="claim-note">已存入图鉴 · 排在已收藏的最后一位</p>
        </div>
        <div>
          <h2>${b.name}</h2>
          <p class="bd-role">${b.role} · ${b.series}</p>
          <p class="bd-text">${b.nature}</p>
          <dl class="bd-meta">
            <div><dt>形貌</dt><dd>${b.form}</dd></div>
            <div><dt>${b.useLabel || "古人怎么用"}</dt><dd>${b.use}</dd></div>
            <div><dt>设计来历</dt><dd>${b.origin}</dd></div>
            <div><dt>今日宜</dt><dd>${b.todo}</dd></div>
          </dl>
          <blockquote class="bd-verse">${b.verse}</blockquote>
          <div class="sync" id="reveal-sync"></div>
        </div>
      </div>
    </div>
  `;

  modalBody().scrollTop = 0;

  /* 结缘这一下同样要真的写板子。之前这里没有 run，只是把进度条跑满就报
   * 「已写入」，板子上其实什么都没有——良渚那次失败就是这么来的。 */
  mountSync($("reveal-sync"), {
    label: "上传到身份板",
    hint: `${b.name} · 单独一页`,
    done: state.syncedBeasts.includes(p.beast),
    doneNote: `「${b.name}」这一页已在板端。`,
    run: hasFrame(p.beast) ? (onProgress) => writeBeastPage(p.beast, onProgress) : null,
    onDone: (ok) => {
      if (!ok) return;
      if (!state.syncedBeasts.includes(p.beast)) state.syncedBeasts.push(p.beast);
    },
  });

  toast(isNew ? `获得「${b.name}」，已加入图鉴` : `「${b.name}」已在你的图鉴里`);
}

/* ---------------- 事件绑定 ---------------- */

document.querySelectorAll(".nav-item").forEach((b) => {
  b.addEventListener("click", () => showView(b.dataset.view));
});

$("brand").addEventListener("click", (e) => {
  e.preventDefault();
  if (state.ready) showView("identity");
  else window.scrollTo({ top: 0, behavior: "smooth" });
});

$("restart").addEventListener("click", () => location.reload());

$("nickname").addEventListener("input", (e) => {
  state.nickname = e.target.value.trim() || "未命名";
});

$("mbti").addEventListener("change", (e) => { state.mbti = e.target.value; });
$("zodiac").addEventListener("change", (e) => { state.zodiac = e.target.value; });

$("occupation").addEventListener("input", (e) => {
  state.occupation = e.target.value.trim();
});

$("note").addEventListener("input", (e) => {
  state.note = e.target.value.trim();
  $("note-count").textContent = `${e.target.value.length} / 30`;
});

$("style-tags").addEventListener("click", (e) => {
  const id = e.target.dataset.style;
  if (!id) return;
  state.style = id;
  renderStyles();
});

$("interest-groups").addEventListener("click", (e) => {
  const tag = e.target.dataset.interest;
  if (!tag) return;
  const i = state.interests.indexOf(tag);
  if (i >= 0) state.interests.splice(i, 1);
  else if (state.interests.length >= 6) return toast("最多选 6 个，卡面只展示前 3 个");
  else state.interests.push(tag);
  renderInterests();
});

$("pet-tags").addEventListener("click", (e) => {
  const pet = e.target.dataset.pet;
  if (!pet) return;
  state.pet = pet;
  renderPets();
});

/* 照片：本地读取，立即预览 */
$("photo").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("请选择图片文件");
  if (state.photo) URL.revokeObjectURL(state.photo);
  state.photo = URL.createObjectURL(file);
  $("photo-preview").src = state.photo;
  $("photo-preview").hidden = false;
  $("photo-empty").hidden = true;
  $("photo-change").hidden = false;
  $("photo-drop").classList.add("has-photo");
  toast("照片已载入");
});

/* 生成：先让三个模型同时画，而不是直接出一张 */
$("generate").addEventListener("click", () => {
  if (state.interests.length < 3) return toast("至少选 3 个兴趣标签，卡面才有话题");
  state.nickname = ($("nickname").value || "").trim() || "未命名";
  state.occupation = ($("occupation").value || "").trim();
  state.note = ($("note").value || "").trim();
  if (picking) return;
  openPicker();
});

/* 一格一格地点：只有画完的那张能点，还没画完的 disabled 掉 */
$("pk-grid").addEventListener("click", (e) => {
  const cell = e.target.closest(".pk-card");
  if (!cell || cell.disabled) return;
  choosePick(cell.dataset.key);
});

/* ESC 退回表单：只在没在画、也没在排版的时候有效，免得不小心丢掉这一轮 */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || $("picker").hidden || choosing) return;
  closePicker();
});

$("go-beasts").addEventListener("click", () => showView("beasts"));

$("beast-grid").addEventListener("click", (e) => {
  const tile = e.target.closest("[data-beast]");
  if (!tile) return;
  openBeast(tile.dataset.beast);
});

$("btn-meet").addEventListener("click", openMeet);
$("btn-culture").addEventListener("click", () => openCulture("liangzhu"));

/* ---------------- 启动 ---------------- */

fillSelect("mbti", MBTI, state.mbti);
fillSelect("zodiac", ZODIAC, state.zodiac);
$("nickname").value = state.nickname;
$("occupation").value = state.occupation;
$("note").value = state.note;
$("note-count").textContent = `${state.note.length} / 30`;
$("photo-preview").src = state.photo;
renderStyles();
renderInterests();
renderPets();
updateStage();
showView("create");
