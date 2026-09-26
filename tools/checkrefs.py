#!/usr/bin/env python3
"""Print the source lines each [[file:line]] reference in a chapter
points at, so references can be checked by eye."""
import re, sys
for path in sys.argv[1:]:
    text = open(path).read()
    for m in re.finditer(r'\[\[(?:src:)?([\w.]+\.[cs]|run):(\d+)(?:-(\d+))?\]\]', text):
        f, a, b = m.group(1), int(m.group(2)), m.group(3)
        lines = open('src/' + f, encoding='latin1').read().split('\n')
        ctx = text[max(0, m.start()-60):m.start()].replace('\n', ' ')
        print('%-14s ...%s' % (m.group(0), ctx[-60:]))
        print('    %d: %s' % (a, lines[a-1].strip()[:90]))
        if b:
            print('    %s: %s' % (b, lines[int(b)-1].strip()[:90]))
