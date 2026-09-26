// Two figures for chapter 6: the type word, and the conversions that
// build() in c01.c inserts for a binary operator.
(function () {
  var INT = 0, CHAR = 1, FLOAT = 2, DOUBLE = 3, STRUCT = 4, LONG = 6;
  var PTR = 010, FUNC = 020, ARRAY = 030;
  var BASE = ['int', 'char', 'float', 'double', 'struct', 'struct (forward)', 'long'];
  var MODS = {1: 'pointer to', 2: 'function returning', 3: 'array of'};
  function decref(t) { return ((t >> 2) & ~7) | (t & 7); }
  function incref(t) { return (((t & ~7) << 2) | (t & 7) | PTR) & 0xffff; }
  function oct(n) { return '0' + (n >>> 0).toString(8); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function describe(t) {
    var p = [], g = 0;
    while ((t & ~7) && g++ < 8) { p.push(MODS[(t >> 3) & 3]); t = decref(t); }
    p.push(BASE[t & 7] || '?');
    return p.join(' ');
  }
  // how the type would be written as a C declarator of x
  function declarator(t) {
    var mods = [], g = 0;
    while ((t & ~7) && g++ < 8) { mods.push((t >> 3) & 3); t = decref(t); }
    var s = 'x', prev = 0;
    mods.forEach(function (m) {
      if (m === 1) { s = '*' + s; }
      else { if (prev === 1) s = '(' + s + ')'; s = s + (m === 2 ? '()' : '[]'); }
      prev = m;
    });
    return (BASE[t & 7] || '?') + ' ' + s;
  }
  function size(t) {
    if ((t & 030) === ARRAY) return null;
    if ((t & ~7) === FUNC) return 0;   // length(): only a function returning a basic type
    if (t >= PTR) return 2;
    return [2, 1, 4, 8, null, null, 4][t & 7];
  }

  // ---------------------------------------------------------------- type word
  document.querySelectorAll('.widget[data-widget="typeword"]').forEach(function (w) {
    var t = incref(CHAR);
    var bitsEl = w.querySelector('.bits'), out = w.querySelector('.tout');
    function render() {
      var h = [];
      for (var b = 15; b >= 0; b--) {
        var on = (t >> b) & 1, lab = b < 3 ? 'base' : 'mod ' + (Math.floor((b - 3) / 2) + 1);
        h.push('<span class="bit' + (on ? ' on' : '') + '" title="bit ' + b + ', ' + lab + '">' + on + '<small>' + b + '</small></span>');
        if (b === 3 || (b > 3 && (b - 3) % 2 === 0)) h.push('<span style="width:.4rem"></span>');
      }
      bitsEl.innerHTML = h.join('');
      var sz = size(t);
      out.innerHTML =
        '<table class="data"><tbody>' +
        '<tr><th>Octal</th><td class="mono">' + oct(t) + '</td></tr>' +
        '<tr><th>Meaning</th><td>' + esc(describe(t)) + '</td></tr>' +
        '<tr><th>Declared as</th><td class="mono">' + esc(declarator(t)) + '</td></tr>' +
        '<tr><th>Size</th><td>' + (sz === null ? 'depends on the dimension in dimtab' : sz === 0 ? 'none (a function)' : sz + ' byte' + (sz > 1 ? 's' : '')) + '</td></tr>' +
        '</tbody></table>';
      w.querySelector('.decref').disabled = !(t & ~7);
      w.querySelector('.incref').disabled = (t >> 13) !== 0;
      w.querySelectorAll('.base').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-b') === (t & 7)); });
    }
    w.querySelectorAll('.base').forEach(function (b) {
      b.addEventListener('click', function () { t = (t & ~7) | +b.getAttribute('data-b'); render(); });
    });
    w.querySelectorAll('.wrap').forEach(function (b) {
      // wrap: make the current type the thing pointed to / returned / the element
      b.addEventListener('click', function () {
        var m = +b.getAttribute('data-m');
        if (t >> 13) return;
        t = (((t & ~7) << 2) | (m << 3) | (t & 7)) & 0xffff; render();
      });
    });
    w.querySelector('.incref').addEventListener('click', function () { t = incref(t); render(); });
    w.querySelector('.decref').addEventListener('click', function () { if (t & ~7) t = decref(t); render(); });
    bitsEl.addEventListener('click', function (e) {
      var bit = e.target.closest('.bit'); if (!bit) return;
      var n = +bit.querySelector('small').textContent; t ^= 1 << n; render();
    });
    render();
  });

  // ---------------------------------------------------------------- conversions
  var ITF = 1, ITL = 2, LTF = 3, ITP = 4, PTI = 5, FTI = 6, LTI = 7, FTL = 8, XX = 15;
  var CVNAME = {0: 'none', 1: 'ITF', 2: 'ITL', 3: 'LTF', 4: 'ITP', 5: 'PTI', 6: 'FTI', 7: 'LTI', 8: 'FTL', 15: 'XX'};
  var CVOP = {1: 'int&rarr;double', 2: 'int&rarr;long', 3: 'long&rarr;double', 6: 'double&rarr;int', 7: 'long&rarr;int', 8: 'double&rarr;long'};
  var cvtab = [
    [0, (FTI << 4) + ITF, (LTI << 4) + ITL, (ITP << 4) + ITP],
    [ITF, 0, LTF, XX],
    [ITL, (FTL << 4) + LTF, 0, XX],
    [ITP, XX, XX, PTI]];
  function lintyp(t) { return t === INT || t === CHAR ? 0 : t === FLOAT || t === DOUBLE ? 1 : t === LONG ? 2 : 3; }
  var TYPES = {'char': CHAR, 'int': INT, 'long': LONG, 'float': FLOAT, 'double': DOUBLE,
    'char *': PTR + CHAR, 'int *': PTR + INT, 'double *': PTR + DOUBLE};
  // operator: [symbol, flags]; flags as in opdope
  var OPS = {
    '+': [40, 0101], '-': [41, 01], '*': [42, 0101], '/': [43, 01], '&': [47, 0161], '<<': [46, 061],
    '<': [63, 05], '==': [60, 05], '=': [80, 013], '=+': [70, 013], '=-': [71, 013]};
  function tname(t) {
    for (var k in TYPES) if (TYPES[k] === t) return k;
    return describe(t);
  }
  function plength(t) { if (!(t & ~7)) return 1; var d = decref(t); return size(d) || 1; }
  function analyse(lt, opn, rt) {
    var op = OPS[opn][0], dope = OPS[opn][1], lines = [], errs = [];
    var t1 = lt, t2 = rt, L = 'a', R = 'b', pcvn = 0, t;
    if ((dope & 020) && lt > CHAR && lt < PTR && lt !== LONG) errs.push('Integer operand required (left)');
    if ((dope & 040) && rt > CHAR && rt < PTR && rt !== LONG) errs.push('Integer operand required (right)');
    var raw = cvtab[lintyp(t1)][lintyp(t2)], leftc = (raw >> 4) & 017, cvn = raw & 017;
    lines.push('cvtab[' + lintyp(t1) + '][' + lintyp(t2) + '] = ' + (leftc ? '(' + CVNAME[leftc] + '&lt;&lt;4)+' : '') + CVNAME[cvn] +
      (leftc ? ': the high half says convert the <em>left</em> operand' : cvn ? ': convert the right operand' : ': no conversion'));
    t = leftc ? t2 : t1;
    if (dope & 010) {
      t = t1;
      if (op === 80 && (cvn === ITP || cvn === PTI)) { cvn = leftc = 0; lines.push('Plain assignment involving a pointer: no conversion, no complaint.'); }
      if (leftc) { cvn = leftc; lines.push('An assignment cannot convert its left side, so the left-hand conversion ' + CVNAME[cvn] + ' is applied to the right instead.'); }
      leftc = 0;
    } else if (dope & 04) {
      if ((op >= 62) && (t1 >= PTR || t2 >= PTR)) { lines.push('A pointer comparison: the operator becomes its unsigned form, <code>' + opn + 'p</code>.'); }
      if (cvn === PTI) cvn = 0;
    }
    if (cvn === PTI) {
      cvn = 0;
      if (op === 41) { t = INT; pcvn = 1; lines.push('Pointer minus pointer: the result is an int, to be divided by the size of the object.'); }
      else if (t1 !== t2 || t1 !== PTR + CHAR) { cvn = XX; }
    }
    var expr = L + ' ' + opn + ' ' + R;
    if (cvn) {
      var l1 = plength(t1), l2 = plength(t2);
      if (cvn === XX) errs.push('Illegal conversion');
      else if (cvn === ITP) {
        var len = leftc ? l2 : l1;
        if (len === 1) lines.push('ITP with an object size of 1: nothing to do.');
        else lines.push('ITP: multiply the integer by ' + len + ', the size of what the pointer points to.');
        expr = leftc ? (len === 1 ? L : '(' + L + '*' + len + ')') + ' ' + opn + ' ' + R : L + ' ' + opn + ' ' + (len === 1 ? R : '(' + R + '*' + len + ')');
      } else {
        lines.push(CVNAME[cvn] + ': insert a conversion operator, ' + CVOP[cvn] + ', above the ' + (leftc ? 'left' : 'right') + ' operand.');
        expr = leftc ? CVOP[cvn] + '(' + L + ') ' + opn + ' ' + R : L + ' ' + opn + ' ' + CVOP[cvn] + '(' + R + ')';
      }
    }
    if (dope & 04) t = INT;
    if (pcvn && t1 !== PTR + CHAR) {
      expr = '(' + expr + ') / ' + plength(t1);
      lines.push('Divide the difference by ' + plength(t1) + '.');
    }
    return {lines: lines, errs: errs, t: t, expr: expr};
  }
  document.querySelectorAll('.widget[data-widget="convert"]').forEach(function (w) {
    var ls = w.querySelector('.cl'), os = w.querySelector('.co'), rs = w.querySelector('.cr'), out = w.querySelector('.cout');
    Object.keys(TYPES).forEach(function (k) {
      ls.insertAdjacentHTML('beforeend', '<option>' + k + '</option>');
      rs.insertAdjacentHTML('beforeend', '<option>' + k + '</option>');
    });
    Object.keys(OPS).forEach(function (k) { os.insertAdjacentHTML('beforeend', '<option>' + esc(k) + '</option>'); });
    ls.value = 'int *'; os.value = '+'; rs.value = 'int';
    function run() {
      var r = analyse(TYPES[ls.value], os.value, TYPES[rs.value]);
      out.innerHTML = '<ol class="small">' + r.lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ol>' +
        (r.errs.length ? '<p class="mono" style="color:#c0392b">' + r.errs.map(esc).join('<br>') + '</p>'
          : '<p><span class="muted">Tree:</span> <code>' + r.expr + '</code> &nbsp; <span class="muted">Result type:</span> <code>' + esc(tname(r.t)) + '</code></p>');
    }
    [ls, os, rs].forEach(function (e) { e.addEventListener('change', run); });
    run();
  });
})();
