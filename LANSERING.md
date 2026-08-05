# Lanseringssjekkliste – messeprofil.no (SEO/GEO/indeksering)

Alt on-page er allerede klart i denne koden: titler, meta-beskrivelser, canonical-lenker
(peker på www.messeprofil.no), Open Graph, LocalBusiness/Organization-schema, FAQPage-schema,
llms.txt og sitemap.xml. Det eneste som holder søkemotorer og AI ute i dag er robots.txt.

## Ved lansering (i rekkefølge)

1. **Pek www.messeprofil.no mot den nye siden** (DNS/hosting – samme FTP-oppsett som stage).
2. **Bytt robots.txt**: slett dagens `robots.txt` (Disallow: /) og gi `robots-prod.txt` navnet
   `robots.txt`. Dette åpner for Google, Bing og AI-crawlere (GPTBot, ClaudeBot, PerplexityBot m.fl.).
3. **Google Search Console**: legg til www.messeprofil.no som property (om den ikke finnes),
   send inn `https://www.messeprofil.no/sitemap.xml`, og be om indeksering av forsiden og
   butikk.html («URL-inspeksjon» → «Be om indeksering»).
4. **Bing Webmaster Tools**: samme – importer gjerne rett fra Search Console.
5. **301-redirects fra gamle WordPress-URLer**: gamle produkt-/kategorisider (f.eks.
   /produkt/..., /produktkategori/...) må videresendes til butikk.html, ellers mister dere
   opparbeidet SEO-verdi og besøkende møter 404. Lag redirectliste fra Search Console
   («Sider» → indekserte URLer) eller gammel sitemap.
6. **Stage etter lansering**: la stage.messeprofil.no beholde `Disallow: /` slik at den aldri
   konkurrerer med hovedsiden i søk.

## Etter lansering (fortløpende)

- SEO/GEO-tekstene (meta, alt-tekster, seksjonen «Alt av messeutstyr…» på butikk.html og
  llms.txt) kan finpusses løpende – de ligger som vanlig HTML/tekst i repoet.
- Følg med i Search Console etter 1–2 uker: indekserte sider, søkeord, klikk.
- FAQ-siden og llms.txt er det AI-motorer siterer mest – hold fakta der oppdatert
  (priser, leveringstid, garanti).
- Vurder å legge nye Pinterest-boards inn i inspirasjonsseksjonen (husk: board-slug uten ø).
