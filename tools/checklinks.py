#!/usr/bin/env python3
"""Check that every relative link in docs/ points at an existing file
and, if it has a fragment, at an existing id in that file."""
import os, re, sys
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs')
ids, bad = {}, 0
def idsof(path):
    if path not in ids:
        ids[path] = set(re.findall(r'id="([^"]+)"', open(path).read()))
    return ids[path]
for dp, _, fs in os.walk(ROOT):
    for f in fs:
        if not f.endswith('.html'):
            continue
        p = os.path.join(dp, f)
        for href in re.findall(r'href="([^"]+)"', open(p).read()):
            if re.match(r'^(https?:|mailto:|#$)', href):
                continue
            path, _, frag = href.partition('#')
            target = os.path.normpath(os.path.join(dp, path)) if path else p
            if not os.path.exists(target):
                print('missing file:', os.path.relpath(p, ROOT), href); bad += 1
            elif frag and target.endswith('.html') and frag not in idsof(target):
                print('missing id:', os.path.relpath(p, ROOT), href); bad += 1
print(bad, 'problems')
