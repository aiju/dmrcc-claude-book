#!/usr/bin/env python3
"""Build RK05 disk images from the Ken Wellsch V6 distribution tape.

Download the tape first:
  curl -L -o v6.tap.bz2 'https://sourceforge.net/projects/bsd42/files/Install%20tapes/Research%20Unix/Unix-v6-Ken-Wellsch.tap.bz2/download'
  bzip2 -d v6.tap.bz2
The tape is a bootstrap followed by dd-style images of rk0 (root),
rk1 (/usr/source) and rk2 (/usr/doc), 4000 blocks each.
"""
import struct

d = open('v6.tap', 'rb').read()
i, recs = 0, []
while i < len(d):
    n, = struct.unpack('<I', d[i:i+4]); i += 4
    if n in (0, 0xffffffff):
        continue
    L = n & 0xffffff
    recs.append(d[i:i+L]); i += L + (L & 1) + 4

def img(start, name):
    b = b''.join(r.ljust(512, b'\0') for r in recs[start:start+4000])
    open(name, 'wb').write(b.ljust(4872*512, b'\0'))

img(100, 'rk0.dsk'); img(4100, 'rk1.dsk'); img(8100, 'rk2.dsk')
