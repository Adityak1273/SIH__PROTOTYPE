/* Optional server-side Level 6/7 endpoints. The browser must never be treated as the final authorization boundary. */
'use strict';
function level567Routes({send,readBody,roleForRequest,store}={}){
 const safeRoles=new Set(['Patient','Caregiver','Doctor/Health Worker']);
 const can=(role,action)=>({readOwn:1,writeOwn:1,manageRoutine:1,viewCaregiver:role==='Caregiver'||role==='Doctor/Health Worker',export:role==='Caregiver'||role==='Doctor/Health Worker',manageUsers:role==='Doctor/Health Worker'}[action]===1);
 return async function(req,res){
  const path=req.url?.split('?')[0]||''; if(!['/api/sync','/api/access'].includes(path))return false;
  const actor=await roleForRequest?.(req);if(!actor||!safeRoles.has(actor.role))return send(res,401,'application/json; charset=utf-8',JSON.stringify({error:'Unauthorized'}),'no-store',req);
  if(req.method!=='POST')return send(res,405,'application/json; charset=utf-8',JSON.stringify({error:'Method Not Allowed'}),'no-store',req);
  try{const body=JSON.parse(await readBody(req));
   if(path==='/api/access'){const action=String(body.action||'');return send(res,200,'application/json; charset=utf-8',JSON.stringify({allowed:can(actor.role,action),role:actor.role}),'no-store',req)}
   if(!can(actor.role,'writeOwn'))return send(res,403,'application/json; charset=utf-8',JSON.stringify({error:'Forbidden'}),'no-store',req);
   const ops=Array.isArray(body.operations)?body.operations.slice(0,100):[];const accepted=[];
   for(const op of ops){if(!op||!op.id||!op.resource||!['upsert','delete'].includes(op.op))continue;if(op.payload?.ownerId&&String(op.payload.ownerId)!==String(actor.id))continue;accepted.push({...op,acceptedAt:new Date().toISOString(),actorId:actor.id,role:actor.role})}
   await store?.(accepted,actor);return send(res,200,'application/json; charset=utf-8',JSON.stringify({ok:true,accepted:accepted.map(x=>x.id),rejected:ops.length-accepted.length}),'no-store',req)
  }catch(_){return send(res,400,'application/json; charset=utf-8',JSON.stringify({error:'Invalid sync request'}),'no-store',req)}
 }
}
module.exports={level567Routes};
