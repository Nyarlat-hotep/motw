#!/usr/bin/env python3
"""Re-embed data/*.json into index.html (the `var PBDATA = ...;` line).
Run after editing any playbook JSON:  python3 tools/embed_data.py"""
import json, os, re
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ORDER = ['chosen','crooked','divine','expert','flake','initiate','monstrous','mundane','professional','spellslinger','spooky','wronged']
data = [json.load(open(os.path.join(root, 'data', i + '.json'), encoding='utf-8')) for i in ORDER]
blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
path = os.path.join(root, 'index.html')
html = open(path, encoding='utf-8', newline='').read()
new, n = re.subn(r'^var PBDATA = .*;$', lambda m: 'var PBDATA = ' + blob + ';', html, count=1, flags=re.M)
assert n == 1, 'PBDATA line not found'
open(path, 'w', encoding='utf-8', newline='').write(new)   # newline='' keeps the page's line endings as they are on every system
print('embedded', len(data), 'playbooks,', len(blob), 'chars')
