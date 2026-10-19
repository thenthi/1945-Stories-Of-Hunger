/* 1945: Stories of Hunger
   Sections scroll vertically; slides inside a section scroll horizontally.
   Scrolling down walks through a section's slides first, then moves on. */
(function () {
  const root = document.documentElement;
  const sections = Array.from(document.querySelectorAll('.section'));
  const slidesOf = sections.map((sec) => Array.from(sec.querySelectorAll('.slide')));
  const dotsEl = document.getElementById('dots');
  const pager = document.getElementById('pager');
  const pagerDots = document.getElementById('pagerDots');
  const prevSlideBtn = document.getElementById('prevSlide');
  const nextSlideBtn = document.getElementById('nextSlide');
  const nextBtn = document.getElementById('next');
  const flowQuery = window.matchMedia('(max-width: 820px), (max-aspect-ratio: 4/5)');

  const DESIGN_W = 2000, DESIGN_H = 1125;
  const DURATION = 1000;               // keep in sync with --dur in CSS
  let sec = 0, sl = 0, locked = false;

  const isFlow = () => root.classList.contains('is-flow');

  /* ---------- Photo placeholders ---------- */
  document.querySelectorAll('.photo img, .card__bg').forEach((img) => {
    const file = img.getAttribute('src');
    const mark = () => {
      const photo = img.closest('.photo');
      if (photo) {
        photo.classList.add('is-missing');
        photo.querySelector('.photo__paper').dataset.file = file;
      } else {
        img.classList.add('is-missing');
      }
    };
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener('error', mark);
  });

  /* ---------- Mouse parallax: photos drift after the pointer ----------
     The pointer position (-1..1 from the centre) is eased into --mx / --my;
     each photo moves by its own --depth, so a circling mouse circles the photos. */
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.slide').forEach((slide) =>
    slide.querySelectorAll('.photo').forEach((p, i) => p.style.setProperty('--depth', [1, 0.6, 1.4][i % 3])));
  let tx = 0, ty = 0, mx = 0, my = 0, raf = 0;
  function drift() {
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;
    root.style.setProperty('--mx', mx.toFixed(4));
    root.style.setProperty('--my', my.toFixed(4));
    raf = Math.abs(tx - mx) + Math.abs(ty - my) > 0.0005 ? requestAnimationFrame(drift) : 0;
  }
  function aim(x, y) {
    tx = x;
    ty = y;
    if (!raf) raf = requestAnimationFrame(drift);
  }
  window.addEventListener('mousemove', (e) => {
    if (isFlow() || still.matches) return;
    aim(e.clientX / window.innerWidth * 2 - 1, e.clientY / window.innerHeight * 2 - 1);
  });
  document.addEventListener('mouseleave', () => aim(0, 0));

  /* ---------- Words: wrap each word so the text can rise in word by word ---------- */
  const TEXT = '.title, .kicker, .panel__year, .panel__date, .panel__title, .text p, .panel__text p, .scroll__paper p';
  document.querySelectorAll(TEXT).forEach((block) => {
    if (block.closest('.w-done')) return;
    block.classList.add('w-done');
    let i = 0;
    const walk = (node) => Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 1) return walk(n);
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
        const w = document.createElement('span');
        w.className = 'w';
        w.style.setProperty('--i', i++);
        w.textContent = part;
        frag.appendChild(w);
      });
      n.replaceWith(frag);
    });
    walk(block);
  });

  /* ---------- Milestone dots ---------- */
  const milestones = [];
  sections.forEach((s, i) => {
    if (!s.dataset.label) return;
    const b = document.createElement('button');
    b.className = 'dot';
    b.type = 'button';
    b.setAttribute('aria-label', s.dataset.label);
    b.innerHTML = `<span class="dot__label">${s.dataset.label}</span>`;
    b.addEventListener('click', () => go(i, 0));
    dotsEl.appendChild(b);
    milestones.push({ index: i, el: b });
  });

  /* ---------- Timeline roll: between two stories the milestones scroll past in one continuous
     run (fast, then slowing down) and settle on the new story's topic, like the year column of
     the UN Women timeline. Only then do the story's pictures come in. ---------- */
  const ROLL = 4200;                   // ms until the new story's content starts to appear
  const COPIES = 5;                    // the list repeats so every roll passes several milestones
  const RUN = 12;                      // at least this many milestones go by
  const topics = milestones.map((m) => {
    const title = sections[m.index].querySelector('.cover .title, .title');
    const text = title ? title.textContent.replace(/\s+/g, ' ').trim() : '';
    return { date: sections[m.index].dataset.label, topic: text.includes(':') ? text.split(':').pop().trim() : text };
  });
  const timeline = document.createElement('div');
  timeline.className = 'timeline';
  timeline.setAttribute('aria-hidden', 'true');
  timeline.innerHTML = `<div class="timeline__track">${Array.from({ length: COPIES }, () => topics.map((t) =>
    `<div class="timeline__item"><span class="timeline__date">${t.date}</span><span class="timeline__topic">${t.topic}</span></div>`
  ).join('')).join('')}</div>`;
  document.querySelector('.ui-stage').appendChild(timeline);
  const items = Array.from(timeline.querySelectorAll('.timeline__item'));
  const msIndex = (i) => milestones.findIndex((m) => m.index === i);
  let rollTimers = [];

  function roll(from, to, onDone) {
    const n = milestones.length;
    const target = 2 * n + to;                               // stop in the middle copy
    const dist = Math.min(2 * n, Math.max(RUN, Math.abs(to - from)));
    const start = target + (to >= from ? -dist : dist);
    rollTimers.forEach(clearTimeout);
    items.forEach((it) => it.classList.remove('is-current'));
    timeline.classList.remove('is-rolling');
    timeline.style.setProperty('--at', start);
    void timeline.offsetHeight;        // jump to the start without animating
    timeline.classList.add('is-on');
    root.classList.add('is-rolling');
    rollTimers = [
      setTimeout(() => { timeline.classList.add('is-rolling'); timeline.style.setProperty('--at', target); }, 250),
      setTimeout(() => items[target].classList.add('is-current'), 3600),
      setTimeout(() => { timeline.classList.remove('is-on'); root.classList.remove('is-rolling'); onDone(); }, ROLL),
    ];
  }

  /* ---------- Layout ---------- */
  function scaleStage() {
    const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
    root.style.setProperty('--s', s.toFixed(5));
  }

  function setFlowMode() {
    root.classList.toggle('is-flow', flowQuery.matches);
    if (isFlow()) slidesOf.flat().forEach((s) => s.classList.add('is-active'));
    else render(sec, sl, sec, true);
  }

  /* ---------- Rendering ----------
     Like the UN Women timeline: the screen never slides as a whole. Sections and
     slides sit on top of each other; the outgoing content drifts away and fades
     while the incoming photos drift in from the direction you are travelling
     (set on <html data-dir>) and the words of the text rise in one by one. */
  let leaveTimer = 0;
  function render(toSec, toSl, fromSec, instant) {
    const fromSlide = slidesOf[sec][sl];
    const toSlide = slidesOf[toSec][toSl];

    if (instant) {
      document.querySelectorAll('.section, .slide').forEach((el) => el.classList.add('no-anim'));
    } else {
      root.dataset.dir = toSec > fromSec ? 'down' : toSec < fromSec ? 'up' : toSl > sl ? 'right' : 'left';
      void document.body.offsetHeight;   // incoming photos take their start offset before they move
      clearTimeout(leaveTimer);
      document.querySelectorAll('.is-leaving').forEach((el) => el.classList.remove('is-leaving'));
      if (fromSlide !== toSlide) {
        fromSlide.classList.add('is-leaving');
        if (fromSec !== toSec) sections[fromSec].classList.add('is-leaving');
        leaveTimer = setTimeout(() =>
          document.querySelectorAll('.is-leaving').forEach((el) => el.classList.remove('is-leaving')), DURATION + 200);
      }
    }

    // moving to another story: roll the timeline first, show the slide afterwards
    const to = msIndex(toSec);
    const rolling = !instant && toSec !== fromSec && to >= 0 && !still.matches;
    let wait = DURATION;
    if (rolling) {
      const from = msIndex(fromSec) >= 0 ? msIndex(fromSec) : to + (toSec > fromSec ? -1 : 1);
      roll(from, to, () => toSlide.classList.add('is-active'));
      wait = ROLL + 600;
    }

    sections.forEach((s, i) => s.classList.toggle('is-active', i === toSec));
    slidesOf.forEach((list, i) => list.forEach((slide, j) =>
      slide.classList.toggle('is-active', !rolling && i === toSec && j === toSl)));

    if (instant) {
      void document.body.offsetHeight;   // apply the instant changes before re-enabling transitions
      document.querySelectorAll('.no-anim').forEach((el) => el.classList.remove('no-anim'));
    }

    sec = toSec;
    sl = toSl;
    updateUI();
    return wait;
  }

  function updateUI() {
    const count = slidesOf[sec].length;
    const ms = milestones.find((m) => m.index === sec);
    dotsEl.classList.toggle('is-visible', !!ms);
    milestones.forEach((m) => m.el.classList.toggle('is-active', m === ms));

    pager.classList.toggle('is-visible', count > 1);
    pagerDots.innerHTML = count > 1 ? slidesOf[sec].map((_, j) => `<i class="${j === sl ? 'is-active' : ''}"></i>`).join('') : '';
    prevSlideBtn.disabled = sl === 0;
    nextSlideBtn.disabled = sl === count - 1;

    const atEnd = sec === sections.length - 1 && sl === count - 1;
    nextBtn.classList.toggle('is-hidden', atEnd);
    nextBtn.classList.toggle('is-sideways', sl < count - 1);

    const anchor = sections[sec].dataset.anchor;
    history.replaceState(null, '', count > 1 ? `#${anchor}/${sl + 1}` : `#${anchor}`);
  }

  /* ---------- Navigation ---------- */
  function go(toSec, toSl) {
    if (isFlow()) {
      slidesOf[toSec][toSl || 0].scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (toSec < 0 || toSec >= sections.length) return;
    toSl = Math.max(0, Math.min(slidesOf[toSec].length - 1, toSl));
    if ((toSec === sec && toSl === sl) || locked) return;
    locked = true;
    const wait = render(toSec, toSl, sec, false);
    setTimeout(() => { locked = false; }, wait + 150);
  }

  function next() {
    if (sl < slidesOf[sec].length - 1) go(sec, sl + 1);   // horizontal first
    else go(sec + 1, 0);                                  // then down to the next section
  }
  function prev() {
    if (sl > 0) go(sec, sl - 1);
    else if (sec > 0) go(sec - 1, slidesOf[sec - 1].length - 1);
  }

  /* ---------- Input ---------- */
  let lastWheel = 0;
  window.addEventListener('wheel', (e) => {
    if (isFlow()) return;
    e.preventDefault();
    const now = Date.now();
    const gap = now - lastWheel;
    lastWheel = now;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    // ignore trackpad inertia: a new gesture (short pause) or a big delta is needed
    if (locked || Math.abs(delta) < 8) return;
    if (gap < 180 && Math.abs(delta) < 60) return;
    delta > 0 ? next() : prev();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (isFlow()) return;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || k === ' ') { e.preventDefault(); next(); }
    else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'ArrowRight') { e.preventDefault(); go(sec, sl + 1); }
    else if (k === 'ArrowLeft') { e.preventDefault(); go(sec, sl - 1); }
    else if (k === 'Home') go(0, 0);
    else if (k === 'End') go(sections.length - 1, 0);
  });

  let touch = null;
  window.addEventListener('touchstart', (e) => {
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (isFlow() || !touch) return;
    const dx = touch.x - e.changedTouches[0].clientX;
    const dy = touch.y - e.changedTouches[0].clientY;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;
    if (Math.abs(dx) > Math.abs(dy)) go(sec, sl + (dx > 0 ? 1 : -1));
    else dy > 0 ? next() : prev();
  });

  nextBtn.addEventListener('click', next);
  prevSlideBtn.addEventListener('click', () => go(sec, sl - 1));
  nextSlideBtn.addEventListener('click', () => go(sec, sl + 1));
  document.querySelectorAll('[data-goto]').forEach((el) => el.addEventListener('click', () => {
    const i = sections.findIndex((s) => s.dataset.anchor === el.dataset.goto);
    if (i >= 0) go(i, 0);
  }));

  /* ---------- Init from URL (#m2/3) ---------- */
  const [hashAnchor, hashSlide] = decodeURIComponent(location.hash.slice(1)).split('/');
  const startSec = sections.findIndex((s) => s.dataset.anchor === hashAnchor);
  if (startSec >= 0) {
    sec = startSec;
    sl = Math.max(0, Math.min(slidesOf[sec].length - 1, (parseInt(hashSlide, 10) || 1) - 1));
  }
  scaleStage();
  setFlowMode();
  window.addEventListener('resize', scaleStage);
  flowQuery.addEventListener('change', setFlowMode);
})();
