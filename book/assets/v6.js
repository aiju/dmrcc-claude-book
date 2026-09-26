// Shared knowledge about the V6 compiler's numbering, used by the
// interactive figures.  Numbers and names follow c0h.c and c1h.c.
window.V6 = (function () {
  var OPS = {
    0: ['EOF', ''], 1: ['SEMI', ';'], 2: ['LBRACE', '{'], 3: ['RBRACE', '}'],
    4: ['LBRACK', '['], 5: ['RBRACK', ']'], 6: ['LPARN', '('], 7: ['RPARN', ')'],
    8: ['COLON', ':'], 9: ['COMMA', ','], 10: ['FSEL', 'field'],
    19: ['KEYW', 'keyword'], 20: ['NAME', 'name'], 21: ['CON', 'const'], 22: ['STRING', 'string'],
    23: ['FCON', 'float const'], 24: ['SFCON', 'short float'],
    27: ['AUTOI', '*r++'], 28: ['AUTOD', '*--r'],
    30: ['INCBEF', '++pre'], 31: ['DECBEF', '--pre'], 32: ['INCAFT', '++post'], 33: ['DECAFT', '--post'],
    34: ['EXCLA', '!'], 35: ['AMPER', '&amp;'], 36: ['STAR', '*'], 37: ['NEG', '-'], 38: ['COMPL', '~'],
    39: ['DOT', '.'], 40: ['PLUS', '+'], 41: ['MINUS', '-'], 42: ['TIMES', '*'], 43: ['DIVIDE', '/'],
    44: ['MOD', '%'], 45: ['RSHIFT', '&gt;&gt;'], 46: ['LSHIFT', '&lt;&lt;'], 47: ['AND', '&amp;'],
    48: ['OR', '|'], 49: ['EXOR', '^'], 50: ['ARROW', '-&gt;'], 51: ['ITOF', 'int&rarr;double'],
    52: ['FTOI', 'double&rarr;int'], 53: ['LOGAND', '&amp;&amp;'], 54: ['LOGOR', '||'], 55: ['NAND', '&amp;~'],
    56: ['FTOL', 'double&rarr;long'], 57: ['LTOF', 'long&rarr;double'], 58: ['ITOL', 'int&rarr;long'],
    59: ['LTOI', 'long&rarr;int'],
    60: ['EQUAL', '=='], 61: ['NEQUAL', '!='], 62: ['LESSEQ', '&lt;='], 63: ['LESS', '&lt;'],
    64: ['GREATEQ', '&gt;='], 65: ['GREAT', '&gt;'], 66: ['LESSEQP', '&lt;=p'], 67: ['LESSP', '&lt;p'],
    68: ['GREATQP', '&gt;=p'], 69: ['GREATP', '&gt;p'],
    70: ['ASPLUS', '=+'], 71: ['ASMINUS', '=-'], 72: ['ASTIMES', '=*'], 73: ['ASDIV', '=/'],
    74: ['ASMOD', '=%'], 75: ['ASRSH', '=&gt;&gt;'], 76: ['ASLSH', '=&lt;&lt;'], 77: ['ASSAND', '=&amp;'],
    78: ['ASOR', '=|'], 79: ['ASXOR', '=^'], 80: ['ASSIGN', '='],
    81: ['TAND', '&amp; test'], 82: ['LTIMES', '* long'], 83: ['LDIV', '/ long'], 84: ['LMOD', '% long'],
    85: ['ASSNAND', '=&amp;~'], 90: ['QUEST', '?'], 91: ['SIZEOF/LLSHIFT', 'sizeof'],
    98: ['CALL1', 'call'], 99: ['CALL2', 'call'], 100: ['CALL', 'call'], 101: ['MCALL', 'call()'],
    102: ['JUMP', 'goto'], 103: ['CBRANCH', 'branch if'], 104: ['INIT', 'init'], 105: ['SETREG', 'set regs'],
    106: ['LOAD', 'load'], 110: ['RFORCE', 'to r0'], 111: ['BRANCH', 'jump'], 112: ['LABEL', 'label'],
    113: ['NLABEL', 'name label'], 114: ['RLABEL', 'function label'],
    200: ['BDATA', 'bytes'], 201: ['WDATA', 'words'], 202: ['PROG', '.text'], 203: ['DATA', '.data'],
    204: ['BSS', '.bss'], 205: ['CSPACE', '.comm'], 206: ['SSPACE', 'space'], 207: ['SYMDEF', '.globl'],
    208: ['SAVE', 'function entry'], 209: ['RETRN', 'return'], 210: ['EVEN', '.even'],
    212: ['PROFIL', 'profile'], 213: ['SWIT', 'switch'], 214: ['EXPR', 'end of expression'],
    215: ['SNAME', 'static name'], 216: ['RNAME', 'register name'], 217: ['ANAME', 'auto name'],
    218: ['NULL', 'no arguments']
  };
  // operators with two operands (the BINARY bit of opdope)
  var BINARY = {8:1, 9:1, 39:1, 40:1, 41:1, 42:1, 43:1, 44:1, 45:1, 46:1, 47:1, 48:1, 49:1, 50:1,
    53:1, 54:1, 55:1, 60:1, 61:1, 62:1, 63:1, 64:1, 65:1, 66:1, 67:1, 68:1, 69:1, 70:1, 71:1,
    72:1, 73:1, 74:1, 75:1, 76:1, 77:1, 78:1, 79:1, 80:1, 81:1, 82:1, 83:1, 84:1, 85:1, 86:1,
    87:1, 88:1, 90:1, 91:1, 92:1, 100:1, 101:1};
  var BASE = ['int', 'char', 'float', 'double', 'struct', 'struct (forward)', 'long', 'no type'];
  var CLASS = {0: 'none', 10: 'member', 11: 'auto', 12: 'extern', 13: 'static', 14: 'register',
               15: 'struct tag', 16: 'argument', 17: 'argument', 18: 'field', 20: 'offset',
               21: 'extern offset', 22: 'static offset'};

  function opname(n) { return OPS[n] ? OPS[n][0] : 'op ' + n; }
  function opsym(n) { return OPS[n] ? OPS[n][1] : String(n); }
  // decref: ((t>>TYLEN) & ~TYPE) | (t & TYPE)
  function typeName(t) {
    var parts = [], guard = 0;
    while ((t & ~7) && guard++ < 8) {
      var m = (t >> 3) & 3;
      parts.push(m === 1 ? 'pointer to' : m === 2 ? 'function returning' : 'array of');
      t = ((t >> 2) & ~7) | (t & 7);
    }
    parts.push(BASE[t & 7]);
    return parts.join(' ');
  }
  function oct(n, w) { var s = (n >>> 0).toString(8); while (s.length < (w || 0)) s = '0' + s; return s; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  return { OPS: OPS, BINARY: BINARY, CLASS: CLASS, opname: opname, opsym: opsym, typeName: typeName,
           oct: oct, esc: esc };
})();
