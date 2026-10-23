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

  /* ---------- Sound effects: scroll = the milestone years rolling, hover = any button, choose = click ---------- */
  const sfx = {};
  ['scroll', 'hover', 'choose'].forEach((name) => {
    const a = new Audio(`${name}.wav`);
    a.preload = 'auto';
    sfx[name] = a;
  });
  function play(name) {
    const a = sfx[name];
    if (!a || !soundOn) return;
    a.currentTime = 0;
    a.play().catch((err) => console.warn('sfx', name, err.name));   // the browser may block it until the first click / key press
  }
  /* background music (flute): loops, fades out while the film plays, and one button
     turns the music and the sound effects on / off together */
  const music = new Audio('leberch-flute-587281.mp3');
  music.loop = true;
  music.volume = 0;
  const MUSIC_VOL = 0.35;
  let soundOn = true, fadeTimer = 0;
  const audioBtn = document.getElementById('audioToggle');
  function fadeMusic(to, done) {
    clearInterval(fadeTimer);
    fadeTimer = setInterval(() => {
      const d = to - music.volume;
      music.volume = Math.abs(d) < 0.02 ? to : music.volume + Math.sign(d) * 0.02;
      if (music.volume === to) { clearInterval(fadeTimer); if (done) done(); }
    }, 50);
  }
  function updateMusic() {
    const filmPlaying = root.classList.contains('is-watching') || (video && !video.paused);
    const want = soundOn && !filmPlaying && !isFlow();
    if (want) {
      music.play().then(() => fadeMusic(MUSIC_VOL)).catch(() => {});   // blocked until the first click / key press
    } else if (!music.paused) {
      fadeMusic(0, () => music.pause());
    }
  }
  function setAudio(on) {
    soundOn = on;
    audioBtn.classList.toggle('is-off', !on);
    audioBtn.setAttribute('aria-pressed', String(on));
    audioBtn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    audioBtn.querySelector('.audio-toggle__text').textContent = on ? 'Sound on' : 'Sound off';
    updateMusic();
  }
  audioBtn.addEventListener('click', () => setAudio(!soundOn));
  ['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, updateMusic, { passive: true }));   // first gesture starts the music

  const BTN = 'button:not(:disabled), a[href], [data-goto]';
  document.addEventListener('mouseover', (e) => {
    const b = e.target.closest && e.target.closest(BTN);
    if (b && !(e.relatedTarget && b.contains(e.relatedTarget))) play('hover');
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest(`${BTN}, .photo.is-zoomable.is-hover, .lightbox`);
    if (t) play('choose');
  });

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
    mx += (tx - mx) * 0.15;   // follows the mouse closely, still eased
    my += (ty - my) * 0.15;
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
  const TEXT = '.title, .kicker, .panel__year, .panel__date, .panel__title, .text p, .panel__text p, .chapter-card__lede';
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

  /* which side of the screen a picture stands on (pictures in the middle have none) */
  document.querySelectorAll('.slide:not(.cover) .photo').forEach((p) => {
    const cx = parseFloat(p.style.getPropertyValue('--x')) + parseFloat(p.style.getPropertyValue('--w')) / 2;
    if (cx < 800) p.dataset.side = 'l';
    else if (cx > 1200) p.dataset.side = 'r';
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
    photo.addEventListener('click', () => { if (photo.classList.contains('is-hover')) openPhoto(img); });
  });

  /* Hover only counts on the picture itself, not on the empty part of its box: the photos keep
     their proportions inside the box (object-fit: contain) and have a torn, partly transparent edge,
     so we work out where the picture really is and shrink that a little. */
  const zoomables = Array.from(document.querySelectorAll('.photo.is-zoomable'));
  function pictureRect(photo) {
    const img = photo.querySelector('img');
    const r = img.getBoundingClientRect();
    let { left, top, width, height } = r;
    const fit = getComputedStyle(img).objectFit;
    if (fit === 'contain' && img.naturalWidth) {
      const ir = img.naturalWidth / img.naturalHeight;
      if (width / height > ir) { const w = height * ir; left += (width - w) / 2; width = w; }
      else { const h = width / ir; top += (height - h) / 2; height = h; }
    }
    const k = photo.classList.contains('photo--framed') ? 0.05 : 0.11;   // torn / faded edge
    return { left: left + width * k, right: left + width * (1 - k), top: top + height * k, bottom: top + height * (1 - k) };
  }
  let hoverRaf = 0, px = -1, py = -1;
  function updateHover() {
    hoverRaf = 0;
    let any = false;
    zoomables.forEach((photo) => {
      const r = photo.closest('.slide.is-active') && !viewing() ? pictureRect(photo) : null;
      const on = !!r && px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
      photo.classList.toggle('is-hover', on);
      any = any || on;
    });
    document.body.classList.toggle('over-photo', any);
  }
  window.addEventListener('mousemove', (e) => {
    px = e.clientX; py = e.clientY;
    if (!hoverRaf) hoverRaf = requestAnimationFrame(updateHover);
  });
  document.addEventListener('mouseleave', () => { px = py = -1; updateHover(); });

  /* ---------- Milestone dots ---------- */
  const milestones = [];
  sections.forEach((s, i) => {
    if (!s.dataset.label) return;
    const b = document.createElement('button');
    b.className = 'dot';
    b.type = 'button';
    b.setAttribute('aria-label', s.dataset.label);
    b.innerHTML = `<span class="dot__label">${s.dataset.label}</span>`;
    b.addEventListener('click', () => { b.classList.add('is-picked'); go(i, 0); });
    b.addEventListener('mouseleave', () => b.classList.remove('is-picked'));
    dotsEl.appendChild(b);
    milestones.push({ index: i, el: b });
  });

  /* ---------- Timeline roll: between two stories the milestones scroll past in one continuous
     run (fast, then slowing down) and settle on the new story's topic, like the year column of
     the UN Women timeline. Only then do the story's pictures come in. ---------- */
  const ROLL = 3370;                   // ms until the new story's content starts to appear
  const COPIES = 11;                   // the list repeats so every roll passes several milestones
  const RUN = 24;                      // at least this many milestones go by
  const topics = milestones.map((m) => {
    const title = sections[m.index].querySelector('.cover .title, .title');
    const text = title ? title.textContent.replace(/\s+/g, ' ').trim() : '';   // one line, even if the title breaks
    const topic = (text.includes(':') ? text.split(':').pop() : text).trim();
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

  function roll(from, to, onDone) {
    const n = milestones.length;
    const target = 5 * n + to;                               // stop in the middle copy
    const dist = Math.min(5 * n, Math.max(RUN, Math.abs(to - from)));
    const start = target + (to >= from ? -dist : dist);
    rollTimers.forEach(clearTimeout);
    items.forEach((it) => it.classList.remove('is-current'));
    timeline.classList.remove('is-rolling');
    timeline.style.setProperty('--at', start);
    void timeline.offsetHeight;        // jump to the start without animating
    timeline.classList.add('is-on');
    root.classList.add('is-rolling');
    rollTimers = [
      setTimeout(() => { play('scroll'); timeline.classList.add('is-rolling'); timeline.style.setProperty('--at', target); }, 250),   // the sound and the roll start together; its last hit lands with the roll
      setTimeout(() => items[target].classList.add('is-current'), 2320),   // grows as it arrives, on the last hit of the scroll sound
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
    const dur = rolling ? 2300 : 1400;
    const soft = (t) => -(Math.cos(Math.PI * t) - 1) / 2;   // gentle start and finish, no jolt
    // changing story: fast at the start, slow at the end (same curve as the timeline roll)
    const steady = (t) => 1 - Math.pow(1 - t, 2.4);
    const ease = rolling ? steady : soft;
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
    let moving = false;
    if (instant) delete root.dataset.move;
    if (videoSlide && slidesOf[toSec][toSl] !== videoSlide) hideVideo();
    const toSlide = slidesOf[toSec][toSl];

    if (instant) {
      document.querySelectorAll('.section, .slide').forEach((el) => el.classList.add('no-anim'));
    } else {
      root.dataset.dir = toSec > fromSec ? 'down' : toSec < fromSec ? 'up' : toSl > sl ? 'right' : 'left';
      // two story pages of the same chapter: pictures slip off / in from their own sides
      const story = (el) => !el.classList.contains('cover') && !el.classList.contains('has-video');
      moving = toSec === fromSec && !!sections[toSec].dataset.label && fromSlide !== slidesOf[toSec][toSl] && story(fromSlide) && story(slidesOf[toSec][toSl]) && !still.matches;
      if (moving) root.dataset.move = 'slide'; else delete root.dataset.move;
      void document.body.offsetHeight;   // incoming photos take their start offset before they move
      clearTimeout(leaveTimer);
      document.querySelectorAll('.is-leaving').forEach((el) => el.classList.remove('is-leaving'));
      if (fromSlide !== toSlide) {
        fromSlide.classList.add('is-leaving');
        if (fromSec !== toSec) sections[fromSec].classList.add('is-leaving');
        leaveTimer = setTimeout(() =>
          document.querySelectorAll('.is-leaving').forEach((el) => el.classList.remove('is-leaving')), moving ? 2200 : DURATION + 200);
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
    return moving ? 2000 : wait;
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
    // nav bar: light up the part of the site we are in (any chapter counts as "Story")
    const navKey = /^m\d/.test(anchorName) ? 'm1' : anchorName;
    document.querySelectorAll('#siteNav .site-nav__links button').forEach((b) => b.classList.toggle('is-current', b.dataset.goto === navKey));
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
    updateMusic();
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
    ['play', 'pause', 'ended'].forEach((t) => video.addEventListener(t, updateMusic));
    // when the film is over the text comes back (no loop); the next scroll plays it again from the start
    video.addEventListener('ended', () => { hideVideo(); video.currentTime = 0; updateUI(); });
    sync();
    soundBtn.addEventListener('click', (e) => { e.stopPropagation(); setSound(video.muted); });
    video.addEventListener('click', () => { if (revealed()) setSound(true); });
  }
  function hideVideo() {
    if (!videoSlide) return;
    videoSlide.classList.remove('is-revealed');
    root.classList.remove('is-watching');
    video.pause();
    updateMusic();
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
  const WHEEL_MIN = 90;                // how much wheel / trackpad push counts as one scroll
  let acc = 0, lastWheel = 0, lastMag = 0, peak = 0, rising = 0, faded = false, armed = true, pending = null, pendingAt = 0;
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
    if (gap > 160) { armed = true; peak = 0; acc = 0; }
    else if (!armed && faded && rising >= 2) armed = true;
    lastWheel = now;
    lastMag = mag;
    peak = Math.max(peak, mag);
    if (!armed) return;
    // a light touch is not a scroll: the push has to add up to a real movement first
    if (acc && Math.sign(acc) !== Math.sign(delta)) acc = 0;
    acc += delta;
    if (Math.abs(acc) < WHEEL_MIN) return;
    acc = 0;
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
  updateMusic();
  window.addEventListener('resize', scaleStage);
  flowQuery.addEventListener('change', setFlowMode);
})();
