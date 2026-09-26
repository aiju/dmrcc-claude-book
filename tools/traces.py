#!/usr/bin/env python3
"""Turn the output of the tracing c1 (examples/trace/NAME.trace) into
data for the book's figures."""
import re

NODE = re.compile(r'\((\d+):(L?-?\d+):(-?\d+) ')
LEAF = re.compile(r'[^\s()]*(?:\([^)]*\))?[^\s()]*')

def parse_tree(s, i=0):
    """Parse one tree in the tracer's prefix notation starting at s[i]."""
    m = NODE.match(s, i)
    if m:
        op = int(m.group(1)); a = m.group(2); deg = int(m.group(3))
        i = m.end()
        kids = []
        while s[i] != ')':
            k, i = parse_tree(s, i)
            kids.append(k)
            if s[i] == ' ':
                i += 1
        node = {'op': op, 'k': kids}
        if op == 103:
            node['lbl'] = a; node['cond'] = deg
        else:
            node['t'] = int(a); node['d'] = deg
        return node, i + 1
    if s.startswith('()', i):
        return {'leaf': '(none)', 't': 0}, i + 2
    m = LEAF.match(s, i)
    text = m.group(0)
    name, _, t = text.rpartition(':')
    return {'leaf': name, 't': int(t) if t.lstrip('-').isdigit() else 0}, m.end()

def parse(path, tables, g_of_table_line, srclines):
    dirs, labels = tables
    raw = open(path, encoding='latin1').read().replace('\x02', '').replace('\x03', '')
    # The markers the tracer brackets its output with do not survive the
    # terminal, but every traced tree is parenthesised, so each record
    # can be found by its prefix and ended where its tree ends.
    rec = re.compile(r'(R (\d+) |O |M (regtab|efftab|cctab|sptab) (\d+) (\d+) )(?=\()')
    pre, stmts, cur, i = '', [], None, 0
    while True:
        m = rec.search(raw, i)
        text = raw[i:m.start()] if m else raw[i:]
        if cur is not None:
            cur['code'] += text
        else:
            pre += text
        if not m:
            break
        tree, j = parse_tree(raw, m.end())
        kind = m.group(1)[0]
        if kind == 'R':
            line = int(m.group(2))
            cur = {'line': line, 'src': srclines[line - 1] if 0 < line <= len(srclines) else '',
                   'read': tree, 'code': '', 'matches': []}
            stmts.append(cur)
        elif kind == 'O':
            cur['opt'] = tree
        else:
            tab, op, n = m.group(3), int(m.group(4)), int(m.group(5))
            label = dirs[tab][op]
            e = labels[label][n]
            cur['matches'].append({'table': tab, 'label': label, 'n': n, 'pat': e['pat'],
                                   'pline': g_of_table_line(e['line']),
                                   'tmpl': [x.expandtabs(8) for x in e['tmpl']],
                                   'tline': g_of_table_line(e['tline']) if e['tmpl'] else None,
                                   'alias': e.get('alias'), 'tree': tree,
                                   'at': len(cur['code'])})
        i = j
    return {'pre': pre, 'stmts': stmts}
