#!/usr/bin/env python3
"""Build the book into docs/.

    python3 build.py

Inputs
  src/                 the compiler source, unmodified
  book/chapters/*.html chapter bodies (fragments, see below)
  book/assets/         stylesheet and scripts, copied verbatim
  examples/out/        output captured from the real V6 compiler
                       (produced by tools/run_examples.py)

Chapter fragments start with metadata comments:
    <!-- title: Lexical Analysis -->
    <!-- short: Lexing -->
    <!-- scripts: lexer.js -->
and may use these shorthands in their text:
    [[c00.c:185]]          link to a source line, shown as its global number
    [[c00.c:185-318]]      link to a range
    [[fn:symbol]]          `symbol` linked to its definition
    [[include:examples/out/loop.s]]   the file's contents, HTML-escaped
    [[src:c00.c:185-203]]  a quoted excerpt of the listing, with numbers
    [[bytes:examples/out/x.i]]      an od -b dump as a JSON list of bytes
"""
import html, json, os, re, shutil, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tools'))

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'docs')
BOOK = os.path.join(ROOT, 'book')

BOOK_TITLE = 'The Sixth Edition C Compiler'
SUBTITLE = 'with commentary'

# Listing order.  Like the Lions book, every file starts on a fresh
# sheet of 50 lines and lines are numbered consecutively through the
# whole listing, so a single number names any line.
FILES = [
    ('cc.c',    'The cc command and preprocessor'),
    ('c0h.c',   'Pass 0 header'),
    ('c00.c',   'Pass 0: main, symbol table, lexer, expression parser'),
    ('c01.c',   'Pass 0: tree building and conversions'),
    ('c02.c',   'Pass 0: external definitions and statements'),
    ('c03.c',   'Pass 0: declarations'),
    ('c04.c',   'Pass 0: utilities and intermediate-code output'),
    ('c05.c',   'Pass 0: operator and character tables'),
    ('c0t.s',   'Pass 0: number scanner (assembly)'),
    ('c1h.c',   'Pass 1 header'),
    ('c10.c',   'Pass 1: code generation driver'),
    ('c11.c',   'Pass 1: utilities, switches, branches, tree input'),
    ('c12.c',   'Pass 1: expression optimizer'),
    ('c13.c',   'Pass 1: operator tables'),
    ('c1t.s',   'Pass 1: instruction and branch tables'),
    ('table.s', 'Pass 1: code tables (source)'),
    ('cvopt.c', 'Code table converter'),
    ('c2h.c',   'Pass 2 header'),
    ('c20.c',   'Pass 2: the object code improver'),
    ('c21.c',   'Pass 2: register tracking and utilities'),
    ('csv.s',   'Library: function entry and exit'),
    ('run',     'The build script'),
]
SHEET = 50

C_KEYWORDS = set('''int char float double struct long auto extern static register
goto return if while else switch case break continue do default for sizeof'''.split())


def esc(s):
    return html.escape(s, quote=False)


# ---------------------------------------------------------------- source

