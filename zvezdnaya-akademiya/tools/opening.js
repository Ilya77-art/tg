/* ---------- case opening: one session with explicit phases ----------
   arrive → charge → open → reel → land → reveal → settled. The result is already saved before the show starts
   (Data.openCase), so any interruption only shortens the show. Every timer, frame loop and Web Animation belongs
   to the session; skip jumps to the reveal from any earlier phase, close tears everything down. */
const MOTION = {
  arrive: 520, charge: 700, open: 520, out: 300, reelIn: 380, reel: 4800, reelShort: 2600, land: 720, landShort: 520,
  spring: 'cubic-bezier(.2, 1.3, .35, 1)', settle: 'cubic-bezier(.16, 1, .3, 1)', press: 'cubic-bezier(.4, 0, .6, 1)', away: 'cubic-bezier(.55, 0, 1, .45)'
};
const Cases = (() => {
  const META = window.ACAD_CASEMETA || {}, VID = window.ACAD_CASEVID || {};
  let run = null;
  /* opening videos (prism, briefcase, spray): one source per page, picked by what the browser can play */
  const vidSrc = {};
  function videoSrc(look) {
    const v = VID[look]; if (!v || reduceMotion) return null;
    if (look in vidSrc) return vidSrc[look];
    const t = document.createElement('video');
    const kind = v.webm && t.canPlayType('video/webm; codecs="vp9"') ? ['webm', 'video/webm'] : v.mp4 && t.canPlayType('video/mp4; codecs="avc1.4d401e"') ? ['mp4', 'video/mp4'] : null;
    if (!kind) return (vidSrc[look] = null);
    let blob = null;
    try { const bin = atob(v[kind[0]]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); blob = URL.createObjectURL(new Blob([u8], { type: kind[1] })); } catch (e) { blob = null; }
    return (vidSrc[look] = { blob, data: `data:${kind[1]};base64,${v[kind[0]]}` });
  }

  /* a timeline owned by one session: timeouts, one frame loop and Web Animations, all cancelled together */
  function timeline() {
    const ids = new Set(), anims = new Set(); let raf = 0;
    return {
      at(ms, fn) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); },
      loop(fn) { cancelAnimationFrame(raf); const step = t => { if (fn(t) !== false) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); },
      anim(el, frames, o) { if (!el || reduceMotion || !el.animate) return null; const a = el.animate(frames, o); anims.add(a); a.finished.then(() => anims.delete(a), () => anims.delete(a)); return a; },
      clear() { ids.forEach(clearTimeout); ids.clear(); cancelAnimationFrame(raf); raf = 0; anims.forEach(a => { try { a.cancel(); } catch (e) { /* gone */ } }); anims.clear(); }
    };
  }

  /* the case as parts: the picture is cut at its seam, so a lid can swing, a capsule split, a cap pop */
  function rig(cs) {
    const src = (window.ACAD_CASEART || {})[cs.look], m = META[cs.look];
    if (!src || !m) return `<div class="crig" data-st="none">${Art.caseArt(cs)}<i class="cr-light"></i></div>`;
    const img = cls => `<img class="cr-p ${cls}" src="${src}" alt="" draggable="false">`;
    const mid = m.seam != null ? m.seam : (m.top + m.bot) / 2;
    const vars = `--seam:${(mid * 100).toFixed(1)}%;--top:${(m.top * 100).toFixed(1)}%;--bot:${(m.bot * 100).toFixed(1)}%;--cw:${(m.w * 100).toFixed(1)}%`;
    const v = VID[cs.look] && !reduceMotion ? VID[cs.look] : null;
    const video = v ? `<video class="cr-v" muted playsinline preload="auto" disablepictureinpicture aria-hidden="true" style="left:${(v.L * 100).toFixed(2)}%;top:${(v.T * 100).toFixed(2)}%;width:${(v.W * 100).toFixed(2)}%;height:${(v.H * 100).toFixed(2)}%"></video>` : '';
    return `<div class="crig" data-st="${m.style}" style="${vars}">${m.seam != null ? img('cr-b') + '<i class="cr-light"></i>' + img('cr-t') : img('cr-w') + '<i class="cr-light"></i>'}${video}</div>`;
  }

  /* each opening style is choreography for the parts: [element selector, keyframes, timing] */
  const OPEN = {
    hinge: [['.cr-t', [{ transform: 'none' }, { transform: 'translateY(1%) rotateX(-4deg)', offset: 0.18 }, { transform: 'translateY(-11%) rotateX(68deg)' }], { duration: MOTION.open, easing: MOTION.spring }],
      ['.cr-b', [{ transform: 'none' }, { transform: 'translateY(1.2%) scaleY(.985)', offset: 0.25 }, { transform: 'none' }], { duration: 420, easing: MOTION.settle }]],
    split: [['.cr-t', [{ transform: 'none' }, { transform: 'translateY(2%)', offset: 0.15 }, { transform: 'translateY(-30%) rotate(-14deg)' }], { duration: MOTION.open, easing: MOTION.spring }],
      ['.cr-b', [{ transform: 'none' }, { transform: 'translateY(8%) rotate(5deg)' }], { duration: MOTION.open, easing: MOTION.spring }]],
    pop: [['.cr-t', [{ transform: 'none', opacity: 1 }, { transform: 'translateY(3%)', offset: 0.12 }, { transform: 'translate(10%, -46%) rotate(32deg)', opacity: 1, offset: 0.7 }, { transform: 'translate(13%, -52%) rotate(38deg)', opacity: 0 }], { duration: MOTION.open + 140, easing: MOTION.settle }],
      ['.cr-b', [{ transform: 'none' }, { transform: 'translateY(2%) scaleY(.97)', offset: 0.2 }, { transform: 'none' }], { duration: 460, easing: MOTION.settle }]],
    beam: [['.cr-w', [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'scale(.97)', offset: 0.15 }, { transform: 'scale(1.07)', filter: 'brightness(1.7)', offset: 0.55 }, { transform: 'scale(1.03)', filter: 'brightness(1.35)' }], { duration: MOTION.open, easing: MOTION.settle }]],
    frame: [['.cr-w', [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'rotateY(0) scale(.97)', offset: 0.15 }, { transform: 'rotateY(-24deg) scale(1.05)', filter: 'brightness(1.5)', offset: 0.6 }, { transform: 'rotateY(-14deg) scale(1.03)', filter: 'brightness(1.3)' }], { duration: MOTION.open + 80, easing: MOTION.settle }]],
    none: [['.crig > *:first-child', [{ transform: 'none' }, { transform: 'scale(1.08)', filter: 'brightness(1.6)' }], { duration: MOTION.open, easing: MOTION.settle }]]
  };

  function reelTile(it) { return `<div class="t" style="--rc:${C.RARITY[it.r].color}"><div class="art">${Art.item(it)}</div><span><i class="g">${C.GLYPH[it.r]}</i> ${esc(it.name)}</span></div>`; }
  /* reel filler follows the real odds; near the winning tile nothing rarer than epic is placed (no staged near-misses) */
  function filler(cs, near) {
    const keys = RORDER.filter(r => cs.odds[r] && (!near || RORDER.indexOf(r) < 4)), use = keys.length ? keys : RORDER.filter(r => cs.odds[r]);
    const tot = use.reduce((a, r) => a + cs.odds[r], 0);
    let x = Math.random() * tot, r = use[0]; for (const k of use) { if (x < cs.odds[k]) { r = k; break; } x -= cs.odds[k]; }
    const pool = (cs.id === 'starter' ? C.ITEMS.filter(i => i.type === 'sticker') : Data.casePool(cs)).filter(i => i.r === r);
    return pool[Math.floor(Math.random() * pool.length)] || C.ITEMS.find(i => i.type === 'sticker');
  }
  /* one quick action that puts the new prize to use */
  function quick(s, it) {
    if (!s || Data.readOnly()) return null;
    const pr = s.profile;
    if (it.type === 'theme' && pr.theme !== it.id) return { label: 'Поставить фоном', fn: () => { Data.setTheme(s.id, it.id); go('profile'); } };
    if (it.type === 'model' && pr.model !== it.id) return { label: 'Выбрать фигурой', fn: () => { Data.setModel(s.id, it.id); go('profile'); } };
    if (it.type === 'skin') return { label: 'Надеть', fn: () => { Data.setSkin(s.id, pr.model, it.id); go('profile'); } };
    if (it.type === 'model' && pr.set[it.art.base] !== it.id) return { label: 'На доску', fn: () => { Data.setSet(s.id, it.art.base, it.id); go('studio', { stab: 'set' }); } };
    if (it.type === 'sticker') return { label: 'Наклеить', fn: () => go('studio', { stab: 'sticker' }) };
    if ((it.type === 'frame' || it.type === 'title') && s.equip[it.type] !== it.id) return { label: 'Надеть', fn: () => { Data.equip(s.id, it.type, it.id); render(); } };
    return null;
  }
  /* entry point from the shop: the purchase is one data change, then the show */
  function open(caseId, opts = {}) {
    if (run) return;
    const s = active(); if (!s) return;
    const cs = C.CASES.find(c => c.id === caseId); if (!cs) return;
    const res = Data.openCase(s.id, caseId);
    if (!res || res.error) { Sound.bad(); toast(esc(res ? res.error : 'Не получилось открыть кейс')); return; }
    play(cs, res, { from: opts.from, quick: opts.quick });
  }

  function play(cs, res, opts = {}) {
    if (run) return;
    /* short: the first-lesson capsule; brisk: also «ещё раз» right after a reveal, the case is already in front of you */
    const it = res.item, rc = C.RARITY[it.r].color, lv = RORDER.indexOf(it.r), short = !!opts.short, brisk = short || !!opts.quick;
    const tl = timeline();
    const ov = document.createElement('div'); ov.className = 'opening';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Открытие: ' + cs.name);
    ov.style.setProperty('--rc', '#5e5ce6');
    ov.innerHTML = `<div class="rays"></div><i class="o-vbg"></i><button type="button" class="btn sm glass skip" id="skipB">Пропустить</button>
      <div class="stage2"><p class="ctitle">${esc(cs.name)}</p><div class="casebox"><i class="o-beam"></i><div class="bigcase">${rig(cs)}</div><i class="o-floor"></i></div></div>`;
    layer.appendChild(ov);
    const sess = { phase: 'arrive', ov, tl, ctl: null };
    run = sess;
    const stage = $('.stage2', ov), box = $('.casebox', ov), big = $('.bigcase', ov), crig = $('.crig', ov), light = $('.cr-light', ov);
    const phase = p => { sess.phase = p; ov.dataset.phase = p; };
    /* the opening video, if this case has one: blob URL first, data URL second, the parts animation if neither plays */
    const vm = VID[cs.look], vs = videoSrc(cs.look), vid = vs ? $('.cr-v', ov) : null;
    if (vid) {
      vid.muted = true; vid.playsInline = true;
      vid.addEventListener('error', () => { if (vs.blob && vid.dataset.src !== 'data') { vid.dataset.src = 'data'; vid.src = vs.data; vid.load(); } else vid.dataset.failed = '1'; });
      vid.dataset.src = vs.blob ? 'blob' : 'data'; vid.src = vs.blob || vs.data; vid.load();
    }
    sess.vid = vid;
    const pre = () => ['arrive', 'charge', 'open', 'reel', 'land'].includes(sess.phase);

    /* keyboard: Space, Enter or Escape skip to the prize; after the reveal Escape takes it */
    const onKey = e => {
      if (run !== sess) return;
      if (pre() && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); e.stopPropagation(); skip(); }
      /* keys pressed to skip must not fall through onto the prize's buttons while they are still appearing */
      else if (sess.phase === 'reveal' && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); e.stopPropagation(); }
      else if (sess.phase === 'settled' && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const t = $('#takeB', ov) || $('#nextB', ov); if (t) t.click(); }
    };
    document.addEventListener('keydown', onKey, true);
    $('#skipB', ov).addEventListener('click', () => skip());
    setTimeout(() => { const b = $('#skipB', ov); if (b && run === sess) b.focus({ preventScroll: true }); }, 30);

    function skip() { if (run !== sess || !pre()) return; tl.clear(); reveal(true); }
    function close() {
      if (run !== sess) return;
      tl.clear(); if (sess.ctl) sess.ctl.destroy();
      if (vid) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { /* already gone */ } }
      document.removeEventListener('keydown', onKey, true);
      ov.remove(); run = null; phase('closed');
    }

    /* reduced motion: the prize, without the show */
    if (reduceMotion) { phase('arrive'); Sound.open(); tl.at(260, () => reveal(false)); return; }

    /* 1. arrive: the case flies in from the card that was pressed */
    phase('arrive');
    tl.anim(ov, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'linear' });
    let from = 'translateY(42px) scale(.72)';
    if (opts.from && opts.from.width) {
      const r = big.getBoundingClientRect(), f = opts.from;
      if (r.width) from = `translate(${(f.left + f.width / 2 - (r.left + r.width / 2)).toFixed(1)}px, ${(f.top + f.height / 2 - (r.top + r.height / 2)).toFixed(1)}px) scale(${(f.width / r.width).toFixed(3)})`;
    }
    tl.anim(big, [{ transform: from, opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: brisk ? 360 : MOTION.arrive, easing: MOTION.spring });
    tl.anim($('.o-floor', ov), [{ opacity: 0, transform: 'scaleX(.4)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.arrive, easing: MOTION.settle });
    tl.anim($('.ctitle', ov), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 160, easing: MOTION.settle, fill: 'backwards' });
    Sound.click();

    /* 2–3. charge and open: by the case's own video when it is ready to play, otherwise by its parts */
    const tCharge = brisk ? 360 : MOTION.arrive + 60, charge = brisk ? 480 : MOTION.charge;
    tl.at(tCharge, () => { if (vid && !vid.dataset.failed && vid.readyState >= 2) videoShow(); else classic(); });

    function classic() {
      phase('charge');
      tl.anim(big, [{ transform: 'none' }, { transform: 'translateY(3%) scale(1.045, .94)', offset: 0.35 }, { transform: 'translateY(-1.5%) scale(.985, 1.02)', offset: 0.7 }, { transform: 'none' }], { duration: 380, easing: MOTION.press });
      const shake = []; const n = 16;
      for (let i = 0; i <= n; i++) { const k = i / n, amp = 0.6 + k * k * 5.4, sgn = i % 2 ? 1 : -1; shake.push({ transform: i === n ? 'none' : `translate(${(sgn * amp).toFixed(2)}px, ${(-sgn * amp * 0.4).toFixed(2)}px) rotate(${(sgn * amp * 0.55).toFixed(2)}deg)` }); }
      tl.anim(crig, shake, { duration: charge, delay: short ? 120 : 260, easing: 'linear' });
      tl.anim(light, [{ opacity: 0, transform: 'scale(.6, .4)' }, { opacity: 0.85, transform: 'scale(1, 1)' }], { duration: charge, delay: 200, easing: 'cubic-bezier(.5, 0, .9, .6)', fill: 'forwards' });
      tl.anim($('.rays', ov), [{ opacity: 0.5 }, { opacity: 0.85 }], { duration: charge + 260, easing: 'ease-in', fill: 'forwards' });
      Sound.thock(); Sound.charge((charge + 200) / 1000);
      const tOpen = brisk ? 600 : charge + 240;
      tl.at(tOpen, () => {
        phase('open');
        (OPEN[crig.dataset.st] || OPEN.none).forEach(([sel, kf, o]) => { const el = sel.startsWith('.crig') ? $(sel, ov) : $(sel, crig); tl.anim(el, kf, Object.assign({ fill: 'forwards' }, o)); });
        tl.anim(light, [{ opacity: 0.85, transform: 'scale(1, 1)' }, { opacity: 1, transform: 'scale(1.5, 7)', offset: 0.35 }, { opacity: 0, transform: 'scale(1.9, 9)' }], { duration: 760, easing: MOTION.settle, fill: 'forwards' });
        tl.anim($('.o-beam', ov), [{ opacity: 0, transform: 'scaleY(.15)' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.3 }, { opacity: 0, transform: 'scaleY(1.15)' }], { duration: 900, easing: MOTION.settle, fill: 'forwards' });
        const lr = light.getBoundingClientRect();
        FX.burst(lr.left + lr.width / 2, lr.top + lr.height / 2, { n: 60, colors: ['#ffffff', '#ffe08a', '#ffd60a', '#c8d2ff'], speed: 11 });
        Sound.open();
      });
      tl.at(tOpen + (brisk ? 420 : MOTION.open + 120), toReel);
    }

    /* the video carries its own anticipation, opening and burst; the stage darkens to its backdrop around it */
    function videoShow() {
      phase('charge');
      const rate = (vm.rate || 1) * (brisk ? 1.25 : 1), dur = isFinite(vid.duration) && vid.duration > 0 ? vid.duration : vm.dur || 3;
      ov.style.setProperty('--vbg', vm.bg || '#080e20'); ov.dataset.vid = '1';
      /* frame 0 is the picture itself, so the swap is invisible; it happens at once, not when playback reports in */
      tl.anim(vid, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'linear', fill: 'forwards' });
      $$('.cr-p', crig).forEach(el => tl.anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 60, easing: 'linear', fill: 'forwards' }));
      tl.anim($('.rays', ov), [{ opacity: 0.5 }, { opacity: 0.16 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
      Sound.thock(); Sound.charge(Math.min(2.4, (vm.cue || 1) / rate));
      vid.playbackRate = rate;
      let p; try { vid.currentTime = 0; p = vid.play(); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).catch(() => {
        /* autoplay refused or the format failed after all: the parts take over */
        if (run !== sess || sess.phase !== 'charge') return;
        delete ov.dataset.vid; vid.dataset.failed = '1'; vid.style.display = 'none'; tl.clear(); $$('.cr-p', crig).forEach(el => { el.style.opacity = ''; }); classic();
      });
      /* the video's own clock drives the show, so a slow start never cuts it short; a safety net if it stalls */
      let opened = false, done = false;
      const finish = () => { if (done) return; done = true; toReel(); };
      tl.loop(() => {
        if (run !== sess || done || vid.dataset.failed) return false;
        const t = vid.currentTime;
        if (!opened && t >= (vm.cue || 1)) { opened = true; phase('open'); Sound.open(); }
        if (t >= dur - 0.28 * rate || vid.ended) { finish(); return false; }
        return true;
      });
      tl.at(dur * 1000 / rate + 2200, finish);
    }

    /* 4. reel: the case steps back, the roulette rises in its place */
    function toReel() {
      if (run !== sess) return;
      phase('reel');
      if (ov.dataset.vid) { delete ov.dataset.vid; tl.anim($('.rays', ov), [{ opacity: 0.16 }, { opacity: 0.5 }], { duration: 700, easing: 'ease-in-out', fill: 'forwards' }); }
      const a = tl.anim(box, [{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'translateY(-8%) scale(.84)', filter: 'brightness(1.6) blur(5px)' }], { duration: MOTION.out, easing: MOTION.away, fill: 'forwards' });
      const go2 = () => { if (run !== sess || sess.phase !== 'reel') return; if (vid) vid.pause(); box.remove(); spin(); };
      if (a) a.finished.then(go2, () => {}); else go2();
    }

    function spin() {
      const N = short ? 40 : 62, WIN = short ? 33 : 54, tiles = [];
      for (let i = 0; i < N; i++) tiles.push(i === WIN ? it : filler(cs, Math.abs(i - WIN) <= 2));
      const reel = document.createElement('div'); reel.className = 'reel';
      reel.innerHTML = `<div class="strip">${tiles.map(reelTile).join('')}</div><div class="mark"></div>`;
      stage.appendChild(reel);
      tl.anim(reel, [{ opacity: 0, transform: 'translateY(26px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: MOTION.reelIn, easing: MOTION.settle, fill: 'both' });
      /* layout sizes, not getBoundingClientRect: the reel is mid-entrance (scaled), which would skew the stop point */
      const strip = $('.strip', reel), first = strip.children[0];
      const w = first.offsetWidth, gap = parseFloat(getComputedStyle(strip).columnGap || getComputedStyle(strip).gap) || 12, step = w + gap;
      const RW = reel.clientWidth;
      const target = WIN * step + w / 2 - RW / 2 + (Math.random() - 0.5) * w * 0.7;
      const dur = short ? MOTION.reelShort : MOTION.reel, t0 = performance.now();
      const ease = t => 1 - Math.pow(1 - t, 4.2);
      let lastIdx = -1, lastX = 0;
      tl.loop(now => {
        const t = Math.min(1, (now - t0) / dur), x = target * ease(t), v = Math.abs(x - lastX); lastX = x;
        strip.style.transform = `translateX(${-x}px)`;
        strip.style.filter = v > 6 ? `blur(${Math.min(4, v / 9).toFixed(1)}px)` : 'none';
        const idx = Math.floor((x + RW / 2) / step);
        if (idx !== lastIdx) { lastIdx = idx; Sound.tick(); }
        if (t < 1) return true;
        strip.style.filter = 'none';
        land(reel, strip.children[WIN]);
        return false;
      });
    }
    /* 5. land: the winning tile answers in its rarity colour before the prize steps out */
    function land(reel, tile) {
      phase('land');
      reel.classList.add('done'); tile.classList.add('win'); ov.style.setProperty('--rc', rc);
      tl.anim(tile, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1.12)' }], { duration: 520, easing: MOTION.spring, fill: 'forwards' });
      const r = tile.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 24 + lv * 10, colors: [rc, '#ffffff'], speed: 7 });
      Sound.thock();
      tl.at(short ? MOTION.landShort : MOTION.land, () => reveal(false));
    }

    /* 6. reveal: the climax, then 7. settled: the prize is yours, the actions are there */
    function reveal(skipped) {
      if (run !== sess || sess.phase === 'reveal' || sess.phase === 'settled') return;
      phase('reveal');
      ov.style.setProperty('--rc', rc);
      if (vid) vid.pause();
      if (ov.dataset.vid) { delete ov.dataset.vid; const ry = $('.rays', ov); if (ry) ry.style.opacity = ''; }
      if (lv >= 3) { const f = document.createElement('div'); f.className = 'flash'; f.style.setProperty('--flash', rc); document.body.appendChild(f); setTimeout(() => f.remove(), 700); }
      if (lv >= 4) { document.body.classList.remove('shakeall'); void document.body.offsetWidth; document.body.classList.add('shakeall'); setTimeout(() => document.body.classList.remove('shakeall'), 600); }
      Sound.reveal(it.r);
      const cur = active() || {}, again = !opts.next && cs.price > 0 && cur.id && Data.balance(cur) >= cs.price && !Data.readOnly(), q = res.dup || opts.next ? null : quick(cur.id ? cur : null, it);
      const sk = $('#skipB', ov); if (sk) sk.remove();
      stage.innerHTML = `<div class="reveal ${skipped ? 'quick' : ''}" style="--rc:${rc}">
        <span class="rname ${lv >= 3 ? 'big' : ''}"><i class="g">${C.GLYPH[it.r]}</i> ${C.RARITY[it.r].name}</span>
        <div class="r3wrap"><div class="r3d" id="r3d"></div><i class="r-floor"></i></div>
        <span class="inm rv" style="--d:180ms">${esc(it.type === 'skin' ? Art.modelInfo('c_' + Art.skinPiece(it)).name + ' | ' + it.name : it.name)}</span><span class="itp rv" style="--d:240ms">${C.TYPES[it.type].name}${it.type === 'skin' ? ' · ' + Data.wearOf(cur.id ? cur : null, it.id).name.toLowerCase() : ''}</span>
        ${res.dream ? '<span class="dreamhit rv" style="--d:300ms">♥ Мечта сбылась!</span>' : ''}
        <p class="note2 rv" style="--d:320ms">${res.dup ? `Такой приз уже есть, поэтому он превратился в <b>${res.refund} ${starsWord(res.refund)}</b>.` : esc(it.text)}${res.forced ? ' Сработала гарантия эпика!' : ''}</p>
        <div class="row c racts rv" style="--d:${skipped ? 220 : 420}ms">${opts.next ? `<button type="button" class="btn lg" id="nextB">${esc(opts.next.label)} ${ICON.arrow}</button>` : ''}${q ? `<button type="button" class="btn lg" id="useNow">${esc(q.label)}</button>` : ''}<button type="button" class="btn lg glass" id="inspB">${ICON.cube}Осмотреть</button>${opts.next ? '' : `<button type="button" class="btn lg ${q ? 'glass' : ''}" id="takeB">Забрать</button>`}${again ? `<button type="button" class="btn lg glass" id="againB">Ещё раз · ${cs.price}★</button>` : ''}</div>
      </div>`;
      const face = $('#r3d', stage);
      sess.ctl = Inspect.mount(face, it.id, { floor: $('.r-floor', stage), rest: -14, from: skipped ? -120 : -200 });
      tl.at(skipped ? 60 : 160, () => FX.at(face, { n: 60 + lv * 36, colors: [rc, '#ffffff', '#ffd60a', lv >= 5 ? '#64d2ff' : rc], speed: 10 + lv * 2 }));
      if (lv >= 5) tl.at(650, () => FX.at(face, { n: 140, colors: ['#ff375f', '#ffd60a', '#30d158', '#64d2ff', '#bf5af2'], speed: 15 }));
      const once = fn => () => { if (run !== sess || sess.phase !== 'settled') return; fn(); };
      $('#inspB', stage).onclick = once(() => { if (opts.next) { Inspect.open(it.id, { fresh: false, preview: true }); return; } close(); Inspect.open(it.id, { fresh: false }); });
      const tk = $('#takeB', stage); if (tk) tk.onclick = once(() => { close(); render(); });
      const nb = $('#nextB', stage); if (nb) nb.onclick = once(() => { close(); opts.next.fn(); });
      const un = $('#useNow', stage); if (un) un.onclick = once(() => { close(); q.fn(); Sound.star(); });
      const ag = $('#againB', stage); if (ag) ag.onclick = once(() => { const r = $('#r3d', stage).getBoundingClientRect(); close(); open(cs.id, { from: r, quick: true }); });
      /* the actions answer only once they are visible: no accidental double press carried over from the skip */
      tl.at(skipped ? 380 : 520, () => { if (run !== sess) return; phase('settled'); (nb || un || tk || $('#inspB', stage)).focus({ preventScroll: true }); });
    }

  }
  return { open, play, busy: () => !!run, phase: () => (run ? run.phase : 'idle') };
})();
