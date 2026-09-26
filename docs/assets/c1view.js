// Figures for the chapters on c1: a viewer for traces of the
// instrumented c1 (tools/c1trace), and a browser for the code tables.
(function () {
  var V = window.V6;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function oct(n) { return n < 0 ? '-' + (-n).toString(8) : n.toString(8); }
  var BASE = ['int', 'char', 'float', 'double', 'struct', 'struct', 'long', '?'];
  function tshort(t) {
    var s = BASE[t & 7], mods = [], g = 0;
    while ((t & ~7) && g++ < 7) { mods.push((t >> 3) & 3); t = ((t >> 2) & ~7) | (t & 7); }
    for (var i = mods.length - 1; i >= 0; i--) s += mods[i] === 1 ? '*' : mods[i] === 2 ? '()' : '[]';
    return s;
  }
  // numbers inside leaves were printed in decimal by the tracer; show
  // them in octal like the generated code
  function leafText(l) {
    var s = l.leaf;
    s = s.replace(/^\$(-?\d+)$/, function (_, n) { return '$' + oct(+n); });
    s = s.replace(/(^|[+_\w])(-?\d+)\((r\d)\)/, function (_, p, n, r) { return p + oct(+n) + '(' + r + ')'; });
    s = s.replace(/^(-?\d+)\((r\d)\)$/, function (_, n, r) { return oct(+n) + '(' + r + ')'; });
    s = s.replace(/\+(\d+)$/, function (_, n) { return '+' + oct(+n); });
    return s;
  }
  var SYM = {106: 'load', 98: 'call', 99: 'call', 100: 'call', 110: 'to r0', 103: 'branch', 104: 'init',
             27: '*r++', 28: '*--r', 102: 'goto', 9: ','};
  function opText(op) {
    if (SYM[op]) return SYM[op];
    var s = V.opsym(op);
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&rarr;/g, '→');
  }
  function draw(n, pre, last, root, showDeg) {
    pre = pre || '';
    var label;
    if (n.leaf !== undefined) label = '<b>' + esc(leafText(n)) + '</b> <span class="muted">' + esc(tshort(n.t)) + '</span>';
    else if (n.op === 103) label = '<b>branch to ' + esc(n.lbl) + ' if ' + (n.cond ? 'true' : 'false') + '</b>';
    else label = '<b>' + esc(opText(n.op)) + '</b> <span class="muted">' + esc(tshort(n.t)) +
      (showDeg ? ', degree ' + n.d : '') + '</span>';
    var line = (root === false ? pre + (last ? '└─ ' : '├─ ') : '') + label + '\n';
    var kids = n.k || [], np = root === false ? pre + (last ? '   ' : '│  ') : '';
    return line + kids.map(function (k, i) { return draw(k, np, i === kids.length - 1, false, showDeg); }).join('');
  }
  function infix(n) {
    if (!n) return '';
    if (n.leaf !== undefined) return leafText(n);
    var k = n.k || [];
    if (n.op === 106) return infix(k[0]);
    if (n.op === 103) return 'branch(' + infix(k[0]) + ')';
    if (n.op === 98 || n.op === 99 || n.op === 100) return infix(k[0]) + '(' + (k[1] ? infix(k[1]) : '') + ')';
    if (k.length === 1) {
      if (n.op === 32 || n.op === 33) return infix(k[0]) + opText(n.op).slice(0, 2);
      return opText(n.op) + infix(k[0]);
    }
    return '(' + infix(k[0]) + ' ' + opText(n.op) + ' ' + infix(k[1]) + ')';
  }
  // pattern letters, as translated by cvopt.c and tested by match()
  var DEG = {z: 'zero', '1': 'the constant 0 or 1', c: 'a small constant', r: 'a register or a constant', i: 'addressable',
             a: 'addressable', e: 'computable in the free registers', n: 'anything'};
  var TYP = {w: 'word', b: 'byte', f: 'float or double', d: 'double', l: 'long', s: 'struct', i: 'int', p: 'pointer'};
  function explainOperand(s) {
    if (!s) return '';
    var m = s.match(/^([z1craien])([wbfdlsip]*)(\*?)$/);
    if (!m) return s;
    var d = DEG[m[1]], t = m[2] ? TYP[m[2]] || m[2] : '';
    if (m[3]) return 'an indirection <code>*x</code> where the whole is ' + d + (t ? ' (' + t + ')' : '');
    return d + (t ? ', ' + t : '');
  }
  function explainPattern(p) {
    var m = p.replace(/^%/, '').split(',');
    return 'left: ' + explainOperand(m[0].trim()) + (m.length > 1 ? '; right: ' + explainOperand(m[1].trim()) : '');
  }
  function lineLink(g, text) {
    for (var i = 0; i < window.LISTING.files.length; i++) {
      var f = window.LISTING.files[i];
      if (g >= f.start && g < f.start + f.n)
        return '<a class="lref" data-file="' + f.name + '" data-line="' + g + '" href="source/' + f.name + '.html#L' + g + '">' + (text || g) + '</a>';
    }
    return String(g);
  }

  // ---------------------------------------------------------------- trace viewer
  document.querySelectorAll('.widget[data-widget="c1trace"]').forEach(function (w) {
    var datas = [].map.call(w.querySelectorAll('script[type="application/json"]'), function (e) { return JSON.parse(e.textContent); });
    var mode = w.getAttribute('data-mode') || 'codegen';
    var body = w.querySelector('.wbody'), cur = 0, data, stmts, list, main;
    var sel = w.querySelector('select.tvsel');
    if (sel) {
      sel.innerHTML = datas.map(function (d, i) { return '<option value="' + i + '">' + esc(d.name) + '.c</option>'; }).join('');
      sel.addEventListener('change', function () { load(+sel.value, 0); });
    }
    function load(i, start) {
      data = datas[i]; stmts = data.stmts;
      body.innerHTML = '<div class="tvgrid"><div><div class="stackhead">' + esc(data.name) + '.c, one entry per expression</div><ol class="tvlist iflist"></ol></div><div class="tvmain"></div></div>';
      list = body.querySelector('.tvlist'); main = body.querySelector('.tvmain');
      stmts.forEach(function (s, k) {
        var li = document.createElement('li');
        var what = s.read.op === 103 ? '<span class="chip">test</span> ' : '';
        li.innerHTML = '<button type="button"><span class="muted">' + s.line + '</span>&nbsp; ' + what + '<span class="mono">' + esc(s.src.trim() || '(initializer)') + '</span></button>';
        li.firstChild.addEventListener('click', function () { show(k); });
        list.appendChild(li);
      });
      show(Math.min(start, stmts.length - 1));
    }
    function show(k) {
      cur = k;
      list.querySelectorAll('li').forEach(function (li, i) { li.classList.toggle('on', i === k); });
      var s = stmts[k], h = [];
      h.push('<div class="pair"><div><div class="stackhead">As read from c0</div><pre class="tree-txt">' + draw(s.read, '', true, true, false) + '</pre></div>' +
             '<div><div class="stackhead">After optim()</div><pre class="tree-txt">' + (s.opt ? draw(s.opt, '', true, true, true) : '') + '</pre></div></div>');
      if (mode === 'codegen') {
        if (s.matches.length) {
          h.push('<div class="stackhead" style="margin-top:.8rem">Code table entries used, in order</div><ol class="tvmatch">');
          s.matches.forEach(function (m) {
            h.push('<li><div class="row small"><span class="chip on">' + m.table + '</span> <span class="mono">' + m.label + '</span> ' +
                   lineLink(m.pline, esc(m.pat)) + ' <span class="muted">for</span> <code>' + esc(infix(m.tree)) + '</code></div>' +
                   '<pre class="tmpl">' + (m.tmpl.length ? esc(m.tmpl.map(function (x) { return x.replace(/^ {8}/, ''); }).join('\n')) : '<span class="muted">(empty template: no code)</span>') + '</pre></li>');
          });
          h.push('</ol>');
        }
      }
      h.push('<div class="stackhead" style="margin-top:.8rem">Output</div><pre class="tree-txt">' + esc(s.code.replace(/\n+$/, '')) + '</pre>');
      main.innerHTML = h.join('');
    }
    var prev = w.querySelector('.prev'), next = w.querySelector('.next');
    if (prev) prev.addEventListener('click', function () { if (cur > 0) show(cur - 1); });
    if (next) next.addEventListener('click', function () { if (cur < stmts.length - 1) show(cur + 1); });
    load(0, +(w.getAttribute('data-start') || 0));
  });

  // ---------------------------------------------------------------- table browser
  document.querySelectorAll('.widget[data-widget="tables"]').forEach(function (w) {
    var T = JSON.parse(w.querySelector('script[type="application/json"]').textContent);
    var ts = w.querySelector('.tsel'), os = w.querySelector('.osel'), out = w.querySelector('.tout');
    function fillOps() {
      var d = T.dirs[ts.value], ops = Object.keys(d).map(Number).sort(function (a, b) { return a - b; });
      os.innerHTML = ops.map(function (o) { return '<option value="' + o + '">' + esc(opText(o)) + ' (' + o + ', ' + d[o] + ')</option>'; }).join('');
    }
    function show() {
      var lab = T.dirs[ts.value][os.value], entries = T.labels[lab] || [], h = [];
      h.push('<p class="small muted">' + entries.length + ' patterns under the label <span class="mono">' + lab +
             '</span>. <code>match</code> tries them in this order and takes the first that fits.</p><ol class="tvmatch">');
      var lastT = null;
      entries.forEach(function (e) {
        var same = e.tline === lastT;
        h.push('<li><div class="row small">' + lineLink(e.line, esc(e.pat)) + ' <span class="muted">' + explainPattern(e.pat) + '</span></div>' +
               (same ? '<p class="small muted" style="margin:.2rem 0 .6rem">same template as above</p>'
                     : '<pre class="tmpl">' + (e.tmpl.length ? esc(e.tmpl.map(function (x) { return x.replace(/^ {8}/, ''); }).join('\n')) : '<span class="muted">(empty: no code needed)</span>') + '</pre>') + '</li>');
        lastT = e.tline;
      });
      h.push('</ol>');
      out.innerHTML = h.join('');
    }
    ts.addEventListener('change', function () { fillOps(); show(); });
    os.addEventListener('change', show);
    ts.value = w.getAttribute('data-table') || 'regtab';
    fillOps();
    os.value = w.getAttribute('data-op') || os.options[0].value;
    show();
  });
})();
