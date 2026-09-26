// Decoder for c0's intermediate file.  The byte values come from an
// "od -b" of the real temporary file; the decoding follows getree()
// in c11.c, and the stack of trees is rebuilt exactly as c1 does it.
(function () {
  var V = window.V6;
  document.querySelectorAll('.widget[data-widget="ifile"]').forEach(function (w) {
    var bytes = JSON.parse(w.querySelector('script[type="application/json"]').textContent);
    var recs = decode(bytes);
    var body = w.querySelector('.wbody');
    body.innerHTML =
      '<div class="ifgrid">' +
      '<div><div class="stackhead">Records</div><ol class="iflist"></ol></div>' +
      '<div><div class="stackhead">Bytes (octal, as od -b prints them)</div><div class="ifdump"></div>' +
      '<div class="stackhead" style="margin-top:1rem">c1&rsquo;s expression stack after this record</div><div class="iftree"></div></div>' +
      '</div>';
    var list = body.querySelector('.iflist'), dump = body.querySelector('.ifdump'), treeEl = body.querySelector('.iftree');
    recs.forEach(function (r, k) {
      var li = document.createElement('li');
      li.innerHTML = '<button type="button"><span class="mono">' + r.name + '</span> <span class="muted">' + r.desc + '</span></button>';
      li.firstChild.addEventListener('click', function () { select(k); });
      list.appendChild(li);
    });
    // octal dump, 16 bytes a line like od
    var cells = [], html = [];
    for (var i = 0; i < bytes.length; i += 16) {
      html.push('<div><span class="muted">' + V.oct(i, 7) + '</span>');
      for (var j = i; j < Math.min(i + 16, bytes.length); j++)
        html.push(' <span data-b="' + j + '">' + V.oct(bytes[j], 3) + '</span>');
      html.push('</div>');
    }
    dump.innerHTML = html.join('');
    dump.querySelectorAll('span[data-b]').forEach(function (s) { cells[+s.getAttribute('data-b')] = s; });
    var cur = 0;
    function select(k) {
      cur = k;
      list.querySelectorAll('li').forEach(function (li, n) { li.classList.toggle('on', n === k); });
      cells.forEach(function (c) { c.classList.remove('hit'); });
      var r = recs[k];
      for (var b = r.start; b < r.end; b++) if (cells[b]) cells[b].classList.add('hit');
      var first = cells[r.start];
      if (first) dump.scrollTop = first.parentNode.offsetTop - dump.offsetTop - 40;
      var li = list.children[k];
      if (li.offsetTop < list.scrollTop || li.offsetTop > list.scrollTop + list.clientHeight - 30)
        list.scrollTop = li.offsetTop - list.clientHeight / 3;
      treeEl.innerHTML = r.stack.length ? r.stack.map(function (t) { return '<pre class="tree-txt">' + draw(t) + '</pre>'; }).join('')
        : '<p class="muted small">' + (r.name === 'EXPR' ? 'Empty: the tree was just handed to the code generator.' : 'Empty.') + '</p>';
    }
    w.querySelector('.prev').addEventListener('click', function () { if (cur > 0) select(cur - 1); });
    w.querySelector('.next').addEventListener('click', function () { if (cur < recs.length - 1) select(cur + 1); });
    select(0);
  });

  function decode(b) {
    var i = 0, recs = [], stack = [];
    function w() { var v = b[i] | (b[i + 1] << 8); i += 2; return v; }
    function s() { var j = i, t = ''; while (j < b.length && b[j]) t += String.fromCharCode(b[j++]); i = j + 1; return t; }
    function sx(v) { return v & 0x8000 ? v - 0x10000 : v; }
    while (i < b.length - 1) {
      var start = i, op = w(), d = '', name;
      if ((op >> 8) !== 0o376) { recs.push({start: start, end: b.length, name: '?', desc: 'not an operator word', stack: []}); break; }
      op &= 0o377;
      name = V.opname(op);
      switch (op) {
      case 0: d = 'end of file'; break;
      case 207: d = 'make _' + s() + ' global'; break;
      case 113: d = 'label _' + s() + ':'; break;
      case 114: var fn = s(); d = 'function _' + fn + ': (and ~~' + fn + ' for the debugger)'; break;
      case 205: var cn = s(); d = 'common _' + cn + ', ' + w() + ' bytes'; break;
      case 215: var sn = s(); d = 'debugger: static ' + sn + ' is L' + w(); break;
      case 217: var an = s(); d = 'debugger: ' + an + ' is at ' + sx(w()) + '(r5)'; break;
      case 216: var rn = s(); d = 'debugger: ' + rn + ' is in r' + w(); break;
      case 206: d = 'reserve ' + w() + ' bytes'; break;
      case 208: d = 'function entry; ' + w() + ' bytes used below r5'; break;
      case 212: d = 'profiling counter L' + w(); break;
      case 112: d = 'L' + w() + ':'; break;
      case 111: d = 'jump to L' + w(); break;
      case 105: var rv = w(); d = rv > 4 ? 'no register variables; r0–r4 are free for expressions'
        : 'register variables in r4 down to r' + rv + '; r0–r' + (rv - 1) + ' are free for expressions'; break;
      case 214: d = 'end of expression, line ' + w() + ': compile it'; stack = []; break;
      case 200: case 201:
        var vals = [];
        if (w() !== 0) { for (;;) { vals.push(w()); if (w() !== 1) break; } }
        d = (op === 200 ? 'bytes ' : 'words ') + vals.map(function (v) { return V.oct(v); }).join(',');
        break;
      case 202: case 203: case 204: case 210: case 209:
        d = {202: 'switch to .text', 203: 'switch to .data', 204: 'switch to .bss', 210: '.even', 209: 'return: jmp cret'}[op];
        break;
      case 213:
        var dl = w(), ln = w(), cs = [];
        for (;;) { var lab = w(); if (!lab) break; cs.push(w() + '→L' + lab); }
        d = 'switch, default L' + dl + ', line ' + ln + ': ' + cs.join(' ');
        break;
      case 20:
        var cl = w(), ty, nm;
        if (cl === 12) { ty = w(); nm = s(); d = '_' + nm + ', extern, ' + V.typeName(ty); stack.push({t: nm, s: 'extern ' + V.typeName(ty)}); }
        else {
          ty = w(); var loc = sx(w());
          var where = cl === 14 ? 'r' + loc : cl === 13 ? 'L' + loc : cl === 11 ? loc + '(r5)' : String(loc);
          d = where + ', ' + (V.CLASS[cl] || cl) + ', ' + V.typeName(ty);
          stack.push({t: where, s: (V.CLASS[cl] || cl) + ' ' + V.typeName(ty)});
        }
        break;
      case 21: case 23: case 24:
        var ct = w(), cv = sx(w());
        d = (op === 21 ? 'constant ' + cv : op === 24 ? 'short float, high word ' + V.oct(cv & 0xffff) : 'float constant at L' + cv) + ', ' + V.typeName(ct);
        stack.push({t: op === 23 ? 'L' + cv : String(cv), s: V.typeName(ct)});
        break;
      case 218: d = 'empty argument list'; stack.push({t: '(none)', s: ''}); break;
      case 103:
        var bl = w(), bc = w();
        d = 'branch to L' + bl + ' if the tree is ' + (bc ? 'true' : 'false');
        stack.push({t: 'branch if ' + (bc ? 'true' : 'false') + ' to L' + bl, s: '', k: [stack.pop()]});
        break;
      case 10:
        var ft = w(), fi = w();
        d = 'field of ' + (fi & 0xff) + ' bits at bit ' + (fi >> 8) + ', ' + V.typeName(ft);
        stack.push({t: 'field', s: d, k: [stack.pop()]});
        break;
      default:
        var t = w();
        if (V.BINARY[op]) {
          var r = stack.pop(), l = stack.pop();
          stack.push({t: V.opsym(op), s: V.typeName(t), k: [l, r]});
          d = 'binary ' + V.opsym(op) + ', result ' + V.typeName(t);
        } else {
          stack.push({t: V.opsym(op), s: V.typeName(t), k: [stack.pop()]});
          d = 'unary ' + V.opsym(op) + ', result ' + V.typeName(t);
        }
      }
      recs.push({start: start, end: i, name: name, desc: d, stack: stack.slice()});
      if (op === 0) break;
    }
    return recs;
  }

  function draw(t, pre, last, root) {
    if (!t) return '';
    pre = pre || '';
    var line = (root === false ? pre + (last ? '└─ ' : '├─ ') : '') +
      '<b>' + t.t + '</b>' + (t.s ? '  <span class="muted">' + t.s + '</span>' : '') + '\n';
    var kids = t.k || [];
    var np = root === false ? pre + (last ? '   ' : '│  ') : '';
    return line + kids.map(function (k, n) { return draw(k, np, n === kids.length - 1, false); }).join('');
  }
})();
