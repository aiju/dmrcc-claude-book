// A port of c0's lexical analyser, symbol() and its helpers in c00.c,
// with getnum from c0t.s.  It keeps the original's structure: one
// character of pushback (peekc), one token of pushback (peeksym), and
// the character class table ctab from c05.c.
(function () {
  var T = {EOF: 0, SEMI: 1, LBRACE: 2, RBRACE: 3, LBRACK: 4, RBRACK: 5, LPARN: 6, RPARN: 7, COLON: 8,
    COMMA: 9, KEYW: 19, NAME: 20, CON: 21, STRING: 22, FCON: 23, SFCON: 24, SIZEOF: 91,
    INCBEF: 30, DECBEF: 31, EXCLA: 34, DOT: 39, PLUS: 40, MINUS: 41, TIMES: 42, DIVIDE: 43, MOD: 44,
    RSHIFT: 45, LSHIFT: 46, AND: 47, OR: 48, EXOR: 49, ARROW: 50, LOGAND: 53, LOGOR: 54,
    EQUAL: 60, NEQUAL: 61, LESSEQ: 62, LESS: 63, GREATEQ: 64, GREAT: 65, ASPLUS: 70, ASSIGN: 80,
    QUEST: 90, COMPL: 38,
    INSERT: 119, PERIOD: 120, SQUOTE: 121, DQUOTE: 122, LETTER: 123, DIGIT: 124, NEWLN: 125, SPACE: 126, UNKN: 127};
  var NAMES = {};
  Object.keys(T).forEach(function (k) { NAMES[T[k]] = k; });
  NAMES[70] = 'ASPLUS'; NAMES[71] = 'ASMINUS'; NAMES[72] = 'ASTIMES'; NAMES[73] = 'ASDIV'; NAMES[74] = 'ASMOD';
  NAMES[75] = 'ASRSH'; NAMES[76] = 'ASLSH'; NAMES[77] = 'ASSAND'; NAMES[78] = 'ASOR'; NAMES[79] = 'ASXOR';
  var SPELL = {1: ';', 2: '{', 3: '}', 4: '[', 5: ']', 6: '(', 7: ')', 8: ':', 9: ',', 30: '++', 31: '--', 34: '!',
    38: '~', 39: '.', 40: '+', 41: '-', 42: '*', 43: '/', 44: '%', 45: '>>', 46: '<<', 47: '&', 48: '|', 49: '^',
    50: '->', 53: '&&', 54: '||', 60: '==', 61: '!=', 62: '<=', 63: '<', 64: '>=', 65: '>', 70: '=+', 71: '=-',
    72: '=*', 73: '=/', 74: '=%', 75: '=>>', 76: '=<<', 77: '=&', 78: '=|', 79: '=^', 80: '=', 90: '?', 91: 'sizeof'};
  var KW = ['int', 'char', 'float', 'double', 'struct', 'long', 'auto', 'extern', 'static', 'register', 'goto',
    'return', 'if', 'while', 'else', 'switch', 'case', 'break', 'continue', 'do', 'default', 'for', 'sizeof'];

  // ctab from c05.c
  var ctab = [];
  (function () {
    var U = T.UNKN, row = [
      T.EOF, T.INSERT, U, U, U, U, U, U, U, T.SPACE, T.NEWLN, U, U, U, U, U,
      U, U, U, U, U, U, U, U, U, U, U, U, U, U, U, U,
      T.SPACE, T.EXCLA, T.DQUOTE, U, U, T.MOD, T.AND, T.SQUOTE, T.LPARN, T.RPARN, T.TIMES, T.PLUS, T.COMMA, T.MINUS, T.PERIOD, T.DIVIDE];
    for (var i = 0; i < 48; i++) ctab[i] = row[i];
    for (i = 48; i < 58; i++) ctab[i] = T.DIGIT;
    var r2 = [T.COLON, T.SEMI, T.LESS, T.ASSIGN, T.GREAT, T.QUEST, U];
    for (i = 58; i < 65; i++) ctab[i] = r2[i - 58];
    for (i = 65; i < 91; i++) ctab[i] = T.LETTER;
    ctab[91] = T.LBRACK; ctab[92] = U; ctab[93] = T.RBRACK; ctab[94] = T.EXOR; ctab[95] = T.LETTER; ctab[96] = U;
    for (i = 97; i < 123; i++) ctab[i] = T.LETTER;
    ctab[123] = T.LBRACE; ctab[124] = T.OR; ctab[125] = T.RBRACE; ctab[126] = T.COMPL; ctab[127] = U;
  })();

  // PDP-11 double: sign, 8-bit excess-128 exponent, 55-bit fraction with hidden bit.
  // Returns the first word, and whether the other three are zero (an SFCON).
  function pdpFloat(x) {
    if (x === 0) return {w: 0, short: true};
    var s = x < 0 ? 1 : 0; x = Math.abs(x);
    var e = Math.floor(Math.log2(x)) + 1, m = x / Math.pow(2, e);
    if (m >= 1) { m /= 2; e++; } if (m < 0.5) { m *= 2; e--; }
    var top = Math.floor(m * 256);
    return {w: (s << 15) | ((e + 128) << 7) | (top - 128), short: m * 256 === top};
  }

  function lex(src) {
    var i = 0, peekc = 0, peeksym = -1, eof = 0, mosflg = 0, line = 1, isn = 1, inhdr = 0;
    var cval = 0, fcval = 0, name = '', out = [], msgs = [];
    function getchar() { return i < src.length ? (src.charCodeAt(i++) & 0177) || 0 : 0; }
    function error(s) { msgs.push({line: line, text: s, at: out.length}); }
    function spnextchar() {
      var c = peekc || getchar();
      if (c === 9) c = 32;
      else if (c === 10) { c = 32; if (!inhdr) line++; inhdr = 0; }
      else if (c === 1) { inhdr++; c = 32; }
      peekc = c; return c;
    }
    function subseq(c, a, b) { if (spnextchar() !== c) return a; peekc = 0; return b; }
    function mapch(q) {
      var a = getchar();
      for (;;) {
        if (a === q) return -1;
        if (a === 10 || a === 0) { error('Nonterminated string'); peekc = a; return -1; }
        if (a !== 92) return a;
        a = getchar();
        switch (a) {
        case 116: return 9; case 110: return 10; case 98: return 8; case 114: return 13;
        case 10: line++; a = getchar(); continue;
        }
        if (a >= 48 && a <= 55) {
          var n = 0, k = 0;
          while (++k <= 3 && a >= 48 && a <= 55) { n = n * 8 + a - 48; a = getchar(); }
          if (a) i--; // the original keeps it in mpeek; here we simply back up
          return n;
        }
        return a;
      }
    }
    function getnum(c0) {
      // c0t.s: digits in base 8 (leading 0) or 10, a '.', an 'e' exponent
      var base = c0 === 48 ? 8 : 10, c = peekc, v = 0, digits = 0, decpt = 0, text = '';
      peekc = 0;
      function dig() { if (c >= 48 && c <= 57) { digits++; v = (v * base + c - 48) & 0xffff; text += String.fromCharCode(c); c = getchar(); return true; } return false; }
      while (dig());
      if (c === 46) { decpt = 1; text += '.'; c = getchar(); while (dig()); }
      if (digits && c === 101) {
        decpt = 1; text += 'e'; c = getchar();
        if (c === 43 || c === 45) { text += String.fromCharCode(c); c = getchar(); }
        while (c >= 48 && c <= 57) { text += String.fromCharCode(c); c = getchar(); }
      }
      peekc = c;
      if (!digits) return T.DOT;
      if (!decpt) { cval = v; return T.CON; }
      fcval = parseFloat(text);
      var f = pdpFloat(fcval);
      if (f.short) { cval = f.w; return T.SFCON; }
      return T.FCON;
    }
    function symbol() {
      var c;
      if (peeksym >= 0) { c = peeksym; peeksym = -1; if (c === T.NAME) mosflg = 0; return c; }
      if (peekc) { c = peekc; peekc = 0; } else if (eof) return T.EOF; else c = getchar();
      for (;;) {
        switch (ctab[c]) {
        case T.INSERT: inhdr = 1; c = getchar(); continue;
        case T.NEWLN: if (!inhdr) line++; inhdr = 0; c = getchar(); continue;
        case T.SPACE: c = getchar(); continue;
        case T.EOF: eof++; return 0;
        case T.PLUS: return subseq(c, T.PLUS, T.INCBEF);
        case T.MINUS: var inner = subseq(62, T.MINUS, T.ARROW); return subseq(c, inner, T.DECBEF);
        case T.ASSIGN:
          if (subseq(32, 0, 1)) return T.ASSIGN;
          c = symbol();
          if (c >= T.PLUS && c <= T.EXOR) {
            if (spnextchar() !== 32 && (c === T.MINUS || c === T.AND || c === T.TIMES))
              error('Warning: assignment operator assumed');
            return c + T.ASPLUS - T.PLUS;
          }
          if (c === T.ASSIGN) return T.EQUAL;
          peeksym = c; return T.ASSIGN;
        case T.LESS: if (subseq(c, 0, 1)) return T.LSHIFT; return subseq(61, T.LESS, T.LESSEQ);
        case T.GREAT: if (subseq(c, 0, 1)) return T.RSHIFT; return subseq(61, T.GREAT, T.GREATEQ);
        case T.EXCLA: return subseq(61, T.EXCLA, T.NEQUAL);
        case T.DIVIDE:
          if (subseq(42, 1, 0)) return T.DIVIDE;
          var closed = false;
          while ((c = spnextchar()) !== 0) {
            peekc = 0;
            if (c === 42 && spnextchar() === 47) { peekc = 0; c = getchar(); closed = true; break; }
          }
          if (!closed) { eof++; error('Nonterminated comment'); return 0; }
          continue;
        case T.PERIOD: case T.DIGIT:
          peekc = c;
          var r = getnum(c);
          if (r === T.FCON) cval = isn++;
          return r;
        case T.DQUOTE:
          var s = '', ch; while ((ch = mapch(34)) >= 0) s += String.fromCharCode(ch);
          name = s; cval = isn++; return T.STRING;
        case T.SQUOTE:
          var n = 0, cc = 0, ch2;
          while ((ch2 = mapch(39)) >= 0) { if (cc < 2) n |= ch2 << (8 * cc); cc++; }
          if (cc > 2) error('Long character constant');
          cval = n; return T.CON;
        case T.LETTER:
          var sp = mosflg ? '.' : ''; mosflg = 0;
          while (ctab[c] === T.LETTER || ctab[c] === T.DIGIT) { if (sp.length < 8) sp += String.fromCharCode(c); c = getchar(); }
          peekc = c; name = sp;
          var w = sp.charAt(0) === '.' ? sp.slice(1) : sp, k = KW.indexOf(w);
          if (k === 22) return T.SIZEOF;
          if (k >= 0) { cval = k; return T.KEYW; }
          return T.NAME;
        case T.AND: return subseq(38, T.AND, T.LOGAND);
        case T.OR: return subseq(124, T.OR, T.LOGOR);
        case T.UNKN: error('Unknown character'); c = getchar(); continue;
        }
        return ctab[c];
      }
    }
    var guard = 0;
    for (;;) {
      if (guard++ > 2000) break;
      var tline = line, t = symbol();
      if (t === 0) break;
      var tok = {t: t, line: tline};
      if (t === T.NAME || t === T.KEYW) tok.name = name;
      if (t === T.CON || t === T.SFCON) tok.val = cval;
      if (t === T.FCON) { tok.val = cval; tok.f = fcval; }
      if (t === T.SFCON) tok.f = fcval;
      if (t === T.STRING) { tok.val = cval; tok.s = name; }
      out.push(tok);
      if (t === T.DOT || t === T.ARROW) mosflg = 1;   // tree() does this in c0
    }
    return {toks: out, msgs: msgs};
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function show(tok) {
    var cls = 'tok', label = NAMES[tok.t] || String(tok.t), top, extra = '';
    switch (tok.t) {
    case T.NAME: top = tok.name; cls += ' n'; break;
    case T.KEYW: top = tok.name; cls += ' k'; label = 'KEYW'; extra = ', cval ' + KW.indexOf(tok.name.replace(/^\./, '')); break;
    case T.CON: top = String(tok.val << 16 >> 16); label = 'CON'; break;
    case T.SFCON: top = tok.f + ' = $' + tok.val.toString(8); break;
    case T.FCON: top = tok.f + ' at L' + tok.val; break;
    case T.STRING: top = '"' + tok.s.replace(/\n/g, '\\n') + '"'; label = 'STRING L' + tok.val; break;
    default: top = SPELL[tok.t] || label;
    }
    return '<span class="' + cls + '">' + esc(top) + '<small>' + label + ' ' + tok.t + extra + '</small></span>';
  }

  window.V6lex = lex;
  document.querySelectorAll('.widget[data-widget="lexer"]').forEach(function (w) {
    var ta = w.querySelector('textarea'), out = w.querySelector('.lexout'), msg = w.querySelector('.lexmsg');
    function run() {
      var r = lex(ta.value), html = [], m = 0;
      r.toks.forEach(function (tok, k) {
        while (m < r.msgs.length && r.msgs[m].at <= k) { html.push('<span class="tok bad">' + esc(r.msgs[m].line + ': ' + r.msgs[m].text) + '<small>error()</small></span>'); m++; }
        html.push(show(tok));
      });
      while (m < r.msgs.length) { html.push('<span class="tok bad">' + esc(r.msgs[m].line + ': ' + r.msgs[m].text) + '<small>error()</small></span>'); m++; }
      out.innerHTML = html.join('');
      msg.textContent = r.toks.length + ' tokens' + (r.msgs.length ? ', ' + r.msgs.length + ' message' + (r.msgs.length > 1 ? 's' : '') : '');
    }
    ta.addEventListener('input', run);
    w.querySelectorAll('[data-sample]').forEach(function (b) {
      b.addEventListener('click', function () { ta.value = b.getAttribute('data-sample').replace(/\\n/g, '\n').replace(/\\t/g, '\t'); run(); });
    });
    run();
  });
})();
