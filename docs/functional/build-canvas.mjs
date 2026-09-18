// Genera el HTML autocontenido y audita la estructura del documento funcional.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const stem = 'PET_ECOSYSTEM_CANVAS_FUNCIONAL';
const md = await readFile(path.join(dir, `${stem}.md`), 'utf8');
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const chapters = [...md.matchAll(/^## (.+)$/gm)].map((m) => ({ title: m[1], id: slug(m[1]) }));
const features = [...md.matchAll(/^### ([COPFDTVA]\d{2}) · (.+)$/gm)].map((m) => ({ id: m[1], title: m[2] }));
if (new Set(features.map((x) => x.id)).size !== features.length) throw new Error('ID funcional duplicado');
const lines = md.split(/\r?\n/);
const body = [];
let chapter = null;
let article = false;
let tables = 0;
const closeArticle = () => { if (article) body.push('</article>'); article = false; };
const closeChapter = () => { closeArticle(); if (chapter) body.push('</section>'); };
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim() || line.startsWith('# ') || line.startsWith('Documento integral')) continue;
  if (line.startsWith('## ')) {
    closeChapter();
    const title = line.slice(3);
    chapter = slug(title);
    body.push(`<section class="chapter" id="${chapter}"><div class="chapter-kicker">PET ECOSYSTEM / DOCUMENTACIÓN FUNCIONAL</div><h2>${inline(title)}</h2>`);
  } else if (line.startsWith('### ')) {
    closeArticle();
    const title = line.slice(4);
    const match = title.match(/^([COPFDTVA]\d{2}) · (.+)$/);
    const id = match ? match[1] : slug(title);
    article = true;
    body.push(`<article class="${match ? 'feature' : 'subsection'}" id="${id}"><h3>${match ? `<span class="fid">${match[1]}</span>${inline(match[2])}` : inline(title)}</h3>`);
  } else if (line.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith('|')) {
      const cells = lines[i].trim().slice(1, -1).split('|').map((s) => s.trim());
      if (!cells.every((s) => /^:?-+:?$/.test(s))) rows.push(cells);
      i++;
    }
    i--;
    if (rows.some((r) => r.length !== rows[0].length)) throw new Error(`Tabla irregular en línea ${i}`);
    tables++;
    if (chapter.startsWith('02-') && rows[0][0] === 'Bloque') {
      body.push('<div class="role-canvas">' + rows.slice(1).map((r, n) => `<div class="role-card"><span class="role-number">0${n+1}</span><h3>${inline(r[0])}</h3><p class="purpose">${inline(r[1])}</p><p>${inline(r[2])}</p><div class="outcome">${inline(r[3])}</div></div>`).join('') + '</div>');
    } else {
      const wide = rows[0].length > 5 ? ' matrix' : '';
      body.push(`<div class="table-wrap${wide}"><table><thead><tr>${rows[0].map((s) => `<th scope="col">${inline(s)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => '<tr>'+r.map((s) => `<td>${inline(s)}</td>`).join('')+'</tr>').join('')}</tbody></table></div>`);
    }
  } else {
    const paragraph = [line];
    while (i+1 < lines.length && lines[i+1].trim() && !/^(#|\|)/.test(lines[i+1])) paragraph.push(lines[++i]);
    body.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
}
closeChapter();

const css = `
:root{--ink:#142c42;--muted:#526779;--teal:#087e86;--blue:#183e60;--line:#d9e4e9;--paper:#fff;--wash:#f1f5f7;--gold:#b37e22}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;background:var(--wash);color:var(--ink);font:15px/1.65 'Segoe UI',Arial,sans-serif}a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #d79129;outline-offset:3px}button,input{font:inherit}button,.button{border:1px solid var(--line);border-radius:8px;background:#fff;padding:8px 13px;cursor:pointer;color:var(--ink);display:inline-block}.primary{background:var(--teal);color:white;border-color:var(--teal)}.skip{position:absolute;left:-10000px}.skip:focus{position:fixed;top:8px;left:8px;background:#fff;z-index:99;padding:10px}.topbar{position:sticky;top:0;z-index:20;background:#142c42;display:flex;align-items:center;gap:12px;justify-content:space-between;padding:12px 24px;color:white;box-shadow:0 2px 12px #142c4220}.brand{font-weight:700;letter-spacing:.08em;font-size:13px}.actions{display:flex;gap:8px;flex-wrap:wrap}.shell{display:grid;grid-template-columns:250px minmax(0,1080px);gap:26px;max-width:1410px;margin:26px auto;padding:0 24px}.sidebar{position:sticky;top:90px;max-height:calc(100vh - 110px);overflow:auto;align-self:start;padding:5px 10px 24px 0}.sidebar a{display:block;font-size:12px;padding:7px 9px;border-left:2px solid var(--line);color:var(--muted)}.sidebar a:hover{border-color:var(--teal);background:#e7f2f3;text-decoration:none}.sidebar h2{font-size:11px;letter-spacing:.13em;text-transform:uppercase}.search{width:100%;padding:9px;border:1px solid #b6c8d1;border-radius:8px;background:#fff;margin:8px 0}.search-results{font-size:12px;background:white;border-radius:8px}.search-results a{border:0;padding:8px}.search-status{font-size:11px;color:var(--muted)}main{min-width:0}.cover{background:var(--ink);color:white;border-radius:15px;padding:60px 54px;position:relative;overflow:hidden}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.17em;color:#8cdddd}.cover h1{font-size:52px;line-height:1.06;letter-spacing:-.045em;margin:24px 0}.cover h1 span{color:#8cdddd}.cover .lead{font-size:20px;max-width:660px;line-height:1.45;color:#e0edf2}.cover-meta{font-size:12px;border-top:1px solid #658599;padding-top:20px;margin-top:30px;color:#cce0ea}.stats{display:flex;gap:30px;margin:32px 0}.stat strong{font-size:32px;display:block;color:#fff}.stat span{font-size:11px;color:#bfe0e7;text-transform:uppercase;letter-spacing:.05em}.cover-note{font-size:12px;color:#bfe0e7}.tocpage{background:white;border:1px solid var(--line);padding:34px 42px;border-radius:12px;margin:24px 0}.tocpage h2{font-size:23px}.toc-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 22px}.toc-grid a{padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}.chapter{background:#fff;border:1px solid var(--line);border-radius:12px;margin:24px 0;padding:38px 42px;scroll-margin-top:90px}.chapter-kicker{font-size:9px;letter-spacing:.14em;color:var(--teal);font-weight:700}.chapter h2{font-size:28px;line-height:1.25;letter-spacing:-.025em;margin:10px 0 25px;border-bottom:3px solid var(--teal);padding-bottom:15px}.chapter h3{font-size:18px;line-height:1.35;margin:0 0 12px}.feature{border:1px solid var(--line);border-left:4px solid var(--teal);border-radius:8px;margin:18px 0;padding:21px 23px;scroll-margin-top:90px;break-inside:avoid}.feature p{margin:9px 0;font-size:14px}.feature p:last-child{margin-bottom:0}.fid{display:inline-block;font-size:11px;letter-spacing:.05em;background:#e5f3f3;color:#09656b;border-radius:4px;padding:4px 7px;margin-right:9px;vertical-align:2px}.subsection{margin-top:28px}p{margin:12px 0}strong{font-weight:650}code{font-family:Consolas,monospace;font-size:.88em;overflow-wrap:anywhere;background:#edf3f6;padding:1px 3px;border-radius:3px}.table-wrap{overflow-x:auto;margin:18px 0}table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.5;table-layout:fixed}th,td{padding:10px 11px;text-align:left;vertical-align:top;border:1px solid var(--line);overflow-wrap:anywhere}th{background:var(--blue);color:white;font-weight:600}tbody tr:nth-child(even){background:#f5f8fa}th:first-child,td:first-child{font-weight:600}.matrix table{min-width:810px;font-size:10px}.matrix th,.matrix td{padding:8px 6px}.role-canvas{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:22px 0}.role-card{border:1px solid #bed3da;border-radius:8px;padding:22px;background:#f8fbfc;break-inside:avoid}.role-card:nth-child(3n+1){border-top:4px solid var(--teal)}.role-card:nth-child(3n+2){border-top:4px solid var(--blue)}.role-card:nth-child(3n){border-top:4px solid var(--gold)}.role-number{font-size:11px;color:var(--muted);letter-spacing:.1em}.role-card h3{font-size:18px;margin:7px 0}.role-card p{font-size:13px;line-height:1.5}.role-card .purpose{font-weight:600}.outcome{font-size:12px;border-top:1px solid var(--line);padding-top:10px;margin-top:12px;color:#08636b}.footer{color:var(--muted);text-align:center;font-size:11px;padding:20px}#search-results:empty{display:none}
@media(max-width:1000px){.shell{display:block;max-width:900px}.sidebar{position:static;max-height:none}.sidebar nav{display:none}.cover{padding:36px}.cover h1{font-size:42px}.chapter{padding:28px}.sidebar h2{display:none}}
@media(max-width:600px){.topbar{padding:10px 14px;align-items:flex-start}.brand{max-width:115px}.actions{gap:4px;justify-content:flex-end}.button,button{font-size:11px;padding:7px 8px}.shell{padding:0 12px;margin-top:10px}.cover{padding:28px 24px}.cover h1{font-size:36px}.cover .lead{font-size:17px}.stats{gap:20px}.stat strong{font-size:27px}.role-canvas,.toc-grid{grid-template-columns:1fr}.chapter{padding:25px 18px}.chapter h2{font-size:24px}.feature{padding:17px 14px}.feature h3{font-size:17px}.tocpage{padding:25px}table{font-size:11px}.table-wrap:not(.matrix) table{min-width:570px}.table-wrap{max-width:100%}}
@page{size:A4;margin:17mm 15mm 18mm}@page wide{size:A4 landscape;margin:17mm 12mm 18mm}
@media print{section[id="12-matriz-consolidada-de-funciones-por-canal"]{page:wide}}
@media print{html{scroll-behavior:auto}body{background:#fff;font-size:9.5pt;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}.topbar,.sidebar,.skip,.footer{display:none!important}.shell{display:block;margin:0;padding:0;max-width:none}main{width:100%}.cover{border-radius:0;min-height:235mm;padding:30mm 15mm 16mm;break-after:page;background:#142c42!important}.cover h1{font-size:48pt}.cover .lead{font-size:18pt}.eyebrow{font-size:10pt}.cover-meta,.cover-note{font-size:10pt}.stats{margin-top:20mm}.stat strong{font-size:28pt}.tocpage{padding:6mm 0;border:0;margin:0;break-after:page}.toc-grid{gap:4mm 7mm}.toc-grid a{font-size:10pt}.chapter{border:0;border-radius:0;margin:0;padding:0;break-before:page}.chapter-kicker{font-size:7pt}.chapter h2{font-size:23pt;margin:2mm 0 7mm;padding-bottom:4mm}.chapter h3{font-size:12pt}.feature{padding:4mm;margin:4mm 0;border-radius:2mm;break-inside:avoid}.feature p{font-size:9.3pt;line-height:1.45;margin:2.5mm 0}.fid{font-size:8pt;padding:2px 5px}.subsection{margin-top:6mm}h2,h3{break-after:avoid}p{orphans:3;widows:3}table{font-size:8.2pt;line-height:1.4}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:2.2mm}.table-wrap{overflow:visible;margin:4mm 0}.role-canvas{gap:4mm}.role-card{padding:4mm}.role-card h3{font-size:12pt}.role-card p,.outcome{font-size:9pt}.role-number{font-size:8pt}.role-card p{margin:2mm 0}.matrix table{min-width:0;font-size:8.2pt}.matrix th,.matrix td{padding:2mm}.table-wrap:not(.matrix) table{min-width:0}#12-matriz-consolidada-de-funciones-por-canal{page:wide}a{color:inherit}code{font-size:.85em}a[href]::after{content:none}}
`;
const toc = chapters.map((c) => `<a href="#${c.id}">${esc(c.title)}</a>`).join('');
const featureText = [];
for (const match of md.matchAll(/^### ([COPFDTVA]\d{2}) · (.+)\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)) featureText.push({id:match[1],title:match[2],text:match[3]});
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Canvas funcional de Pet Ecosystem: roles, funciones Mobile y Web, recorridos, permisos y alcance."><title>Pet Ecosystem · Canvas funcional</title><style>${css}</style></head><body>
<a class="skip" href="#contenido">Saltar al contenido</a><header class="topbar"><div class="brand">PET ECOSYSTEM<br><span style="font-weight:400;letter-spacing:0">Canvas funcional · v1.0</span></div><div class="actions"><a class="button" href="${stem}.pdf" download>Descargar PDF</a><button id="download-md">Markdown editable</button><button class="primary" id="print">Imprimir / PDF</button></div></header>
<div class="shell"><aside class="sidebar" aria-label="Índice y búsqueda"><h2>Explorar el canvas</h2><label for="search">Buscar función</label><input type="search" class="search" id="search" placeholder="Ej.: QR, gastos, O19"><div class="search-status" id="search-status" role="status" aria-live="polite"></div><div class="search-results" id="search-results"></div><nav aria-label="Capítulos">${toc}</nav></aside><main id="contenido">
<div class="cover"><div class="eyebrow">Producto · Roles · Funciones</div><h1>Un ecosistema.<br><span>Todos sus recorridos.</span></h1><p class="lead">Canvas funcional de Pet Ecosystem<br>Mobile, Web y Administración</p><div class="stats"><div class="stat"><strong>${features.length}</strong><span>Fichas funcionales</span></div><div class="stat"><strong>8</strong><span>Actores</span></div><div class="stat"><strong>3</strong><span>Superficies</span></div></div><p>Del cuidado diario y las reservas a la acogida, el reencuentro y el historial profesional.</p><div class="cover-meta">Versión 1.0 · 16 de septiembre de 2026<br>Referencia de código: master / 1352e4c</div><p class="cover-note">Catálogo del proyecto actual. Las funciones implementadas, condicionadas y planificadas se distinguen dentro del documento.</p></div>
<section class="tocpage"><div class="chapter-kicker">GUÍA DE LECTURA</div><h2>El mapa del documento</h2><p>Empieza por el canvas general o entra al rol que necesitas. Cada ficha conserva un identificador para facilitar revisión, conversación y futuras actualizaciones.</p><div class="toc-grid">${toc}</div><p><strong>Formatos:</strong> PDF para compartir e imprimir; HTML para navegar y buscar; Markdown como fuente editable.</p></section>
${body.join('\n')}<footer class="footer">Pet Ecosystem · Canvas funcional v1.0 · Fuente editable incluida · 16/09/2026</footer></main></div>
<script>
const index=${JSON.stringify(featureText).replaceAll('<','\\u003c')};
const norm=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
document.getElementById('search').addEventListener('input',e=>{const q=norm(e.target.value.trim());const box=document.getElementById('search-results');box.replaceChildren();if(!q){document.getElementById('search-status').textContent='';return}const hits=index.filter(f=>norm(f.id+' '+f.title+' '+f.text).includes(q));document.getElementById('search-status').textContent=hits.length+' funciones encontradas';for(const f of hits.slice(0,30)){const a=document.createElement('a');a.href='#'+f.id;a.textContent=f.id+' · '+f.title;box.append(a)}});
document.getElementById('print').addEventListener('click',()=>window.print());
document.getElementById('download-md').addEventListener('click',()=>{const bytes=Uint8Array.from(atob('${Buffer.from(md).toString('base64')}'),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='${stem}.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
</script></body></html>`;
await writeFile(path.join(dir, `${stem}.html`), html);
const audit = { version: '1.0', date: '2026-09-16', sourceCommit: '1352e4c272d1475520a0409ad32e336967c343b0', chapters: chapters.length, features: features.length, indexedFeatures: featureText.length, tables, words: md.split(/\s+/).length, bytes: { markdown: Buffer.byteLength(md), html: Buffer.byteLength(html) }, countsByRole: Object.fromEntries(['C','O','P','F','D','T','V','A'].map((prefix)=>[prefix,features.filter((f)=>f.id.startsWith(prefix)).length])) };
if (audit.indexedFeatures !== audit.features) throw new Error('Índice de búsqueda incompleto');
await writeFile(path.join(dir,'canvas-validation.json'), JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit));
