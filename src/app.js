(function () {
  var html = document.documentElement;
  var KEY = 'fepg-lang';
  function setLang(l, push) {
    if (l !== 'en' && l !== 'ta') l = 'en';
    html.lang = l;
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.l === l)); });
    document.querySelectorAll('[data-pdf]').forEach(function (a) { a.href = a.dataset['pdf' + l.toUpperCase()] || a.href; });
    document.title = document.querySelector('meta[name="title-' + l + '"]').content;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    if (push) { var u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u); }
    spy();
  }
  var q = new URLSearchParams(location.search).get('lang');
  var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  setLang(q || saved || (navigator.language || '').slice(0, 2) === 'ta' && 'ta' || 'en', false);
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      // keep the reader in the same section when switching language
      var cur = currentId();
      setLang(b.dataset.l, true);
      if (cur) { var t = document.querySelector('[data-lang-block="' + html.lang + '"] section.doc[data-sec="' + cur + '"]'); if (t) { var go = function () { t.scrollIntoView({ behavior: 'instant', block: 'start' }); }; go(); requestAnimationFrame(go); setTimeout(go, 250); if (document.fonts) document.fonts.ready.then(function () { setTimeout(go, 50); }); } }
    });
  });

  function sections() { return Array.prototype.slice.call(document.querySelectorAll('[data-lang-block="' + html.lang + '"] section.doc')); }
  function currentId() {
    var y = window.scrollY + 140, id = null;
    sections().forEach(function (s) { if (s.offsetTop <= y) id = s.dataset.sec; });
    return id;
  }
  function spy() {
    var id = currentId();
    document.querySelectorAll('.toc a').forEach(function (a) { a.classList.toggle('active', a.dataset.sec === id); });
    var tt = document.querySelector('.to-top'); if (tt) tt.classList.toggle('show', window.scrollY > 900);
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { spy(); ticking = false; }); } }, { passive: true });
  document.querySelectorAll('.toc-mobile a').forEach(function (a) { a.addEventListener('click', function () { a.closest('details').open = false; }); });
})();
