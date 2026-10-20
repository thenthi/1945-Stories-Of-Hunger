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
  const hudChapter = document.getElementById('hudChapter');
  const hudBar = document.getElementById('hudBar');
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
    slide.querySelectorAll('.photo').forEach((p, i) => p.style.setProperty('--depth', [1, 0.8, 1.2][i % 3])));
  let tx = 0, ty = 0, mx = 0, my = 0, raf = 0;
  function drift() {
    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;
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

  /* ---------- Chapter cards: each story's cover becomes a documentary title card ----------
     big chapter number, the date, the topic in large type and the story's first sentence. */
  const pad = (n) => String(n).padStart(2, '0');
  sections.filter((s) => s.dataset.label).forEach((s, i) => {
    const h = s.querySelector('.cover .title');
    if (!h) return;
    const [date, topic] = h.textContent.includes(':') ? h.textContent.split(':') : [s.dataset.label, h.textContent];
    const first = s.querySelector('.slide:not(.cover) .panel__text p, .slide:not(.cover) .text p');
    const lede = first ? (first.textContent.match(/^.*?[.!?](\s|$)/) || [first.textContent])[0].trim() : '';
    const card = document.createElement('div');
    card.className = 'layer chapter-card';
    card.innerHTML = `<span class="chapter-card__num" aria-hidden="true">${pad(i + 1)}</span>
      <p class="chapter-card__eyebrow" data-anim>Chapter ${pad(i + 1)} <span></span> ${date.trim()}</p>
      <h2 class="title chapter-card__title" data-anim>${h.innerHTML.includes(':') ? h.innerHTML.split(':').pop().trim() : topic.trim()}</h2>
      ${lede ? `<p class="chapter-card__lede" data-anim>${lede}</p>` : ''}`;
    h.closest('.layer').replaceWith(card);
    card.insertAdjacentHTML('beforebegin', '<div class="scrim" aria-hidden="true"></div>');
  });

  /* ---------- Words: wrap each word so the text can rise in word by word ---------- */
  const TEXT = '.title, .kicker, .panel__year, .panel__date, .panel__title, .text p, .panel__text p, .scroll__paper p, .chapter-card__lede, .quote__text, .quote__trans';
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

  /* ---------- Photos: hover shows the caption, click opens the picture full screen ---------- */
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbCap = document.getElementById('lightboxCap');
  const viewing = () => !lightbox.hidden;
  function openPhoto(img) {
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = img.alt;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
  }
  function closePhoto() {
    lightbox.classList.remove('is-open');
    setTimeout(() => { lightbox.hidden = true; }, 350);
  }
  lightbox.addEventListener('click', closePhoto);
  document.querySelectorAll('.photo').forEach((photo) => {
    const img = photo.querySelector('img');
    if (!img || !img.alt || photo.hasAttribute('data-flow-hide')) return;
    photo.classList.add('is-zoomable');
    photo.insertAdjacentHTML('beforeend', `<figcaption class="photo__cap">${img.alt}</figcaption>`);
    photo.addEventListener('click', () => { if (photo.closest('.slide.is-active')) openPhoto(img); });
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
    // keep the title's line break (<br>) so the topic breaks in the same place
    const html = title ? title.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : '';
    const text = html.replace(/[ \t]+/g, ' ').trim();
    const topic = (text.includes(':') ? text.split(':').pop() : text).trim().replace(/\s*\n\s*/g, '<br>');
    return { date: sections[m.index].dataset.label, topic };
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

  // entering the first story from the prologue: nothing above it; the story's title and the
  // milestones that follow it rise from below, and it stops in the middle
  function roll(from, to, onDone, entering = false) {
    const n = milestones.length;
    const target = 2 * n + to;                               // stop in the middle copy
    const dist = Math.min(2 * n, Math.max(RUN, Math.abs(to - from)));
    const start = entering ? target - 2.6 : target + (to >= from ? -dist : dist);
    rollTimers.forEach(clearTimeout);
    items.forEach((it, i) => {
      it.classList.remove('is-current');
      it.classList.toggle('is-hidden', entering && (i < target || i >= target + n - to));
    });
    timeline.classList.toggle('is-entering', entering);
    timeline.classList.remove('is-rolling');
    timeline.style.setProperty('--at', start);
    void timeline.offsetHeight;        // jump to the start without animating
    timeline.classList.add('is-on');
    if (entering) items[target].classList.add('is-current');   // already the one in focus
    root.classList.add('is-rolling');
    rollTimers = [
      setTimeout(() => { timeline.classList.add('is-rolling'); timeline.style.setProperty('--at', target); }, 250),
      setTimeout(() => items[target].classList.add('is-current'), 3600),
      setTimeout(() => { timeline.classList.remove('is-on'); root.classList.remove('is-rolling'); onDone(); }, ROLL),
    ];
  }

  /* The brown box slides to the current milestone. On its way it shows the name of each
     milestone it passes; only when it arrives does that milestone's dot turn white. */
  const marker = document.createElement('span');
  marker.className = 'dots__marker';
  // the box is a window onto a column of all the names; the column rolls through it
  marker.innerHTML = `<span class="dots__label"><span class="dots__strip">${milestones.map((m) =>
    `<span class="dots__item"><span>${sections[m.index].dataset.label}</span></span>`).join('')}</span></span>`;
  const markerLabel = marker.firstChild;
  const strip = markerLabel.firstChild;
  const ROW = 42;                      // height of the box = one name
  dotsEl.appendChild(marker);
  let markerY = null, markerRaf = 0, markerDelay = 0;

  // the box fits each name; between two dots its width blends from one name to the next
  let dotYs = [], widths = [];
  function measureMarker() {
    dotYs = milestones.map((m) => m.el.offsetTop);
    widths = Array.from(strip.children, (it) => it.firstChild.offsetWidth);
    if (!widths.every((w) => w > 0)) dotYs = [];   // not laid out yet (hidden): measure again next time
  }
  function placeMarker(y) {
    markerY = y;
    marker.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    // which two dots is the box between, and how far along
    let i = 0;
    while (i < dotYs.length - 2 && y > dotYs[i + 1]) i++;
    const f = Math.max(0, Math.min(1, (y - dotYs[i]) / ((dotYs[i + 1] ?? dotYs[i] + 1) - dotYs[i])));
    markerLabel.style.width = `${(widths[i] + ((widths[i + 1] ?? widths[i]) - widths[i]) * f).toFixed(1)}px`;
    strip.style.transform = `translate3d(0, ${(-(i + f) * ROW).toFixed(2)}px, 0)`;   // names roll by inside the box
  }
  function moveMarker(ms) {
    if (!ms) return;
    cancelAnimationFrame(markerRaf);
    clearTimeout(markerDelay);
    if (!dotYs.length) measureMarker();
    const toY = dotYs[milestones.indexOf(ms)];
    const arrive = () => { placeMarker(toY); ms.el.classList.add('is-active'); };
    if (markerY === null || markerY === toY || still.matches) return arrive();
    // in step with the timeline roll when changing story: same length, fast start, slow finish
    const rolling = root.classList.contains('is-rolling');
    const dur = rolling ? 3600 : 1400;
    const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;   // gentle start and finish, no jolt
    const fromY = markerY;
    markerDelay = setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        placeMarker(fromY + (toY - fromY) * ease(t));
        if (t < 1) markerRaf = requestAnimationFrame(step);
        else arrive();
      };
      markerRaf = requestAnimationFrame(step);
    }, rolling ? 250 : 0);
  }

  /* ---------- Layout ---------- */
  function scaleStage() {
    const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
    root.style.setProperty('--s', s.toFixed(5));
  }

  function setFlowMode() {
    root.classList.toggle('is-flow', flowQuery.matches);
    if (video) video.controls = isFlow();                   // phones: a normal video with controls
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
    if (videoSlide && slidesOf[toSec][toSl] !== videoSlide) hideVideo();
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
      const entering = msIndex(fromSec) < 0 && toSec > fromSec;
      const from = msIndex(fromSec) >= 0 ? msIndex(fromSec) : to + (toSec > fromSec ? -1 : 1);
      roll(from, to, () => toSlide.classList.add('is-active'), entering);
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
    milestones.forEach((m) => { if (m !== ms) m.el.classList.remove('is-active'); });
    if (ms && !ms.el.classList.contains('is-active')) moveMarker(ms);   // its dot lights up when the box arrives

    pager.classList.toggle('is-visible', count > 1);
    pagerDots.innerHTML = count > 1 ? `<b>${pad(sl + 1)}</b> / ${pad(count)}` : '';

    // top bar: where we are in the story, and overall progress along the bottom
    const names = { overview: 'Prologue', 'bigger-picture': 'The Bigger Picture', consequences: 'Epilogue' };
    const anchorName = sections[sec].dataset.anchor;
    const chapterText = ms ? `Chapter ${pad(milestones.indexOf(ms) + 1)} <span>—</span> ${sections[sec].dataset.label}` : (names[anchorName] || '');
    if (hudChapter.innerHTML !== chapterText) {               // the label fades in slowly when it changes
      hudChapter.innerHTML = chapterText;
      hudChapter.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 1400, delay: 300, easing: 'ease-out', fill: 'backwards' });
    }
    const done = slidesOf.slice(0, sec).reduce((n, l) => n + l.length, 0) + sl;
    hudBar.style.transform = `scaleX(${done / (slidesOf.flat().length - 1)})`;
    root.classList.toggle('is-home', sec === 0);
    prevSlideBtn.disabled = sl === 0;
    nextSlideBtn.disabled = sl === count - 1;

    const atEnd = sec === sections.length - 1 && sl === count - 1 && (!videoSlide || revealed());
    nextBtn.classList.toggle('is-hidden', atEnd);
    nextBtn.classList.toggle('is-sideways', sl < count - 1);

    const anchor = sections[sec].dataset.anchor;
    history.replaceState(null, '', count > 1 ? `#${anchor}/${sl + 1}` : `#${anchor}`);
  }

  /* ---------- Video behind the last page ----------
     Arriving: the video sits blurred and paused behind the text. One more scroll:
     the text fades away, the video comes into focus and plays. Scrolling back undoes it. */
  const videoSlide = document.querySelector('.slide.has-video');
  const video = videoSlide && videoSlide.querySelector('.bg-video');
  const revealed = () => !!videoSlide && videoSlide.classList.contains('is-revealed');
  function revealVideo() {
    videoSlide.classList.add('is-revealed');
    root.classList.add('is-watching');
    video.muted = false;                                    // with sound when the browser allows it,
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });   // otherwise silent
    updateUI();
  }
  // a scroll does not count as a "click" for the browser, so it may start the film silent:
  // the sound button (or a click anywhere on the film) turns the sound on / off
  const soundBtn = videoSlide && videoSlide.querySelector('.sound');
  function setSound(on) {
    video.muted = !on;
    if (on) video.play().catch(() => {});
  }
  if (video) {
    const sync = () => {
      soundBtn.classList.toggle('is-on', !video.muted);
      soundBtn.querySelector('.sound__text').textContent = video.muted ? 'Sound on' : 'Sound off';
      soundBtn.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
    };
    video.addEventListener('volumechange', sync);
    sync();
    soundBtn.addEventListener('click', (e) => { e.stopPropagation(); setSound(video.muted); });
    video.addEventListener('click', () => { if (revealed()) setSound(true); });
  }
  function hideVideo() {
    if (!videoSlide) return;
    videoSlide.classList.remove('is-revealed');
    root.classList.remove('is-watching');
    video.pause();
  }
  const onVideoSlide = () => videoSlide && slidesOf[sec][sl] === videoSlide;

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
    unlockAfter(wait + 150);
  }

  function next() {
    if (onVideoSlide() && !revealed()) {
      if (locked) return;
      locked = true;
      revealVideo();
      unlockAfter(1200);
      return;
    }
    if (sl < slidesOf[sec].length - 1) go(sec, sl + 1);   // horizontal first
    else go(sec + 1, 0);                                  // then down to the next section
  }
  function prev() {
    if (revealed() && onVideoSlide()) {
      if (locked) return;
      locked = true;
      hideVideo();
      updateUI();
      unlockAfter(1200);
      return;
    }
    if (sl > 0) go(sec, sl - 1);
    else if (sec > 0) go(sec - 1, slidesOf[sec - 1].length - 1);
  }

  /* ---------- Input ---------- */
  /* Wheel / trackpad: one gesture = one step.
     A trackpad keeps sending fading "inertia" events after the fingers lift; a new gesture
     shows up as the delta rising again (or after a short pause). A step asked for while a
     transition is still running is remembered and runs as soon as it ends, so one scroll
     is always enough. */
  let lastWheel = 0, lastMag = 0, peak = 0, rising = 0, faded = false, armed = true, pending = null, pendingAt = 0;
  function unlockAfter(ms) {
    setTimeout(() => {
      locked = false;
      if (pending && Date.now() - pendingAt < 1500) {
        const dir = pending;
        pending = null;
        dir > 0 ? next() : prev();
      }
      pending = null;
    }, ms);
  }
  window.addEventListener('wheel', (e) => {
    if (isFlow()) return;
    e.preventDefault();
    if (viewing()) return;
    const now = Date.now();
    const gap = now - lastWheel;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const mag = Math.abs(delta);
    // a pause starts a new gesture; so does the push growing again after the last one faded
    rising = mag > lastMag * 1.15 + 1 ? rising + 1 : 0;
    if (mag < peak * 0.6) faded = true;
    if (gap > 160) { armed = true; peak = 0; }
    else if (!armed && faded && rising >= 2) armed = true;
    lastWheel = now;
    lastMag = mag;
    peak = Math.max(peak, mag);
    if (!armed || mag < 4) return;                        // tiny first events keep it armed
    armed = false;
    faded = false;
    peak = mag;
    const dir = delta > 0 ? 1 : -1;
    if (locked) { pending = dir; pendingAt = now; return; }
    dir > 0 ? next() : prev();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (viewing()) { if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); closePhoto(); } return; }
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
    if (isFlow() || !touch || viewing()) return;
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
