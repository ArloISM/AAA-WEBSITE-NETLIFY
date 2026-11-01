/* "Interactive Demo" buttons for the AAA site. Load after lightbox.js:
     <script src="/aaa-telehandler-viewer/lightbox.js" defer></script>
     <script src="/aaa-telehandler-viewer/site-buttons.js" defer></script>
   Item pages for a modelled head run the demo in place of their GIF. The home page
   gets a line under the hero's buttons, and a floating button that stays in view as
   the page scrolls. */
(() => {
  if (window.AAAViewerButtons) return;
  window.AAAViewerButtons = true;
  const MODELLED = ['romastor-360', 'romastor-pan-tilt', 'romastor-3d', 'rotator'];
  const LABEL = 'Interactive Demo';
  const ARROW = ' &rarr;';

  // the sliders under each head's description; ranges match `funcs` in app.js
  const BOOM = { key: 'boom', label: 'Tilt', min: -31, max: 41, pitch: true };
  const PAN = { key: 'pan', label: 'Pan', min: -180, max: 180 };
  const FUNCS = {
    'romastor-360': [PAN],
    'romastor-pan-tilt': [PAN, { key: 'tilt', label: 'Tilt', min: -70, max: 0, pitch: true, flip: true }],
    'romastor-3d': [{ key: 'axis1', label: 'Axis 1 · Pan', min: -180, max: 180 }, { key: 'axis2', label: 'Axis 2 · Roll', min: -180, max: 180 }],
    rotator: [{ key: 'rotate', label: 'Rotate', min: -180, max: 180 }],
  };
  const BASE = new URL('./', document.currentScript.src).href;
  const hasWebGL = () => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } };

  // Runs the demo in place of an item page's GIF. It sits over the slideshow rather than in it,
  // because the slideshow rebuilds its stage on every slide and would reload the 3D each time.
  function itemDemo(id) {
    if (!hasWebGL() || typeof paintStage !== 'function') return;
    const style = document.createElement('style');
    style.textContent = `
.aaa-demo{position:absolute;left:0;right:0;top:0;aspect-ratio:4/3;z-index:1;border-radius:22px;overflow:hidden;border:1px solid var(--r);background:radial-gradient(circle at 50% 40%,#1c1a19 0%,#0d0c0b 100%)}
.aaa-demo.off{visibility:hidden}
.aaa-demo iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;opacity:0;transition:opacity .6s cubic-bezier(.16,1,.3,1)}
.aaa-demo.ready iframe{opacity:1}
.stage-nav{z-index:2}
.aaa-has-demo .stage-nav{top:var(--aaa-mid,50%)}
.aaa-has-demo .stage{min-width:0}
.aaa-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;transition:opacity .4s;animation:aaaLoadIn .4s .2s backwards}
.aaa-demo.ready .aaa-load{opacity:0;pointer-events:none}
.aaa-load b{font-size:.74rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--pd)}
.aaa-load span{display:block;width:180px;height:2px;background:var(--rs);overflow:hidden}
.aaa-load i{display:block;height:100%;width:100%;background:var(--s);transform:scaleX(0);transform-origin:left;transition:transform .3s}
.aaa-load em{font-style:normal;font-size:.82rem;font-weight:500;color:var(--a);font-variant-numeric:tabular-nums}
@keyframes aaaLoadIn{from{opacity:0}to{opacity:1}}
.aaa-ctl{margin:0 0 30px;padding:20px 0 16px;border-top:1px solid var(--r);border-bottom:1px solid var(--r);transition:opacity .4s}
.aaa-ctl.wait{opacity:.5;pointer-events:none}
.aaa-ctl-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.aaa-ctl h3{font-size:.74rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--a)}
.aaa-ctl-btns{display:flex;gap:8px}
.aaa-ctl-btns .btn{padding:7px 16px;font-size:.8rem}
.aaa-ctl h4{font-size:.74rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--a);margin:12px 0 2px}
.aaa-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:.92rem;font-weight:600}
.aaa-row output{font-variant-numeric:tabular-nums}
.aaa-ctl input[type=range]{--pct:50%;-webkit-appearance:none;appearance:none;display:block;width:100%;height:32px;background:transparent;cursor:pointer;touch-action:pan-y}
.aaa-ctl input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:linear-gradient(to right,var(--s) var(--pct),var(--rs) var(--pct))}
.aaa-ctl input[type=range]::-moz-range-track{height:4px;border-radius:2px;background:var(--rs)}
.aaa-ctl input[type=range]::-moz-range-progress{height:4px;border-radius:2px;background:var(--s)}
.aaa-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;margin-top:-10px;border-radius:50%;background:var(--p);border:0;box-shadow:0 1px 8px rgba(0,0,0,.6)}
.aaa-ctl input[type=range]::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:var(--p);border:0}
.aaa-ctl input[type=range]:focus-visible{outline:2px solid var(--p);outline-offset:2px}
@media (max-width:900px){.aaa-ctl{margin:0}.aaa-has-demo .thumbs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.aaa-has-demo .thumbs::-webkit-scrollbar{display:none}}
@media (max-width:680px){.aaa-has-demo .stage-main,.aaa-demo{aspect-ratio:1/1}}`;
    document.head.appendChild(style);
    document.body.classList.add('aaa-has-demo');

    let layer, frame, api, gif, shown = true, onScreen = true;
    const paints = {};
    let held = null, heldUntil = 0;

    const syncPause = () => { if (api) api.pause(!(shown && onScreen)); };
    const toDemo = () => { if (cur !== 0) { cur = 0; paintStage(); paintThumbs(); } };

    function slider(def) {
      const sign = def.flip ? -1 : 1;
      const lo = Math.min(def.min * sign, def.max * sign), hi = Math.max(def.min * sign, def.max * sign);
      const wrap = document.createElement('div');
      const fid = `aaa-${def.key}`;
      wrap.innerHTML = `<div class="aaa-row"><label for="${fid}">${def.label}</label><output for="${fid}"></output></div><input id="${fid}" type="range" min="${lo}" max="${hi}" step="0.1">`;
      const input = wrap.querySelector('input'), out = wrap.querySelector('output');
      const paint = (v) => {
        input.value = v * sign;
        input.style.setProperty('--pct', `${((v * sign - lo) / (hi - lo)) * 100}%`);
        const r = Math.round(v);
        const text = !def.pitch ? `${r}°` : r === 0 ? '0°' : `${Math.abs(r)}° ${r < 0 ? 'up' : 'down'}`;
        if (out.textContent !== text) { out.textContent = text; input.setAttribute('aria-valuetext', text); }
      };
      input.addEventListener('input', () => {
        const v = +input.value * sign;
        held = def.key;
        heldUntil = performance.now() + 900;   // the head eases after the slider; don't let it drag the thumb back
        paint(v);
        toDemo();
        api.setTarget(def.key, v);
      });
      paint(0);
      paints[def.key] = paint;
      return wrap;
    }

    function panel() {
      const el = document.createElement('section');
      el.className = 'aaa-ctl wait';
      el.setAttribute('aria-label', 'Interactive demo controls');
      el.innerHTML = `<div class="aaa-ctl-top"><h3>Interactive Demo</h3><div class="aaa-ctl-btns"><button type="button" class="btn btn-ghost" data-do="demo">Stop demo</button><button type="button" class="btn btn-ghost" data-do="reset">Reset</button></div></div><h4>Head movement</h4>`;
      FUNCS[id].forEach((d) => el.appendChild(slider(d)));
      el.insertAdjacentHTML('beforeend', '<h4>Boom tilt</h4>');
      el.appendChild(slider(BOOM));
      el.querySelector('[data-do=demo]').onclick = () => { toDemo(); api.toggleDemo(); };
      el.querySelector('[data-do=reset]').onclick = () => { toDemo(); held = null; api.reset(); };
      return el;
    }

    function mount() {
      const stage = document.querySelector('.stage'), info = document.querySelector('.info');
      layer = document.createElement('div');
      layer.className = 'aaa-demo';
      layer.innerHTML = '<div class="aaa-load" role="status"><b>Loading Web App</b><span><i></i></span><em>0%</em></div>';
      stage.prepend(layer);

      const ctl = panel();
      const actions = info.querySelector('.actions');
      // on a phone the description would push the sliders away from the head they move
      const narrow = matchMedia('(max-width:900px)');
      const place = () => { if (narrow.matches) stage.after(ctl); else info.insertBefore(ctl, actions); };
      place();
      narrow.addEventListener('change', place);

      let shownP = 0;
      const bar = layer.querySelector('i'), pct = layer.querySelector('em');
      const progress = (p) => {
        shownP = Math.max(shownP, p);
        bar.style.transform = `scaleX(${shownP})`;
        pct.textContent = `${Math.round(shownP * 100)}%`;
      };
      addEventListener('message', (e) => {
        if (!frame || e.source !== frame.contentWindow || !e.data) return;
        if (e.data.type === 'aaa-viewer:progress') progress(e.data.p);
        if (e.data.type === 'aaa-viewer:error') {   // the GIF is still better than an empty stage
          layer.innerHTML = `<img src="${gif}" alt="" style="width:78%;height:78%;margin:11%;object-fit:contain">`;
          ctl.remove();
        }
        if (e.data.type === 'aaa-viewer:ready') {
          api = frame.contentWindow.aaaViewer;
          const demoBtn = ctl.querySelector('[data-do=demo]');
          api.observe({
            paint: (key, v) => { if (key !== held || performance.now() > heldUntil) paints[key]?.(v); },
            demo: (on) => { demoBtn.textContent = on ? 'Stop demo' : 'Run demo'; },
          });
          progress(1);
          ctl.classList.remove('wait');
          layer.classList.add('ready');
          syncPause();
          setTimeout(() => api.play(), 600);   // starts once the fade has finished
        }
      });

      // the arrows centre on the demo, however many rows of thumbnails sit under it
      new ResizeObserver(() => stage.style.setProperty('--aaa-mid', `${layer.offsetHeight / 2}px`)).observe(layer);
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; syncPause(); }, { rootMargin: '120px' }).observe(layer);

      frame = document.createElement('iframe');
      frame.title = 'Interactive 3D demo. Drag to rotate.';
      frame.src = `${BASE}index.html?a=${encodeURIComponent(id)}&inline`;
      layer.appendChild(frame);
    }

    // the page builds its list and stage in one go, so the GIF is out before anything draws
    const draw = window.paintStage, thumbs = window.paintThumbs, lightbox = window.paintLightbox;
    window.paintStage = function () {
      if (!layer) {
        gif = MEDIA[0].url;
        MEDIA[0] = Object.assign(MEDIA[0], { kind: 'placeholder', demo: true });
        mount();
        queueMicrotask(() => {   // and from the gallery further down the page
          const pg = document.getElementById('page-gallery');
          const tile = pg && [...pg.children].find((g) => g.querySelector('img')?.getAttribute('src') === gif);
          if (!tile) return;
          tile.remove();
          [...pg.children].forEach((g, n) => { g.className = `g${n === 0 ? ' wide' : n === 1 ? ' tall' : ''}`; });
        });
      }
      draw();
      shown = cur === 0;
      layer.classList.toggle('off', !shown);
      syncPause();
    };
    window.paintThumbs = function () {
      thumbs();
      const first = document.querySelector('#thumbs .thumb .play');
      if (first && MEDIA[0].demo) first.textContent = '3D';
    };
    window.paintLightbox = function () {
      if (MEDIA[cur].demo) { document.getElementById('lightbox').classList.remove('open'); return; }
      lightbox();
    };
    if (document.getElementById('stage-main')) { window.paintStage(); window.paintThumbs(); }
  }

  function floatingButton() {
    const style = document.createElement('style');
    style.textContent = `
.aaa-float{position:fixed;right:max(24px,env(safe-area-inset-right));bottom:max(24px,env(safe-area-inset-bottom));z-index:900;box-shadow:0 12px 34px rgba(0,0,0,.45)}
.aaa-float.away,body.nav-open .aaa-float{opacity:0;visibility:hidden;transform:translateY(16px)}
.aaa-try{display:block;margin:20px auto 0;padding:8px 12px;background:none;border:0;color:var(--pd);font:500 .92rem var(--font);letter-spacing:-.01em;cursor:pointer;text-decoration:underline;text-decoration-color:var(--s);text-underline-offset:5px;transition:color .3s;opacity:0;animation:fadeUp 1.1s cubic-bezier(.16,1,.3,1) .75s forwards}
.aaa-try:hover{color:var(--p)}
@media (max-width:680px){.aaa-float{right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom))}}`;
    document.head.appendChild(style);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-primary aaa-float';
    b.setAttribute('data-aaa-viewer', '');
    b.innerHTML = LABEL + ARROW;
    document.body.appendChild(b);
    const cta = document.querySelector('.hero-ctas');
    if (cta) {
      const line = document.createElement('button');
      line.type = 'button';
      line.className = 'aaa-try';
      line.setAttribute('data-aaa-viewer', '');
      line.textContent = 'Try our Interactive Demo';
      cta.after(line);
    }
    // step aside at the contact section, whose own buttons take over there
    const contact = document.getElementById('contact');
    if (contact) new IntersectionObserver(([e]) => b.classList.toggle('away', e.isIntersecting)).observe(contact);
  }

  const path = location.pathname.replace(/\/$/, '');
  const id = new URLSearchParams(location.search).get('id');
  if (/\/item(\.html)?$/.test(path)) { if (MODELLED.includes(id)) itemDemo(id); }
  else if (path === '' || path === '/index.html') floatingButton();
})();
