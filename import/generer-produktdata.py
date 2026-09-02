#!/usr/bin/env python3
"""
Genererer produktdata.js + import/bilder-manifest.json fra adSystem-feeden.

  python3 import/generer-produktdata.py

Inndata:
  import/adsystem-feed.xml   – feeden (https://adsystem.pl/xml/price-wars), RSS 2.0, ett <o> per SKU
  import/wp-til-feed.json    – mapping WordPress-produkt-id -> item_group_id (produktfamilie) i feeden
  import/beskrivelser-no.json – norske beskrivelser per item_group_id (oversatt fra feedens <desc>)
  produktdata.js (eksisterende) – brukes som fallback for norsk beskrivelse der beskrivelser-no.json mangler

Utdata:
  produktdata.js             – window.PRODUKTDATA = { "<wp-id>": {...} }
  import/bilder-manifest.json – bilder som GitHub-workflowen «Hent adSystem-bilder» laster ned til bilder/adsystem/

Felter per produkt (nøkkel = WordPress-id som streng):
  g     item_group_id i feeden
  pt    product_type fra feeden («Hovedgruppe > Undergruppe», engelsk)
  d     norsk beskrivelse (avsnitt skilt med blank linje)
  s     størrelser, f.eks. ["240×230","300×230"] (cm)
  wmin/wmax  vekt-spenn i kg (null hvis ukjent)
  v     antall varianter (uten rene «Print»-SKU-er)
  ean   første EAN i familien
  imgs  lokale bildestier under bilder/ (første = hovedbilde)
  acc   tilbehør [{n: norsk navn, img: lokal sti|null, id: wp-id hvis tilbehøret finnes som eget produkt}]
  ds    true hvis familien finnes dobbeltsidig
  ss    true hvis familien finnes enkeltsidig
  wp    true hvis familien har «without print»-varianter (kan kjøpes uten trykk)
"""
import json, re, html, os, sys, hashlib
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMP = os.path.join(ROOT, 'import')
MAX_IMGS = 8
MAX_ACC = 8

feed = ET.parse(os.path.join(IMP, 'adsystem-feed.xml')).getroot()
skus = feed.findall('.//o')
fam = {}
for o in skus:
    fam.setdefault(o.attrib['item_group_id'], []).append(o)

mapping = json.load(open(os.path.join(IMP, 'wp-til-feed.json')))
try:
    desc_no = json.load(open(os.path.join(IMP, 'beskrivelser-no.json')))
except FileNotFoundError:
    desc_no = {}
try:
    acc_no = json.load(open(os.path.join(IMP, 'tilbehor-no.json')))  # engelsk navn -> [norsk navn, wp-id|null]
except FileNotFoundError:
    acc_no = {}

# eksisterende produktdata.js som fallback for norske beskrivelser
old = {}
p_old = os.path.join(ROOT, 'produktdata.js')
if os.path.exists(p_old):
    src = open(p_old, encoding='utf-8').read()
    m = re.search(r'window\.PRODUKTDATA\s*=\s*(\{.*\});?\s*$', src, re.S)
    if m:
        old = json.loads(m.group(1))

# PRODS fra butikk.html (for navn + rekkefølge)
src = open(os.path.join(ROOT, 'butikk.html'), encoding='utf-8').read()
prods = json.loads(re.search(r'const PRODS\s*=\s*(\[.*?\]);', src, re.S).group(1))

def is_print_sku(name):
    n = name.lower()
    return bool(re.match(r'^\s*(print|wydruk|stampa|druck)\b', n)) or 'set of prints' in n

def sizes_from(names):
    out = []
    for n in names:
        for a, b in re.findall(r'(\d{2,4})\s*[x×]\s*(\d{2,4})', n):
            a, b = int(a), int(b)
            if a < 10 or b < 10:
                continue
            key = f'{a}×{b}'
            if key not in out:
                out.append(key)
    # sorter på areal
    out.sort(key=lambda s: tuple(int(x) for x in s.split('×')))
    return out

def widths_from(names):
    """Familier som bare oppgir bredde i navnet (f.eks. «adWall Vario straight Light 240»)."""
    out = set()
    for n in names:
        for w in re.findall(r'(?<![\d×x])(\d{2,3})(?![\d×x])', n):
            w = int(w)
            if 40 <= w <= 800:
                out.add(w)
    return [f'{w}' for w in sorted(out)] if len(out) > 1 else []

