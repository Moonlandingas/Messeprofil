#!/usr/bin/env python3
"""
Velger hovedbilde per produkt: første bilde som viser produktet MED trykk/design
(ikke bare stativ, ramme eller mekanikk). Christians ønske 22.11.2026.

Leser:   produktdata.js (imgs), butikk.html (PRODS – miniatyrbildet p[3]), bilder/
Skriver: import/hovedbilde.json  {wp-id: {side, kort}}  – fasit som generer-produktdata.py følger
         (med --bruk) produktdata.js, butikk.html og produkt.html oppdateres

Regel: et bilde regnes som «med design» når en tydelig andel av produktet er farget flate
(adSystems demotrykk er alltid i sterk farge). Blant bildene med design velges det første
i leverandørens rekkefølge som er et rent produktbilde (lys bakgrunn, ikke nærbilde/miljø).
Har gjeldende hovedbilde allerede design, beholdes det urørt. Manuelle valg i
import/hovedbilde-manuelt.json overstyrer alltid ({wp-id: bildesti}, eller null = ikke rør;
«_behold_miniatyr»: [wp-id] = bytt bare på produktsiden).
"""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMP = os.path.join(ROOT, 'import')
B = os.path.join(ROOT, 'bilder')
MIN_FARGE = 0.02      # minst 2 % av bildet er farget flate …
MIN_ANDEL = 0.20      # … og minst 20 % av selve produktet (resten av bildet er lys bakgrunn)
MAKS_KANT = 0.04      # rent produktbilde: høyst 4 % av bildekanten er dekket
MIN_MILJO = 0.60      # miljøbilde: minst 60 % av kanten dekket. Alt imellom er utsnitt/nærbilder og velges aldri

def har_design(m):
    return bool(m) and m[0] >= MIN_FARGE and m[0] / max(m[2], 1e-6) >= MIN_ANDEL

def maal(sti):
    """-> (fargeandel, kantdekning, objektandel) eller None"""
    try:
        im = Image.open(os.path.join(B, sti)).convert('RGBA')
    except Exception:
        return None
    im.thumbnail((160, 160))
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    px = bg.convert('HSV'); w, h = px.size
    d = list(px.get_flattened_data()) if hasattr(px, 'get_flattened_data') else list(px.getdata())
    farge = [s > 80 and v > 70 for (_, s, v) in d]          # mettet farge
    obj = [not (v > 215 and s < 30) for (_, s, v) in d]     # ikke lys/nøytral bakgrunn
    n = w * h
    r = max(2, int(min(w, h) * 0.03))
    kant = [obj[y * w + x] for y in range(h) for x in range(w) if x < r or y < r or x >= w - r or y >= h - r]
    return sum(farge) / n, sum(kant) / max(1, len(kant)), sum(obj) / n

def les_js(fil, pat):
    s = open(os.path.join(ROOT, fil), encoding='utf-8').read()
    m = re.search(pat, s, re.S)
    return s, m

def main():
    bruk = '--bruk' in sys.argv
    pds, pm = les_js('produktdata.js', r'window\.PRODUKTDATA = (\{.*\});')
    PD = json.loads(pm.group(1))
    bs, bm = les_js('butikk.html', r'const PRODS\s*=\s*(\[.*?\]);')
    PRODS = json.loads(bm.group(1))
    try:
        manuelt = json.load(open(os.path.join(IMP, 'hovedbilde-manuelt.json')))
    except FileNotFoundError:
        manuelt = {}
    behold_kort = set(manuelt.pop('_behold_miniatyr', []))   # produkter der miniatyren i butikken ikke skal byttes
    valg, logg = {}, []
    for p in PRODS:
        wp = str(p[0]); d = PD.get(wp, {})
        naa_side = (d.get('imgs') or [None])[0]       # hovedbilde på produktsiden
        naa_kort = p[3]                                # miniatyr i butikken
        kand = []
        for s in (d.get('imgs') or []) + [naa_kort]:
            if s and s not in kand and os.path.exists(os.path.join(B, s)):
                kand.append(s)
        if not kand:
            continue
        if wp in manuelt:
            ny, hvorfor = manuelt[wp] or naa_side or kand[0], 'manuelt'
        else:
            m = {s: maal(s) for s in kand}
            m = {s: v for s, v in m.items() if v}
            design = [s for s in kand if s in m and har_design(m[s])]
            rene = [s for s in design if m[s][1] <= MAKS_KANT]
            gjeld = naa_side if naa_side in m else kand[0]
            if gjeld in design:
                ny, hvorfor = gjeld, 'beholdt'
            elif rene:
                ny, hvorfor = rene[0], 'byttet: første rene bilde med design'
            elif [s for s in design if m[s][1] >= MIN_MILJO]:
                ny, hvorfor = [s for s in design if m[s][1] >= MIN_MILJO][0], 'byttet: miljøbilde med design'
            else:
                ny, hvorfor = gjeld, 'ingen bilder med design'
        # miniatyren i butikken beholdes når den allerede viser design; ellers samme bilde som produktsiden
        mk = maal(naa_kort) if naa_kort and os.path.exists(os.path.join(B, naa_kort)) else None
        ny_ok = wp in manuelt or har_design(maal(ny))
        kort = naa_kort if (har_design(mk) and wp not in manuelt) or not ny_ok else ny
        if wp in manuelt and manuelt[wp] is None:
            kort = naa_kort
        if wp in behold_kort:
            kort = naa_kort
        valg[wp] = {'side': ny, 'kort': kort}
        logg.append((wp, p[1], naa_side, naa_kort, ny, hvorfor, kort))
    json.dump(valg, open(os.path.join(IMP, 'hovedbilde.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)
    json.dump(logg, open(os.path.join(IMP, 'hovedbilde-logg.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    n_side = sum(1 for l in logg if l[2] and l[2] != l[4]); n_kort = sum(1 for l in logg if l[3] != l[6])
    print(f'produkter: {len(logg)}, nytt hovedbilde på produktsiden: {n_side}, nytt miniatyrbilde i butikken: {n_kort}, uten designbilde: {sum(1 for l in logg if l[5].startswith("ingen"))}')
    if not bruk:
        return
    for wp, v in valg.items():
        ny = v['side']
        d = PD.get(wp)
        if d and d.get('imgs') and ny in d['imgs']:
            d['imgs'] = [ny] + [x for x in d['imgs'] if x != ny]
        elif d is not None and ny:
            d['imgs'] = [ny] + (d.get('imgs') or [])
    for p in PRODS:
        if str(p[0]) in valg:
            p[3] = valg[str(p[0])]['kort']
    open(os.path.join(ROOT, 'produktdata.js'), 'w', encoding='utf-8').write(pds[:pm.start(1)] + json.dumps(PD, ensure_ascii=False, separators=(',', ':')) + pds[pm.end(1):])
    ny_prods = json.dumps(PRODS, ensure_ascii=False, separators=(',', ':'))
    for fil in ('butikk.html', 'produkt.html'):
        s, m = les_js(fil, r'const PRODS\s*=\s*(\[.*?\]);')
        open(os.path.join(ROOT, fil), 'w', encoding='utf-8').write(s[:m.start(1)] + ny_prods + s[m.end(1):])
    print('skrevet: produktdata.js, butikk.html, produkt.html')

if __name__ == '__main__':
    main()
