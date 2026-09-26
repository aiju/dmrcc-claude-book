// A model of how c0 reads a declarator: getype() in c03.c builds a type
// word with the modifiers in reading order, and decl1() reverses them.
// Array dimensions go into dimtab as getype does it.
(function () {
  var BASES = {'int': 0, 'char': 1, 'float': 2, 'double': 3, 'long': 6};
  var MODS = {1: 'pointer to', 2: 'function returning', 3: 'array of'};
  var BASE = ['int', 'char', 'float', 'double', 'struct', 'struct', 'long'];
  function oct(n) { return '0' + (n >>> 0).toString(8); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function decref(t) { return ((t >> 2) & ~7) | (t & 7); }
  function describe(t) {
    var p = [], g = 0;
    while ((t & ~7) && g++ < 8) { p.push(MODS[(t >> 3) & 3]); t = decref(t); }
    p.push(BASE[t & 7]);
    return p.join(' ');
  }
  function fields(t) {
    var f = [];
    while (t & 030) { f.push(['', 'PTR', 'FUNC', 'ARRAY'][(t >> 3) & 3]); t >>= 2; }
    return f.join(' | ') || '(none)';
  }

  function analyse(src) {
    var lx = window.V6lex(src + ';'), toks = lx.toks, pos = 0, peek = null, log = [], dimtab = [], depth = 0;
    function sym() { if (peek) { var t = peek; peek = null; return t; } return toks[pos++] || {t: 0}; }
    var tk = sym(), base = 0, longf = false;
    while (tk.t === 19) {
      if (tk.name === 'long') longf = true;
      else if (BASES[tk.name] !== undefined) base = BASES[tk.name];
      tk = sym();
    }
    if (longf) base = base === 2 ? 3 : 6;
    peek = tk;
    var name = null, ssp = 0, err = null;
    function ind() { return new Array(depth + 1).join('    '); }
    function getype() {
      var o = sym(), type, viaParen = false;
      depth++;
      if (o.t === 42) {
        log.push(ind() + '<code>*</code>: read the rest, then shift it left and put PTR at the bottom');
        var inner = getype();
        if (inner < 0) return -1;
        var r = (inner << 2) | 010;
        depth--;
        log.push(ind() + 'getype returns ' + oct(inner) + '&lt;&lt;2 | PTR = <b>' + oct(r) + '</b>');
        return r;
      }
      if (o.t === 6) {
        log.push(ind() + '<code>(</code>: read the parenthesised declarator');
        type = getype();
        if (type < 0) return -1;
        if (sym().t !== 7) { err = 'Declaration syntax: missing )'; return -1; }
        viaParen = true;
      } else if (o.t === 20) {
        name = o.name; type = 0; ssp = dimtab.length;
        log.push(ind() + 'the name <code>' + esc(name) + '</code>: type starts at 0; its dimensions will start at dimtab[' + ssp + ']');
      } else { err = 'Declaration syntax'; return -1; }
      for (;;) {
        o = sym();
        if (o.t === 6) {
          if (sym().t !== 7) { err = 'Declaration syntax: this model takes () without parameters'; return -1; }
          type = (type << 2) | 020;
          log.push(ind() + '<code>()</code>: type = type&lt;&lt;2 | FUNC = ' + oct(type));
          continue;
        }
        if (o.t === 4) {
          var n = sym();
          if (n.t === 5) { dimtab.push(1); log.push(ind() + '<code>[]</code>: no bound; dimtab[' + (dimtab.length - 1) + '] = 1'); }
          else {
            if (n.t !== 21 || sym().t !== 5) { err = 'Constant required'; return -1; }
            var v = n.val;
            if (!viaParen) {
              for (var k = ssp; k < dimtab.length; k++) dimtab[k] *= v;
            }
            dimtab.push(v);
            log.push(ind() + '<code>[' + v + ']</code>: ' + (viaParen ? '' : 'earlier dimensions of this name are multiplied by ' + v + '; ') + 'dimtab[' + (dimtab.length - 1) + '] = ' + v);
          }
          type = (type << 2) | 030;
          log.push(ind() + 'type = type&lt;&lt;2 | ARRAY = ' + oct(type));
          continue;
        }
        peek = o;
        depth--;
        log.push(ind() + 'nothing more: getype returns <b>' + oct(type) + '</b>');
        return type;
      }
    }
    var t1 = getype();
    if (t1 < 0 || err) return {err: err || 'Declaration syntax', log: log};
    // decl1: reverse the fields
    var type = 0, t = t1;
    do { type = (type << 2) | (t & 030); } while (((t >>= 2) & 030) !== 0);
    type |= base;
    // length()
    var tt = type, n = 1, size;
    while ((tt & 030) === 030) { tt = decref(tt); n = dimtab[ssp]; }
    if ((tt & 030) === 020) size = 0;
    else if (tt >= 010) size = 2 * n;
    else size = n * [2, 1, 4, 8, 0, 0, 4][tt & 7];
    return {name: name, raw: t1, type: type, base: base, dimtab: dimtab, ssp: ssp, size: size, log: log};
  }

  document.querySelectorAll('.widget[data-widget="declarator"]').forEach(function (w) {
    var inp = w.querySelector('input'), out = w.querySelector('.dout');
    function run() {
      var r = analyse(inp.value.replace(/;\s*$/, ''));
      if (r.err) { out.innerHTML = '<p class="mono" style="color:#c0392b">' + esc(r.err) + '</p>'; return; }
      out.innerHTML =
        '<div class="stackhead">getype, reading the declarator</div><div class="log small">' + r.log.join('<br>') + '</div>' +
        '<div class="scroll"><table class="data" style="margin-top:1rem"><tbody>' +
        '<tr><th>getype&rsquo;s word</th><td class="mono">' + oct(r.raw) + '</td><td>' + fields(r.raw) + ', last one read at the bottom</td></tr>' +
        '<tr><th>after decl1 reverses it</th><td class="mono">' + oct(r.type & ~7) + '</td><td>' + fields(r.type) + ', outermost at the bottom</td></tr>' +
        '<tr><th>plus the base type</th><td class="mono">' + oct(r.type) + '</td><td>' + esc(r.name) + ' is ' + esc(describe(r.type)) + '</td></tr>' +
        '<tr><th>dimtab</th><td class="mono">' + (r.dimtab.length ? r.dimtab.join(', ') : '(nothing)') + '</td><td>' + (r.dimtab.length ? 'the name&rsquo;s ssp points at the first entry' : '') + '</td></tr>' +
        '<tr><th>length()</th><td class="mono">' + r.size + '</td><td>bytes' + (r.size === 0 ? ' (a function has none)' : '') + '</td></tr>' +
        '</tbody></table></div>';
    }
    inp.addEventListener('change', run);
    w.querySelector('.drun').addEventListener('click', run);
    w.querySelectorAll('[data-decl]').forEach(function (b) { b.addEventListener('click', function () { inp.value = b.getAttribute('data-decl'); run(); }); });
    run();
  });
})();
