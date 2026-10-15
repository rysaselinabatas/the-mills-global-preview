#!/usr/bin/env python3
"""Writes docs/AUTOMATION-HANDOFF.md (a standalone brief for whoever builds the n8n and Zoho automations)."""
import os, re, json
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)
src = open('tools/build-n8n-lead-magnet.py').read().split("KINDS = [")[0]
g = {'__file__': os.path.abspath('tools/build-n8n-lead-magnet.py')}
exec(compile(src, 'tools/build-n8n-lead-magnet.py', 'exec'), g)
SERVICES, INDUSTRIES, G = g['SERVICES'], g['INDUSTRIES'], g['G']
drive = {k: v.split('id=')[1] for k, v in json.load(open('tools/drive_links.json')).items()}
HDR = ("| Name | Guide slug | Zoho field value | Checklist title | PDF file | Drive download | Email-series webhook path |\n"
       "|---|---|---|---|---|---|---|")


def rows(names, field):
    out = []
    for slug, name in names.items():
        d = drive.get(slug)
        dl = f"[link](https://drive.google.com/uc?export=download&id={d})" if d else 'n/a'
        out.append(f"| {name} | `{slug}` | {field} = {name} | {G[slug]['title']} | `{G[slug]['pdf'].split('/')[-1]}` | {dl} | `/webhook/mills-followup-{slug}` |")
    return '\n'.join(out)


TEMPLATE = open('tools/handoff-template.md').read()
md = TEMPLATE.replace('@@HDR@@', HDR).replace('@@SERVICES@@', rows(SERVICES, 'Service')).replace('@@INDUSTRIES@@', rows(INDUSTRIES, 'Industry_Segment'))
open('docs/AUTOMATION-HANDOFF.md', 'w').write(md)
print('written', len(md), 'chars')
