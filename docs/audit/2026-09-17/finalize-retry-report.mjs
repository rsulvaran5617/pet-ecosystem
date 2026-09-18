import fs from 'node:fs/promises';
const dir=new URL('./',import.meta.url);
const file=new URL('evidence/technical-validation.json',dir);
const checks=JSON.parse(await fs.readFile(file,'utf8'));
const updates=[
 {check:'Regresión clínica local',result:'36/36 correctas',scope:'H04/H05 más las 21 regresiones H01-H03; baseline reproduce ambos fallos'},
 {check:'Regresión clínica remota',result:'25/25 correctas antes y después',scope:'PostgreSQL real; fixtures revertidos; migración H04/H05 instalada'},
 {check:'Recuperación cliente/servicio',result:'9/9 correctas',scope:'Lógica real con respuestas de red simuladas'},
 {check:'Recuperación web y Storage',result:'7/7 correctas',scope:'Web local y PNG real; respuesta de subida perdida, reintento sin duplicación'},
 {check:'Publicación clientes H04/H05',result:'Pendiente',scope:'Build web y exports Android/iOS pasan; sin despliegue web ni distribución mobile'}
];
for(const update of updates){const i=checks.findIndex(c=>c.check===update.check);if(i>=0)checks[i]=update;else checks.push(update);}
await fs.writeFile(file,JSON.stringify(checks,null,2)+'\n');
const summary={executedAt:new Date().toISOString(),typecheck:'7 workspaces passed',lint:'7 workspaces passed; SQL and client test runners lint passed',web:'production build passed',android:'Expo export passed',ios:'Expo export passed',nativeDevice:'not tested',deployment:{database:'20260918020000 applied',web:'pending',mobile:'pending'},sqlLocal:36,clientSimulated:9,sqlRemoteBefore:25,sqlRemoteAfter:25,browserRealStorage:7,limits:'No concurrent SQL connections test; no native runtime; in-memory retry state lost on reload.'};
await fs.writeFile(new URL('evidence/clinical-retry-validation.json',dir),JSON.stringify(summary,null,2)+'\n');
for(const url of [new URL('CORRECCION_REINTENTOS.md',dir),new URL('../../HANDOFF.md',dir)]){
 let body=await fs.readFile(url,'utf8');
 const line='Validación técnica H04/H05: typecheck y lint de siete workspaces, lint de runners SQL/cliente, build web de producción y exports Android/iOS pasaron. El primer export simultáneo emitió ENOENT al observar .next durante el build web; se repitió después y terminó con exit 0. No se cambió configuración Metro.';
 if(!body.includes(line)){
  if(url.pathname.endsWith('/HANDOFF.md'))body=body.replace('- Servidor aplicado; publicación web/mobile pendiente.', '- '+line+'\n- Servidor aplicado; publicación web/mobile pendiente.');
  else body=body.replace('## Reproducción',line+'\n\n## Reproducción');
  await fs.writeFile(url,body);
 }
}
