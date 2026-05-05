/**
 * Drip Atlas — Global Tab Bar + Paywall
 *
 * Drop <script src="tabs.js"></script> at the bottom of any page.
 * Active tab is auto-detected from the URL filename.
 */
(function () {
  'use strict';

  // ── Tier definitions ────────────────────────────────────────────────────────

  const TIERS = {
    1: {
      badge: 'Tier 1',
      name: 'The Plan',
      tagline: 'Your complete irrigation blueprint, ready to build.',
      color: '#4a8fe8',
      textDark: false,
      features: [
        'Full irrigation system plan',
        'Parts list with exact quantities',
        'Material cost breakdown',
        'Zone-by-zone run time schedule',
      ],
      cta: 'Unlock The Plan →',
    },
    2: {
      badge: 'Tier 2',
      name: 'Done For You',
      tagline: 'Everything you need, shipped to your door.',
      color: '#9b59b6',
      textDark: false,
      features: [
        'Everything in The Plan',
        'All parts shipped to your address',
        'Step-by-step installation guidance',
        'Priority email support',
      ],
      cta: 'Unlock Done For You →',
    },
    top: {
      badge: 'Designer Pro',
      name: 'Designer Pro',
      tagline: 'Design your system on a live satellite map of your property.',
      color: '#c8e670',
      textDark: true,
      features: [
        'Everything in Done For You',
        'Interactive satellite map designer',
        'Draw custom zones on aerial imagery',
        'Real-time flow & pressure calculations',
        'Lot line overlay for precise placement',
        'Unlimited design revisions',
      ],
      cta: 'Unlock Designer Pro →',
    },
  };

  // ── Tab definitions ─────────────────────────────────────────────────────────

  const TABS = [
    { id: 'property', label: 'Property', icon: '📍', href: 'design.html',     tier: null,  pages: ['design', 'index', ''] },
    { id: 'zones',    label: 'Zones',    icon: '🗺️',  href: 'zones.html',     tier: null,  pages: ['zones', 'water'] },
    { id: 'plan',     label: 'Plan & Parts', icon: '📋', href: 'materials.html', tier: 1,  pages: ['materials'] },
    { id: 'shipping', label: 'Shipping', icon: '📦', href: 'checkout.html',   tier: 2,     pages: ['checkout'] },
    { id: 'support',  label: 'Support',  icon: '💬', href: null,              tier: 2,     pages: ['support'] },
    { id: 'designer', label: 'Designer', icon: '✏️', href: 'designer.html',   tier: 'top', pages: ['designer'] },
  ];

  // ── Detect current page ─────────────────────────────────────────────────────

  const currentPage = (location.pathname.split('/').pop() || '').replace('.html', '');

  // ── Inject base styles ──────────────────────────────────────────────────────

  const css = document.createElement('style');
  css.textContent = `
    /* ── Tab bar ── */
    #drip-tabbar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 60px;
      background: #141d0d;
      border-top: 1px solid rgba(255,255,255,.08);
      display: flex;
      align-items: stretch;
      z-index: 8000;
      padding: 0 4px;
    }
    .dt {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 4px 2px 6px;
      cursor: pointer;
      position: relative;
      border: none;
      background: transparent;
      -webkit-tap-highlight-color: transparent;
      transition: background .14s;
      border-radius: 10px;
      margin: 4px 2px;
      max-width: 80px;
    }
    .dt:hover { background: rgba(255,255,255,.06); }
    .dt.dt-on { background: rgba(200,230,112,.10); }
    .dt-icon { font-size: 18px; line-height: 1; position: relative; display: block; }
    .dt-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: .02em;
      color: rgba(255,255,255,.32);
      font-family: 'Inter', sans-serif;
      white-space: nowrap;
    }
    .dt.dt-on .dt-label { color: #c8e670; }
    /* lock badge */
    .dt-lock {
      position: absolute;
      top: 3px; right: 3px;
      font-size: 8px;
      line-height: 1;
      opacity: .45;
    }
    /* tier pill */
    .dt-pill {
      position: absolute;
      top: 2px; right: 1px;
      font-size: 6.5px;
      font-weight: 800;
      font-family: 'Inter', sans-serif;
      letter-spacing: .04em;
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: 4px;
      opacity: .6;
    }

    /* ── Paywall overlay ── */
    #drip-paywall {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 9500;
      align-items: flex-end;
      justify-content: center;
      padding: 0;
    }
    #drip-paywall.dpw-open { display: flex; }
    .dpw-sheet {
      background: #18250f;
      border: 1px solid rgba(255,255,255,.10);
      border-bottom: none;
      border-radius: 24px 24px 0 0;
      padding: 8px 28px 36px;
      width: 100%;
      max-width: 480px;
      position: relative;
      animation: dpwUp .25s cubic-bezier(.32,1,.28,1) both;
    }
    @keyframes dpwUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .dpw-handle {
      width: 36px; height: 4px;
      background: rgba(255,255,255,.15);
      border-radius: 2px;
      margin: 10px auto 20px;
    }
    .dpw-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
      font-family: 'Inter', sans-serif;
      padding: 3px 10px;
      border-radius: 100px;
      margin-bottom: 10px;
    }
    .dpw-name {
      font-size: 26px;
      font-weight: 700;
      color: #fff;
      font-family: 'Playfair Display', Georgia, serif;
      margin-bottom: 6px;
      line-height: 1.2;
    }
    .dpw-tagline {
      font-size: 13px;
      color: rgba(255,255,255,.5);
      font-family: 'Inter', sans-serif;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .dpw-features {
      list-style: none;
      padding: 0; margin: 0 0 26px;
      display: flex; flex-direction: column; gap: 9px;
    }
    .dpw-features li {
      font-size: 13px;
      color: rgba(255,255,255,.72);
      font-family: 'Inter', sans-serif;
      display: flex; align-items: flex-start; gap: 9px;
      line-height: 1.4;
    }
    .dpw-check {
      width: 16px; height: 16px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700;
      flex-shrink: 0; margin-top: 1px;
    }
    .dpw-cta {
      display: block;
      width: 100%;
      padding: 15px;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      letter-spacing: .02em;
      transition: opacity .15s, transform .12s;
      text-align: center;
      text-decoration: none;
    }
    .dpw-cta:hover { opacity: .88; transform: translateY(-1px); }
    .dpw-cta:active { transform: translateY(0); }
    .dpw-dismiss {
      display: block;
      width: 100%;
      margin-top: 10px;
      padding: 10px;
      background: transparent;
      border: none;
      font-size: 12px;
      color: rgba(255,255,255,.3);
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      text-align: center;
    }
    .dpw-dismiss:hover { color: rgba(255,255,255,.55); }

    /* ── Push body content above tab bar on normal flow pages ── */
    body { padding-bottom: 60px !important; }
  `;
  document.head.appendChild(css);

  // ── Fullscreen map overrides ────────────────────────────────────────────────
  // These pages use position:fixed elements that fill to bottom:0.
  // We bump them up to leave room for the tab bar.

  if (currentPage === 'designer') {
    const fix = document.createElement('style');
    fix.textContent = `.map-wrap, .ws-overlay { bottom: 60px !important; }`;
    document.head.appendChild(fix);
  }
  if (currentPage === 'zones') {
    const fix = document.createElement('style');
    fix.textContent = `#map-wrap, #sidebar, #panel, #zone-panel { bottom: 60px !important; }`;
    document.head.appendChild(fix);
  }

  // ── Build tab bar ───────────────────────────────────────────────────────────

  const bar = document.createElement('nav');
  bar.id = 'drip-tabbar';
  bar.setAttribute('aria-label', 'Main navigation');

  TABS.forEach(tab => {
    const isActive = tab.pages.includes(currentPage);
    const isLocked = tab.tier !== null;
    const tierInfo = isLocked ? TIERS[tab.tier] : null;

    const btn = document.createElement('button');
    btn.className = 'dt' + (isActive ? ' dt-on' : '');
    btn.setAttribute('aria-label', tab.label + (isLocked ? ' (locked)' : ''));
    btn.title = tab.label + (isLocked ? ` — ${tierInfo.name}` : '');

    let pillHtml = '';
    if (isLocked) {
      const pillColor = tierInfo.color;
      const pillLabel = tab.tier === 'top' ? 'PRO' : `T${tab.tier}`;
      pillHtml = `<span class="dt-pill" style="background:${pillColor}22;color:${pillColor}">${pillLabel}</span>`;
    }

    btn.innerHTML = `
      <span class="dt-icon">${tab.icon}${isLocked ? '<span class="dt-lock">🔒</span>' : ''}</span>
      <span class="dt-label">${tab.label}</span>
      ${pillHtml}
    `;

    if (isLocked) {
      btn.addEventListener('click', () => openPaywall(tab.tier));
    } else if (tab.href && !isActive) {
      btn.addEventListener('click', () => { location.href = tab.href; });
    }

    bar.appendChild(btn);
  });

  document.body.appendChild(bar);

  // ── Paywall sheet ───────────────────────────────────────────────────────────

  const overlay = document.createElement('div');
  overlay.id = 'drip-paywall';
  overlay.innerHTML = `<div class="dpw-sheet" id="dpw-sheet"></div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closePaywall(); });
  document.body.appendChild(overlay);

  function openPaywall(tierKey) {
    const t = TIERS[tierKey];
    const textColor = t.textDark ? '#1c2312' : '#fff';
    document.getElementById('dpw-sheet').innerHTML = `
      <div class="dpw-handle"></div>
      <div class="dpw-badge" style="background:${t.color}22;color:${t.color}">${t.badge}</div>
      <div class="dpw-name">${t.name}</div>
      <div class="dpw-tagline">${t.tagline}</div>
      <ul class="dpw-features">
        ${t.features.map(f => `
          <li>
            <span class="dpw-check" style="background:${t.color}22;color:${t.color}">✓</span>
            ${f}
          </li>
        `).join('')}
      </ul>
      <a class="dpw-cta" href="checkout.html"
         style="background:${t.color};color:${textColor}">
        ${t.cta}
      </a>
      <button class="dpw-dismiss" onclick="window._dripClosePaywall()">Maybe later</button>
    `;
    overlay.classList.add('dpw-open');
  }

  function closePaywall() {
    overlay.classList.remove('dpw-open');
  }

  window._dripClosePaywall = closePaywall;

})();