class Source:
    def __init__(self):
        self.files = {}      # name -> list of lines
        self.start = {}      # name -> global number of first line
        self.defs = {}       # identifier -> (file, line)
        self.xref = {}       # identifier -> [global numbers]
        n = 100
        for name, _ in FILES:
            text = open(os.path.join(SRC, name), encoding='latin1').read()
            lines = text.expandtabs(8).rstrip('\n').split('\n')
            self.files[name] = lines
            self.start[name] = n
            n = ((n + len(lines) + SHEET - 1) // SHEET) * SHEET
        self.end = n
        self.find_defs()
        self.find_xref()

    def g(self, name, line):
        """Global line number of line (1-based) of file name."""
        lines = self.files[name]
        if not 1 <= line <= len(lines):
            raise ValueError('%s:%d out of range' % (name, line))
        return self.start[name] + line - 1

    def locate(self, g):
        for name, _ in FILES:
            s = self.start[name]
            if s <= g < s + len(self.files[name]):
                return name, g - s + 1
        return None

    def find_defs(self):
        cdef = re.compile(r'^(?:(?:struct\s+\w+|char|int|double)\s*\**\s*)?\**(\w+)\s*\(([\w, ]*)\)\s*(\{.*)?$')
        for name, _ in FILES:
            for i, line in enumerate(self.files[name], 1):
                if name.endswith('.c'):
                    m = cdef.match(line)
                    if m and m.group(1) not in C_KEYWORDS:
                        self.defs.setdefault(m.group(1), (name, i))
                elif name.endswith('.s'):
                    m = re.match(r'^(\w+)\s*[:=]', line)
                    if m:
                        self.defs.setdefault(m.group(1), (name, i))

    def find_xref(self):
        for name, _ in FILES:
            if not name.endswith('.c'):
                continue
            incomment = False
            for i, line in enumerate(self.files[name], 1):
                code, incomment = strip_comments(line, incomment)
                code = re.sub(r'"(\\.|[^"\\])*"', '""', code)
                code = re.sub(r"'(\\.|[^'\\])*'", "''", code)
                if code.lstrip().startswith('#'):
                    code = code.lstrip()[1:]
                    code = re.sub(r'^\s*include\s.*', '', code)
                for ident in re.findall(r'\b[A-Za-z_]\w*\b', code):
                    if ident in C_KEYWORDS:
                        continue
                    lst = self.xref.setdefault(ident, [])
                    gn = self.g(name, i)
                    if not lst or lst[-1] != gn:
                        lst.append(gn)

    def href(self, name, line, prefix=''):
        return '%ssource/%s.html#L%d' % (prefix, name, self.g(name, line))


def strip_comments(line, incomment):
    out = []
    i = 0
    while i < len(line):
        if incomment:
            j = line.find('*/', i)
            if j < 0:
                return ''.join(out), True
            i = j + 2
            incomment = False
        else:
            j = line.find('/*', i)
            if j < 0:
                out.append(line[i:])
                break
            out.append(line[i:j])
            i = j + 2
            incomment = True
    return ''.join(out), incomment


# ---------------------------------------------------------------- highlighting

def highlight_c(line, state, src, prefix, linkdefs=True, here=None):
    """Return HTML for one line of C.  state carries 'in comment'."""
    out = []
    i = 0
    n = len(line)
    if state['comment']:
        j = line.find('*/')
        if j < 0:
            return '<span class="cm">%s</span>' % esc(line)
        out.append('<span class="cm">%s</span>' % esc(line[:j + 2]))
        i = j + 2
        state['comment'] = False
    if line.lstrip().startswith('#') and i == 0:
        return '<span class="pp">%s</span>' % esc(line)
    while i < n:
        c = line[i]
        if line.startswith('/*', i):
            j = line.find('*/', i + 2)
            if j < 0:
                out.append('<span class="cm">%s</span>' % esc(line[i:]))
                state['comment'] = True
                break
            out.append('<span class="cm">%s</span>' % esc(line[i:j + 2]))
            i = j + 2
        elif c in '"\'':
            j = i + 1
            while j < n and line[j] != c:
                j += 2 if line[j] == '\\' else 1
            out.append('<span class="st">%s</span>' % esc(line[i:j + 1]))
            i = j + 1
        elif c.isalpha() or c == '_':
            j = i
            while j < n and (line[j].isalnum() or line[j] == '_'):
                j += 1
            w = line[i:j]
            if w in C_KEYWORDS:
                out.append('<span class="kw">%s</span>' % w)
            elif linkdefs and w in src.defs and src.defs[w] != here:
                f, l = src.defs[w]
                out.append('<a class="id" href="%s">%s</a>' % (src.href(f, l, prefix), w))
            elif here and src.defs.get(w) == here:
                out.append('<span class="def">%s</span>' % w)
            else:
                out.append(w)
            i = j
        elif c.isdigit():
            j = i
            while j < n and (line[j].isalnum() or line[j] == '.'):
                j += 1
            out.append('<span class="nu">%s</span>' % esc(line[i:j]))
            i = j
        else:
            out.append(esc(c))
            i += 1
    return ''.join(out)


def highlight_s(line):
    # PDP-11 assembler: "/" starts a comment, <...> is a string.
    out = []
    i = 0
    n = len(line)
    while i < n:
        c = line[i]
        if c == '/':
            out.append('<span class="cm">%s</span>' % esc(line[i:]))
            break
        if c == '<':
            j = line.find('>', i)
            j = n - 1 if j < 0 else j
            out.append('<span class="st">%s</span>' % esc(line[i:j + 1]))
            i = j + 1
            continue
        out.append(esc(c))
        i += 1
    return ''.join(out)


def highlight_table(line):
    # table.s mixes code-table templates (%...) with assembler.
    if line.startswith('%'):
        return '<span class="tp">%s</span>' % esc(line)
    if line.startswith('/'):
        return '<span class="cm">%s</span>' % esc(line)
    if re.match(r'^\w+:\s*$', line):
        return '<span class="def">%s</span>' % esc(line)
    return esc(line)


def highlight_lines(name, lines, src, prefix):
    state = {'comment': False}
    out = []
    for i, line in enumerate(lines, 1):
        if name.endswith('.c'):
            out.append(highlight_c(line, state, src, prefix, here=(name, i)))
        elif name == 'table.s':
            out.append(highlight_table(line))
        elif name.endswith('.s'):
            out.append(highlight_s(line))
        else:
            out.append(esc(line))
    return out


# ---------------------------------------------------------------- page shell

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Archivo+Narrow:wght@500;600;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400'
         '&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap">')


