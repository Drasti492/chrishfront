(() => {
  const { API_URL, SHOP_NAME, SHOW_SAMPLE_WINNERS } = window.APP_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (n) => Number(n).toLocaleString('en-KE');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let token = localStorage.getItem('xmas_token');
  let cfg = { segments: [1450, 3240, 0, 5500, 2300, 0, 4670, 1800, 6580, 0, 2870, 3800, 0, 6000, 4200, 2600, 0, 5100], branches: [], maxSpins: 3, slotsLeft: 5000, target: 5000, taken: 0 };
  let me = null, rotation = 0, spinning = false;

  $('#shopName').textContent = SHOP_NAME && SHOP_NAME !== 'Your Minimart' ? `${SHOP_NAME} Christmas` : 'Christmas Giveaway';

  /* ---------- helpers ---------- */
  const SAF = /^(?:07(?![378])\d{8}|01\d{8})$/;
  function cleanPhone(p) {
    let s = String(p || '').replace(/[\s-]/g, '');
    if (s.startsWith('+254')) s = '0' + s.slice(4); else if (s.startsWith('254')) s = '0' + s.slice(3);
    return s;
  }
  let toastTimer;
  function toast(msg, bad) {
    const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = ''), 3400);
  }
  async function api(path, opts = {}) {
    const wake = setTimeout(() => toast('Waking up the server, one moment...'), 3500);
    try {
      const res = await fetch(API_URL + path, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { const e = new Error(data.message || 'Something went wrong.'); e.status = res.status; throw e; }
      return data;
    } catch (e) {
      if (e instanceof TypeError) throw new Error('No connection. Check your internet and try again.');
      throw e;
    } finally { clearTimeout(wake); }
  }
  function show(view) {
    $$('.view').forEach((v) => (v.hidden = v.dataset.view !== view));
    $('#barUser').hidden = !me;
    if (me) $('#barName').textContent = me.username.split(' ')[0];
    window.scrollTo({ top: 0 });
  }
  function busy(btn, on, label) {
    if (on) { btn.dataset.l = btn.textContent; btn.textContent = label || 'Please wait...'; } else btn.textContent = btn.dataset.l || btn.textContent;
    btn.disabled = on;
  }

  /* ---------- wheel drawing ---------- */
  function drawWheel(canvas, segs, px) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = canvas.height = px * dpr;
    const c = canvas.getContext('2d'); c.scale(dpr, dpr);
    const r = px / 2, n = segs.length, sa = (Math.PI * 2) / n;
    segs.forEach((v, i) => {
      const a0 = -Math.PI / 2 + i * sa;
      c.beginPath(); c.moveTo(r, r); c.arc(r, r, r - 1, a0, a0 + sa); c.closePath();
      c.fillStyle = v === 0 ? '#fff4dc' : v >= 5000 ? '#f2b84b' : i % 2 ? '#14523e' : '#b3202e';
      c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
      c.save(); c.translate(r, r); c.rotate(a0 + sa / 2); c.textAlign = 'right'; c.textBaseline = 'middle';
      if (v === 0) {
        c.fillStyle = '#7a1a22'; c.font = `700 ${r * 0.075}px Figtree, sans-serif`; c.fillText('Try again', r * 0.9, 0);
      } else {
        c.fillStyle = v >= 5000 ? '#3a2400' : '#fff';
        c.font = `800 ${r * 0.115}px Fraunces, Georgia, serif`; c.fillText(fmt(v), r * 0.9, 0);
      }
      c.restore();
    });
  }
  function drawAll() {
    const w = $('#wheel'); const size = Math.round($('.wheel-rot').getBoundingClientRect().width) || 420;
    if (!$('[data-view="wheel"]').hidden) drawWheel(w, cfg.segments, size);
    const p = $('#previewWheel'); const ps = Math.round(p.getBoundingClientRect().width) || 360;
    if (ps > 50) drawWheel(p, cfg.segments, ps);
  }
  function buildLights() {
    const box = $('#lights'); box.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const b = document.createElement('i'); b.className = 'bulb';
      b.style.transformOrigin = '50% 1534%'; b.style.transform = `rotate(${i * 15}deg)`;
      box.appendChild(b);
    }
  }

  /* ---------- views ---------- */
  function renderTries() {
    const t = $('#tries'); t.innerHTML = '';
    for (let i = 0; i < cfg.maxSpins; i++) {
      const d = document.createElement('div'); d.className = 'try' + (i < me.spinsUsed ? ' used' : ''); d.textContent = '\u{1F381}'; t.appendChild(d);
    }
    const left = me.spinsLeft;
    $('#wheelHint').textContent = left === cfg.maxSpins ? 'Tap the centre to spin. You have 3 tries to land a voucher.' : `${left} ${left === 1 ? 'try' : 'tries'} left. Tap the centre to spin again.`;
    $('#spinBtn').classList.toggle('ready', left > 0);
  }
  function openWheel() {
    show('wheel'); buildLights(); renderTries(); $('#resultLine').textContent = '';
    requestAnimationFrame(() => { drawAll(); });
  }
  function openReceipt() {
    $('#rAmount').textContent = fmt(me.prize); $('#rName').textContent = me.username;
    $('#rPhone').textContent = me.phone.replace(/^(\d{4})\d{3}(\d{3})$/, '$1 *** $2');
    $('#rBranch').textContent = me.branch; $('#rCode').textContent = me.voucherCode;
    $('#rDate').textContent = new Date(me.claimedAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
    $('#rStatus').textContent = me.redeemed ? 'Redeemed' : 'Ready to redeem';
    $('#rThanks').textContent = `Thank you for shopping with us this year, ${me.username.split(' ')[0]}.`;
    show('receipt');
  }
  function route() {
    if (!me) return show('landing');
    if (me.claimed) return openReceipt();
    if (me.prize) { showWin(); return openWheel(); }
    openWheel();
  }

  /* ---------- spin ---------- */
  async function spin() {
    if (spinning || me.spinsLeft < 1) return;
    spinning = true; $('#spinBtn').disabled = true; $('#resultLine').textContent = '';
    let r;
    try { r = await api('/api/game/spin', { method: 'POST' }); }
    catch (e) { spinning = false; $('#spinBtn').disabled = false; return toast(e.message, true); }

    const n = cfg.segments.length, sa = 360 / n;
    const jitter = (Math.random() - 0.5) * sa * 0.7;
    const target = -((r.sliceIndex + 0.5) * sa + jitter);
    const mod = (x) => ((x % 360) + 360) % 360;
    rotation = rotation + 360 * (reduceMotion ? 1 : 6) + mod(target - rotation);
    const rot = $('#wheelRot');
    rot.style.transition = reduceMotion ? 'transform .4s' : '';
    rot.style.transform = `rotate(${rotation}deg)`;

    const done = () => {
      rot.removeEventListener('transitionend', done);
      me = { ...me, ...r }; spinning = false; $('#spinBtn').disabled = false; renderTries();
      if (r.amount > 0) { $('#resultLine').textContent = `Ksh ${fmt(r.amount)}!`; setTimeout(showWin, 500); }
      else { $('#resultLine').textContent = 'Try again slice. Spin once more!'; toast(`Not this time. ${r.spinsLeft} ${r.spinsLeft === 1 ? 'try' : 'tries'} left.`); }
    };
    rot.addEventListener('transitionend', done);
  }
  function showWin() {
    $('#winAmount').textContent = fmt(me.prize); $('#winModal').hidden = false; confetti();
  }

  /* ---------- confetti + snow ---------- */
  function confetti() {
    if (reduceMotion) return;
    const cv = $('#confetti'), c = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#f2b84b', '#b3202e', '#fff8ea', '#2e9a73'];
    const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * 4) | 0] }));
    let f = 0;
    (function tick() {
      c.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); c.restore(); });
      if (++f < 150) requestAnimationFrame(tick); else c.clearRect(0, 0, cv.width, cv.height);
    })();
  }
  (function snow() {
    if (reduceMotion) return;
    const cv = $('#snow'), c = cv.getContext('2d'); let w, h, flakes;
    const init = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; flakes = Array.from({ length: innerWidth < 600 ? 35 : 70 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.6, v: 0.3 + Math.random() * 0.9, d: Math.random() * 6 })); };
    init(); addEventListener('resize', init);
    (function tick() {
      c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath();
      flakes.forEach((f) => { f.y += f.v; f.d += 0.01; f.x += Math.sin(f.d) * 0.4; if (f.y > h) { f.y = -5; f.x = Math.random() * w; } c.moveTo(f.x, f.y); c.arc(f.x, f.y, f.r, 0, 7); });
      c.fill(); requestAnimationFrame(tick);
    })();
  })();

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); show(g.dataset.go); } });
  $('#brand').addEventListener('click', (e) => { e.preventDefault(); me ? route() : show('landing'); });
  $$('input[inputmode="numeric"]').forEach((i) => i.addEventListener('input', () => { i.value = i.type === 'password' ? i.value.replace(/\D/g, '').slice(0, 4) : i.value.replace(/[^\d+\s]/g, ''); }));
  $('#logoutBtn').addEventListener('click', () => { localStorage.removeItem('xmas_token'); token = null; me = null; show('landing'); });

  async function authDone(data) {
    token = data.token; localStorage.setItem('xmas_token', token);
    me = await api('/api/game/me'); route();
  }
  $('#signupForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target, err = $('#signupErr'), b = $('button[type=submit]', f); err.textContent = '';
    const body = Object.fromEntries(new FormData(f)); body.phone = cleanPhone(body.phone);
    if (body.username.trim().length < 2) return (err.textContent = 'Enter your name.');
    if (!SAF.test(body.phone)) return (err.textContent = 'Enter a valid Safaricom number e.g. 0722 000 000.');
    if (body.phone === '0712345678') return (err.textContent = 'Please use your own Safaricom number.');
    if (body.branch.trim().length < 2) return (err.textContent = 'Type the name of the supermarket you shopped at.');
    if (!/^\d{4}$/.test(body.pin)) return (err.textContent = 'PIN must be exactly 4 digits.');
    if (body.pin === '1234') return (err.textContent = 'Choose a PIN other than 1234.');
    if (body.pin !== body.confirmPin) return (err.textContent = 'The two PINs do not match.');
    busy(b, true, 'Creating account...');
    try { await authDone(await api('/api/auth/register', { method: 'POST', body })); toast('Account created. Good luck!'); }
    catch (x) { err.textContent = x.message; } finally { busy(b, false); }
  });
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target, err = $('#loginErr'), b = $('button[type=submit]', f); err.textContent = '';
    const body = Object.fromEntries(new FormData(f)); body.phone = cleanPhone(body.phone);
    if (!SAF.test(body.phone)) return (err.textContent = 'Enter a valid Safaricom number.');
    if (!/^\d{4}$/.test(body.pin)) return (err.textContent = 'PIN must be 4 digits.');
    busy(b, true, 'Signing in...');
    try { await authDone(await api('/api/auth/login', { method: 'POST', body })); }
    catch (x) { err.textContent = x.message; } finally { busy(b, false); }
  });
  $('#spinBtn').addEventListener('click', spin);
  $('#claimBtn').addEventListener('click', async (e) => {
    busy(e.target, true, 'Preparing receipt...');
    try { me = await api('/api/game/claim', { method: 'POST' }); $('#winModal').hidden = true; openReceipt(); confetti(); }
    catch (x) { toast(x.message, true); } finally { busy(e.target, false); }
  });
  $('#redeemBtn').addEventListener('click', () => { $('#redeemCode').textContent = me.voucherCode; $('#redeemBranch').textContent = me.branch; $('#redeemModal').hidden = false; });
  $('#closeRedeem').addEventListener('click', () => ($('#redeemModal').hidden = true));
  $('#copyBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(me.voucherCode); toast('Code copied.'); } catch { toast('Long-press the code to copy it.'); } });
  $('#printBtn').addEventListener('click', () => window.print());
  addEventListener('resize', () => { clearTimeout(window.__rz); window.__rz = setTimeout(drawAll, 150); });

  /* ---------- places left ---------- */
  function renderSlots() {
    const left = cfg.slotsLeft, pct = Math.min(100, (cfg.taken / cfg.target) * 100);
    $('#slotsBar').style.width = pct + '%';
    if (left > 0) {
      $('#slotsLeft').textContent = fmt(left); $('#slotsText').textContent = `of ${fmt(cfg.target)} places left`;
      $('#slotsNote').textContent = `Our target is ${fmt(cfg.target)} customers.`;
    } else {
      $('#slotsLeft').textContent = fmt(cfg.target) + '+'; $('#slotsText').textContent = 'customers have joined';
      $('#slotsNote').textContent = 'Target reached. Sign-ups stay open while the giveaway budget lasts.';
    }
  }

  /* ---------- live winners popups ---------- */
  const SAMPLE = [
    ['Daisy', '0725', '475', 3240], ['Wanjiru', '0712', '908', 1800], ['Brian', '0722', '316', 2300], ['Achieng', '0710', '554', 4670],
    ['Kevin', '0740', '821', 1450], ['Njeri', '0701', '237', 5100], ['Otieno', '0743', '689', 2870], ['Faith', '0757', '142', 3800],
    ['Mutua', '0768', '095', 2600], ['Chebet', '0790', '773', 1450], ['Kamau', '0721', '460', 4200], ['Atieno', '0719', '318', 1800],
    ['Wambui', '0728', '654', 2300], ['Barasa', '0705', '187', 3240], ['Naliaka', '0796', '902', 5500],
  ].map(([name, p, last, amount]) => ({ name, phone: p + '*****' + last, amount }));
  let feedList = [], feedIdx = 0;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function showFeedItem() {
    if (!feedList.length || document.hidden) return;
    const w = feedList[feedIdx++ % feedList.length];
    const ago = ['just now', '1 min ago', '2 min ago', '4 min ago', '7 min ago'][(Math.random() * 5) | 0];
    const el = document.createElement('div'); el.className = 'feed-item';
    el.innerHTML = `<div class="feed-av"></div><div class="feed-tx"><b></b> <span class="ph"></span><br>redeemed a <em></em> voucher<small>${ago}</small></div>`;
    $('.feed-av', el).textContent = w.name.charAt(0); $('b', el).textContent = w.name; $('.ph', el).textContent = w.phone; $('em', el).textContent = 'Ksh ' + fmt(w.amount);
    const feed = $('#feed'); feed.innerHTML = ''; feed.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 600); }, 4800);
  }
  async function startFeed() {
    let real = [];
    try { real = await api('/api/game/recent'); } catch { /* ignore */ }
    feedList = real.slice();
    if (SHOW_SAMPLE_WINNERS) feedList = feedList.concat(shuffle(SAMPLE.slice()).slice(0, Math.max(0, 15 - real.length)));
    shuffle(feedList);
    if (!feedList.length) return;
    setTimeout(() => { showFeedItem(); setInterval(showFeedItem, 8000); }, 3500);
  }

  /* ---------- boot ---------- */
  (async function boot() {
    drawAll(); setTimeout(drawAll, 300);
    try {
      cfg = { ...cfg, ...(await api('/api/game/config')) };
      renderSlots();
      drawAll();
    } catch { /* landing still works offline */ }
    if (token) { try { me = await api('/api/game/me'); route(); } catch { localStorage.removeItem('xmas_token'); token = null; show('landing'); } }
    else show('landing');
    document.fonts && document.fonts.ready.then(drawAll);
    startFeed();
  })();
})();
