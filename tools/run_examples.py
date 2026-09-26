#!/usr/bin/env python3
"""Compile every examples/*.c with the real V6 compiler and save what it
produced in examples/out/:

  NAME.s      cc -S          (passes c0 and c1)
  NAME.O.s    cc -S -O       (c0, c1 and the optimizer c2)
  NAME.c2     statistics printed by c2 when given the "-" flag
  NAME.i      byte dump of c0's intermediate file (od -b of temp1)
  NAME.i2     byte dump of c0's string file (od -b of temp2)
  NAME.run    output of running the program, when it has a main
  NAME.err    diagnostics, when compiling produced any

    python3 tools/run_examples.py [NAME ...]
"""
import glob, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'v6'))
from v6 import V6

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EX = os.path.join(ROOT, 'examples')
OUT = os.path.join(EX, 'out')

def save(name, ext, text):
    path = os.path.join(OUT, name + ext)
    if text.strip():
        open(path, 'w').write(text if text.endswith('\n') else text + '\n')
    elif os.path.exists(path):
        os.remove(path)

def main(names):
    os.makedirs(OUT, exist_ok=True)
    files = sorted(glob.glob(os.path.join(EX, '*.c')))
    if names:
        files = [f for f in files if os.path.basename(f)[:-2] in names]
    with V6() as u:
        u.run('chdir /tmp')
        for path in files:
            name = os.path.basename(path)[:-2]
            text = open(path).read().rstrip('\n')
            u.put('x.c', text)
            err = u.run('cc -S x.c')
            save(name, '.err', err)
            save(name, '.s', u.run('cat x.s'))
            u.run('rm x.s')
            u.run('cc -S -O x.c')
            save(name, '.O.s', u.run('cat x.s'))
            u.run('/lib/c0 x.c t1 t2')
            save(name, '.i', u.run('od -b t1'))
            save(name, '.i2', u.run('od -b t2'))
            u.run('/lib/c1 t1 t2 x.s')
            save(name, '.c2', u.run('/lib/c2 - x.s y.s'))
            if 'main(' in text:
                u.run('cc x.c')
                save(name, '.run', u.run('a.out'))
            u.run('rm x.s y.s t1 t2 a.out')
            print(name, file=sys.stderr)

if __name__ == '__main__':
    main(sys.argv[1:])
