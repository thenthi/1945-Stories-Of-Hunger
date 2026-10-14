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

  /* ---------- Rendering ---------- */
  function render(toSec, toSl, fromSec, instant) {
    sections.forEach((s, i) => {
      const moving = i === toSec || i === fromSec;
      if (instant || !moving) s.classList.add('no-anim');
      s.classList.toggle('is-active', i === toSec);
      s.classList.toggle('is-past', i < toSec);
      s.classList.toggle('is-future', i > toSec);
    });

    // a section entered vertically shows the right slide immediately
    const track = sections[toSec].querySelector('.track');
    if (toSec !== fromSec || instant) track.classList.add('no-anim');
    track.style.transform = `translateX(${-toSl * 100}%)`;

    slidesOf.forEach((list, i) => list.forEach((slide, j) =>
      slide.classList.toggle('is-active', i === toSec && j === toSl)));

    void document.body.offsetHeight;   // apply the instant changes before re-enabling transitions
    document.querySelectorAll('.no-anim').forEach((el) => el.classList.remove('no-anim'));

    sec = toSec;
    sl = toSl;
    updateUI();
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
    render(toSec, toSl, sec, false);
    setTimeout(() => { locked = false; }, DURATION + 150);
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
