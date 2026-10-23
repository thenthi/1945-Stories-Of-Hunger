/* 1945: Stories of Hunger — hand-made looking decorations drawn as SVG:
   torn & burnt photo frames.
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
     Burnt paper frame (.photo--fill), matching the frames baked into the photos:
     a wide cream border with big lumpy tears and dark specks, a thin burnt line on
     the outside and a soft brown scorch halo around the picture.
     --------------------------------------------------------- */
  function buildBurnt(photo, W, H, seed) {
    const min = Math.min(W, H);
    const wobble = 0.12, fibre = 0.012;
    const pad = min * (wobble / 2 + fibre / 2) + 4;
    const border = min * 0.09;
    const vb = `viewBox="0 0 ${f1(W)} ${f1(H)}" preserveAspectRatio="none"`;
    const id = `p${++uid}`;
    const outer = shape('c', pad, pad, W - 2 * pad, H - 2 * pad, min);
    const inner = shape('c', pad + border, pad + border, W - 2 * (pad + border), H - 2 * (pad + border), min);

    const paper = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>
      ${tornFilter(id + 'o', seed, min, wobble, fibre)}
      <filter id="${id}b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${f1(min * 0.004)}"/></filter>
      <filter id="${id}m"><feTurbulence type="fractalNoise" baseFrequency="${(5 / min).toFixed(4)}" numOctaves="3" seed="${seed + 1}"/><feColorMatrix values="0 0 0 0 .62 0 0 0 0 .5 0 0 0 0 .34 0 0 0 .9 -.35"/></filter>
      <filter id="${id}d"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="${seed + 2}"/><feColorMatrix values="0 0 0 0 .3 0 0 0 0 .22 0 0 0 0 .14 0 0 0 9 -6.3"/></filter>
      <filter id="${id}g"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .15 0 0 0 .18 0"/></filter>
      <clipPath id="${id}c">${outer}/></clipPath>
    </defs>
    <g filter="url(#${id}o)">
      ${outer} fill="#efe8da"/>
      <g clip-path="url(#${id}c)">
        <rect width="100%" height="100%" filter="url(#${id}m)" opacity=".55"/>
        <rect width="100%" height="100%" filter="url(#${id}d)" opacity=".7"/>
        <rect width="100%" height="100%" filter="url(#${id}g)"/>
      </g>
      ${outer} fill="none" stroke="#a87c52" stroke-width="${f1(min * 0.009)}" filter="url(#${id}b)" opacity=".5"/>
    </g></svg>`;

    const hole = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>${tornFilter(id + 'i', seed + 3, min, wobble * 0.9, fibre)}</defs>
      <g filter="url(#${id}i)">${inner} fill="#fff"/></g></svg>`;

    const scorch = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>
      ${tornFilter(id + 's', seed + 3, min, wobble * 0.9, fibre)}
      <filter id="${id}h" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${f1(min * 0.022)}"/></filter>
      <filter id="${id}l" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${f1(min * 0.003)}"/></filter>
    </defs><g filter="url(#${id}s)">
      ${inner} fill="none" stroke="#b08050" stroke-width="${f1(min * 0.07)}" filter="url(#${id}h)" opacity=".7"/>
      ${inner} fill="none" stroke="#6e4520" stroke-width="${f1(min * 0.008)}" filter="url(#${id}l)" opacity=".55"/>
    </g></svg>`;

    photo.style.setProperty('--paper', svgUrl(paper));
    photo.style.setProperty('--hole', svgUrl(hole));
    photo.style.setProperty('--scorch', svgUrl(scorch));
  }

  /* ---------------------------------------------------------
     Oval blot (.torn-oval, home page): a rounded, uneven ink-blot shape whose
     edge fades and bleeds into the page in soft patches.
     --------------------------------------------------------- */
  function buildOval(photo, W, H, seed) {
    const min = Math.min(W, H);
    const vb = `viewBox="0 0 ${f1(W)} ${f1(H)}" preserveAspectRatio="none"`;
    const id = `o${++uid}`;
    const hole = `<svg xmlns="http://www.w3.org/2000/svg" ${vb}><defs>
      <filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${f1(W)}" height="${f1(H)}">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${f1(min * 0.09)}" result="soft"/>
        <feTurbulence type="fractalNoise" baseFrequency="${(2.2 / min).toFixed(4)}" numOctaves="3" seed="${seed}" result="big"/>
        <feTurbulence type="fractalNoise" baseFrequency="${(9 / min).toFixed(4)}" numOctaves="4" seed="${seed + 9}" result="small"/>
        <feComposite in="big" in2="small" operator="arithmetic" k2=".7" k3=".3" result="n"/>
        <feColorMatrix in="n" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="na"/>
        <feComposite in="soft" in2="na" operator="arithmetic" k2="1" k3="1.1" k4="-1" result="sum"/>
        <feComponentTransfer in="sum" result="shape"><feFuncA type="linear" slope="2.4" intercept="0"/></feComponentTransfer>
        <feFlood flood-color="#fff"/><feComposite in2="shape" operator="in"/>
      </filter></defs>
      ${photo.classList.contains('torn-soft')
        // soft rectangle: rounded corners, the same blotchy, fading edge
        ? `<rect x="${f1(W * 0.08)}" y="${f1(H * 0.1)}" width="${f1(W * 0.84)}" height="${f1(H * 0.8)}" rx="${f1(min * 0.1)}" fill="#fff" filter="url(#${id})"/>`
        : `<ellipse cx="${f1(W / 2)}" cy="${f1(H / 2)}" rx="${f1(W * 0.41)}" ry="${f1(H * 0.37)}" fill="#fff" filter="url(#${id})"/>`}</svg>`;
    photo.style.setProperty('--paper', 'none');
    photo.style.setProperty('--hole', svgUrl(hole));
    photo.style.setProperty('--scorch', 'none');
  }

  function buildPhoto(photo, index) {
    const W = num(photo, '--w'), H = num(photo, '--h');
    if (!W || !H) return;
    const min = Math.min(W, H);
    if (photo.classList.contains('photo--framed')) return;    // frame is already in the image
    if (photo.classList.contains('torn-brush')) return buildBrush(photo, W, H, 11 + index * 17);
    if (photo.classList.contains('torn-oval')) return buildOval(photo, W, H, 23);
    if (photo.classList.contains('photo--fill')) return buildBurnt(photo, W, H, 11 + index * 17);
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

  document.querySelectorAll('.photo').forEach(buildPhoto);

  /* .photo--fill: the photo fills its box (cropped) inside a drawn torn frame. It is zoomed
     inside a crop box shaped like the torn hole, so the burnt border baked into the image
     falls outside and only the drawn frame shows. */
  document.querySelectorAll('.photo--fill img').forEach((img) => {
    const crop = document.createElement('span');
    crop.className = 'photo__crop';
    img.replaceWith(crop);
    crop.appendChild(img);
  });
})();
