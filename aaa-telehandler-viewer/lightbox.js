/* AAA telehandler viewer lightbox. On the host page:
     <script src="/aaa-telehandler-viewer/lightbox.js" defer></script>
     <button data-aaa-viewer>View in 3D</button>
     <button data-aaa-viewer="rotator">View the Rotator</button>
   or call AAAViewer.open('romastor-3d'). The blur has to live here on the host page,
   because backdrop-filter inside an iframe can't reach the page behind it. */
(() => {
  if (window.AAAViewer) return;   // already on the page: a second copy would open two viewers
  const BASE = new URL('./', document.currentScript.src).href;
  const FADE = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240;
  const css = `
.aaa-lightbox{position:fixed;inset:0;z-index:1100;background:rgba(10,9,8,.6);-webkit-backdrop-filter:blur(24px) saturate(1.1);backdrop-filter:blur(24px) saturate(1.1);opacity:0;transition:opacity ${FADE}ms cubic-bezier(.22,.61,.36,1)}
.aaa-lightbox.on{opacity:1}
.aaa-lightbox iframe{display:block;width:100%;height:100%;border:0;background:transparent}
.aaa-lightbox-close{position:absolute;top:32px;right:32px;z-index:2;width:44px;height:44px;padding:0;border-radius:50%;background:rgba(245,241,234,.06);border:1px solid rgba(245,241,234,.16);color:#f5f1ea;font:600 22px/1 Manrope,-apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:background .3s,transform .3s}
.aaa-lightbox-close:hover{background:rgba(245,241,234,.12)}
.aaa-lightbox-close:focus-visible{outline:2px solid #f5f1ea;outline-offset:2px}
@media (max-width:680px){.aaa-lightbox-close{top:12px;right:12px}}`;
  let box = null, opener = null, frame = null, overflow = '', walled = [];

  function open(id) {
    if (box) return;
    if (!document.getElementById('aaa-lightbox-css')) {
      const s = document.createElement('style');
      s.id = 'aaa-lightbox-css';
      s.textContent = css;
      document.head.appendChild(s);
    }
    opener = document.activeElement;
    box = document.createElement('div');
    box.className = 'aaa-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Telehandler attachments in 3D');
    frame = document.createElement('iframe');
    frame.title = 'Telehandler attachments in 3D';
    frame.src = BASE + 'index.html' + (id ? `?a=${encodeURIComponent(id)}` : '');
    frame.addEventListener('load', () => frame && frame.focus());
    // the close button lives out here, so it works while the viewer is still loading or if it fails to
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'aaa-lightbox-close';
    x.setAttribute('aria-label', 'Close 3D viewer');
    x.innerHTML = '&times;';
    x.addEventListener('click', close);
    box.append(x, frame);
    walled = [...document.body.children].filter((el) => !el.inert && el.tagName !== 'SCRIPT');
    walled.forEach((el) => { el.inert = true; });
    document.body.appendChild(box);
    overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => box && box.classList.add('on')));
  }

  function close() {
    if (!box) return;
    const leaving = box;
    box = frame = null;
    walled.forEach((el) => { el.inert = false; });
    walled = [];
    document.documentElement.style.overflow = overflow;
    leaving.classList.remove('on');
    setTimeout(() => leaving.remove(), FADE);   // removing the iframe frees its WebGL context
    if (opener && opener.focus) opener.focus();
  }

  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  addEventListener('message', (e) => {
    if (frame && e.source === frame.contentWindow && e.data && e.data.type === 'aaa-viewer:close') close();
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-aaa-viewer]');
    if (t) { e.preventDefault(); open(t.getAttribute('data-aaa-viewer') || undefined); }
  });
  window.AAAViewer = { open, close };
})();
