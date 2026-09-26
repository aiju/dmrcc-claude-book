// Side-by-side reading: clicking a line number in the commentary opens
// the listing in a panel next to the text instead of leaving the page.
(function () {
  var L = window.LISTING;
  var panel = document.getElementById('panel');
  if (!L || !panel) return;
  var body = panel.querySelector('.pbody');
  var title = panel.querySelector('.pfile');
  var shown = null;

  function fileOf(g) {
    for (var i = 0; i < L.files.length; i++) {
      var f = L.files[i];
      if (g >= f.start && g < f.start + f.n) return f;
    }
    return null;
  }
  function render(f) {
    if (shown === f.name) return;
    var lines = L.lines[f.name], out = [];
    for (var i = 0; i < lines.length; i++) {
      var g = f.start + i;
      out.push('<tr id="P' + g + '" class="s' + (Math.floor(g / 50) % 2) + '"><td class="ln">' + g +
               '</td><td class="code">' + (lines[i] || ' ') + '</td></tr>');
    }
    body.innerHTML = '<table class="src">' + out.join('') + '</table>';
    // identifiers inside the panel link to listing pages; keep them there
    body.querySelectorAll('a.id').forEach(function (a) {
      a.setAttribute('href', 'source/' + a.getAttribute('href').replace(/^source\//, ''));
    });
    shown = f.name;
  }
  function open(g, g2) {
    var f = fileOf(g);
    if (!f) return false;
    render(f);
    title.innerHTML = f.name + ' <a href="source/' + f.name + '.html#L' + g + '">open full page</a>';
    body.querySelectorAll('tr.hit').forEach(function (r) { r.classList.remove('hit'); });
    for (var k = g; k <= (g2 || g); k++) {
      var r = document.getElementById('P' + k);
      if (r) r.classList.add('hit');
    }
    panel.hidden = false;
    document.body.classList.add('panel-open');
    var row = document.getElementById('P' + g);
    if (row) body.scrollTop = row.offsetTop - body.clientHeight / 4;
    return true;
  }
  function close() {
    panel.hidden = true;
    document.body.classList.remove('panel-open');
  }
  panel.querySelector('.pclose').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.lref');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var g = +a.getAttribute('data-line');
    var m = a.textContent.match(/(\d+)\D+(\d+)/);
    if (open(g, m ? +m[2] : g)) e.preventDefault();
  });
})();
