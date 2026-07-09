#!/bin/bash
# Laster ned alle bilder fra beta-siten til assets/img/ og skriver om HTML-filene
# Kjør: bash hent-bilder.sh
set -e
mkdir -p assets/img
BASE="https://beta.moonlandingsite.no/messeprofil/wp-content/uploads/2026/04"
FILES="Logo.png Logo-1.png footer-logo.png Messepakke-og-stands_img-300x241.webp Klassisk_messeutstyr_img-300x241.webp Utendors-profilering_img-300x241.webp Lyskasser_img-300x241.webp Messevegger-Tekstil_img-300x241.webp Utstillingsbord-og-disker_1st_product-img-300x240.webp Camilla-Nilsen_img.png Anders_Pedersen_img.png blog_post-img.webp Hvordan_img.webp fire-eater-img.svg forbundet-img.svg norwegian-img.svg golf-img.svg novs-img.svg sport-img.svg ecit-img.svg"
for f in $FILES; do
  curl -sSfL "$BASE/$f" -o "assets/img/$f" && echo "OK  $f" || echo "FEIL $f"
done
# Pek HTML-filene på lokale bilder
for h in index.html butikk.html produkt.html; do
  sed -i.bak "s|$BASE/|assets/img/|g" "$h"
done
rm -f *.bak
echo "Ferdig – bildene ligger i assets/img/ og HTML peker lokalt."
