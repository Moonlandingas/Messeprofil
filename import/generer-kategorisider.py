#!/usr/bin/env python3
"""
Regenererer produktlistene på kategorisidene (messevegger/, messestand/ …) fra produktgrupper.js + produktdata.js.

  python3 import/generer-kategorisider.py

Bytter bare ut <div class="pgrid">…</div>, antall i toolbar, «Se alle»-lenken, «Filtrer i nettbutikken»-lenken
og ItemList i JSON-LD. Alt annet på sidene (H1, ingress, SEO-tekst, FAQ) beholdes.
"""
import json, re, os, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pg = open(os.path.join(ROOT, 'produktgrupper.js'), encoding='utf-8').read()
GR = json.loads(re.search(r'GRUPPER = (\[.*?\]);', pg, re.S).group(1))
PG = json.loads(re.search(r'PRODUKTGRUPPE = (\{.*?\});', pg, re.S).group(1))
PD = json.loads(re.search(r'= (\{.*\});', open(os.path.join(ROOT, 'produktdata.js'), encoding='utf-8').read(), re.S).group(1))
src = open(os.path.join(ROOT, 'butikk.html'), encoding='utf-8').read()
PRODS = json.loads(re.search(r'const PRODS\s*=\s*(\[.*?\]);', src, re.S).group(1))

# mappe → liste av (gruppe, undergruppe|None)
SIDER = {
    'messevegger': [('messevegger', None), ('spesialformer', None)],
    'messestand': [('messestander', None), ('standpakker-event', None), ('skjermer', None)],
    'lyskasser-og-tekstilrammer': [('lyskasser', None), ('tekstilrammer', None)],
    'messebord-og-disker': [('messedisker', None)],
    'tilbehor': [('tilbehor', None)],
    'messemobler': [('messestander', 'messemobler'), ('utendors', 'utemobler'), ('utendors', 'fluktstoler')],
    'utendors-og-telt': [('utendors', None)],
    'brosjyrestativ-og-skilt': [('tilbehor', 'brosjyrestativ'), ('utendors', 'gatebukker')],
    'rollups': [('rollups', None)],
}
grp = {g['s']: g for g in GR}
gidx = {g['s']: i for i, g in enumerate(GR)}

def unit(s):
    return ' m' if all(int(x) < 20 for x in s.split('×') if x.isdigit()) else ' cm'

def kort(p):
    wp = str(p[0]); d = PD.get(wp, {})
    navn = p[1]
    img = p[3]
    s = d.get('s') or []
    var = ''
    if s:
        var = ', '.join(s[:4]) + (' …' if len(s) > 4 else '') + unit(s[0])
    elif p[4] > 1:
        var = f'{p[4]} varianter/størrelser'
    pgv = PG.get(wp, ['', '', 0]); U = grp.get(pgv[0]); u = U and next((x for x in U['u'] if x['s'] == pgv[1]), None)
    return ('<article class="pcard"><a class="im" href="../produkt.html?id=%s"><img loading="lazy" src="../bilder/%s" alt="%s"></a>'
            '<div class="bd"><span class="cat">%s</span><h3><a href="../produkt.html?id=%s">%s</a></h3>%s'
            '<a class="go" href="../produkt.html?id=%s">Se produkt <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div></article>'
            % (wp, img, navn.replace('"', '&quot;'), (u['n'] if u else (U['n'] if U else '')), wp, navn, ('<span class="var">%s</span>' % var) if var else '', wp))

for mappe, valg in SIDER.items():
    fil = os.path.join(ROOT, mappe, 'index.html')
    s = open(fil, encoding='utf-8').read()
    prods = []
    for p in PRODS:
        v = PG.get(str(p[0]))
        if not v: continue
        for g, u in valg:
            if v[0] == g and (u is None or v[1] == u):
                prods.append(p); break
    prods.sort(key=lambda p: (gidx.get(PG[str(p[0])][0], 99), PG[str(p[0])][2]))
    n = len(prods)
    g0 = valg[0][0]; u0 = valg[0][1]
    lenke = '../butikk.html?g=' + g0 + ('&u=' + u0 if u0 else '')
    # undergruppe-chips (kun når hele grupper vises)
    chips = ''
    if all(u is None for _, u in valg):
        deler = []
        for g, _ in valg:
            for u in grp[g]['u']:
                if u['antall']: deler.append('<a class="chip" href="../butikk.html?g=%s&u=%s">%s <span style="opacity:.6">%d</span></a>' % (g, u['s'], u['n'], u['antall']))
        if deler: chips = '<div class="chips" style="margin:0 0 22px">' + ''.join(deler) + '</div>\n    '
    grid = '<div class="pgrid">\n      ' + ''.join(kort(p) for p in prods) + '\n    </div>'
    # finn balansert slutt på pgrid-diven
    a = s.index('<div class="pgrid">'); i = a + len('<div class="pgrid">'); depth = 1
    while depth:
        m = re.compile(r'<div\b|</div>').search(s, i)
        depth += 1 if m.group(0) != '</div>' else -1
        i = m.end()
    s = s[:a] + grid + s[i:]; k1 = 1
    s, k2 = re.subn(r'<span class="toolbar-count"><strong>\d+</strong> produkter i denne kategorien</span>', '<span class="toolbar-count"><strong>%d</strong> produkter i denne kategorien</span>' % n, s)
    s, k3 = re.subn(r'href="\.\./butikk\.html\?kat=[^"]*"', 'href="%s"' % lenke, s)
    s, k4 = re.subn(r'Se alle \d+ produktene i nettbutikken', 'Se alle %d produktene i nettbutikken' % n, s)
    # chips rett før pgrid (fjern ev. gamle)
    s = re.sub(r'<div class="chips" style="margin:0 0 22px">(?:(?!</div>).)*</div>\n    ', '', s, flags=re.S)
    s = s.replace('<div class="pgrid">', chips + '<div class="pgrid">', 1)
    # JSON-LD ItemList
    items = ', '.join('{"@type": "ListItem", "position": %d, "name": %s, "url": "https://www.messeprofil.no/produkt.html?id=%s"}' % (i + 1, json.dumps(html.unescape(p[1]), ensure_ascii=False), p[0]) for i, p in enumerate(prods))
    s, k5 = re.subn(r'"numberOfItems": \d+, "itemListElement": \[.*?\]\}', '"numberOfItems": %d, "itemListElement": [%s]}' % (n, items), s, count=1, flags=re.S)
    open(fil, 'w', encoding='utf-8').write(s)
    print(f'{mappe}: {n} produkter (grid {k1}, count {k2}, lenker {k3}, seall {k4}, jsonld {k5})')
