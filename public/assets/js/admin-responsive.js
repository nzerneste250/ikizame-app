(function () {
  function getSidebar() {
    return document.querySelector('.sidebar, .side');
  }

  function getShell() {
    return document.querySelector('.shell');
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
