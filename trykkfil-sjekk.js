/* Trykkfil-sjekk («Check files») for produktsiden.
   Kunden velger en fil, og nettleseren sjekker den lokalt mot valgt produkt og størrelse:
   format, proporsjoner, oppløsning, målestokk, fargemodus og utfall.
   Fila lastes ALDRI opp – alt skjer i nettleseren. pdf.js hentes bare når en PDF sjekkes.
   Skjules automatisk for tilbehør (window.__erTilbehor), som leveres uten trykk. */
(function(){
  'use strict';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var MAIL = 'kundeservice@messeprofil.no';

  var css = ''+
  '.tf-tools{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}'+
  '.tf-btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;border-radius:999px;border:1.5px solid var(--grey-200,#EBDCDF);background:#fff;font:600 14px var(--font-body,Inter,sans-serif);color:var(--ink,#16161A);cursor:pointer;transition:border-color .15s,background .15s}'+
  '.tf-btn:hover{border-color:var(--ink,#16161A)}'+
  '.tf-btn svg{width:17px;height:17px}'+
  '.tf-btn.primary{background:var(--ink,#16161A);border-color:var(--ink,#16161A);color:#fff}'+
  '.tf-btn.primary:hover{background:#000}'+
  '.tf-dlg{margin:auto;inset:0;border:none;border-radius:18px;padding:0;width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 32px);box-shadow:0 24px 70px rgba(22,22,26,.28);color:var(--ink,#16161A)}'+
  '.tf-dlg::backdrop{background:rgba(22,22,26,.55)}'+
  '.tf-in{padding:26px 26px 22px;overflow:auto;max-height:calc(100vh - 32px)}'+
  '.tf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:6px}'+
  '.tf-head h2{font:800 22px var(--font-head,Manrope,sans-serif);letter-spacing:-.02em}'+
  '.tf-x{border:none;background:var(--grey-100,#F7EDEF);width:36px;height:36px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer;flex:none}'+
  '.tf-sub{color:var(--grey-500,#75676B);font-size:14px;margin-bottom:16px}'+
  '.tf-target{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;background:var(--grey-50,#FBF6F7);border:1px solid var(--grey-200,#EBDCDF);border-radius:12px;padding:12px 14px;font-size:14px;margin-bottom:14px}'+
  '.tf-target strong{font-weight:700}'+
  '.tf-target input{width:74px;height:36px;border:1.5px solid var(--grey-200,#EBDCDF);border-radius:8px;padding:0 8px;font:600 14px var(--font-body,Inter,sans-serif);text-align:center}'+
  '.tf-drop{display:block;border:2px dashed var(--grey-200,#EBDCDF);border-radius:14px;padding:26px 16px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s}'+
  '.tf-drop:hover,.tf-drop.over{border-color:var(--red,#D51D29);background:var(--red-soft,#F9E2E4)}'+
  '.tf-drop svg{display:block;width:34px;height:34px;color:var(--red,#D51D29);margin:0 auto 6px}'+
  '.tf-drop b{display:block;font:700 15px var(--font-head,Manrope,sans-serif)}'+
  '.tf-drop span{font-size:13px;color:var(--grey-500,#75676B)}'+
  '.tf-drop input{position:absolute;width:1px;height:1px;opacity:0}'+
  '.tf-priv{font-size:12.5px;color:var(--grey-500,#75676B);margin-top:8px;text-align:center}'+
  '.tf-res{margin-top:18px}'+
  '.tf-file{font:700 14px var(--font-head,Manrope,sans-serif);margin-bottom:10px;word-break:break-all}'+
  '.tf-row{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--grey-200,#EBDCDF);font-size:14px;line-height:1.5}'+
  '.tf-ic{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font:800 13px var(--font-head,Manrope,sans-serif);color:#fff}'+
  '.tf-ok .tf-ic{background:#1E7A46}.tf-warn .tf-ic{background:#C77700}.tf-bad .tf-ic{background:var(--red,#D51D29)}.tf-info .tf-ic{background:var(--grey-500,#75676B)}'+
  '.tf-row b{display:block;font-weight:700}'+
  '.tf-sum{margin-top:12px;padding:14px;border-radius:12px;font-size:14.5px;font-weight:600}'+
  '.tf-sum.ok{background:#E7F3EC;color:#14522F}.tf-sum.warn{background:#FFF3DF;color:#7A4A00}.tf-sum.bad{background:var(--red-soft,#F9E2E4);color:#8E101B}'+
  '.tf-tips{margin-top:16px;font-size:13.5px;color:#4C4245}'+
  '.tf-tips h3{font:700 14.5px var(--font-head,Manrope,sans-serif);color:var(--ink,#16161A);margin-bottom:6px}'+
  '.tf-tips ul{margin:0 0 0 18px}.tf-tips li{margin-bottom:4px}'+
  '.tf-act{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}'+
  '.tf-act .btn{height:44px;font-size:14px;padding:0 20px}'+
  '.tf-busy{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--grey-500,#75676B);padding:12px 0}'+
  '.tf-spin{width:18px;height:18px;border-radius:50%;border:2.5px solid var(--grey-200,#EBDCDF);border-top-color:var(--red,#D51D29);animation:tfspin .8s linear infinite}'+
  '@keyframes tfspin{to{transform:rotate(360deg)}}'+
  '@media (max-width:520px){.tf-in{padding:20px 16px 18px}.tf-act .btn{width:100%}}';

  var ICON_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/></svg>';
  var ICON_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>';
  var ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtMB(b){ return b > 1048576 ? (b/1048576).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(b/1024))+' kB'; }
  function n0(x){ return Math.round(x).toLocaleString('nb-NO'); }
  function n1(x){ return (Math.round(x*10)/10).toLocaleString('nb-NO'); }
  function n2(x){ return (Math.round(x*100)/100).toLocaleString('nb-NO'); }

  /* Produkttype fra feedens product_type – styrer tipsene */
  function produktType(){
    var id = new URLSearchParams(location.search).get('id');
    var PD = (window.PRODUKTDATA||{})[String(id)] || {};
    var pt = PD.pt || '', nm = (window.__prodName||'').toLowerCase();
    if(/Roll-up/.test(pt) || /roll-?up|adstand/.test(nm)) return 'rollup';
    if(/flag/i.test(pt) || /adflag/.test(nm)) return 'flagg';
    if(/tent/i.test(pt) || /adtent/.test(nm)) return 'telt';
    if(/Counters|Tribune/i.test(pt) || /adtribune|adbox|disk/.test(nm)) return 'disk';
    if(/Lightboxes|Backlit|LED|SEG/.test(pt) || /led|lumina|sego|seg\b|adframe/.test(nm)) return 'lys';
    return 'tekstil';
  }
  var TIPS = {
    tekstil: ['Hold tekst og logo minst 5 cm fra kantene – stoffet strekkes rundt rammen.','Unngå tynne linjer og liten tekst; flaten leses på avstand.','Bakgrunnsfargen bør gå helt ut i utfallet, så kantene blir rene.'],
    lys: ['Lyskasser trykkes på lysgjennomslippelig stoff – bruk mettede farger.','Store, mørke flater slipper gjennom mindre lys og kan se matte ut.','Hold tekst og logo minst 5 cm fra kantene, der silikonkanten sitter.'],
    rollup: ['Hold viktig innhold unna nederste del, der foten og kassetten sitter.','Logo og budskap bør ligge i øvre halvdel – der øynene havner.','Bruk store skrifter; en roll-up leses gjerne fra flere meters avstand.'],
    disk: ['Front og eventuell topp trykkes hver for seg – vi sender mal per flate.','Hold tekst unna buede kanter og skjøter.','Tenk på at disken sees ovenfra og fra siden, ikke bare forfra.'],
    flagg: ['Flagg har egen fasong – vi sender fasongmal med eksakte mål.','Hold logo og tekst unna stangsiden og ytterkanten.','Trykket blir speilvendt på baksiden; unngå tekst som må leses fra begge sider.'],
    telt: ['Hver flate (tak, vegger) trykkes separat – vi sender mal per side.','Hold logo unna sømmer og hjørner.','Takflatene sees ofte fra avstand – bruk store, enkle elementer.']
  };

  /* Valgt størrelse fra produktsiden -> [bredde_cm, høyde_cm] */
  function valgtStorrelse(){
    var b = document.querySelector('.options[aria-label="Velg størrelse"] .opt.active');
    var s = b ? (b.getAttribute('data-size')||b.textContent) : '';
    var m = s.replace(',', '.').match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*(m|cm)?/i);
    if(!m) return null;
    var w = parseFloat(m[1]), h = parseFloat(m[2]);
    var unit = (m[3]||'').toLowerCase();
    if(unit === 'm' || (!unit && w < 20 && h < 20)){ w *= 100; h *= 100; }
    return [w, h];
  }

  /* JPEG: finn SOF-markøren for antall fargekanaler (4 = CMYK) og bildets piksler */
  function jpegInfo(buf){
    var d = new DataView(buf), i = 2;
    if(d.getUint16(0) !== 0xFFD8) return null;
    var dpi = null;
    while(i + 9 < d.byteLength){
      if(d.getUint8(i) !== 0xFF){ i++; continue; }
      var mk = d.getUint8(i+1);
      if(mk === 0xD8 || mk === 0x01 || (mk >= 0xD0 && mk <= 0xD7)){ i += 2; continue; }
      var len = d.getUint16(i+2);
      if(mk === 0xE0 && i + 16 < d.byteLength){
        var unit = d.getUint8(i+11), xd = d.getUint16(i+12);
        if(unit === 1 && xd > 1) dpi = xd; else if(unit === 2 && xd > 1) dpi = Math.round(xd*2.54);
      }
      if((mk >= 0xC0 && mk <= 0xC3) || (mk >= 0xC5 && mk <= 0xC7) || (mk >= 0xC9 && mk <= 0xCB) || (mk >= 0xCD && mk <= 0xCF)){
        return { h: d.getUint16(i+5), w: d.getUint16(i+7), comp: d.getUint8(i+9), dpi: dpi };
      }
      i += 2 + len;
    }
    return null;
  }
  function pngInfo(buf){
    var d = new DataView(buf);
    if(d.byteLength < 33 || d.getUint32(0) !== 0x89504E47) return null;
    return { w: d.getUint32(16), h: d.getUint32(20), comp: 3 };
  }

  function lastPdfJs(){
    if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function(){
        if(!window.pdfjsLib) return rej(new Error('pdf.js'));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        res(window.pdfjsLib);
      };
      s.onerror = function(){ rej(new Error('pdf.js')); };
      document.head.appendChild(s);
    });
  }
  function boks(txt, navn){
    var m = txt.match(new RegExp('/' + navn + '\\s*\\[\\s*([\\d.\\-]+)\\s+([\\d.\\-]+)\\s+([\\d.\\-]+)\\s+([\\d.\\-]+)\\s*\\]'));
    return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])] : null;
  }

  /* ---------- Selve sjekken ---------- */
  function sjekk(file, target){
    var res = { navn: file.name, str: file.size, rader: [] };
    function rad(st, tittel, tekst){ res.rader.push({ st: st, t: tittel, x: tekst }); }
    var ext = (file.name.split('.').pop() || '').toLowerCase();

    if(file.size > 300*1048576){
      rad('warn', 'Svært stor fil ('+fmtMB(file.size)+')', 'Filer over 300 MB er tunge å sende. Lagre som PDF med komprimerte bilder (JPEG, høy kvalitet) – det påvirker ikke trykkvaliteten synlig.');
    }

    function sammenlign(wPx, hPx, kilde){
      if(!target) return;
      var tA = target[0]/target[1], fA = wPx/hPx;
      var avvik = Math.abs(fA - tA)/tA;
      if(avvik <= 0.03){
        rad('ok', 'Proporsjonene stemmer', 'Fila har samme forhold mellom bredde og høyde som '+n0(target[0])+' × '+n0(target[1])+' cm.');
      } else if(Math.abs(1/fA - tA)/tA <= 0.03){
        rad('bad', 'Fila ser ut til å være rotert', 'Fila er '+(fA>1?'liggende':'stående')+', men produktet er '+(tA>1?'liggende':'stående')+'. Roter fila 90°.');
      } else {
        rad(avvik <= 0.10 ? 'warn' : 'bad', 'Proporsjonene avviker ('+Math.round(avvik*100)+' %)',
          'Fila har forholdet '+n2(fA)+':1, mens '+n0(target[0])+' × '+n0(target[1])+' cm har '+n2(tA)+':1. '+
          (avvik <= 0.10 ? 'Det kan skyldes utfall eller ombrett – vi sjekker det mot malen.' : 'Motivet må tilpasses størrelsen, ellers blir det beskåret eller strukket.'));
      }
      if(kilde === 'bilde'){
        var dpi = wPx / (target[0]/2.54);
        if(dpi >= 150) rad('ok', 'God oppløsning ('+n0(dpi)+' dpi i full størrelse)', 'Kravet er minst 150 dpi i full størrelse.');
        else if(dpi >= 72) rad('warn', 'Lav oppløsning ('+n0(dpi)+' dpi i full størrelse)', 'Kravet er 150 dpi. På store flater som sees på avstand kan det gå an for bakgrunner og foto, men tekst og logo blir mindre skarpe – lever dem helst som vektor i PDF.');
        else rad('bad', 'For lav oppløsning ('+n0(dpi)+' dpi i full størrelse)', 'Trykket blir uskarpt. Til '+n0(target[0])+' cm bredde trengs minst '+n0(target[0]/2.54*150)+' piksler i bredden – fila har '+n0(wPx)+'.');
      }
    }

    if(ext === 'pdf' || file.type === 'application/pdf'){
      rad('ok', 'PDF – riktig filformat', 'PDF er det foretrukne formatet for trykk.');
      return file.arrayBuffer().then(function(buf){
        var bytes = new Uint8Array(buf);
        var head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 4*1048576)));
        var tail = bytes.length > 4*1048576 ? new TextDecoder('latin1').decode(bytes.subarray(bytes.length - 1048576)) : '';
        var txt = head + tail;
        return lastPdfJs().then(function(lib){
          return lib.getDocument({ data: bytes }).promise.then(function(doc){
            return doc.getPage(1).then(function(pg){
              var v = pg.view, wPt = v[2]-v[0], hPt = v[3]-v[1];
              return { wPt: wPt, hPt: hPt, sider: doc.numPages };
            });
          });
        }).catch(function(){
          var mb = boks(txt, 'MediaBox');
          return mb ? { wPt: mb[2]-mb[0], hPt: mb[3]-mb[1], sider: null } : null;
        }).then(function(info){
          if(!info){
            rad('info', 'Kunne ikke lese sidestørrelsen', 'Vi sjekker mål og målestokk manuelt når du sender fila.');
          } else {
            var wCm = info.wPt/72*2.54, hCm = info.hPt/72*2.54;
            if(info.sider > 1) rad('info', info.sider+' sider i dokumentet', 'Vi sjekket side 1. Har produktet flere flater (f.eks. for- og bakside), er det riktig med én side per flate.');
            if(target){
              var r = wCm/target[0];
              var bleedW = wCm - target[0];
              if(Math.abs(r - 1) <= 0.03) rad('ok', 'Målestokk 1:1 ('+n1(wCm)+' × '+n1(hCm)+' cm)', 'Sidestørrelsen tilsvarer produktet i full størrelse.');
              else if(Math.abs(r - 0.1) <= 0.004) rad('ok', 'Målestokk 1:10 ('+n1(wCm)+' × '+n1(hCm)+' cm)', 'Riktig – vi skalerer opp til '+n0(target[0])+' × '+n0(target[1])+' cm.');
              else rad('warn', 'Uvanlig sidestørrelse ('+n1(wCm)+' × '+n1(hCm)+' cm)', 'Vi forventet '+n0(target[0])+' × '+n0(target[1])+' cm (1:1) eller '+n1(target[0]/10)+' × '+n1(target[1]/10)+' cm (1:10). '+(bleedW>0 && bleedW<15 ? 'Avviket kan være utfall eller ombrett.' : 'Sjekk at du har valgt riktig størrelse over.'));
            } else {
              rad('info', 'Sidestørrelse '+n1(wCm)+' × '+n1(hCm)+' cm', 'Velg produktets størrelse over for å sjekke mål og målestokk.');
            }
            sammenlign(info.wPt, info.hPt, 'pdf');
          }
          var mb = boks(txt, 'MediaBox'), tb = boks(txt, 'TrimBox'), bb = boks(txt, 'BleedBox');
          if(tb && (bb || mb)){
            var ytre = bb || mb, utfallMm = (tb[0]-ytre[0])/72*25.4;
            if(utfallMm >= 2.5) rad('ok', 'Utfall funnet ('+n1(utfallMm)+' mm)', 'Kravet er 3 mm utfall.');
            else rad('warn', 'Lite eller ingen utfall', 'Legg på 3 mm utfall rundt hele motivet, så unngår du hvite kanter.');
          } else {
            rad('info', 'Utfall', 'Kunne ikke måle utfall automatisk. Sørg for 3 mm utfall rundt motivet – vi kontrollerer det.');
          }
          var cmyk = /\/DeviceCMYK|\/Separation|\/DeviceN/.test(txt), rgb = /\/DeviceRGB|\/CalRGB/.test(txt);
          if(cmyk && !rgb) rad('ok', 'CMYK-farger', 'Fila bruker CMYK, som er riktig for trykk.');
          else if(rgb && !cmyk) rad('warn', 'RGB-farger', 'Fila ser ut til å bruke RGB. Vi konverterer til CMYK, men sterke farger (særlig neon, grønt og blått) kan bli litt mattere.');
          else if(rgb && cmyk) rad('info', 'Blanding av CMYK og RGB', 'Deler av fila er RGB. Vi konverterer til CMYK før trykk.');
          else rad('info', 'Fargemodus', 'Kunne ikke avgjøres automatisk – vi sjekker det. Lever helst i CMYK.');
          rad('info', 'Bildeoppløsning i PDF', 'Oppløsningen på bilder inne i PDF-en sjekkes manuelt av oss. Kravet er minst 150 dpi i full størrelse.');
          return res;
        });
      });
    }

    if(/^(jpe?g|png)$/.test(ext) || /image\/(jpeg|png)/.test(file.type)){
      return file.slice(0, Math.min(file.size, 2*1048576)).arrayBuffer().then(function(buf){
        var png = ext === 'png' || file.type === 'image/png';
        var info = png ? pngInfo(buf) : jpegInfo(buf);
        if(!info){ rad('bad', 'Kunne ikke lese bildet', 'Fila kan være skadet eller i et uvanlig format. Lagre den på nytt som PDF eller JPG.'); return res; }
        rad(png ? 'warn' : 'info', (png ? 'PNG' : 'JPG')+' – '+n0(info.w)+' × '+n0(info.h)+' piksler',
          png ? 'Kan brukes, men PNG er alltid RGB. PDF er foretrukket for trykk.' : 'Kan brukes. PDF er foretrukket, særlig når motivet har tekst eller logo.');
        if(!target) rad('info', 'Velg størrelse', 'Velg produktets størrelse over for å sjekke proporsjoner og oppløsning.');
        sammenlign(info.w, info.h, 'bilde');
        if(info.comp === 4) rad('ok', 'CMYK-farger', 'Bildet er i CMYK, som er riktig for trykk.');
        else if(info.comp === 1) rad('info', 'Gråtoner', 'Bildet er i gråtoner. Det er greit hvis motivet skal være svart-hvitt.');
        else rad('warn', 'RGB-farger', 'Vi konverterer til CMYK, men sterke farger kan bli litt mattere enn på skjermen.');
        rad('info', 'Utfall', 'Kan ikke måles i bilder. Sørg for at bakgrunnen går minst 3 mm ut over motivets kant.');
        return res;
      });
    }

    if(/^(ai|eps|psd|tif|tiff|indd|svg|cdr)$/.test(ext)){
      rad('warn', ext.toUpperCase()+'-fil', 'Kan ikke sjekkes i nettleseren. Vi tar imot fila, men lagre den gjerne som trykk-PDF – da går det raskest.');
      return Promise.resolve(res);
    }
    rad('bad', 'Filformatet støttes ikke', 'Bruk PDF (anbefalt), JPG eller PNG.');
    return Promise.resolve(res);
  }

  /* ---------- UI ---------- */
  var dlg, resEl, wIn, hIn, sisteRes = null, sisteFil = null;

  function bygg(){
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var info = document.querySelector('.p-info');
    var buy = info && info.querySelector('.buy-alt');
    if(!buy) return false;
    var tools = document.createElement('div');
    tools.className = 'tf-tools';
    tools.innerHTML = '<button type="button" class="tf-btn primary" id="tfOpen">'+ICON_FILE+'Sjekk trykkfil</button>'+
                      '<button type="button" class="tf-btn" id="tfKrav">'+ICON_DOC+'Trykkrav</button>';
    buy.parentNode.insertBefore(tools, buy.nextSibling);

    dlg = document.createElement('dialog');
    dlg.className = 'tf-dlg';
    dlg.setAttribute('aria-labelledby', 'tfTitle');
    dlg.innerHTML = '<div class="tf-in">'+
      '<div class="tf-head"><h2 id="tfTitle">Sjekk trykkfilen din</h2><button type="button" class="tf-x" aria-label="Lukk">×</button></div>'+
      '<p class="tf-sub">Få svar på sekunder: format, mål, oppløsning, farger og utfall – sjekket mot produktet du ser på.</p>'+
      '<div class="tf-target"><span>Produkt: <strong id="tfProd"></strong></span><span style="display:flex;align-items:center;gap:6px">Størrelse <input id="tfW" inputmode="decimal" aria-label="Bredde i cm"> × <input id="tfH" inputmode="decimal" aria-label="Høyde i cm"> cm</span></div>'+
      '<label class="tf-drop" id="tfDrop">'+ICON_UP+'<b>Velg fil eller dra den hit</b><span>PDF (anbefalt), JPG eller PNG</span>'+
        '<input type="file" id="tfFile" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.ai,.eps,.psd,application/pdf,image/jpeg,image/png"></label>'+
      '<p class="tf-priv">Fila lastes ikke opp – sjekken skjer i nettleseren din.</p>'+
      '<div class="tf-res" id="tfRes" aria-live="polite"></div>'+
      '<div class="tf-tips" id="tfTips"></div>'+
    '</div>';
    document.body.appendChild(dlg);
    resEl = dlg.querySelector('#tfRes'); wIn = dlg.querySelector('#tfW'); hIn = dlg.querySelector('#tfH');

    dlg.querySelector('.tf-x').onclick = function(){ dlg.close(); };
    dlg.addEventListener('click', function(e){ if(e.target === dlg) dlg.close(); });
    document.getElementById('tfOpen').onclick = apne;
    document.getElementById('tfKrav').onclick = function(){
      var b = document.querySelectorAll('.tab-nav button')[2];
      if(b){ b.click(); var t = document.querySelector('.tabs'); if(t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
    var inp = dlg.querySelector('#tfFile'), drop = dlg.querySelector('#tfDrop');
    inp.onchange = function(){ if(inp.files[0]) kjor(inp.files[0]); inp.value = ''; };
    ['dragenter','dragover'].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function(e){ var f = e.dataTransfer && e.dataTransfer.files[0]; if(f) kjor(f); });
    [wIn, hIn].forEach(function(el){ el.addEventListener('change', function(){ if(sisteFil) kjor(sisteFil); }); });
    return true;
  }

  function maal(){
    var w = parseFloat((wIn.value||'').replace(',', '.')), h = parseFloat((hIn.value||'').replace(',', '.'));
    return (w > 0 && h > 0) ? [w, h] : null;
  }

  function apne(){
    dlg.querySelector('#tfProd').textContent = window.__prodName || 'Produktet';
    var s = valgtStorrelse();
    wIn.value = s ? n0(s[0]).replace(/\s/g,'') : '';
    hIn.value = s ? n0(s[1]).replace(/\s/g,'') : '';
    var t = TIPS[produktType()] || TIPS.tekstil;
    dlg.querySelector('#tfTips').innerHTML = '<h3>Tips for dette produktet</h3><ul>'+t.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>';
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    track('trykkfil_sjekk_apnet');
  }

  function kjor(file){
    sisteFil = file;
    resEl.innerHTML = '<div class="tf-busy"><span class="tf-spin"></span>Sjekker '+esc(file.name)+' …</div>';
    sjekk(file, maal()).then(vis).catch(function(){
      resEl.innerHTML = '<div class="tf-sum warn">Noe gikk galt under sjekken. Send fila til oss, så sjekker vi den manuelt.</div>' + handlinger(null);
    });
  }

  function vis(r){
    sisteRes = r;
    var st = r.rader.some(function(x){ return x.st === 'bad'; }) ? 'bad' : r.rader.some(function(x){ return x.st === 'warn'; }) ? 'warn' : 'ok';
    var tegn = { ok: '✓', warn: '!', bad: '×', info: 'i' };
    var sum = {
      ok: 'Fila ser bra ut. Vi gjør alltid en siste manuell kontroll før trykk.',
      warn: 'Fila kan brukes, men se over punktene merket med ! – eller send den til oss, så hjelper vi deg.',
      bad: 'Fila må rettes før trykk. Se punktene merket med × – eller la oss fikse det for deg.'
    }[st];
    resEl.innerHTML = '<div class="tf-file">'+esc(r.navn)+' · '+fmtMB(r.str)+'</div>'+
      r.rader.map(function(x){ return '<div class="tf-row tf-'+x.st+'"><span class="tf-ic">'+tegn[x.st]+'</span><div><b>'+esc(x.t)+'</b>'+esc(x.x)+'</div></div>'; }).join('')+
      '<div class="tf-sum '+st+'">'+sum+'</div>' + handlinger(st);
    track('trykkfil_sjekket', st);
  }

  function oppsummering(){
    var m = maal();
    var linjer = ['Produkt: '+(window.__prodName||''), 'Størrelse: '+(m ? n0(m[0])+' × '+n0(m[1])+' cm' : 'ikke valgt'),
                  'Produktside: '+location.href.split('#')[0]];
    if(sisteRes){
      linjer.push('Fil: '+sisteRes.navn+' ('+fmtMB(sisteRes.str)+')', '', 'Automatisk sjekk:');
      sisteRes.rader.forEach(function(x){ linjer.push('- ['+({ok:'OK',warn:'OBS',bad:'FEIL',info:'INFO'})[x.st]+'] '+x.t); });
    }
    return linjer;
  }

  function handlinger(st){
    var linjer = oppsummering();
    var mail = 'mailto:'+MAIL+'?subject='+encodeURIComponent('Trykkfil til sjekk – '+(window.__prodName||'produkt'))+
      '&body='+encodeURIComponent('Hei!\n\nJeg sender trykkfil til sjekk (legg ved fila i denne e-posten).\n\n'+linjer.join('\n')+'\n\nNavn:\nTelefon:\n');
    var req = document.getElementById('sendReq'), tfUrl = req ? req.href : '#';
    var konfig = 'Trykkfilsjekk: '+(sisteRes ? sisteRes.navn+' – '+(st==='ok'?'OK':st==='warn'?'med merknader':'må rettes') : 'ikke gjennomført');
    if(tfUrl.indexOf('konfig=') > -1){
      tfUrl = tfUrl.replace(/konfig=([^&]*)/, function(_, v){ return 'konfig=' + encodeURIComponent(decodeURIComponent(v) + ' · ' + konfig); });
    }
    var hjelp = st === 'bad' || st === 'warn' || st === null;
    return '<div class="tf-act">'+
      '<a class="btn btn-red" href="'+esc(tfUrl)+'" data-tf="foresporsel">'+(hjelp ? 'Be om hjelp med fila' : 'Send forespørsel')+'</a>'+
      '<a class="btn" style="border:1.5px solid var(--grey-200,#EBDCDF)" href="'+esc(mail)+'" data-tf="epost">Send fila til gratis sjekk</a>'+
    '</div>';
  }

  function track(ev, status){
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: ev, trykkfil_status: status || '', produkt: window.__prodName || '', side: location.pathname });
  }

  function init(){
    if(window.__erTilbehor) return;
    if(!bygg()) return;
    /* Filkrav-fanen: pek til sjekken og fjern løftet om nedlastbare maler (malen sendes med tilbudet) */
    var panels = document.querySelectorAll('.tab-panel');
    var fp = panels[2];
    if(fp){
      fp.querySelectorAll('p').forEach(function(p){
        if(/Ferdige maler ligger klare/.test(p.textContent)){
          p.innerHTML = 'Lever trykkeklar PDF i målestokk 1:1 eller 1:10 med 3 mm utfall, CMYK og minimum 150 dpi i full størrelse. Mal med eksakte mål for produktet sendes sammen med tilbudet. Trenger du hjelp, velg «Jeg trenger designhjelp» over, så setter designerne våre opp filene for deg.';
          var b = document.createElement('p');
          b.innerHTML = '<button type="button" class="tf-btn primary" style="margin-top:6px">'+ICON_FILE+'Sjekk trykkfilen din nå</button>';
          b.querySelector('button').onclick = apne;
          p.parentNode.insertBefore(b, p.nextSibling);
        }
      });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