def page(title, body, prefix='', scripts=(), bodyclass=''):
    js = ''.join('<script src="%sassets/%s"></script>' % (prefix, s) for s in scripts)
    return '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%s</title>
%s
<link rel="stylesheet" href="%sassets/style.css">
</head>
<body class="%s">
%s
<script src="%sassets/book.js"></script>
%s
</body>
</html>
''' % (esc(title), FONTS, prefix, bodyclass, body, prefix, js)


def topbar(prefix, crumbs):
    parts = ['<a class="home" href="%sindex.html">%s</a>' % (prefix, esc(BOOK_TITLE))]
    parts += crumbs
    return ('<header class="topbar"><nav>%s</nav>'
            '<div class="tools"><a href="%scontents.html">Contents</a>'
            '<a href="%ssource/index.html">Listing</a>'
            '<a href="%sxref.html">Index</a></div></header>') % (
        '<span class="sep">/</span>'.join(parts), prefix, prefix, prefix)


# ---------------------------------------------------------------- listing pages

def build_listing(src):
    os.makedirs(os.path.join(OUT, 'source'), exist_ok=True)
    prefix = '../'
    names = [f for f, _ in FILES]
    for k, (name, desc) in enumerate(FILES):
        lines = src.files[name]
        hl = highlight_lines(name, lines, src, prefix)
        start = src.start[name]
        rows = []
        for i, h in enumerate(hl):
            gn = start + i
            sheet = (gn // SHEET) % 2
            rows.append('<tr id="L%d" class="s%d"><td class="ln"><a href="#L%d">%d</a></td>'
                        '<td class="code">%s</td></tr>' % (gn, sheet, gn, gn, h or ' '))
        prev = ('<a href="%s.html">&larr; %s</a>' % (names[k - 1], names[k - 1])) if k else '<span></span>'
        nxt = ('<a href="%s.html">%s &rarr;</a>' % (names[k + 1], names[k + 1])) if k + 1 < len(names) else '<span></span>'
        body = '''%s
