(function () {
    var menu = document.getElementById('mobile-menu');
    var openBtn = document.getElementById('menu-open');
    var closeBtn = document.getElementById('menu-close');

    function openMenu() {
        menu.classList.remove('hidden');
        menu.classList.add('flex');
        openBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
        openBtn.setAttribute('aria-expanded', 'false');
    }

    if (menu && openBtn && closeBtn) {
        openBtn.addEventListener('click', openMenu);
        closeBtn.addEventListener('click', closeMenu);
        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });
        window.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
        });
    }

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
})();
