#!/usr/bin/env python3
"""Build a tracing version of c1 on the simulated V6 system.

The V6 source in /usr/source/c is copied to /tmp/c1x, two one-line
changes are made with ed, dbg.c (from this directory) is added, and
c1 is rebuilt following the steps of the original "run" script.  The
result, /tmp/c1x/c1x, is used by trace.py.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'v6'))
from v6 import ttyquote

HERE = os.path.dirname(os.path.abspath(__file__))

def ed(u, fname, cmds):
    u.p.send('ed ' + fname + '\r')
    for c in cmds:
        u.p.send(ttyquote(c) + '\r')
    u.sync()

def build(u):
    u.run('/etc/mknod /dev/rk1 b 0 1')
    u.run('/etc/mount /dev/rk1 /usr/source')
    u.run('mkdir /tmp/c1x')
    u.run('chdir /tmp/c1x')
    # V6 cp takes exactly two arguments
    for f in ['c1h.c', 'c10.c', 'c11.c', 'c12.c', 'c13.c', 'c1t.s', 'table.s', 'cvopt.c']:
        u.run('cp /usr/source/c/%s %s' % (f, f))
    u.put('dbg.c', open(os.path.join(HERE, 'dbg.c')).read().rstrip('\n'))
    ed(u, 'c11.c', [r'/rcexpr(optim(\*--sp), efftab, 0);/s/optim/dbopt/p', 'w', 'q'])
    ed(u, 'c10.c', [r'/string = opt->tabstring;/a', '\tdbmatch(tree, opt);', '.', 'w', 'q'])
    log = []
    for cmd in ['cc -c c10.c c11.c c12.c c13.c dbg.c', 'as c1t.s', 'mv a.out c1t.o',
                'cc cvopt.c', 'a.out table.s table.i', 'as table.i', 'mv a.out table.o',
                'cc -n c1?.o dbg.o table.o', 'mv a.out c1x', 'ls -l c1x']:
        log.append('$ ' + cmd + '\n' + u.run(cmd))
    return '\n'.join(log)

if __name__ == '__main__':
    from v6 import V6
    with V6() as u:
        print(build(u))
