const TABLE = process.env.SUPABASE_TABLE || "elgroup_demo_state";
const ROW_ID = process.env.SUPABASE_ROW_ID || "default";

function sendJson(res, status, body){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json");
  res.end(JSON.stringify(body));
}

function getConfig(){
  const url=(process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  return {url,key,ready:Boolean(url&&key)};
}

function supabaseHeaders(key, extra={}){
  const headers = {
    apikey:key,
    "Content-Type":"application/json",
    ...extra,
  };
  if(!key.startsWith("sb_secret_")) headers.Authorization=`Bearer ${key}`;
  return headers;
}

async function readBody(req){
  if(req.body) return typeof req.body==="string"?JSON.parse(req.body):req.body;
  const chunks=[];
  for await (const chunk of req) chunks.push(chunk);
  const raw=Buffer.concat(chunks).toString("utf8");
  return raw?JSON.parse(raw):{};
}

export default async function handler(req,res){
  const {url,key,ready}=getConfig();
  if(!ready) return sendJson(res,503,{error:"Cloud storage is not configured."});

  try{
    if(req.method==="GET"){
      const endpoint=`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&select=data,updated_at`;
      const response=await fetch(endpoint,{headers:supabaseHeaders(key)});
      if(!response.ok) return sendJson(res,response.status,{error:await response.text()});
      const rows=await response.json();
      return sendJson(res,200,{data:rows?.[0]?.data||null,updatedAt:rows?.[0]?.updated_at||null});
    }

    if(req.method==="PUT"){
      const body=await readBody(req);
      if(!body?.data||typeof body.data!=="object") return sendJson(res,400,{error:"Missing state data."});
      const endpoint=`${url}/rest/v1/${TABLE}?on_conflict=id`;
      const response=await fetch(endpoint,{
        method:"POST",
        headers:supabaseHeaders(key,{Prefer:"resolution=merge-duplicates,return=minimal"}),
        body:JSON.stringify({id:ROW_ID,data:body.data,updated_at:new Date().toISOString()}),
      });
      if(!response.ok) return sendJson(res,response.status,{error:await response.text()});
      return sendJson(res,200,{ok:true});
    }

    if(req.method==="DELETE"){
      const endpoint=`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}`;
      const response=await fetch(endpoint,{
        method:"DELETE",
        headers:supabaseHeaders(key,{Prefer:"return=minimal"}),
      });
      if(!response.ok) return sendJson(res,response.status,{error:await response.text()});
      return sendJson(res,200,{ok:true});
    }

    res.setHeader("Allow","GET, PUT, DELETE");
    return sendJson(res,405,{error:"Method not allowed."});
  }catch(error){
    return sendJson(res,500,{error:error.message||"Unexpected cloud storage error."});
  }
}
