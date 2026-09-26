// Side-by-side comparison of c1's output and c2's, with a line diff.
(function () {
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function diff(a, b) {
    var n = a.length, m = b.length, L = [];
    for (var i = 0; i <= n; i++) { L[i] = []; for (var j = 0; j <= m; j++) L[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push(['=', a[i], b[j]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { out.push(['-', a[i], null]); i++; }
      else { out.push(['+', null, b[j]]); j++; }
    }
    while (i < n) out.push(['-', a[i++], null]);
    while (j < m) out.push(['+', null, b[j++]]);
    return out;
  }
  document.querySelectorAll('.widget[data-widget="c2diff"]').forEach(function (w) {
    var sets = [].map.call(w.querySelectorAll('.c2set'), function (e) {
      return {name: e.getAttribute('data-name'),
              before: e.querySelector('.before').textContent.replace(/\n+$/, '').split('\n'),
              after: e.querySelector('.after').textContent.replace(/\n+$/, '').split('\n'),
              stats: e.querySelector('.stats').textContent.replace(/\n+$/, '').split('\n')};
    });
    var sel = w.querySelector('select'), body = w.querySelector('.c2body');
    sel.innerHTML = sets.map(function (s, i) { return '<option value="' + i + '">' + esc(s.name) + '.c</option>'; }).join('');
    function show(k) {
      var s = sets[k], d = diff(s.before, s.after), L = [], R = [];
      d.forEach(function (x) {
        if (x[0] === '=') { L.push(esc(x[1])); R.push(esc(x[2])); }
        else if (x[0] === '-') { L.push('<span class="del">' + esc(x[1]) + '</span>'); R.push(''); }
        else { L.push(''); R.push('<span class="add">' + esc(x[2]) + '</span>'); }
      });
      var stats = s.stats.filter(function (l) { return !/^0 /.test(l) && !/core$/.test(l); });
      body.innerHTML = '<div class="c2cols asm"><div><div class="stackhead">c1 output</div><pre>' + L.join('\n') +
        '</pre></div><div><div class="stackhead">after c2</div><pre>' + R.join('\n') + '</pre></div></div>' +
        '<div class="stackhead" style="margin-top:.6rem">What c2 reported</div><p class="mono small">' + stats.map(esc).join('<br>') + '</p>';
    }
    sel.addEventListener('change', function () { show(+sel.value); });
    show(0);
  });
})();