<main class="listing">
<div class="listhead">
<p class="eyebrow">Sheet %d &middot; lines %d&ndash;%d</p>
<h1><code>%s</code></h1>
<p class="desc">%s</p>
</div>
<div class="scroll"><table class="src">%s</table></div>
<nav class="pager">%s%s</nav>
</main>''' % (topbar(prefix, ['<a href="index.html">Listing</a>', '<code>%s</code>' % name]),
              start // SHEET, start, start + len(lines) - 1, name, esc(desc),
              '\n'.join(rows), prev, nxt)
        open(os.path.join(OUT, 'source', name + '.html'), 'w').write(
            page('%s · V6 C compiler' % name, body, prefix, bodyclass='listpage'))

    # listing index
    items = []
    for name, desc in FILES:
        s = src.start[name]
        items.append('<tr><td class="num">%d</td><td><a href="%s.html"><code>%s</code></a></td>'
                     '<td>%s</td><td class="num">%d</td></tr>' % (
                         s, name, name, esc(desc), len(src.files[name])))
    body = '''%s
<main class="prose narrow">
<p class="eyebrow">Part one</p>
<h1>The Listing</h1>
<p>The complete source of the Sixth Edition C compiler, as it stood in
<code>/usr/source/c</code> in 1975, plus the <code>cc</code> command that drives it and
the two library routines that every compiled function calls. Nothing has been changed.
As in Lions&rsquo; commentary on the kernel, each file starts on a new sheet of fifty lines and
the lines are numbered straight through, so a single number such as
<a href="c00.c.html#L%d">%d</a> identifies a line anywhere in the listing.</p>
<div class="scroll"><table class="toc-table"><thead><tr><th>First line</th><th>File</th><th>Contents</th><th>Lines</th></tr></thead>
<tbody>%s</tbody></table></div>
</main>''' % (topbar(prefix, ['Listing']), src.g('c00.c', 185), src.g('c00.c', 185), '\n'.join(items))
    open(os.path.join(OUT, 'source', 'index.html'), 'w').write(
        page('Listing · V6 C compiler', body, prefix))


def build_xref(src):
    groups = {}
    for ident in sorted(src.xref, key=lambda s: (s.lower(), s)):
        groups.setdefault(ident[0].upper() if ident[0].isalpha() else '_', []).append(ident)
    parts = []
    for letter in sorted(groups):
        rows = []
        for ident in groups[letter]:
            refs = []
            d = src.defs.get(ident)
            dg = src.g(*d) if d else None
            for gn in src.xref[ident]:
                f, l = src.locate(gn)
                cls = ' class="d"' if gn == dg else ''
                refs.append('<a%s href="source/%s.html#L%d">%d</a>' % (cls, f, gn, gn))
            rows.append('<div class="xr"><code>%s</code><span>%s</span></div>' % (ident, ' '.join(refs)))
        parts.append('<section><h2 id="x-%s">%s</h2>%s</section>' % (letter, letter, '\n'.join(rows)))
    jump = ' '.join('<a href="#x-%s">%s</a>' % (l, l) for l in sorted(groups))
    body = '''%s
