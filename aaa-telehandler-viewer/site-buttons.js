/* "Function View" buttons for the AAA site. Load after lightbox.js:
     <script src="/aaa-telehandler-viewer/lightbox.js" defer></script>
     <script src="/aaa-telehandler-viewer/site-buttons.js" defer></script>
   Item pages for a modelled head get a button beside their actions. The home page
   gets a floating button that stays in view as the page scrolls. */
(() => {
  const MODELLED = ['romastor-360', 'romastor-pan-tilt', 'romastor-3d', 'rotator'];
  const LABEL = 'Function View';
  const ARROW = ' &rarr;';

  function itemButton(id) {
    const page = document.getElementById('page');
    if (!page) return;
    const place = () => {
      const actions = page.querySelector('.actions');   // the page renders itself after loading its data
      if (!actions) return false;
      if (actions.querySelector('[data-aaa-viewer]')) return true;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-ghost';
      b.setAttribute('data-aaa-viewer', id);
      b.innerHTML = LABEL + ARROW;
      actions.appendChild(b);
      return true;
    };
    if (place()) return;
    new MutationObserver((_, obs) => { if (place()) obs.disconnect(); }).observe(page, { childList: true, subtree: true });
  }

  function floatingButton() {
    const style = document.createElement('style');
    style.textContent = `
.aaa-float{position:fixed;right:max(24px,env(safe-area-inset-right));bottom:max(24px,env(safe-area-inset-bottom));z-index:900;box-shadow:0 12px 34px rgba(0,0,0,.45)}
.aaa-float.away,body.nav-open .aaa-float{opacity:0;visibility:hidden;transform:translateY(16px)}
@media (max-width:680px){.aaa-float{right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom))}}`;
    document.head.appendChild(style);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-primary aaa-float';
    b.setAttribute('data-aaa-viewer', '');
    b.innerHTML = LABEL + ARROW;
    document.body.appendChild(b);
    // step aside at the contact section, whose own buttons take over there
    const contact = document.getElementById('contact');
    if (contact) new IntersectionObserver(([e]) => b.classList.toggle('away', e.isIntersecting)).observe(contact);
  }

  const path = location.pathname.replace(/\/$/, '');
  const id = new URLSearchParams(location.search).get('id');
  if (/\/item(\.html)?$/.test(path)) { if (MODELLED.includes(id)) itemButton(id); }
  else if (path === '' || path === '/index.html') floatingButton();
})();
