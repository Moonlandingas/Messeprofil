#!/usr/bin/env python3
"""
Genererer produktgrupper.js – adSystems struktur og produktrekkefølge for butikk.html.

  python3 import/generer-grupper.py

Inndata: import/grupper.json (struktur + norske navn), produktdata.js (product_type per produkt),
         butikk.html (PRODS), import/adsystem-struktur/kategorier.json (rekkefølge fra adsystem.pl/en),
         import/adsystem-feed.xml (SKU-url → familie)
Utdata:  produktgrupper.js:
           window.GRUPPER = [{s, n, en, tekst, img, u:[{s,n,en}]}]
           window.PRODUKTGRUPPE = {"<wp-id>": [gruppe-slug, undergruppe-slug, sortnr]}
"""
import json, re, os, html
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMP = os.path.join(ROOT, 'import')
G = json.load(open(os.path.join(IMP, 'grupper.json')))
pd = json.loads(re.search(r'= (\{.*\});', open(os.path.join(ROOT, 'produktdata.js'), encoding='utf-8').read(), re.S).group(1))
src = open(os.path.join(ROOT, 'butikk.html'), encoding='utf-8').read()
prods = json.loads(re.search(r'const PRODS\s*=\s*(\[.*?\]);', src, re.S).group(1))
kat = json.load(open(os.path.join(IMP, 'adsystem-struktur', 'kategorier.json')))
feed = ET.parse(os.path.join(IMP, 'adsystem-feed.xml')).getroot()
url2g = {}
for o in feed.findall('.//o'):
    url2g.setdefault(o.attrib.get('url', '').strip('/'), o.attrib['item_group_id'])

en2gu = {}
for g in G['grupper']:
    for u in g['u']:
        en2gu[(g['en'], u['en'])] = (g['s'], u['s'])
grp_by_en = {g['en']: g for g in G['grupper']}
# adSystem-rekkefølge: familie -> posisjon i hovedkategorien
pos = {}
for g in G['grupper']:
    k = kat.get(g['slug'])
    if not k: continue
    i = 0
    for l in k['lenker']:
        fam = url2g.get(l['href'][4:])
        if fam and (g['s'], fam) not in pos:
            pos[(g['s'], fam)] = i; i += 1

out = {}
for p in prods:
    wp = str(p[0]); d = pd.get(wp) or {}
    pt = d.get('pt', '')
    gu = None
    if pt and ' > ' in pt:
        gen, uen = pt.split(' > ', 1)
        gu = en2gu.get((gen, uen))
        if not gu and gen in grp_by_en:
            # undergruppe ikke i lista (f.eks. adFloor) – legg i første undergruppe
            gu = (grp_by_en[gen]['s'], grp_by_en[gen]['u'][0]['s'])
    if not gu:
        c = str(p[2][0]) if p[2] else '4'
        gu = tuple(G['cats'].get(c, ['tilbehor', 'tilbehor-belysning']))
    if wp in G.get('overstyr', {}):
        gu = tuple(G['overstyr'][wp])
    fam = d.get('g')
    # undergruppe-overstyring fra adSystems undergruppesider (adslug)
    if fam:
        for g in G['grupper']:
            if g['s'] != gu[0]: continue
            for u in g['u']:
                k = kat.get(u.get('adslug', ''))
                if k and any(url2g.get(l['href'][4:]) == fam for l in k['lenker']):
                    gu = (g['s'], u['s'])
    sort = pos.get((gu[0], fam), 9000)
    out[wp] = [gu[0], gu[1], sort]

# stabil sekundær rekkefølge = feed-rekkefølge (PRODS-rekkefølge)
seen = {}
for i, p in enumerate(prods):
    wp = str(p[0]); out[wp][2] = out[wp][2] * 1000 + i

grupper = []
for g in G['grupper']:
    img = ''
    for cand in (pd.get(str(g.get('bilde'))) or {}).get('imgs', []):
        if os.path.exists(os.path.join(ROOT, 'bilder', cand)):
            img = cand; break
    n = sum(1 for v in out.values() if v[0] == g['s'])
    grupper.append({'s': g['s'], 'n': g['n'], 'en': g['en'], 'tekst': g.get('tekst', ''), 'img': img, 'antall': n,
                    'u': [{'s': u['s'], 'n': u['n'], 'en': u['en'], 'antall': sum(1 for v in out.values() if v[0] == g['s'] and v[1] == u['s'])} for u in g['u']]})

hdr = '// Produktgrupper etter adSystems struktur (adsystem.pl/en). GENERERT av import/generer-grupper.py – rediger import/grupper.json.\n'
with open(os.path.join(ROOT, 'produktgrupper.js'), 'w', encoding='utf-8') as fh:
    fh.write(hdr + 'window.GRUPPER = ' + json.dumps(grupper, ensure_ascii=False, separators=(',', ':')) + ';\n')
    fh.write('window.PRODUKTGRUPPE = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('grupper:', [(g['n'], g['antall']) for g in grupper])
print('med adSystem-posisjon:', sum(1 for v in out.values() if v[2] < 9000 * 1000), 'av', len(out))
