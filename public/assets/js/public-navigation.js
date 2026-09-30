(() => {
  const tocDisclosure = document.querySelector('.toc-disclosure');
  if (tocDisclosure) {
    const compactViewport = window.matchMedia('(max-width: 600px)');
    const syncToc = () => { tocDisclosure.open = !compactViewport.matches; };
    syncToc();
    compactViewport.addEventListener?.('change', syncToc);
  }

  const headers = document.querySelectorAll('.navbar');
  headers.forEach((header, index) => {
    const nav = header.querySelector('nav');
    const links = header.querySelector('.navbar-links');
    const brand = header.querySelector('.navbar-brand-wrap');
    if (!nav || !links || !brand || header.querySelector('.mobile-menu-toggle')) return;

    const isPublicNav = links.querySelector('a[href*="/ubufasha"], a[href="https://ikizame.rw/"]');
    if (isPublicNav && !links.querySelector('.nav-cta-item')) {
      const item = document.createElement('li');
      item.className = 'nav-cta-item';
      const cta = document.createElement('a');
      cta.className = 'navbar-cta';
      cta.href = '/#candidateRegistrationInteractiveForm';
      cta.textContent = 'Tangira Ikizamini';
      item.appendChild(cta);
      links.appendChild(item);
    }

    // Selected public pages keep navigation visible on mobile in a scrollable row.
    if (header.classList.contains('home-visible-nav') || header.classList.contains('always-visible-nav')) {
      nav.hidden = false;
      return;
    }

    if (!nav.id) nav.id = `public-navigation-${index + 1}`;
    const toggle = document.createElement('button');
    toggle.className = 'mobile-menu-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Fungura menu');
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
    brand.insertAdjacentElement('afterend', toggle);

    const mobile = window.matchMedia('(max-width: 1050px)');
    const closeMenu = () => {
      header.classList.remove('menu-open');
      nav.hidden = mobile.matches;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Fungura menu');
    };
    const syncViewport = () => {
      if (mobile.matches) closeMenu();
      else {
        header.classList.remove('menu-open');
        nav.hidden = false;
        toggle.setAttribute('aria-expanded', 'false');
      }
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      header.classList.toggle('menu-open', open);
      nav.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Funga menu' : 'Fungura menu');
    });
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
    mobile.addEventListener?.('change', syncViewport);
    syncViewport();
  });
})();