def img_local(url, folder):
    h = hashlib.sha1(url.split('&v=')[0].encode()).hexdigest()[:12]
    return f'adsystem/{folder}/{h}.webp'

manifest = {}
data = {}

for p in prods:
    wp = str(p[0])
    g = mapping.get(wp)
    if not g or g not in fam:
        if wp in old:
            data[wp] = old[wp]
        continue
    f = fam[g]
    names = [o.findtext('name') or '' for o in f]
    real = [o for o in f if not is_print_sku(o.findtext('name') or '')] or f
    pt = max(set(o.findtext('product_type') or '' for o in f), key=lambda t: sum(1 for o in f if o.findtext('product_type') == t))
    weights = [float(o.attrib.get('weight') or 0) for o in real if float(o.attrib.get('weight') or 0) > 0]
    ean = next((a.text.strip() for o in f for a in o.findall('attrs/a') if a.attrib.get('name') == 'EAN' and (a.text or '').strip()), '')
    # bilder: hovedbilde fra første ekte SKU først, deretter resten
    urls = []
    for o in real + [o for o in f if o not in real]:
        mn = o.find('imgs/main')
        if mn is not None and mn.attrib.get('url') and mn.attrib['url'] not in urls:
            urls.append(mn.attrib['url'])
        for i in o.findall('imgs/i'):
            u = i.attrib.get('url')
            if u and u not in urls:
                urls.append(u)
    urls = urls[:MAX_IMGS]
    imgs = []
    for u in urls:
        loc = img_local(u, g)
        manifest[loc] = u
        imgs.append(loc)
    # tilbehør
    acc = []
    seen = set()
    for o in f:
        for a in o.findall('accessories/acc'):
            n = html.unescape(a.attrib.get('name') or '').strip()
            if not n or n.lower() in seen:
                continue
            seen.add(n.lower())
            u = html.unescape(a.attrib.get('img') or '')
            loc = None
            if u:
                loc = img_local(u, 'acc')
                manifest[loc] = u
            tr = acc_no.get(n) or [n, None]
            item = {'n': tr[0], 'img': loc}
            if tr[1]:
                item['id'] = tr[1]
            acc.append(item)
            if len(acc) >= MAX_ACC:
                break
        if len(acc) >= MAX_ACC:
            break
    joined = ' '.join(names).lower()
    ds = bool(re.search(r'double[\s-]?sided|dwustronn', joined))
    ss = bool(re.search(r'single[\s-]?sided|singlesided|jednostronn', joined))
    wpr = bool(re.search(r'without print|bez wydruku', joined))
    d = desc_no.get(g) or (old.get(wp) or {}).get('d') or ''
    data[wp] = {
        'g': g, 'pt': pt, 'd': d,
        's': (sizes_from(n for n in names if not is_print_sku(n)) or sizes_from(names)
              or (old.get(wp) or {}).get('s') or widths_from(n for n in names if not is_print_sku(n))),
        'wmin': min(weights) if weights else None,
        'wmax': max(weights) if weights else None,
        'v': len(real), 'ean': ean,
        'imgs': imgs, 'acc': acc, 'ds': ds, 'ss': ss, 'wp': wpr,
    }

hdr = ('// Produktdata fra adSystem XML-feed (adsystem.pl/xml/price-wars).\n'
       '// GENERERT av import/generer-produktdata.py - ikke rediger for haand. Norske tekster: import/beskrivelser-no.json\n')
with open(os.path.join(ROOT, 'produktdata.js'), 'w', encoding='utf-8') as fh:
    fh.write(hdr + 'window.PRODUKTDATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
with open(os.path.join(IMP, 'bilder-manifest.json'), 'w', encoding='utf-8') as fh:
    json.dump(dict(sorted(manifest.items())), fh, indent=0)

n_desc = sum(1 for v in data.values() if v.get('d'))
print(f'produkter: {len(data)} (fra feed: {sum(1 for v in data.values() if v.get("g"))}), med norsk beskrivelse: {n_desc}, bilder i manifest: {len(manifest)}')