<main class="prose wide xref">
<p class="eyebrow">Part three</p>
<h1>Cross-Reference Index</h1>
<p>Every identifier in the C files of the listing, with the lines on which it appears.
The line on which a function is defined is shown in bold. Identifiers in comments
and strings are not indexed.</p>
<p class="jump">%s</p>
%s
</main>''' % (topbar('', ['Index']), jump, '\n'.join(parts))
    open(os.path.join(OUT, 'xref.html'), 'w').write(page('Index · V6 C compiler', body))


def build_sourcedata(src):
    """A script defining the whole listing, for the side-by-side reader."""
    data = {'files': [], 'lines': {}}
    for name, desc in FILES:
        data['files'].append({'name': name, 'start': src.start[name], 'n': len(src.files[name])})
        data['lines'][name] = highlight_lines(name, src.files[name], src, '')
    js = 'window.LISTING = %s;\n' % json.dumps(data, separators=(',', ':'))
    open(os.path.join(OUT, 'assets', 'listing-data.js'), 'w').write(js)


# ---------------------------------------------------------------- chapters

def chapter_files():
    d = os.path.join(BOOK, 'chapters')
    return sorted(f for f in os.listdir(d) if f.endswith('.html'))


def meta(text, key, default=''):
    m = re.search(r'<!--\s*%s:\s*(.*?)\s*-->' % key, text)
    return m.group(1) if m else default


def expand(text, src, prefix=''):
    def lineref(m):
        f, a, b = m.group(1), int(m.group(2)), m.group(3)
        ga = src.g(f, a)
        label = str(ga)
        if b:
            gb = src.g(f, int(b))
            label = '%d&ndash;%d' % (ga, gb)
        return '<a class="lref" data-file="%s" data-line="%d" href="%s">%s</a>' % (
            f, ga, src.href(f, a, prefix), label)

    def fnref(m):
        name = m.group(1)
        if name not in src.defs:
            raise ValueError('unknown function ' + name)
        f, l = src.defs[name]
        return '<a class="lref fn" data-file="%s" data-line="%d" href="%s"><code>%s</code></a>' % (
            f, src.g(f, l), src.href(f, l, prefix), name)

    def include(m):
        path = os.path.join(ROOT, m.group(1))
        return esc(open(path, encoding='latin1').read().expandtabs(8).rstrip('\n'))

    def excerpt(m):
        f, a, b = m.group(1), int(m.group(2)), int(m.group(3) or m.group(2))
        hl = highlight_lines(f, src.files[f], src, prefix)
        rows = []
        for i in range(a, b + 1):
            gn = src.g(f, i)
            rows.append('<span class="xl"><a class="lref" data-file="%s" data-line="%d" href="%s">%5d</a>  %s</span>' % (
                f, gn, src.href(f, i, prefix), gn, hl[i - 1]))
        return '<pre class="excerpt"><span class="xf">%s</span>\n%s</pre>' % (f, '\n'.join(rows))

    def odbytes(m):
        # an "od -b" dump, turned back into a JSON list of byte values
        out = []
        for line in open(os.path.join(ROOT, m.group(1))):
            out += [int(x, 8) for x in line.split()[1:]]
        return json.dumps(out, separators=(',', ':'))

    def trace(m):
        # a trace of the instrumented c1, see tools/c1trace
        import tables, traces
        name = m.group(1)
        tabs = tables.parse(os.path.join(SRC, 'table.s'))
        srcl = open(os.path.join(ROOT, 'examples', name + '.c')).read().split('\n')
        d = traces.parse(os.path.join(ROOT, 'examples', 'trace', name + '.trace'), tabs,
                         lambda l: src.g('table.s', l), srcl)
        d['name'] = name
        d['source'] = srcl
        return json.dumps(d, separators=(',', ':')).replace('</', '<\\/')

    def tablesjson(m):
        import tables
        dirs, labels = tables.parse(os.path.join(SRC, 'table.s'))
        for lab in labels.values():
            for e in lab:
                e['line'] = src.g('table.s', e['line'])
                if e['tmpl']:
                    e['tline'] = src.g('table.s', e['tline'])
                e['tmpl'] = [x.expandtabs(8) for x in e['tmpl']]
        return json.dumps({'dirs': dirs, 'labels': labels}, separators=(',', ':'))

    text = re.sub(r'\[\[trace:(\w+)\]\]', trace, text)
    text = re.sub(r'\[\[tables\]\]', tablesjson, text)
    text = re.sub(r'\[\[bytes:([^\]]+)\]\]', odbytes, text)
    text = re.sub(r'\[\[include:([^\]]+)\]\]', include, text)
    text = re.sub(r'\[\[src:([\w.]+):(\d+)(?:-(\d+))?\]\]', excerpt, text)
    text = re.sub(r'\[\[([\w.]+\.[cs]|run):(\d+)(?:-(\d+))?\]\]', lineref, text)
    text = re.sub(r'\[\[fn:(\w+)\]\]', fnref, text)
    left = re.findall(r'\[\[[^\]]*\]\]', text)
    if left:
        raise ValueError('unexpanded: %s' % left[:3])
    return text


def build_chapters(src):
    chs = []
    for f in chapter_files():
        text = open(os.path.join(BOOK, 'chapters', f)).read()
        chs.append({
            'file': f,
            'text': text,
            'title': meta(text, 'title'),
            'short': meta(text, 'short') or meta(text, 'title'),
            'num': meta(text, 'number'),
            'blurb': meta(text, 'blurb'),
            'scripts': [s for s in meta(text, 'scripts').split() if s],
        })
    for k, ch in enumerate(chs):
        body = expand(ch['text'], src)
        # collect h2 headings for the chapter's own contents
        heads = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body)
        local = ''.join('<li><a href="#%s">%s</a></li>' % (i, t) for i, t in heads)
        prev = chs[k - 1] if k else None
        nxt = chs[k + 1] if k + 1 < len(chs) else None
        pager = '<nav class="pager">%s%s</nav>' % (
            ('<a href="%s">&larr; %s</a>' % (prev['file'], esc(prev['short']))) if prev else '<span></span>',
            ('<a href="%s">%s &rarr;</a>' % (nxt['file'], esc(nxt['short']))) if nxt else '<span></span>')
        label = ('Chapter %s' % ch['num']) if ch['num'].isdigit() else ch['num']
        html_ = '''%s
