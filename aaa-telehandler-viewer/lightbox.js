/* AAA telehandler viewer lightbox. On the host page:
     <script src="/aaa-telehandler-viewer/lightbox.js" defer></script>
     <button data-aaa-viewer>View in 3D</button>
     <button data-aaa-viewer="rotator">View the Rotator</button>
   or call AAAViewer.open('romastor-3d'). The blur has to live here on the host page,
   because backdrop-filter inside an iframe can't reach the page behind it. */
(() => {
  const BASE = new URL('./', document.currentScript.src).href;
  const FADE = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240;
  const css = `
.aaa-lightbox{position:fixed;inset:0;z-index:1100;background:rgba(10,9,8,.6);-webkit-backdrop-filter:blur(24px) saturate(1.1);backdrop-filter:blur(24px) saturate(1.1);opacity:0;transition:opacity ${FADE}ms cubic-bezier(.22,.61,.36,1)}
.aaa-lightbox.on{opacity:1}
.aaa-lightbox iframe{display:block;width:100%;height:100%;border:0;background:transparent}`;
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
    box.appendChild(frame);
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
