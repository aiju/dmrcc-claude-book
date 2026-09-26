#!/usr/bin/env python3
"""Run examples through the tracing c1 and save the annotated output in
examples/trace/NAME.trace.  Trees appear between \\002 and \\003:
  R tree   the tree as read from the intermediate file
  O tree   the tree after optim()
  M table op n   cexpr matched the n-th pattern of op in that table
    python3 tools/c1trace/trace.py NAME...
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'v6'))
from v6 import V6
from build_c1x import build

ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'examples', 'trace')

def main(names):
    os.makedirs(OUT, exist_ok=True)
    with V6() as u:
        build(u)
        for name in names:
            text = open(os.path.join(ROOT, 'examples', name + '.c')).read().rstrip('\n')
            u.put('x.c', text)
            u.run('/lib/c0 x.c t1 t2')
            u.run('./c1x t1 t2 x.s')
            out = u.run('cat x.s')
            open(os.path.join(OUT, name + '.trace'), 'w').write(out)
            print(name, file=sys.stderr)

if __name__ == '__main__':
    main(sys.argv[1:])
