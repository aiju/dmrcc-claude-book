#!/usr/bin/env python3
"""Drive a simulated PDP-11 running Sixth Edition Unix.

    from v6 import V6
    with V6() as u:
        u.put('x.c', source)
        print(u.run('cc -S x.c; cat x.s'))

Requires simh's `pdp11` and the disk images made by mkdisks.py.
Disks are copied to a scratch directory so every session starts clean.
"""
import os, re, shutil, sys, tempfile
import pexpect

HERE = os.path.dirname(os.path.abspath(__file__))

def ttyquote(s):
    # V6's tty driver treats # as erase and @ as kill; a backslash escapes them
    # (and is otherwise passed through literally).
    return s.replace('#', '\\#').replace('@', '\\@')

class V6:
    def __init__(self, verbose=False):
        self.dir = tempfile.mkdtemp(prefix='v6-')
        for f in ('rk0.dsk', 'rk1.dsk', 'rk2.dsk', 'boot.ini'):
            shutil.copy(os.path.join(HERE, f), self.dir)
        self.p = pexpect.spawn('pdp11 boot.ini', cwd=self.dir,
                               encoding='latin1', timeout=120)
        if verbose:
            self.p.logfile_read = sys.stderr
        self.p.expect('@'); self.p.send('rkunix\r')
        self.p.expect('login:'); self.p.send('root\r')
        self.p.expect('# ')
        self.p.send('stty -echo tabs\r')
        self.sync()

    def __enter__(self): return self
    def __exit__(self, *a): self.close()

    def run(self, cmd):
        self.p.send(ttyquote(cmd) + '\r')
        return self.sync()

    def sync(self):
        # With echo off the shell prompt runs into the output, so wait
        # for a sentinel instead.
        self.p.send('echo ZZEND\r')
        self.p.expect('ZZEND\r?\n# ')
        out = self.p.before.replace('\r\n', '\n').replace('\r', '')
        out = re.sub(r'^# ', '', out)
        return out.replace('\n# ', '\n')

    def put(self, name, text):
        self.p.send('cat >' + name + '\r')
        for line in text.split('\n'):
            self.p.send(ttyquote(line) + '\r')
        self.p.sendcontrol('d')
        self.sync()

    def close(self):
        try:
            self.p.sendcontrol('e'); self.p.expect('sim>'); self.p.send('q\r')
            self.p.expect(pexpect.EOF)
        except Exception:
            pass
        shutil.rmtree(self.dir, ignore_errors=True)
