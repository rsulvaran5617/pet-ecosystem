/* global fetch */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import {URL} from 'node:url';
const id='7600d5fa-8728-4934-b513-aa1cd750e1f1';
const session=JSON.parse(await fs.readFile(path.join(process.env.USERPROFILE,'.expo/state.json'),'utf8'));
const response=await fetch('https://api.expo.dev/graphql',{method:'POST',headers:{'Content-Type':'application/json','expo-session':session.auth.sessionSecret},body:JSON.stringify({query:'query($id:ID!){submissions{byId(submissionId:$id){id status platform error{errorCode}}}}',variables:{id}})});
const result=await response.json();if(!response.ok||result.errors)throw Error('Submission lookup failed');
const report={checkedAt:new Date().toISOString(),...result.data.submissions.byId};
await fs.writeFile(new URL('beta-submission.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
