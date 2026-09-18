import fs from 'node:fs/promises';
const root=new URL('../../../',import.meta.url);
const web=new URL('apps/web/src/features/clinical-access/components/ProfessionalIdentityPanel.tsx',root);
let content=await fs.readFile(web,'utf8');
const target='writeRequest.status === "approved" ? <><div className={styles.writeRequest}>';
if(!content.includes(target))throw new Error('Expected clinical form condition');
content=content.replace(target,'writeRequest.status === "approved" && !submission ? <><div className={styles.writeRequest}>');
await fs.writeFile(web,content);
const mobile=new URL('apps/mobile/src/features/health/components/ClinicalAccessCard.tsx',root);
content=await fs.readFile(mobile,'utf8');
const history=' · vence {formatExpiration(request.expiresAt)}</Text></View>)}</View> : null}';
if(!content.includes(history))throw new Error('Expected clinical history');
content=content.replace(history,` · vence {formatExpiration(request.expiresAt)}</Text>{request.status === "completed" && new Date(request.expiresAt).getTime() > Date.now() ? <>
        <Text style={{ color: "#64748b", fontSize: 11 }}>La atencion se conserva. Puedes retirar los permisos pendientes para adjuntar documentos.</Text>
        <Pressable disabled={isSubmitting} onPress={() => void revokeWriteRequest(request)} style={{ alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: "#b91c1c", paddingHorizontal: 14, paddingVertical: 9 }}>
          <Text style={{ color: "#b91c1c", fontWeight: "800" }}>Revocar permisos pendientes</Text>
        </Pressable>
      </> : null}</View>)}</View> : null}`);
await fs.writeFile(mobile,content);
