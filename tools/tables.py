#!/usr/bin/env python3
"""Parse the code tables in src/table.s.

Returns, for use by the book's figures:
  dirs:    {table name: {op number: label}}
  labels:  {label: [{'pat': '%n,aw', 'line': n, 'tmpl': [...], 'tline': n}]}
The n-th entry of a label is what cexpr's optab pointer points at when
the trace says "M table op n".
"""
import re

def parse(path):
    lines = open(path, encoding='latin1').read().split('\n')
    dirs, labels, named = {}, {}, {}
    cur_table = None
    cur_label = None
    pending = []          # pattern entries waiting for their template
    i = 0
    def close_template(tmpl, tline, name=None):
        for e in pending:
            e['tmpl'] = tmpl
            e['tline'] = tline
            e['alias'] = name
        pending.clear()
    while i < len(lines):
        ln = lines[i]
        m = re.match(r'^_(\w+)=\.', ln)
        if m:
            cur_table = m.group(1); dirs[cur_table] = {}; i += 1
            while not lines[i].strip().startswith('0'):
                mm = re.match(r'^\s*(\d+)\.;\s*(\w+)', lines[i])
                if mm:
                    dirs[cur_table][int(mm.group(1))] = mm.group(2)
                i += 1
            continue
        m = re.match(r'^(\w+):\s*$', ln)
        if m:
            cur_label = m.group(1); labels[cur_label] = []; i += 1
            continue
        if cur_label and ln.startswith('%'):
            m = re.match(r'^%\[(\w+):\]', ln)
            if m:            # names the template that follows
                i += 1
                pending_name = m.group(1)
                # the name applies to the next template
                labels.setdefault('__names__', [])
                named_next = pending_name
                # remember it on the next template close
                j = i
                # patterns follow, then the template
                while lines[j].startswith('%'):
                    j += 1
                named[pending_name] = j + 1
                continue
            m = re.match(r'^%\s+\[(\w+)\]', ln)
            if m:            # these patterns use a named template
                name = m.group(1)
                tl = named[name]
                tmpl = []
                k = tl - 1
                while k < len(lines) and lines[k].strip():
                    tmpl.append(lines[k]); k += 1
                close_template(tmpl, tl, name)
                i += 1
                continue
            e = {'pat': ln, 'line': i + 1}
            labels[cur_label].append(e)
            pending.append(e)
            i += 1
            if not lines[i].startswith('%'):
                # template: lines up to a blank line (may be empty)
                tl = i + 1
                tmpl = []
                while i < len(lines) and lines[i].strip():
                    tmpl.append(lines[i]); i += 1
                close_template(tmpl, tl)
            continue
        i += 1
    labels.pop('__names__', None)
    return dirs, labels

if __name__ == '__main__':
    import json, sys
    d, l = parse(sys.argv[1] if len(sys.argv) > 1 else 'src/table.s')
    print(json.dumps(d)[:300])
    for lab in ['cr40', 'ci70', 'cc60', 'cr106']:
        for k, e in enumerate(l[lab]):
            print(lab, k, e['pat'], '|', ' / '.join(x.strip() for x in e['tmpl']), e['tline'])