<div class="reader">
<main class="prose chapter">
<header class="chead">
<p class="eyebrow">%s</p>
<h1>%s</h1>
%s
</header>
%s
%s
</main>
<aside class="panel" id="panel" hidden>
<div class="panelbar"><span class="pfile"></span><button type="button" class="pclose" aria-label="Close listing">Close</button></div>
<div class="pbody"></div>
</aside>
</div>''' % (topbar('', [esc(label)]), esc(label), esc(ch['title']),
             ('<nav class="local"><ol>%s</ol></nav>' % local) if local else '',
             body, pager)
        scripts = ['listing-data.js', 'reader.js'] + ch['scripts']
        open(os.path.join(OUT, ch['file']), 'w').write(
            page('%s · V6 C compiler' % ch['title'], html_, '', scripts, 'chpage'))
    return chs


def build_contents(chs, src):
    items = []
    for ch in chs:
        label = ch['num'] if ch['num'] != ch['title'] else ''
        items.append('<li><a href="%s"><span class="cnum">%s</span><span class="ctitle">%s</span></a>'
                     '<p>%s</p></li>' % (ch['file'], esc(label), esc(ch['title']), ch['blurb']))
    body = '''%s
<main class="prose narrow">
<p class="eyebrow">Part two</p>
<h1>Commentary</h1>
<ol class="contents">%s</ol>
<h2 id="also">Also in this book</h2>
<ul class="plain">
<li><a href="source/index.html">The listing</a>: all %d lines of source, numbered as in the commentary.</li>
<li><a href="xref.html">The cross-reference index</a>: where every identifier is used.</li>
</ul>
</main>''' % (topbar('', ['Contents']), '\n'.join(items), sum(len(v) for v in src.files.values()))
    open(os.path.join(OUT, 'contents.html'), 'w').write(page('Contents · V6 C compiler', body))


def build_index(chs, src):
    text = open(os.path.join(BOOK, 'index.html')).read()
    text = expand(text, src)
    toc = '\n'.join('<li><a href="%s"><span class="cnum">%s</span> %s</a></li>' % (
        ch['file'], esc(ch['num'] if ch['num'] != ch['title'] else ''), esc(ch['title'])) for ch in chs)
    text = text.replace('<!-- TOC -->', toc)
    text = topbar('', []) + text
    open(os.path.join(OUT, 'index.html'), 'w').write(
        page(BOOK_TITLE, text, '', ['listing-data.js', 'reader.js'] + meta(text, 'scripts').split(), 'cover'))


def main():
    src = Source()
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(os.path.join(BOOK, 'assets'), os.path.join(OUT, 'assets'))
    build_listing(src)
    build_xref(src)
    build_sourcedata(src)
    chs = build_chapters(src)
    build_contents(chs, src)
    build_index(chs, src)
    open(os.path.join(OUT, '.nojekyll'), 'w').close()
    print('built %d chapters, %d source lines, listing ends at %d' % (
        len(chs), sum(len(v) for v in src.files.values()), src.end))


if __name__ == '__main__':
    main()
