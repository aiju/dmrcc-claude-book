// A port of pswitch() from c11.c: given the case values of a switch,
// choose one of the three dispatch methods and print the same code c1
// would.  Also simulates the dispatch for a value.
(function () {
  function oct(n) { n = n & 0xffff; return n.toString(8); }
  function s16(n) { n &= 0xffff; return n & 0x8000 ? n - 0x10000 : n; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function pswitch(vals, deflab, isn) {
    var cases = vals.map(function (v, i) { return {val: s16(v), lab: i + 1}; });
    var out = [], why = [], plan = {};
    if (!cases.length) { out.push('jbr\tL' + deflab); return {code: out.join('\n'), why: ['No cases: just jump to the default.'], kind: 'none'}; }
    var tlab = isn++;
    // sort() -- a bubble sort that also finds duplicates
    var a = cases.slice();
    for (var lp = a.length - 1; lp > 0; lp--) {
      var ch = 0;
      for (var i = 0; i < lp; i++) {
        if (a[i].val === a[i + 1].val) return {err: 'Duplicate case (' + a[i].val + ')'};
        if (a[i].val > a[i + 1].val) { var t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; ch++; }
      }
      if (!ch) break;
    }
    var ncase = a.length, lo = a[0].val, hi = a[ncase - 1].val, range = s16(hi - lo);
    why.push(ncase + ' case' + (ncase > 1 ? 's' : '') + ', values ' + lo + ' to ' + hi + ', range ' + range + '.');
    if (range > 0 && range <= 3 * ncase) {
      why.push('The range is at most 3 &times; ' + ncase + ' = ' + 3 * ncase + ', so a direct jump table is used.');
      if (lo) out.push('sub\t$' + oct(lo) + ',r0');
      out.push('cmp\tr0,$' + oct(range), 'jhi\tL' + deflab, 'asl\tr0', 'jmp\t*L' + isn + '(r0)', '.data');
      var tab = [], k = 0;
      for (var v = lo; v <= hi; v++) {
        if (v === a[k].val) { tab.push('L' + a[k].lab); k++; } else tab.push('L' + deflab);
      }
      tab[0] = 'L' + isn + ':' + tab[0];
      out = out.concat(tab);
      plan = {kind: 'direct', lo: lo, range: range, tab: tab, table: isn};
      isn++;
    } else if (ncase < 8) {
      why.push((range > 0 ? 'The range is more than 3 &times; ' + ncase + '; ' : '') + 'there are fewer than 8 cases, so a linear search is used.');
      var li = isn++, lj = isn++, loop = isn++;
      out.push('mov\t$L' + li + ',r1', 'mov\tr0,L' + lj, 'L' + loop + ':cmp\tr0,(r1)+', 'jne\tL' + loop,
               'jmp\t*L' + lj + '-L' + li + '(r1)', '.data');
      var first = true;
      a.forEach(function (c) { out.push((first ? 'L' + li + ':' : '') + oct(c.val)); first = false; });
      out.push('L' + lj + ':..');
      a.forEach(function (c) { out.push('L' + c.lab); });
      out.push('L' + deflab);
      plan = {kind: 'simple', a: a};
    } else {
      why.push('There are 8 or more cases spread over a wide range, so a hash table is used.');
      var best = 077777, tabs = 0, tries = [];
      for (var n = Math.floor(ncase / 4); n <= Math.floor(ncase / 2); n++) {
        var cnt = []; for (var j = 0; j < n; j++) cnt[j] = 0;
        a.forEach(function (c) { cnt[(c.val & 0xffff) % n]++; });
        var worst = Math.max.apply(null, cnt);
        tries.push(n + ' buckets: largest has ' + worst + ', cost ' + n * worst);
        if (n * worst < best) { tabs = n; best = n * worst; }
      }
      why.push('Bucket counts from ' + Math.floor(ncase / 4) + ' to ' + Math.floor(ncase / 2) + ' are tried, and the one with the smallest buckets &times; largest bucket wins: ' + tries.join('; ') + '. Chosen: ' + tabs + '.');
      var hi2 = isn++;
      var base = isn;
      out.push('mov\tr0,r1', 'clr\tr0', 'div\t$' + oct(tabs) + ',r0', 'asl\tr1', 'add\t$L' + base + ',r1',
               'mov\tr0,*(r1)+', 'mov\t(r1)+,r1', 'L' + hi2 + ':cmp\tr0,-(r1)', 'jne\tL' + hi2,
               'jmp\t*L' + (base + tabs + 1) + '-L' + (base + 1) + '(r1)', '.data');
      isn++;
      var dir = [];
      for (i = 0; i <= tabs; i++) dir.push('L' + (base + 1 + i));
      dir[0] = 'L' + base + ':' + dir[0];
      out = out.concat(dir);
      var buckets = [];
      for (i = 0; i < tabs; i++) {
        out.push('L' + (base + 1 + i) + ':..');
        buckets[i] = [];
        a.forEach(function (c) {
          if ((c.val & 0xffff) % tabs === i) { out.push(oct(Math.floor((c.val & 0xffff) / tabs))); buckets[i].push(c); }
        });
      }
      var labs = [];
      for (i = 0; i < tabs; i++) {
        labs.push('L' + deflab);
        a.forEach(function (c) { if ((c.val & 0xffff) % tabs === i) labs.push('L' + c.lab); });
      }
      labs[0] = 'L' + (base + tabs + 1) + ':' + labs[0];
      out = out.concat(labs);
      plan = {kind: 'hash', tabs: tabs, buckets: buckets};
    }
    out.push('.text');
    return {code: out.join('\n'), why: why, kind: plan.kind, plan: plan, deflab: deflab};
  }

  function simulate(r, v) {
    var p = r.plan, s = [];
    v = s16(v);
    if (r.kind === 'direct') {
      var d = (v - p.lo) & 0xffff;
      s.push('r0 = ' + v + ' &minus; ' + p.lo + ' = ' + s16(d) + '.');
      if (d > p.range) { s.push('Compared unsigned with ' + p.range + ', it is higher (a negative number is a large unsigned one): <b>jhi</b> to the default, L' + r.deflab + '.'); return s; }
      var ent = p.tab[d].replace(/^L\d+:/, '');
      s.push('asl makes it a word offset, ' + 2 * d + '; the table entry there is ' + ent + ': jump to <b>' + ent + '</b>' + (ent === 'L' + r.deflab ? ', the default, since this value is a gap in the table' : '') + '.');
    } else if (r.kind === 'simple') {
      s.push('Store ' + v + ' in the word after the list, so that the search must stop.');
      for (var i = 0; i < p.a.length; i++) {
        s.push('Compare with ' + p.a[i].val + (p.a[i].val === v ? ': equal. Jump through the matching entry of the label list to <b>L' + p.a[i].lab + '</b>.' : ': no.'));
        if (p.a[i].val === v) return s;
      }
      s.push('Compare with ' + v + ', the value just stored: equal. The entry after the case labels is the default, <b>L' + r.deflab + '</b>.');
    } else if (r.kind === 'hash') {
      var u = v & 0xffff, q = Math.floor(u / p.tabs), rem = u % p.tabs;
      s.push('Divide ' + u + ' (as an unsigned 32-bit number) by ' + p.tabs + ': quotient ' + q + ' (octal ' + oct(q) + '), remainder ' + rem + '.');
      s.push('The remainder picks bucket ' + rem + '. Store the quotient ' + q + ' in the bucket&rsquo;s first word, then search the bucket backwards.');
      var b = p.buckets[rem];
      for (var k = b.length - 1; k >= 0; k--) {
        var bq = Math.floor((b[k].val & 0xffff) / p.tabs);
        s.push('Compare with ' + bq + ', octal ' + oct(bq) + ' (for case ' + b[k].val + ')' + (bq === q ? ': equal. Jump to <b>L' + b[k].lab + '</b>.' : ': no.'));
        if (bq === q) return s;
      }
      s.push('Compare with the stored quotient: equal. The first label for this bucket is the default, <b>L' + r.deflab + '</b>.');
    }
    return s;
  }

  window.V6pswitch = pswitch;
  document.querySelectorAll('.widget[data-widget="switch"]').forEach(function (w) {
    var inp = w.querySelector('.swvals'), val = w.querySelector('.swval'), code = w.querySelector('.swcode'),
        why = w.querySelector('.swwhy'), sim = w.querySelector('.swsim'), last;
    function run() {
      var vals = inp.value.split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(function (x) { return parseInt(x, 10); })
        .filter(function (x) { return !isNaN(x); });
      var r = pswitch(vals, 99, 10000);
      last = r;
      if (r.err) { code.textContent = ''; why.innerHTML = '<p class="mono" style="color:#c0392b">' + esc(r.err) + '</p>'; sim.innerHTML = ''; return; }
      code.textContent = r.code;
      why.innerHTML = '<p class="small">' + r.why.join(' ') + ' Case <i>n</i> in the list jumps to label L<i>n</i>; the default is L99.</p>';
      simulate1();
    }
    function simulate1() {
      if (!last || last.err || last.kind === 'none') { sim.innerHTML = ''; return; }
      var v = parseInt(val.value, 10);
      if (isNaN(v)) { sim.innerHTML = ''; return; }
      sim.innerHTML = '<ol class="small">' + simulate(last, v).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>';
    }
    inp.addEventListener('input', run);
    val.addEventListener('input', simulate1);
    w.querySelectorAll('[data-vals]').forEach(function (b) { b.addEventListener('click', function () { inp.value = b.getAttribute('data-vals'); run(); }); });
    run();
  });
})();
