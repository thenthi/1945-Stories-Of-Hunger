/* 1945: Stories of Hunger — hand-made looking decorations drawn as SVG:
   torn & burnt photo frames, parchment scrolls, froth/coffee stains.
   Every shape is generated from a seed, so it looks the same on every visit. */
(function () {
  let uid = 0;

  // small seeded random generator
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const num = (el, name) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;
  const f1 = (n) => n.toFixed(1);

  /* ---------------------------------------------------------
     Torn edge: two passes of noise displacement (big wobble + paper fibres)
     --------------------------------------------------------- */
  function tornFilter(id, seed, min, wobble, fibre) {
    return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="${(6 / min).toFixed(4)}" numOctaves="4" seed="${seed}" result="n1"/>
      <feDisplacementMap in="SourceGraphic" in2="n1" scale="${f1(min * wobble)}" xChannelSelector="R" yChannelSelector="G" result="d1"/>
      <feTurbulence type="fractalNoise" baseFrequency="${(70 / min).toFixed(4)}" numOctaves="2" seed="${seed + 7}" result="n2"/>
      <feDisplacementMap in="d1" in2="n2" scale="${f1(min * fibre)}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  }

  // shape of the frame for each style
  function shape(kind, x, y, w, h, min) {
    if (kind === 'ink') return `<ellipse cx="${f1(x + w / 2)}" cy="${f1(y + h / 2)}" rx="${f1(w / 2)}" ry="${f1(h / 2)}"`;
    const rx = kind === 'b' ? min * 0.2 : kind === 'c' ? min * 0.06 : min * 0.015;
    return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(rx)}"`;
  }

  /* ---------------------------------------------------------
     Brush frame: no paper, the photo just fades out in dry-brush streaks
     (horizontal + vertical noise added to a feathered rectangle, then sharpened)
     --------------------------------------------------------- */
  function buildBrush(photo, W, H, seed) {
    const min = Math.min(W, H);
    const vb = `viewBox="0 0 ${f1(W)} ${f1(H)}" preserveAspectRatio="none"`;
    const id = `b${++uid}`;
    const inset = min * 0.08;
    const rect = `<rect x="${f1(inset)}" y="${f1(inset)}" width="${f1(W - 2 * inset)}" height="${f1(H - 2 * inset)}"`;
    const streaks = (fid, blur, k3, k4, slope, color) => `<filter id="${fid}" x="0" y="0" width="100%" height="100%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${f1(blur)}" result="soft"/>
      <feTurbulence type="fractalNoise" baseFrequency="${(4 / min).toFixed(4)}" numOctaves="4" seed="${seed}" result="blot"/>
      <feTurbulence type="fractalNoise" baseFrequency="${(1 / W).toFixed(5)} ${(30 / H).toFixed(4)}" numOctaves="3" seed="${seed + 5}" result="drag"/>
      <feComposite in="blot" in2="drag" operator="arithmetic" k2=".55" k3=".45" result="hv"/>
      <feColorMatrix in="hv" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="na"/>
      <feComposite in="soft" in2="na" operator="arithmetic" k2="1" k3="${k3}" k4="${k4}" result="sum"/>
      <feComponentTransfer in="sum" result="shape"><feFuncA type="linear" slope="${slope}" intercept="0"/></feComponentTransfer>
      <feFlood flood-color="${color}"/><feComposite in2="shape" operator="in"/>
    </filter>`;

    // where the photo shows
    const hole = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>${streaks(id + 'h', inset * 0.9, 1.1, -1.05, 5, '#fff')}</defs>
      ${rect} fill="#fff" filter="url(#${id}h)"/></svg>`;

    // dark paint dragged over the photo's edge
    const scorch = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>
      ${streaks(id + 's', inset * 1.6, 1.1, -0.75, 3, '#000')}
      <mask id="${id}m"><rect width="100%" height="100%" fill="#fff"/>${rect} fill="#000" filter="url(#${id}s)"/></mask>
    </defs><rect width="100%" height="100%" fill="#141312" mask="url(#${id}m)" opacity=".85"/></svg>`;

    photo.style.setProperty('--paper', 'none');
    photo.style.setProperty('--hole', svgUrl(hole));
    photo.style.setProperty('--scorch', svgUrl(scorch));
  }

  /* ---------------------------------------------------------
     Ink-bleed frame: the photo spreads out into the black page in soft,
     uneven blots, like a stain soaking through paper. A feathered rectangle
     plus two layers of round noise, thresholded gently so the edge stays soft.
     --------------------------------------------------------- */
  function buildBlot(photo, W, H, seed) {
    const min = Math.min(W, H);
    const vb = `viewBox="0 0 ${f1(W)} ${f1(H)}" preserveAspectRatio="none"`;
    const id = `l${++uid}`;
    const inset = min * 0.12;
    const hole = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>
      <filter id="${id}" x="0" y="0" width="100%" height="100%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${f1(inset * 1.1)}" result="soft"/>
        <feTurbulence type="fractalNoise" baseFrequency="${(2.5 / min).toFixed(4)}" numOctaves="3" seed="${seed}" result="big"/>
        <feTurbulence type="fractalNoise" baseFrequency="${(10 / min).toFixed(4)}" numOctaves="4" seed="${seed + 9}" result="small"/>
        <feComposite in="big" in2="small" operator="arithmetic" k2=".65" k3=".35" result="n"/>
        <feColorMatrix in="n" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="na"/>
        <feComposite in="soft" in2="na" operator="arithmetic" k2="1" k3="1" k4="-.95" result="sum"/>
        <feComponentTransfer in="sum" result="shape"><feFuncA type="linear" slope="2.6" intercept="0"/></feComponentTransfer>
        <feFlood flood-color="#fff"/><feComposite in2="shape" operator="in"/>
      </filter></defs>
      <rect x="${f1(inset)}" y="${f1(inset)}" width="${f1(W - 2 * inset)}" height="${f1(H - 2 * inset)}" fill="#fff" filter="url(#${id})"/></svg>`;
    photo.style.setProperty('--paper', 'none');
    photo.style.setProperty('--hole', svgUrl(hole));
    photo.style.setProperty('--scorch', 'none');
  }

  function buildPhoto(photo, index) {
    const W = num(photo, '--w'), H = num(photo, '--h');
    if (!W || !H) return;
    const min = Math.min(W, H);
    if (photo.classList.contains('torn-brush')) return buildBrush(photo, W, H, 11 + index * 17);
    if (photo.classList.contains('torn-blot')) return buildBlot(photo, W, H, 11 + index * 17);
    const kind = (photo.className.match(/torn-(a|b|c|ink)/) || [])[1] || 'a';
    const ink = kind === 'ink';
    const seed = 11 + index * 17;
    const wobble = ink ? 0.22 : kind === 'b' ? 0.09 : 0.06;
    const fibre = ink ? 0.03 : 0.016;
    const pad = min * (wobble / 2 + fibre / 2) + 4;          // keep the wobble inside the box
    const border = ink ? min * 0.07 : min * 0.045;           // width of the cream torn border
    const vb = `viewBox="0 0 ${f1(W)} ${f1(H)}" preserveAspectRatio="none"`;
    const id = `t${++uid}`;

    const outer = shape(kind, pad, pad, W - 2 * pad, H - 2 * pad, min);
    const inner = shape(kind, pad + border, pad + border, W - 2 * (pad + border), H - 2 * (pad + border), min);

    // 1) the torn paper (cream with a burnt brown rim), or an ink blot
    const paperFill = ink ? '#3b2a1e' : '#efe5d1';
    const rim = ink ? '#1e140d' : '#9a6634';
    const paper = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>
      ${tornFilter(id + 'o', seed, min, wobble, fibre)}
      <filter id="${id}b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${f1(min * 0.012)}"/></filter>
      <filter id="${id}g"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .15 0 0 0 .35 0"/></filter>
      <clipPath id="${id}c">${outer}/></clipPath>
    </defs>
    <g filter="url(#${id}o)">
      ${outer} fill="${paperFill}"/>
      <g clip-path="url(#${id}c)">
        <rect width="100%" height="100%" filter="url(#${id}g)"/>
        ${outer} fill="none" stroke="${rim}" stroke-width="${f1(min * 0.035)}" filter="url(#${id}b)" opacity=".85"/>
      </g>
      ${outer} fill="none" stroke="#4a2c14" stroke-width="1.6" opacity=".7"/>
    </g></svg>`;

    // 2) where the photo shows through (a second, different tear)
    const hole = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>${tornFilter(id + 'i', seed + 3, min, wobble * 0.8, fibre)}</defs>
      <g filter="url(#${id}i)">${inner} fill="#fff"/></g></svg>`;

    // 3) scorch on top of the photo's edge
    const scorch = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>
      ${tornFilter(id + 's', seed + 3, min, wobble * 0.8, fibre)}
      <filter id="${id}sb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${f1(min * 0.01)}"/></filter>
    </defs><g filter="url(#${id}s)">${inner} fill="none" stroke="${ink ? '#20150d' : '#7a4a22'}" stroke-width="${f1(min * 0.03)}" filter="url(#${id}sb)" opacity=".75"/></g></svg>`;

    photo.style.setProperty('--paper', svgUrl(paper));
    photo.style.setProperty('--hole', svgUrl(hole));
    photo.style.setProperty('--scorch', svgUrl(scorch));
  }

  /* ---------------------------------------------------------
     Parchment scroll: paper images in assets/scrolls (see css .scroll).
     Wide, short boxes get the long strip so its edges are not squashed.
     --------------------------------------------------------- */
  function buildScroll(scroll) {
    const W = num(scroll, '--w'), H = num(scroll, '--h');
    scroll.querySelector('.scroll__roll')?.remove();
    if (W && H) scroll.classList.toggle('scroll--wide', W / H >= 2.5);
  }

  /* ---------------------------------------------------------
     Stains: white salt-froth blots, optionally over a coffee ring
     --------------------------------------------------------- */
  const CORNERS = { tl: [0, 0], tr: [1, 0], bl: [0, 1], br: [1, 1], t: [0.5, 0], b: [0.5, 1], l: [0, 0.5], r: [1, 0.5] };

  function buildStain(stain, index) {
    const w0 = num(stain, '--w'), h0 = num(stain, '--h');
    if (!w0 || !h0) return;
    const [cx, cy] = CORNERS[stain.dataset.corner] || CORNERS.tl;
    // grow the box outwards past the screen edge so the blot never ends in a straight line
    const E = 320;
    const left = cx === 0 ? E : 0, top = cy === 0 ? E : 0;
    const W = w0 + (cx !== 0.5 ? E : 0), H = h0 + (cy !== 0.5 ? E : 0);
    stain.style.left = `${num(stain, '--x') - left}px`;
    stain.style.top = `${num(stain, '--y') - top}px`;
    stain.style.width = `${W}px`;
    stain.style.height = `${H}px`;
    const gx = left + cx * w0, gy = top + cy * h0;        // the original corner
    const radius = Math.max(w0, h0) * 0.95;
    const coffee = stain.dataset.stain === 'coffee';
    const seed = 7 + index * 13;
    const min = Math.min(w0, h0);
    const id = `f${++uid}`;
    const freq = (7 / min).toFixed(4);

    // alpha = noise + corner gradient, then sharpened -> blobby, ragged shape
    const blob = (fid, k3, k4, color, extra = '') => `<filter id="${fid}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="5" seed="${seed}" result="n"/>
      <feColorMatrix in="n" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.5 0 0 0 -.25" result="na"/>
      <feComposite in="na" in2="SourceGraphic" operator="arithmetic" k2="1" k3="${k3}" k4="${k4}" result="sum"/>
      <feGaussianBlur in="sum" stdDeviation="1.5" result="sumb"/>
      <feComponentTransfer in="sumb" result="shape"><feFuncA type="linear" slope="7" intercept="-.4"/></feComponentTransfer>
      ${extra}
    </filter>`;

    const froth = blob(`${id}w`, 1.15, -0.95, '#f6f1e8', `
      <feTurbulence type="fractalNoise" baseFrequency="${(45 / min).toFixed(4)}" numOctaves="2" seed="${seed + 3}" result="bn"/>
      <feColorMatrix in="bn" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 12 0 0 0 -8.3" result="holes"/>
      <feComposite in="shape" in2="holes" operator="out" result="foam"/>
      <feGaussianBlur in="foam" stdDeviation="2.2" result="soft"/>
      <feFlood flood-color="#a88d70" flood-opacity=".55"/><feComposite in2="soft" operator="in" result="rim"/>
      <feComposite in="foam" in2="SourceGraphic" operator="arithmetic" k1=".75" k2=".4" result="foamSoft"/>
      <feFlood flood-color="#f7f2ea"/><feComposite in2="foamSoft" operator="in" result="white"/>
      <feMerge><feMergeNode in="rim"/><feMergeNode in="white"/></feMerge>`);

    const ring = coffee ? blob(`${id}c`, 1.45, -0.95, '', `
      <feMorphology in="shape" operator="erode" radius="5" result="inner"/>
      <feComposite in="shape" in2="inner" operator="out" result="edge"/>
      <feFlood flood-color="#b47c45" flood-opacity=".35"/><feComposite in2="shape" operator="in" result="fill"/>
      <feFlood flood-color="#8a5126" flood-opacity=".55"/><feComposite in2="edge" operator="in" result="line"/>
      <feMerge><feMergeNode in="fill"/><feMergeNode in="line"/></feMerge>`) : '';

    stain.innerHTML = `<svg viewBox="0 0 ${f1(W)} ${f1(H)}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="${id}g" gradientUnits="userSpaceOnUse" cx="${f1(gx)}" cy="${f1(gy)}" r="${f1(radius)}"><stop offset="0" stop-color="#fff"/><stop offset=".9" stop-color="#fff" stop-opacity="0"/></radialGradient>
        ${froth}${ring}
      </defs>
      ${coffee ? `<rect width="100%" height="100%" fill="url(#${id}g)" filter="url(#${id}c)"/>` : ''}
      <rect width="100%" height="100%" fill="url(#${id}g)" filter="url(#${id}w)"/>
    </svg>`;
  }

  document.querySelectorAll('.photo').forEach(buildPhoto);
  document.querySelectorAll('.scroll').forEach(buildScroll);
  document.querySelectorAll('.stain').forEach(buildStain);
})();
