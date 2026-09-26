// A step-by-step model of c0's expression parser, tree() in c00.c.
// Tokens come from the port of symbol() in lexer.js.  The parser keeps
// the original's three stacks (operators, their priorities, operands),
// its andflg, and its special cases.  build() is simplified: it makes
// nodes and folds constants but does not compute types.
(function () {
  // opdope[] from c05.c
  var OPDOPE = [0,0,0,0,15360,1024,15360,1024,6273,3585,0,0,0,0,0,0,0,0,0,0,256,256,256,256,256,0,0,0,0,0,
    14467,14467,14467,14467,14480,14466,14480,14464,14480,15361,12353,12289,13377,13313,13313,11313,11313,8305,
    7793,7793,15361,0,0,7169,6657,12289,0,0,0,0,9221,9221,10245,10245,10245,10245,10245,10245,10245,10245,
    5259,5259,5259,5259,5259,5291,5291,5291,5291,5291,5259,0,0,0,0,0,0,0,0,0,6273,14464,0,0,0,0,0,0,0,0,
    15361,15361,0,0,0,0,0,0,0,0,0];
  var BINARY = 1, RASSOC = 0200;
  var S = {1: ';', 4: '[', 5: ']', 6: '(', 7: ')', 8: ':', 9: ',', 30: '++pre', 31: '--pre', 32: '++post',
    33: '--post', 34: '!', 35: '&', 36: '*', 37: '-', 38: '~', 39: '.', 40: '+', 41: '-', 42: '*', 43: '/',
    44: '%', 45: '>>', 46: '<<', 47: '&', 48: '|', 49: '^', 50: '->', 53: '&&', 54: '||', 60: '==', 61: '!=',
    62: '<=', 63: '<', 64: '>=', 65: '>', 70: '=+', 71: '=-', 72: '=*', 73: '=/', 74: '=%', 75: '=>>',
    76: '=<<', 77: '=&', 78: '=|', 79: '=^', 80: '=', 90: '?', 91: 'sizeof', 100: 'call', 101: 'call()', 200: 'SEOF', 0: 'end'};
  function sym(o) { return S[o] !== undefined ? S[o] : String(o); }
  function prio(o) { return (OPDOPE[o] >> 9) & 077; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function leaf(t) {
    if (t.t === 20) return {leaf: t.name};
    if (t.t === 21) return {leaf: String(t.val << 16 >> 16), con: t.val << 16 >> 16};
    if (t.t === 22) return {leaf: 'L' + t.val, note: 'string'};
    return {leaf: t.f !== undefined ? String(t.f) : '?'};
  }
  function show(n) {
    if (!n) return '';
    if (n.leaf !== undefined) return n.leaf;
    return sym(n.op) + '(' + n.k.map(show).join(', ') + ')';
  }
  function fold(op, a, b) {
    if (a.con === undefined || (b && b.con === undefined)) return null;
    var v1 = a.con, v2 = b ? b.con : 0, v;
    switch (op) {
    case 40: v = v1 + v2; break; case 41: v = v1 - v2; break; case 42: v = v1 * v2; break;
    case 43: if (!v2) return null; v = (v1 / v2) | 0; break; case 44: if (!v2) return null; v = v1 % v2; break;
    case 47: v = v1 & v2; break; case 48: v = v1 | v2; break; case 49: v = v1 ^ v2; break;
    case 37: v = -v1; break; case 38: v = ~v1; break; case 46: v = v1 << v2; break; case 45: v = v1 >> v2; break;
    default: return null;
    }
    v = v << 16 >> 16;
    return {leaf: String(v), con: v};
  }

  function parse(toks) {
    var pos = 0, peeksym = null, steps = [], op = [], pp = [], cp = [], andflg = 0;
    function symbol() { if (peeksym) { var t = peeksym; peeksym = null; return t; } return toks[pos++] || {t: 0}; }
    function snap(tok, text, kind) {
      steps.push({tok: tok, text: text, kind: kind,
        ops: op.map(function (o, i) { return {o: o, p: pp[i]}; }),
        cps: cp.map(show), andflg: andflg});
    }
    function build(o) {
      var note = '';
      if (o === 4) { build(40); o = 36; note = 'a[i] becomes *(a+i): '; }
      var b = OPDOPE[o] & BINARY ? cp.pop() : null, a = cp.pop(), r;
      if (o === 0) { cp.push(a); return ''; }
      if (o === 91) { r = {leaf: 'sizeof ' + show(a), note: 'a constant'}; cp.push(r); return note + 'sizeof becomes a constant'; }
      var f = fold(o, a, b);
      if (f) { cp.push(f); return note + 'fold ' + sym(o) + ' of constants to ' + f.leaf; }
      r = {op: o, k: b ? [a, b] : [a]};
      cp.push(r);
      return note + 'build ' + sym(o) + ' from ' + (b ? show(a) + ' and ' + show(b) : show(a));
    }
    op.push(200); pp.push(6);
    snap(null, 'Start: the operator stack holds the end marker SEOF with priority 6.', 'start');
    var o, tok, guard = 0;
    advanc: for (;;) {
      if (guard++ > 400) { snap(null, 'Stopped: too many steps.', 'err'); return steps; }
      tok = symbol(); o = tok.t;
      switch (o) {
      case 20: case 21: case 22: case 23: case 24:
        if (andflg) { snap(tok, 'Two operands in a row: "Expression syntax".', 'err'); return steps; }
        cp.push(leaf(tok)); andflg = 1;
        snap(tok, 'Operand ' + show(cp[cp.length - 1]) + ': push it on the operand stack; now expect an operator (andflg = 1).', 'push');
        continue advanc;
      case 30: case 31:
        if (andflg) o += 2;
        break;
      case 38: case 34: case 91:
        if (andflg) { snap(tok, 'Unary operator after an operand: "Expression syntax".', 'err'); return steps; }
        break;
      case 41:
        if (!andflg) {
          var nx = symbol(); peeksym = nx;
          if (nx.t === 23 || nx.t === 24) {
            // c00.c: a minus in front of a floating constant is folded into it
            nx.f = -nx.f;
            snap(tok, 'Unary minus before a floating constant: negate the constant itself, no NEG node.', 'push');
            continue advanc;
          }
          o = 37;
        }
        andflg = 0;
        break;
      case 47: case 42:
        if (andflg) andflg = 0; else o = o === 47 ? 35 : 36;
        break;
      case 6:
        if (andflg) {
          var n2 = symbol();
          if (n2.t === 7) o = 101;
          else { peeksym = n2; o = 100; andflg = 0; }
        }
        break;
      case 5: case 7:
        if (!andflg) { snap(tok, 'Closing bracket without an operand: "Expression syntax".', 'err'); return steps; }
        break;
      default:
        // binary operators, including [ . and ->, and anything that ends the expression
        if (!andflg) { snap(tok, 'An operator or terminator where an operand was expected: "Expression syntax".', 'err'); return steps; }
        andflg = 0;
      }
      // oponst
      var p = prio(o), first = true;
      for (;;) {
        var ps = pp[pp.length - 1];
        if (p > ps || (p === ps && (OPDOPE[o] & RASSOC))) {
          var why = sym(o) + ' has priority ' + p + (p > ps ? ', above ' : ', equal to (and right-associative) ') +
            sym(op[op.length - 1]) + ' (' + ps + ')';
          if (o === 32 || o === 33) { p = 37; why += '; postfix ++/-- is stacked with priority 37 so it is reduced at once'; }
          if (o === 6 || o === 4 || o === 100) { p = 4; why += '; once stacked it gets priority 4, so that everything inside reduces down to it'; }
          op.push(o); pp.push(p);
          snap(first ? tok : null, why + ': push it.', 'shift');
          continue advanc;
        }
        first = false;
        pp.pop();
        var os = op.pop(), msg;
        switch (os) {
        case 200:
          peeksym = tok; build(0);
          steps.tree = cp[cp.length - 1];
          snap(null, sym(o) + ' (priority ' + p + ') is not above SEOF (6): the expression is complete. ' + sym(o) + ' is pushed back for the caller.', 'done');
          return steps;
        case 100:
          if (o !== 7) { snap(tok, 'Call without ")": "Expression syntax".', 'err'); return steps; }
          msg = build(100);
          snap(tok, ') closes the call: ' + msg + '.', 'reduce');
          continue advanc;
        case 101:
          cp.push({leaf: '(none)'}); os = 100;
          msg = build(100);
          snap(null, 'A call with no arguments: push an empty argument, then ' + msg + '.', 'reduce');
          break;
        case 30: case 31: case 32: case 33:
          cp.push({leaf: '1', con: 1});
          msg = build(os);
          snap(null, sym(o) + ' (' + p + ') is not above ' + sym(os) + ' (' + ps + '): reduce. ++ and -- get the constant 1 as a second operand; ' + msg + '.', 'reduce');
          break;
        case 6:
          if (o !== 7) { snap(tok, 'Missing ")": "Expression syntax".', 'err'); return steps; }
          snap(tok, ') matches ( : the parentheses disappear.', 'reduce');
          continue advanc;
        case 4:
          if (o !== 5) { snap(tok, 'Missing "]": "Expression syntax".', 'err'); return steps; }
          msg = build(4);
          snap(tok, '] closes the subscript: ' + msg + '.', 'reduce');
          continue advanc;
        default:
          msg = build(os);
          snap(null, sym(o) + ' (' + p + ') is not above ' + sym(os) + ' (' + ps + '): reduce. ' + msg.charAt(0).toUpperCase() + msg.slice(1) + '.', 'reduce');
        }
      }
    }
  }

  function drawTree(n, pre, last, root) {
    pre = pre || '';
    var line = (root === false ? pre + (last ? '└─ ' : '├─ ') : '') + '<b>' + esc(n.leaf !== undefined ? n.leaf : sym(n.op)) + '</b>\n';
    var kids = n.k || [], np = root === false ? pre + (last ? '   ' : '│  ') : '';
    return line + kids.map(function (k, i) { return drawTree(k, np, i === kids.length - 1, false); }).join('');
  }

  window.V6parse = parse;
  document.querySelectorAll('.widget[data-widget="parser"]').forEach(function (w) {
    var inp = w.querySelector('input'), step = 0, steps = [];
    var tokEl = w.querySelector('.ptoks'), opsEl = w.querySelector('.pops'), cpsEl = w.querySelector('.pcps'),
        logEl = w.querySelector('.plog'), cnt = w.querySelector('.pcount');
    function run() {
      var r = window.V6lex(inp.value + ';');
      steps = parse(r.toks);
      step = 0;
      tokEl.innerHTML = r.toks.map(function (t, i) { return '<span class="ptok" data-i="' + i + '">' + esc(t.name || (t.t === 21 ? String(t.val << 16 >> 16) : t.t === 22 ? '"' + t.s + '"' : sym(t.t))) + '</span>'; }).join(' ');
      w._toks = r.toks;
      render();
    }
    function render() {
      var s = steps[step];
      cnt.textContent = 'Step ' + (step + 1) + ' of ' + steps.length;
      opsEl.innerHTML = s.ops.map(function (x, i) {
        return '<div class="cell' + (i === s.ops.length - 1 && s.kind === 'shift' ? ' new' : '') + '"><span>' + esc(sym(x.o)) + '</span><small>' + x.p + '</small></div>';
      }).join('');
      cpsEl.innerHTML = s.cps.map(function (x, i) {
        return '<div class="cell' + (i === s.cps.length - 1 && (s.kind === 'push' || s.kind === 'reduce') ? ' new' : '') + '"><span>' + esc(x) + '</span></div>';
      }).join('');
      logEl.innerHTML = '<span class="chip' + (s.kind === 'err' ? '' : ' on') + '">' + (s.kind === 'shift' ? 'push' : s.kind) + '</span> ' + esc(s.text);
      var idx = s.tok ? w._toks.indexOf(s.tok) : -1;
      tokEl.querySelectorAll('.ptok').forEach(function (e) { e.classList.toggle('cur', +e.getAttribute('data-i') === idx); });
      var fin = w.querySelector('.pfinal');
      if (s.kind === 'done') {
        fin.hidden = false;
        fin.querySelector('pre').innerHTML = steps.tree ? drawTree(steps.tree) : '';
      } else fin.hidden = true;
      w.querySelector('.pprev').disabled = step === 0;
      w.querySelector('.pnext').disabled = step === steps.length - 1;
    }
    var lastTree = null;
    var origParse = parse;
    // keep the final tree object for drawing
    parse = function (toks) {
      var st = origParse(toks);
      lastTree = null;
      return st;
    };
    w.querySelector('.pprev').addEventListener('click', function () { if (step > 0) { step--; render(); } });
    w.querySelector('.pnext').addEventListener('click', function () { if (step < steps.length - 1) { step++; render(); } });
    w.querySelector('.pend').addEventListener('click', function () { step = steps.length - 1; render(); });
    inp.addEventListener('change', run);
    w.querySelector('.prun').addEventListener('click', run);
    w.querySelectorAll('[data-expr]').forEach(function (b) { b.addEventListener('click', function () { inp.value = b.getAttribute('data-expr'); run(); }); });
    run();
  });
})();
