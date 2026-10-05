(function () {
  // add-exam.html contains legacy non-UTF-8 markup; keep its admin tab title English at runtime.
  if (/^\/add-exam(?:\.html)?\/?$/.test(window.location.pathname)) {
    document.title = 'IKIZAMINI | Add Question - Admin';
  }
  function getSidebar() {
    return document.querySelector('.sidebar, .side');
  }

  function getShell() {
    return document.querySelector('.shell, .wrap');
  }

  function setupDesktopCollapse(sidebar) {
    const brand = sidebar && sidebar.querySelector('.sidebar-brand, .side-logo');
    if (!brand) return;

    Array.from(brand.childNodes).forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const label = document.createElement('span');
        label.textContent = node.textContent.trim();
        brand.replaceChild(label, node);
      }
    });

    let button = brand.querySelector('.sidebar-collapse-toggle');
    const hasPageSpecificToggle = Boolean(button);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-collapse-toggle';
      button.innerHTML = '<i class="fa-solid fa-angles-left" aria-hidden="true"></i>';
      brand.appendChild(button);
    }

    function updateButton(collapsed) {
      button.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
      button.title = collapsed ? 'Expand navigation' : 'Collapse navigation';
      button.innerHTML = '<i class="fa-solid fa-angles-' + (collapsed ? 'right' : 'left') + '" aria-hidden="true"></i>';
    }

    const shell = getShell();
    if (!shell) return;
    try {
      if (window.innerWidth > 1100 && localStorage.getItem('ikizame-admin-nav-collapsed') === '1') {
        shell.classList.add('sidebar-collapsed');
      }
    } catch (_) {}
    if (!hasPageSpecificToggle) {
      updateButton(shell.classList.contains('sidebar-collapsed'));
      button.addEventListener('click', function () {
        const collapsed = shell.classList.toggle('sidebar-collapsed');
        updateButton(collapsed);
        try { localStorage.setItem('ikizame-admin-nav-collapsed', collapsed ? '1' : '0'); } catch (_) {}
      });
    }
  }

  function enhanceTablesForMobile() {
    document.querySelectorAll('table').forEach(function (table) {
      const headers = Array.from(table.querySelectorAll('thead th')).map(function (cell) {
        return (cell.textContent || '').trim();
      });

      table.querySelectorAll('tbody tr').forEach(function (row) {
        const cells = row.querySelectorAll('td');
        cells.forEach(function (cell, index) {
          const label = headers[index] || '';
          if (label) {
            cell.setAttribute('data-label', label);
          }
        });
      });
    });
  }

  function openSidebar() {
    const sidebar = getSidebar();
    const shell = getShell();
    if (!sidebar) return;
    sidebar.classList.add('open');
    document.body.classList.add('sidebar-open');
    if (shell) {
      shell.classList.add('sidebar-open');
    }
  }

  function closeSidebar() {
    const sidebar = getSidebar();
    const shell = getShell();
    if (!sidebar) return;
    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
    if (shell) {
      shell.classList.remove('sidebar-open');
    }
  }

  window.toggleAdminSidebar = function () {
    const sidebar = getSidebar();
    if (!sidebar) return;
    setupDesktopCollapse(sidebar);
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  window.closeAdminSidebar = closeSidebar;

  document.addEventListener('DOMContentLoaded', function () {
    enhanceTablesForMobile();

    const sidebar = getSidebar();
    if (!sidebar) return;

    const links = sidebar.querySelectorAll('a');
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 1100) {
          closeSidebar();
        }
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1100) {
        closeSidebar();
      }
      enhanceTablesForMobile();
    });

    const observer = new MutationObserver(function () {
      enhanceTablesForMobile();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
