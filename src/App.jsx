import { useState, useRef, useEffect } from "react";

// ─── Design Tokens ──────────────────────────────────────────────────────────
const C = {
  sand:"#D8CBB8", sandLight:"#E8DFD2", sandDark:"#C4B49E",
  offWhite:"#F7F5F2", white:"#FFFFFF",
  charcoal:"#2E3135", charcoalSoft:"#454B52", charcoalMid:"#6B7280", muted:"#9CA3AF",
  sage:"#8D9A8B", sageDark:"#6B7869", sageLight:"#B8C4B6", sagePale:"#EEF1EE",
  bronze:"#B08D57", bronzeDark:"#8A6D3F", bronzeLight:"#D4B880", bronzePale:"#F5EDD8",
  border:"#E8E2D9", borderSoft:"#F0EBE3",
  shadow:"rgba(46,49,53,0.06)", shadowMd:"rgba(46,49,53,0.10)", shadowLg:"rgba(46,49,53,0.16)",
  greenTint:"#EEF3ED", greenText:"#4A6B48", greenDot:"#7BA378",
  amberTint:"#FBF4E8", amberText:"#7A5A1A", amberDot:"#C9A040",
  blueTint:"#EBF0F5", blueText:"#2D4E6E", blueDot:"#5B8AB0",
  roseTint:"#F7EEEE", roseText:"#7A3030", roseDot:"#C07070",
  grayTint:"#F0EDEA", grayText:"#6B6460", grayDot:"#A09890",
};

const STATUS = {
  "Not Started":                { bg:C.grayTint,   text:C.grayText,   dot:C.grayDot,   label:"Not Started" },
  "In Progress":                { bg:C.blueTint,   text:C.blueText,   dot:C.blueDot,   label:"In Progress" },
  "Waiting for Client Approval":{ bg:C.amberTint,  text:C.amberText,  dot:C.amberDot,  label:"Awaiting Approval" },
  "Waiting for Payment":        { bg:C.amberTint,  text:C.amberText,  dot:C.amberDot,  label:"Awaiting Payment" },
  "Approved":                   { bg:C.greenTint,  text:C.greenText,  dot:C.greenDot,  label:"Approved" },
  "Rejected":                   { bg:C.roseTint,   text:C.roseText,   dot:C.roseDot,   label:"Rejected" },
  "Needs Modification":         { bg:C.amberTint,  text:C.amberText,  dot:C.amberDot,  label:"Needs Revision" },
  "Completed":                  { bg:C.greenTint,  text:C.greenText,  dot:C.greenDot,  label:"Completed" },
  "On Hold":                    { bg:C.grayTint,   text:C.grayText,   dot:C.grayDot,   label:"On Hold" },
  "Delayed":                    { bg:C.bronzePale, text:C.bronzeDark, dot:C.bronze,    label:"Delayed" },
  "Awaiting Client Response":   { bg:C.amberTint,  text:C.amberText,  dot:C.amberDot,  label:"Awaiting Response" },
};

// ─── INITIAL_USERS — seed for React state ────────────────────────────────────
const INITIAL_USERS = [
  { id:"u0", name:"Super Admin",    email:"super@elgroup.io",        pass:"superadmin123", role:"hidden_super_admin", initials:"SA", hidden:true },
  { id:"u4", name:"Elahe Moshaver",email:"Elahe.moshaver@gmail.com",pass:"elahe123",      role:"admin_engineer",     initials:"EM" },
  { id:"u5", name:"Roza Mateen",   email:"roza@elgroup.io",          pass:"roza123",        role:"engineer",           initials:"RM" },
  // clients are added dynamically when registrations are approved
];

// ─── Permission Helpers ───────────────────────────────────────────────────────
const isSuperAdmin    = u => u?.role === "hidden_super_admin";
const isAdminEngineer = u => u?.role === "admin_engineer";
const isEngineer      = u => u?.role === "engineer";
const isClient        = u => u?.role === "client";
const isAnyAdmin      = u => isSuperAdmin(u) || isAdminEngineer(u);
const isAnyEngineer   = u => isSuperAdmin(u) || isAdminEngineer(u) || isEngineer(u);

const canManageCompany       = u => isAnyAdmin(u);
const canManageRegistrations = u => isAnyAdmin(u);
const canCreateProjects      = u => isAnyAdmin(u) || isEngineer(u);
const canManageProject       = (u,p) => isAnyAdmin(u) || (isEngineer(u) && p?.engineerId === u?.id);
const canLogDelay            = (u,p) => isAnyAdmin(u) || (isEngineer(u) && p?.engineerId === u?.id);
const canEditStage           = (u,p) => isAnyAdmin(u) || (isEngineer(u) && p?.engineerId === u?.id);
const canUploadStageFiles    = (u,stage) => isAnyEngineer(u) || (isClient(u) && stage?.allowClientUpload === true);
const canApproveStage        = u => isClient(u);

// genPass for new approved clients
const genPass = name => name.toLowerCase().replace(/\s+/g,"")+(Math.floor(1000+Math.random()*9000));

// ─── Company defaults — edit these from the About Page inside the app ─────────
const DEFAULT_COMPANY = {
  name:"ElGroup", tagline:"Premium Interior Design", founded:"2015", location:"Tehran, Iran",
  about:"ElGroup is a leading interior design studio specialising in luxury residential and commercial spaces. We bring together architecture, craftsmanship and personal vision to create spaces that tell your story.",
  mission:"We believe every space has a soul. Our mission is to reveal it — through thoughtful design, quality materials, and a process built around you.",
  team:[
    {name:"Elahe Moshaver", role:"Lead Designer & Founder", bio:""},
    {name:"Roza Mateen",    role:"Designer",                bio:""},
  ],
  services:[
    {title:"Residential Design",desc:"Full-service interior design for villas, apartments and penthouses."},
    {title:"Commercial Fitout", desc:"Office, retail and hospitality spaces built for impact."},
    {title:"Concept & Mood",    desc:"Visual direction, mood boards and material palettes."},
    {title:"3D Visualisation",  desc:"Photorealistic renders before a single nail is placed."},
  ],
  cities:["Tehran","Isfahan","Shiraz","Mashhad","Tabriz","Karaj","Ahvaz"],
  contact:{email:"Elahe.moshaver@gmail.com", phone:"+98 912 309 4126", address:"Tehran, Iran"},
  stats:[{n:"",l:"Projects Completed"},{n:"",l:"Years of Experience"},{n:"",l:"Cities"},{n:"",l:"Client Satisfaction"}],
};

const STAGES_TEMPLATE=[
  {title:"Contract",          desc:"Sign and upload the project contract"},
  {title:"Quotation",         desc:"Submit a detailed cost quotation"},
  {title:"Client Approval",   desc:"Client reviews and approves the initial concept"},
  {title:"First Payment",     desc:"Initial payment milestone"},
  {title:"Concept Design",    desc:"Initial design concepts and direction"},
  {title:"Mood Board",        desc:"Visual references and style palette"},
  {title:"Layout Plan",       desc:"Floor plan and space arrangement"},
  {title:"3D Visualisation",  desc:"Three-dimensional renderings"},
  {title:"Material Selection",desc:"Finalise materials, finishes and furniture"},
  {title:"Modification",      desc:"Client-requested revision round"},
  {title:"Final Approval",    desc:"Client signs off on the final design"},
  {title:"Delivery",          desc:"Project handover and documentation"},
];

const addDays  = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
const diffDays = (a,b)=>{ if(!a||!b) return 0; return Math.max(0,Math.round((new Date(b)-new Date(a))/86400000)); };
const fmtDate  = d=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const fmtShort = d=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):"—";
const nowISO   = ()=>new Date().toISOString().slice(0,10);
const calcProgress = stages=>{ if(!stages.length)return 0; return Math.round(stages.filter(s=>["Completed","Approved"].includes(s.status)).length/stages.length*100); };
const calcDelay = delays=>delays.filter(d=>d.affectsDelivery!==false).reduce((s,d)=>s+(parseInt(d.days)||0),0);

const INIT_PROJECTS = [];
const INIT_PENDING = [];
const PORTFOLIO_SEED = [];

// ─── Base Components ──────────────────────────────────────────────────────────
const font=`"Inter","Segoe UI",sans-serif`;
const fontSerif=`"Georgia","Times New Roman",serif`;

function Pill({status}){
  const s=STATUS[status]||STATUS["Not Started"];
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,background:s.bg,color:s.text,borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:600,fontFamily:font,whiteSpace:"nowrap"}}><span style={{width:5,height:5,borderRadius:"50%",background:s.dot,flexShrink:0}}/>{s.label}</span>;
}

function RoleBadge({role}){
  const cfg={
    hidden_super_admin:{bg:"#F0E6FF",c:"#6B21A8",label:"Super Admin"},
    admin_engineer:    {bg:C.bronzePale,c:C.bronzeDark,label:"Admin Engineer"},
    engineer:          {bg:C.blueTint,c:C.blueText,label:"Engineer"},
    client:            {bg:C.sagePale,c:C.sageDark,label:"Client"},
  };
  const v=cfg[role]||cfg.client;
  return <span style={{background:v.bg,color:v.c,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,fontFamily:font}}>{v.label}</span>;
}

function Btn({children,onClick,variant="primary",size="md",full=false,disabled=false,style={}}){
  const [hov,setHov]=useState(false);
  const sz={sm:{padding:"8px 16px",fontSize:12},md:{padding:"11px 22px",fontSize:13},lg:{padding:"14px 28px",fontSize:14}};
  const vars={
    primary: {bg:hov?C.bronzeDark:C.bronze,  color:C.white,  border:"none",       shadow:hov?`0 4px 16px rgba(176,141,87,0.4)`:`0 2px 8px rgba(176,141,87,0.25)`},
    secondary:{bg:hov?C.sandLight:C.offWhite,color:C.charcoal,border:`1.5px solid ${C.border}`,shadow:"none"},
    ghost:   {bg:"transparent",color:hov?C.bronze:C.charcoalMid,border:"none",shadow:"none"},
    sage:    {bg:hov?C.sageDark:C.sage,color:C.white,border:"none",shadow:"none"},
    danger:  {bg:hov?"#9A4040":"#C05050",color:C.white,border:"none",shadow:"none"},
    outline: {bg:"transparent",color:hov?C.bronze:C.charcoal,border:`1.5px solid ${hov?C.bronze:C.border}`,shadow:"none"},
  };
  const v=vars[variant]||vars.primary;
  return <button onClick={!disabled?onClick:undefined} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{...sz[size],background:v.bg,color:v.color,border:v.border||"none",borderRadius:10,cursor:disabled?"not-allowed":"pointer",fontFamily:font,fontWeight:600,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all 0.18s",boxShadow:v.shadow||"none",width:full?"100%":"auto",opacity:disabled?0.45:1,...style}}>{children}</button>;
}

function Field({label,value,onChange,type="text",placeholder="",multiline=false,rows=3,options=null,required=false,hint="",readOnly=false}){
  const base={width:"100%",padding:"11px 14px",background:readOnly?C.offWhite:C.white,border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.charcoal,fontFamily:font,outline:"none",transition:"border-color 0.15s",boxSizing:"border-box"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&<label style={{fontSize:11,fontWeight:600,color:C.charcoalMid,letterSpacing:"0.05em",textTransform:"uppercase",fontFamily:font}}>{label}{required&&<span style={{color:C.bronze}}> *</span>}</label>}
      {options?<select value={value} onChange={e=>onChange(e.target.value)} style={{...base,appearance:"none",cursor:"pointer"}} disabled={readOnly}>{options.map(o=><option key={o.v!==undefined?o.v:o} value={o.v!==undefined?o.v:o}>{o.l||o}</option>)}</select>
      :multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} readOnly={readOnly} style={{...base,resize:"vertical"}} onFocus={e=>{if(!readOnly)e.target.style.borderColor=C.bronze}} onBlur={e=>e.target.style.borderColor=C.border}/>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} style={base} onFocus={e=>{if(!readOnly)e.target.style.borderColor=C.bronze}} onBlur={e=>e.target.style.borderColor=C.border}/>}
      {hint&&<span style={{fontSize:11,color:C.muted}}>{hint}</span>}
    </div>
  );
}

function Card({children,style={},onClick}){
  const [hov,setHov]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:C.white,borderRadius:14,border:`1px solid ${C.borderSoft}`,boxShadow:hov?`0 8px 28px ${C.shadowMd}`:`0 2px 10px ${C.shadow}`,transition:"all 0.2s",transform:hov&&onClick?"translateY(-2px)":"none",cursor:onClick?"pointer":"default",...style}}>{children}</div>;
}

function Modal({open,onClose,title,children,width=540}){
  if(!open)return null;
  return <div style={{position:"fixed",inset:0,background:"rgba(46,49,53,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={onClose}><div style={{background:C.white,borderRadius:18,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:`0 32px 80px ${C.shadowLg}`}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px 16px",borderBottom:`1px solid ${C.borderSoft}`}}><h3 style={{margin:0,fontSize:16,fontFamily:fontSerif,color:C.charcoal,fontWeight:600}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",width:30,height:30,color:C.charcoalMid,fontSize:17,borderRadius:7}}>✕</button></div><div style={{padding:"20px 24px"}}>{children}</div></div></div>;
}

function Avatar({initials,size=36,variant,role}){
  const byRole={
    hidden_super_admin:`linear-gradient(135deg,#7C3AED,#6B21A8)`,
    admin_engineer:`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`,
    engineer:`linear-gradient(135deg,${C.sage},${C.sageDark})`,
    client:`linear-gradient(135deg,${C.sandDark},${C.sand})`,
  };
  const byVariant={bronze:`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`,sage:`linear-gradient(135deg,${C.sage},${C.sageDark})`,muted:`linear-gradient(135deg,${C.sandLight},${C.sand})`};
  const bg=role?byRole[role]:byVariant[variant]||byVariant.bronze;
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:C.white,fontSize:size*0.36,fontWeight:700,fontFamily:fontSerif,letterSpacing:"0.05em"}}>{initials}</div>;
}

function Toast({toasts,dismiss}){
  return <div style={{position:"fixed",top:20,right:16,zIndex:2000,display:"flex",flexDirection:"column",gap:8,maxWidth:320,pointerEvents:"none"}}>{toasts.map(t=><div key={t.id} style={{background:C.white,borderRadius:12,padding:"12px 16px",boxShadow:`0 8px 32px ${C.shadowMd}`,borderLeft:`3px solid ${t.type==="success"?C.sage:C.bronze}`,display:"flex",gap:10,alignItems:"flex-start",pointerEvents:"all",animation:"slideIn 0.2s ease"}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.charcoal,fontFamily:font}}>{t.title}</div><div style={{fontSize:12,color:C.charcoalMid,marginTop:1}}>{t.msg}</div></div><button onClick={()=>dismiss(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:14,padding:0,flexShrink:0}}>✕</button></div>)}</div>;
}

function ProgressTrack({value,delay=0,original=0,showInfo=false,originalDate,newDate}){
  const delaySeg=original>0?Math.min((delay/(original+delay))*100,35):0;
  return <div><div style={{height:6,borderRadius:99,background:C.sandLight,overflow:"hidden",position:"relative"}}><div style={{position:"absolute",left:0,top:0,bottom:0,width:`${value}%`,background:`linear-gradient(90deg,${C.sage},${C.sageDark})`,borderRadius:99,transition:"width 0.7s"}}/>{delay>0&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:`${delaySeg}%`,background:`linear-gradient(90deg,${C.bronze},${C.bronzeDark})`,borderRadius:"0 99px 99px 0"}}/>}</div>{showInfo&&<div style={{display:"flex",justifyContent:"space-between",marginTop:7,fontSize:11}}><span style={{color:C.sage,fontWeight:600}}>{value}% complete</span>{delay>0?<span style={{color:C.bronze}}>+{delay}d · Due {fmtShort(newDate)}</span>:<span style={{color:C.muted}}>Due {fmtShort(originalDate)}</span>}</div>}</div>;
}

function DelaySummary({project}){
  const delay=calcDelay(project.delays);
  const newDel=delay>0?addDays(project.originalDelivery,delay):project.originalDelivery;
  const curDur=project.originalDuration+delay;
  const reason=project.delays.find(d=>d.reason)?.reason;
  return <div style={{background:C.offWhite,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.borderSoft}`}}><div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10}}>{[{l:"Original",v:`${project.originalDuration}d`,c:C.charcoal},...(delay>0?[{l:"Delay",v:`+${delay}d`,c:C.bronze}]:[]),{l:"Current",v:`${curDur}d`,c:C.charcoal},{l:"Was due",v:fmtShort(project.originalDelivery),c:C.charcoal},{l:"Now due",v:fmtShort(newDel),c:delay>0?C.bronze:C.charcoal}].map(item=><div key={item.l}><div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{item.l}</div><div style={{fontSize:13,fontWeight:600,color:item.c}}>{item.v}</div></div>)}</div>{delay>0&&<div style={{fontSize:11,background:C.bronzePale,borderRadius:7,padding:"6px 10px",border:`1px solid ${C.bronzeLight}`,color:C.bronzeDark,marginBottom:8}}>{project.originalDuration}d + {delay}d delay = <strong>{curDur}d total</strong>{reason&&<> · <em>{reason}</em></>}</div>}<ProgressTrack value={calcProgress(project.stages)} delay={delay} original={project.originalDuration}/></div>;
}

function FileUploader({files,onFilesChange,canUpload}){
  const ref=useRef();
  const onChange=e=>{const nf=Array.from(e.target.files).map(f=>({id:`f${Date.now()}_${Math.random().toString(36).slice(2)}`,name:f.name,size:f.size,type:f.type,uploadedAt:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}));onFilesChange([...(files||[]),...nf]);e.target.value="";};
  const remove=id=>onFilesChange((files||[]).filter(f=>f.id!==id));
  const fmtSize=b=>b>1048576?`${(b/1048576).toFixed(1)} MB`:`${(b/1024).toFixed(0)} KB`;
  const getIcon=t=>t.includes("pdf")?"📄":t.includes("image")?"🖼️":t.includes("zip")?"📦":"📎";
  const list=files||[];
  return <div style={{marginBottom:12}}>{canUpload&&<div style={{background:C.offWhite,border:`1.5px dashed ${C.border}`,borderRadius:11,padding:"14px",marginBottom:list.length?8:0,textAlign:"center",cursor:"pointer",transition:"border-color 0.15s"}} onClick={()=>ref.current?.click()} onMouseEnter={e=>e.currentTarget.style.borderColor=C.bronze} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}><input ref={ref} type="file" multiple accept=".pdf,.dwg,.jpg,.jpeg,.png,.zip,.doc,.docx" hidden onChange={onChange}/><div style={{fontSize:16,color:C.muted,marginBottom:4}}>📎</div><div style={{fontSize:12,color:C.charcoalMid,marginBottom:6}}>Click to upload files</div><Btn variant="secondary" size="sm" onClick={e=>{e.stopPropagation();ref.current?.click();}}>Browse Files</Btn><div style={{fontSize:10,color:C.muted,marginTop:4}}>PDF · DWG · JPG · PNG · ZIP</div></div>}{list.length>0&&<div style={{display:"flex",flexDirection:"column",gap:5}}>{list.map(f=><div key={f.id} style={{display:"flex",alignItems:"center",gap:9,background:C.offWhite,borderRadius:8,padding:"7px 11px",border:`1px solid ${C.borderSoft}`}}><span style={{fontSize:14}}>{getIcon(f.type)}</span><div style={{flex:1,overflow:"hidden"}}><div style={{fontSize:12,fontWeight:600,color:C.charcoal,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name}</div><div style={{fontSize:10,color:C.muted}}>{fmtSize(f.size)} · {f.uploadedAt}</div></div>{canUpload&&<button onClick={()=>remove(f.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:13,padding:2}}>✕</button>}</div>)}</div>}</div>;
}

function LogoIcon({size=16}){
  return <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><path d="M9 1L16 5.5V12.5L9 17L2 12.5V5.5L9 1Z" stroke="white" strokeWidth="1.5" fill="none"/><path d="M9 5L13 7.5V12.5L9 15L5 12.5V7.5L9 5Z" fill="rgba(255,255,255,0.3)"/></svg>;
}

// ─── Public Landing — fully responsive ──────────────────────────────────────
function PublicLanding({onGoLogin,company,portfolio}){
  const sw=[C.sand,C.sage,C.bronze,C.sandDark,C.sageLight,C.bronzeLight];
  const [contactForm,setContactForm]=useState({name:"",phone:"",city:"",type:"Residential",msg:""});
  const [sent,setSent]=useState(false);
  const sendMsg=()=>{ if(!contactForm.name||!contactForm.phone) return; setSent(true); };

  return (
    <div style={{minHeight:"100vh",background:C.offWhite,fontFamily:font}}>
      <style>{`
        @media(max-width:640px){
          .hero-grid{grid-template-columns:1fr!important}
          .hero-cards{display:none!important}
          .about-grid{grid-template-columns:1fr!important}
          .contact-grid{grid-template-columns:1fr!important}
          .process-grid{grid-template-columns:1fr!important}
          .nav-links{display:none!important}
          .footer-row{flex-direction:column!important;gap:10px!important;text-align:center!important}
        }
        @media(max-width:900px){
          .hero-grid{grid-template-columns:1fr!important}
          .hero-cards{display:none!important}
        }
      `}</style>

      {/* NAV */}
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 24px",background:C.white,borderBottom:`1px solid ${C.borderSoft}`,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(8px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><LogoIcon size={14}/></div>
          <div>
            <div style={{fontFamily:fontSerif,fontSize:16,color:C.charcoal,fontWeight:600,letterSpacing:"0.07em"}}>{company.name}</div>
            <div style={{fontSize:8,color:C.bronze,letterSpacing:"0.2em",textTransform:"uppercase"}}>{company.tagline}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div className="nav-links" style={{display:"flex",gap:4}}>
            {[["#about","About"],["#process","Process"],["#portfolio","Portfolio"],["#contact","Contact"]].map(([href,label])=>(
              <a key={href} href={href} style={{fontSize:13,color:C.charcoalMid,textDecoration:"none",padding:"7px 12px",borderRadius:7,transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color=C.bronze} onMouseLeave={e=>e.currentTarget.style.color=C.charcoalMid}>{label}</a>
            ))}
          </div>
          <Btn onClick={onGoLogin} variant="primary" size="sm">Client Portal →</Btn>
        </div>
      </nav>

      {/* HERO */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"56px 24px 48px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:52,alignItems:"center"}} className="hero-grid">
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:C.bronzePale,border:`1px solid ${C.bronzeLight}`,borderRadius:20,padding:"5px 14px",marginBottom:22}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:C.bronze}}/>
            <span style={{fontSize:11,fontWeight:600,color:C.bronzeDark,letterSpacing:"0.06em",textTransform:"uppercase"}}>Est. {company.founded} · {company.location}</span>
          </div>
          <h1 style={{fontFamily:fontSerif,fontSize:"clamp(28px,5vw,50px)",color:C.charcoal,fontWeight:600,lineHeight:1.2,margin:"0 0 18px"}}>
            Your space,<br/><span style={{color:C.bronze}}>beautifully</span> realised.
          </h1>
          <p style={{fontSize:15,color:C.charcoalMid,lineHeight:1.8,margin:"0 0 30px",maxWidth:460}}>{company.about.slice(0,180)}…</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:36}}>
            <Btn onClick={onGoLogin} variant="primary" size="lg">Start Your Project →</Btn>
            <a href="#process" style={{textDecoration:"none"}}><Btn variant="outline" size="lg">How It Works</Btn></a>
          </div>
          {company.stats.some(s=>s.n)&&(
            <div style={{display:"flex",gap:28,flexWrap:"wrap",paddingTop:24,borderTop:`1px solid ${C.borderSoft}`}}>
              {company.stats.filter(s=>s.n).map(s=>(
                <div key={s.l}>
                  <div style={{fontFamily:fontSerif,fontSize:24,fontWeight:700,color:C.charcoal,lineHeight:1}}>{s.n}</div>
                  <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="hero-cards" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {portfolio.length>0
            ? portfolio.slice(0,4).map((item,i)=>{
                const s=sw[i%sw.length];
                return <div key={item.id} style={{borderRadius:12,overflow:"hidden",boxShadow:`0 4px 14px ${C.shadow}`,transition:"all 0.22s",cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 12px 30px ${C.shadowMd}`}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=`0 4px 14px ${C.shadow}`}}><div style={{height:i===0?135:105,background:`linear-gradient(135deg,${s}66,${s}33)`,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="22" height="22" viewBox="0 0 18 18" fill="none" style={{opacity:0.2}}><path d="M9 1L16 5.5V12.5L9 17L2 12.5V5.5L9 1Z" stroke={C.charcoal} strokeWidth="1.2" fill={C.charcoal}/></svg></div><div style={{padding:"9px 11px",background:C.white}}><div style={{fontSize:11,fontWeight:600,color:C.charcoal,fontFamily:fontSerif}}>{item.title}</div><div style={{fontSize:9,color:C.muted,marginTop:1}}>{item.location} · {item.year}</div></div></div>;
              })
            : [C.sand,C.sage,C.bronze,C.sandDark].map((s,i)=>(
                <div key={i} style={{borderRadius:12,overflow:"hidden",boxShadow:`0 4px 14px ${C.shadow}`}}>
                  <div style={{height:i===0?135:105,background:`linear-gradient(135deg,${s}55,${s}22)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="22" height="22" viewBox="0 0 18 18" fill="none" style={{opacity:0.15}}><path d="M9 1L16 5.5V12.5L9 17L2 12.5V5.5L9 1Z" stroke={C.charcoal} strokeWidth="1.2" fill={C.charcoal}/></svg>
                  </div>
                  <div style={{padding:"9px 11px",background:C.white}}><div style={{height:8,background:C.borderSoft,borderRadius:4,marginBottom:4,width:"70%"}}/><div style={{height:6,background:C.borderSoft,borderRadius:4,width:"45%"}}/></div>
                </div>
              ))
          }
        </div>
      </div>

      {/* ABOUT */}
      <div id="about" style={{background:C.white,borderTop:`1px solid ${C.borderSoft}`,padding:"64px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{fontSize:10,color:C.bronze,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>About Us</div>
          <h2 style={{fontFamily:fontSerif,fontSize:"clamp(22px,3vw,32px)",color:C.charcoal,fontWeight:600,margin:"0 0 32px"}}>Who We Are</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"start"}} className="about-grid">
            <div>
              <p style={{fontSize:14,color:C.charcoalMid,lineHeight:1.85,margin:"0 0 20px"}}>{company.about}</p>
              <div style={{borderLeft:`3px solid ${C.bronze}`,paddingLeft:16,marginBottom:28}}>
                <p style={{fontSize:14,color:C.charcoal,lineHeight:1.8,margin:0,fontStyle:"italic"}}>{company.mission}</p>
              </div>
              {/* Cities */}
              <div style={{padding:"16px 18px",background:C.bronzePale,borderRadius:11,border:`1px solid ${C.bronzeLight}`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.bronzeDark,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:9}}>We Work Across Iran</div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{company.cities.map(c=><span key={c} style={{background:C.white,border:`1px solid ${C.bronzeLight}`,color:C.bronzeDark,borderRadius:16,padding:"3px 10px",fontSize:11,fontWeight:600}}>📍 {c}</span>)}</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.charcoalMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Our Services</div>
              {company.services.map((s,i)=>(
                <div key={s.title} style={{padding:"14px 16px",background:C.offWhite,borderRadius:11,border:`1px solid ${C.borderSoft}`,display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,borderRadius:7,background:C.bronzePale,border:`1px solid ${C.bronzeLight}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:C.bronze,fontWeight:700}}>{i+1}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:C.charcoal,marginBottom:2}}>{s.title}</div><div style={{fontSize:12,color:C.charcoalMid,lineHeight:1.5}}>{s.desc}</div></div>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div style={{marginTop:52}}>
            <div style={{fontSize:10,color:C.bronze,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Our Team</div>
            <h3 style={{fontFamily:fontSerif,fontSize:"clamp(18px,2.5vw,24px)",color:C.charcoal,fontWeight:600,margin:"0 0 22px"}}>The People Behind the Work</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
              {company.team.map((m,i)=>(
                <div key={m.name} style={{padding:"20px",background:C.offWhite,borderRadius:13,border:`1px solid ${C.borderSoft}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <Avatar initials={m.name.split(" ").map(w=>w[0]).join("").slice(0,2)} size={44} role={i===0?"admin_engineer":"engineer"}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:C.charcoal}}>{m.name}</div>
                      <div style={{fontSize:11,color:C.bronze,marginTop:2}}>{m.role}</div>
                    </div>
                  </div>
                  {m.bio&&<p style={{margin:0,fontSize:12,color:C.charcoalMid,lineHeight:1.6}}>{m.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HOW WE WORK */}
      <div id="process" style={{background:C.charcoal,padding:"64px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{fontSize:10,color:C.bronze,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Our Process</div>
          <h2 style={{fontFamily:fontSerif,fontSize:"clamp(22px,3vw,32px)",color:C.white,fontWeight:600,margin:"0 0 10px"}}>How We Work</h2>
          <p style={{fontSize:14,color:"rgba(255,255,255,0.5)",margin:"0 0 40px",maxWidth:480}}>From the first conversation to the final handover — a clear, collaborative process.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}} className="process-grid">
            {[
              {n:"01",title:"Initial Consultation",desc:"We listen to your vision, lifestyle and requirements to fully understand the project scope."},
              {n:"02",title:"Concept & Proposal",desc:"We present a design concept with mood boards, material palettes and a detailed quotation."},
              {n:"03",title:"Design Development",desc:"Floor plans, 3D visualisations and material selections are refined with your feedback."},
              {n:"04",title:"Client Approval",desc:"Each stage is reviewed and signed off through your personal client portal."},
              {n:"05",title:"Execution",desc:"Our team oversees every detail of the build, ensuring quality at every step."},
              {n:"06",title:"Handover",desc:"Final walkthrough, documentation and a space that is truly yours."},
            ].map(step=>(
              <div key={step.n} style={{padding:"22px 20px",background:"rgba(255,255,255,0.05)",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.09)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}>
                <div style={{fontFamily:fontSerif,fontSize:28,fontWeight:700,color:C.bronze,opacity:0.6,marginBottom:10,lineHeight:1}}>{step.n}</div>
                <div style={{fontSize:13,fontWeight:600,color:C.white,marginBottom:7}}>{step.title}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.6}}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PORTFOLIO */}
      {portfolio.length>0&&(
        <div id="portfolio" style={{background:C.offWhite,padding:"64px 24px"}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            <div style={{fontSize:10,color:C.bronze,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Selected Work</div>
            <h2 style={{fontFamily:fontSerif,fontSize:"clamp(22px,3vw,32px)",color:C.charcoal,fontWeight:600,margin:"0 0 28px"}}>Our Portfolio</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
              {portfolio.map((item,idx)=>{
                const s=sw[idx%sw.length];
                return <div key={item.id} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${C.borderSoft}`,background:C.white,transition:"all 0.2s",cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 10px 28px ${C.shadowMd}`}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}><div style={{height:150,background:`linear-gradient(145deg,${s}55,${s}22)`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,color:C.charcoalMid,background:"rgba(255,255,255,0.8)",padding:"3px 9px",borderRadius:5,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{item.type}</span></div><div style={{padding:"13px 14px 15px"}}><div style={{fontFamily:fontSerif,fontSize:13,fontWeight:600,color:C.charcoal}}>{item.title}</div><div style={{fontSize:10,color:C.muted,marginTop:2}}>📍 {item.location} · {item.year}</div>{item.desc&&<p style={{margin:"6px 0 0",fontSize:11,color:C.charcoalMid,lineHeight:1.55}}>{item.desc}</p>}</div></div>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONTACT */}
      <div id="contact" style={{background:C.white,borderTop:`1px solid ${C.borderSoft}`,padding:"64px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:52,alignItems:"start"}} className="contact-grid">
          <div>
            <div style={{fontSize:10,color:C.bronze,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:6}}>Get In Touch</div>
            <h2 style={{fontFamily:fontSerif,fontSize:"clamp(22px,3vw,32px)",color:C.charcoal,fontWeight:600,margin:"0 0 16px"}}>Contact Us</h2>
            <p style={{fontSize:14,color:C.charcoalMid,lineHeight:1.8,margin:"0 0 28px"}}>Ready to transform your space? We'd love to hear about your project.</p>
            <div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:28}}>
              {[
                {icon:"📧",label:"Email",value:company.contact.email,href:`mailto:${company.contact.email}`},
                {icon:"📞",label:"Phone",value:company.contact.phone,href:`tel:${company.contact.phone}`},
                {icon:"📍",label:"Address",value:company.contact.address,href:null},
              ].filter(c=>c.value).map(c=>(
                <div key={c.label} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 15px",background:C.offWhite,borderRadius:11,border:`1px solid ${C.borderSoft}`,transition:"border-color 0.15s",cursor:c.href?"pointer":"default"}} onClick={()=>c.href&&window.open(c.href)} onMouseEnter={e=>{if(c.href)e.currentTarget.style.borderColor=C.bronze}} onMouseLeave={e=>e.currentTarget.style.borderColor=C.borderSoft}>
                  <span style={{fontSize:17,flexShrink:0,marginTop:1}}>{c.icon}</span>
                  <div>
                    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{c.label}</div>
                    <div style={{fontSize:13,fontWeight:600,color:C.charcoal}}>{c.value}</div>
                  </div>
                  {c.href&&<span style={{marginLeft:"auto",fontSize:12,color:C.bronze,alignSelf:"center"}}>→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* CONTACT FORM */}
          <div style={{background:C.offWhite,borderRadius:16,padding:"28px",border:`1px solid ${C.border}`}}>
            {!sent?(
              <>
                <div style={{fontFamily:fontSerif,fontSize:17,color:C.charcoal,fontWeight:600,marginBottom:18}}>Send a Message</div>
                <div style={{display:"flex",flexDirection:"column",gap:11}}>
                  <Field label="Your Name" value={contactForm.name} onChange={v=>setContactForm(f=>({...f,name:v}))} placeholder="e.g. Ahmad Karimi" required/>
                  <Field label="Phone Number" value={contactForm.phone} onChange={v=>setContactForm(f=>({...f,phone:v}))} placeholder="+98 912 xxx xxxx" required/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <Field label="City" value={contactForm.city} onChange={v=>setContactForm(f=>({...f,city:v}))} options={["Tehran","Isfahan","Shiraz","Mashhad","Tabriz","Karaj","Ahvaz","Other"]}/>
                    <Field label="Project Type" value={contactForm.type} onChange={v=>setContactForm(f=>({...f,type:v}))} options={["Residential","Commercial","Office","Hospitality","Other"]}/>
                  </div>
                  <Field label="Message" value={contactForm.msg} onChange={v=>setContactForm(f=>({...f,msg:v}))} multiline rows={3} placeholder="Tell us about your project…"/>
                </div>
                <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:9}}>
                  <Btn onClick={sendMsg} variant="primary" full size="lg" disabled={!contactForm.name||!contactForm.phone}>Send Message</Btn>
                  <div style={{textAlign:"center",padding:"10px",background:C.bronzePale,borderRadius:9,border:`1px solid ${C.bronzeLight}`,fontSize:12,color:C.amberText}}>
                    Already a client? <button onClick={onGoLogin} style={{background:"none",border:"none",cursor:"pointer",color:C.bronze,fontWeight:700,fontSize:12,padding:0}}>Sign in here →</button>
                  </div>
                </div>
              </>
            ):(
              <div style={{textAlign:"center",padding:"28px 0"}}>
                <div style={{width:56,height:56,borderRadius:"50%",background:C.greenTint,border:`2px solid ${C.greenDot}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:24}}>✓</div>
                <div style={{fontFamily:fontSerif,fontSize:19,color:C.charcoal,fontWeight:600,marginBottom:8}}>Message Received</div>
                <p style={{fontSize:13,color:C.charcoalMid,lineHeight:1.7,margin:"0 0 20px"}}>Thank you, <strong>{contactForm.name}</strong>. Your message has been recorded. Our team will reach out to you directly.</p>
                <Btn onClick={()=>{setSent(false);setContactForm({name:"",phone:"",city:"Tehran",type:"Residential",msg:""}); }} variant="secondary">Send Another →</Btn>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{background:C.charcoal,padding:"24px 24px"}}>
        <div className="footer-row" style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`,display:"flex",alignItems:"center",justifyContent:"center"}}><LogoIcon size={10}/></div>
            <span style={{fontFamily:fontSerif,color:C.white,fontSize:13,letterSpacing:"0.07em"}}>{company.name}</span>
          </div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center"}}>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>📧 {company.contact.email}</span>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>📞 {company.contact.phone}</span>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>© {new Date().getFullYear()} {company.name}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Login Screen — fully responsive ────────────────────────────────────────
function LoginScreen({onLogin,onBack,onAddPending,company}){
  const [tab,setTab]     = useState("login");
  const [email,setEmail] = useState("");
  const [pass,setPass]   = useState("");
  const [err,setErr]     = useState("");
  const [reg,setReg]     = useState({name:"",email:"",phone:"",city:"Tehran",projectType:"Residential",notes:""});
  const [regDone,setRegDone] = useState(false);

  const attempt=()=>{
    setErr("");
    const ok=onLogin(email,pass);
    if(!ok) setErr("Incorrect email or password. Please try again.");
  };

  const submitReg=()=>{
    if(!reg.name||!reg.email||!reg.phone)return;
    onAddPending({id:`pc${Date.now()}`,...reg,requestDate:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})});
    setRegDone(true);
  };

  return (
    <div style={{minHeight:"100vh",background:C.offWhite,display:"flex",flexDirection:"column",fontFamily:font}}>
      <style>{`@media(min-width:700px){.login-split{flex-direction:row!important}.login-brand{display:flex!important}}`}</style>

      <div className="login-split" style={{flex:1,display:"flex",flexDirection:"column"}}>

        {/* TOP BRAND BAR — always visible on mobile, left panel on desktop */}
        <div className="login-brand" style={{display:"none",flex:"0 0 380px",background:C.charcoal,flexDirection:"column",padding:"40px 36px",justifyContent:"space-between",position:"relative",overflow:"hidden",minHeight:"100vh"}}>
          <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(circle at 20% 80%,rgba(176,141,87,0.12) 0%,transparent 55%)`,pointerEvents:"none"}}/>
          <div style={{position:"relative",zIndex:1}}>
            <button onClick={onBack} style={{background:"none",border:`1px solid rgba(255,255,255,0.15)`,cursor:"pointer",color:"rgba(255,255,255,0.6)",fontSize:12,padding:"6px 13px",borderRadius:7,display:"flex",alignItems:"center",gap:6,fontFamily:font,marginBottom:28,transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.4)";e.currentTarget.style.color=C.white}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";e.currentTarget.style.color="rgba(255,255,255,0.6)"}}>← Back</button>
            <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:28}}>
              <div style={{width:38,height:38,borderRadius:9,background:`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`,display:"flex",alignItems:"center",justifyContent:"center"}}><LogoIcon size={16}/></div>
              <div>
                <div style={{fontFamily:fontSerif,color:C.white,fontSize:19,letterSpacing:"0.09em",fontWeight:600}}>{company.name}</div>
                <div style={{fontSize:9,color:C.bronze,letterSpacing:"0.25em",textTransform:"uppercase"}}>{company.tagline}</div>
              </div>
            </div>
            <div style={{width:28,height:2,background:C.bronze,borderRadius:2,marginBottom:18}}/>
            <p style={{fontFamily:fontSerif,fontSize:16,color:C.white,lineHeight:1.65,fontStyle:"italic",margin:"0 0 20px"}}>"Design is not just what it looks like — it is how it works, and how it feels to live in."</p>
            <p style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Est. {company.founded} · {company.location}</p>
          </div>
          <div style={{position:"relative",zIndex:1}}>
            <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:10}}>Platform Access</div>
            {[{role:"Engineer",icon:"◫",desc:"Full project management & client oversight"},{role:"Client",icon:"◎",desc:"View your project, approve stages & upload files"}].map(item=><div key={item.role} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:"rgba(255,255,255,0.05)",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",marginBottom:5}}><span style={{fontSize:13,color:"rgba(255,255,255,0.45)"}}>{item.icon}</span><div><div style={{fontSize:11,fontWeight:700,color:C.bronze}}>{item.role}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.38)",marginTop:1}}>{item.desc}</div></div></div>)}
            <div style={{marginTop:14,display:"flex",gap:18}}>
              {company.stats.slice(0,3).map(s=><div key={s.l}><div style={{fontFamily:fontSerif,fontSize:17,color:C.bronze,fontWeight:600}}>{s.n}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.38)",textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.l}</div></div>)}
            </div>
          </div>
        </div>

        {/* RIGHT / MAIN FORM */}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",minHeight:"100vh"}}>
          {/* Mobile top bar */}
          <div style={{background:C.charcoal,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:30,height:30,borderRadius:7,background:`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`,display:"flex",alignItems:"center",justifyContent:"center"}}><LogoIcon size={12}/></div>
              <span style={{fontFamily:fontSerif,color:C.white,fontSize:15,fontWeight:600}}>{company.name}</span>
            </div>
            <button onClick={onBack} style={{background:"rgba(255,255,255,0.1)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",fontSize:12,padding:"6px 12px",borderRadius:7,fontFamily:font}}>← Home</button>
          </div>

          <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"28px 20px 40px"}}>
            <div style={{width:"100%",maxWidth:420}}>

              {/* Tabs */}
              <div style={{display:"flex",background:C.offWhite,borderRadius:11,padding:3,marginBottom:24,border:`1px solid ${C.border}`}}>
                {[["login","Sign In"],["register","New Client? Register"]].map(([id,label])=>(
                  <button key={id} onClick={()=>{setTab(id);setErr("");setRegDone(false);}} style={{flex:1,padding:"10px 8px",border:"none",borderRadius:9,cursor:"pointer",fontFamily:font,fontSize:13,fontWeight:tab===id?600:400,background:tab===id?C.white:"transparent",color:tab===id?C.charcoal:C.charcoalMid,boxShadow:tab===id?`0 2px 8px ${C.shadow}`:"none",transition:"all 0.15s"}}>{label}</button>
                ))}
              </div>

              {/* SIGN IN */}
              {tab==="login"&&(
                <>
                  <h1 style={{margin:"0 0 5px",fontFamily:fontSerif,fontSize:22,color:C.charcoal,fontWeight:600}}>Welcome back</h1>
                  <p style={{margin:"0 0 20px",fontSize:13,color:C.charcoalMid}}>Engineers and clients both sign in here.</p>
                  <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
                    <Field label="Email" value={email} onChange={setEmail} placeholder="your@email.com" type="email" required/>
                    <Field label="Password" value={pass} onChange={setPass} type="password" placeholder="••••••••" required/>
                  </div>
                  {err&&<div style={{background:C.roseTint,border:`1px solid #EABABA`,color:C.roseText,borderRadius:9,padding:"9px 13px",fontSize:13,marginBottom:12}}>{err}</div>}
                  <Btn onClick={attempt} variant="primary" full size="lg">Sign In</Btn>

                  <div style={{marginTop:14,textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.muted}}>Built by <a href="mailto:abdulmalekhooti@gmail.com" style={{color:C.bronze,textDecoration:"none",fontWeight:600}}>A. Malek Houti</a></div>
                  </div>
                </>
              )}

              {/* REGISTER */}
              {tab==="register"&&!regDone&&(
                <>
                  <h1 style={{margin:"0 0 5px",fontFamily:fontSerif,fontSize:20,color:C.charcoal,fontWeight:600}}>Client Registration</h1>
                  <p style={{margin:"0 0 18px",fontSize:13,color:C.charcoalMid,lineHeight:1.6}}>Submit your details. The engineer will approve your account.</p>
                  <div style={{display:"flex",flexDirection:"column",gap:11}}>
                    <Field label="Full Name" value={reg.name} onChange={v=>setReg({...reg,name:v})} placeholder="e.g. Sara Mohammadi" required/>
                    <Field label="Email" value={reg.email} onChange={v=>setReg({...reg,email:v})} type="email" placeholder="you@example.com" required/>
                    <Field label="Phone" value={reg.phone} onChange={v=>setReg({...reg,phone:v})} placeholder="+98 912 xxx xxxx" required/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <Field label="City" value={reg.city} onChange={v=>setReg({...reg,city:v})} options={["Tehran","Isfahan","Shiraz","Mashhad","Tabriz","Karaj","Ahvaz","Other"]}/>
                      <Field label="Type" value={reg.projectType} onChange={v=>setReg({...reg,projectType:v})} options={["Residential","Commercial","Office","Hospitality","F&B","Other"]}/>
                    </div>
                    <Field label="Notes" value={reg.notes} onChange={v=>setReg({...reg,notes:v})} multiline rows={2} placeholder="Brief description of your project…"/>
                  </div>
                  <div style={{marginTop:12}}><Btn onClick={submitReg} variant="primary" full size="lg" disabled={!reg.name||!reg.email||!reg.phone}>Submit Registration</Btn></div>
                  <div style={{marginTop:10,padding:"9px 13px",background:C.bronzePale,borderRadius:9,border:`1px solid ${C.bronzeLight}`,fontSize:12,color:C.amberText}}>⏳ Your request will be reviewed by our team. We will contact you directly once approved.</div>
                </>
              )}

              {tab==="register"&&regDone&&(
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{width:60,height:60,borderRadius:"50%",background:C.greenTint,border:`2px solid ${C.greenDot}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:26}}>✓</div>
                  <h2 style={{fontFamily:fontSerif,fontSize:20,color:C.charcoal,margin:"0 0 9px"}}>Request Received</h2>
                  <p style={{fontSize:13,color:C.charcoalMid,lineHeight:1.7,margin:"0 0 20px"}}>Your request has been received. Our team will review it and contact you shortly.</p>
                  <Btn onClick={()=>{setTab("login");setRegDone(false);setReg({name:"",email:"",phone:"",city:"Tehran",projectType:"Residential",notes:""});}} variant="secondary" full>Back to Sign In</Btn>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar — responsive (collapses to bottom bar on mobile) ────────────────
function Sidebar({user,active,onNav,onLogout}){
  const NAV={
    hidden_super_admin:[{id:"dashboard",icon:"⊡",label:"Dashboard"},{id:"projects",icon:"◫",label:"Projects"},{id:"pending",icon:"◎",label:"Registrations"},{id:"users",icon:"👥",label:"Clients"},{id:"portfolio",icon:"◈",label:"Portfolio"},{id:"about",icon:"◉",label:"About Page"},{id:"settings",icon:"⊙",label:"Settings"}],
    admin_engineer:    [{id:"dashboard",icon:"⊡",label:"Dashboard"},{id:"projects",icon:"◫",label:"Projects"},{id:"pending",icon:"◎",label:"Registrations"},{id:"users",icon:"👥",label:"Clients"},{id:"portfolio",icon:"◈",label:"Portfolio"},{id:"about",icon:"◉",label:"About Page"},{id:"settings",icon:"⊙",label:"Settings"}],
    engineer:          [{id:"dashboard",icon:"⊡",label:"Dashboard"},{id:"projects",icon:"◫",label:"Projects"},{id:"portfolio",icon:"◈",label:"Portfolio"}],
    client:            [{id:"dashboard",icon:"⊡",label:"Dashboard"},{id:"projects",icon:"◫",label:"My Projects"}],
  };
  const items=NAV[user.role]||NAV.client;
  const roleLabel={hidden_super_admin:"Super Admin",admin_engineer:"Admin Engineer",engineer:"Designer",client:"Client"};
  return (
    <>
      <style>{`
        @media(max-width:700px){
          .sidebar-desktop{display:none!important}
          .sidebar-mobile{display:flex!important}
        }
        @media(min-width:701px){
          .sidebar-desktop{display:flex!important}
          .sidebar-mobile{display:none!important}
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="sidebar-desktop" style={{display:"flex",width:220,background:C.white,borderRight:`1px solid ${C.borderSoft}`,flexDirection:"column",flexShrink:0,fontFamily:font}}>
        <div style={{padding:"20px 16px 14px",borderBottom:`1px solid ${C.borderSoft}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:32,height:32,borderRadius:7,background:`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><LogoIcon size={13}/></div>
            <div><div style={{fontFamily:fontSerif,fontSize:14,color:C.charcoal,fontWeight:600,letterSpacing:"0.06em"}}>ElGroup</div><div style={{fontSize:8,color:C.bronze,letterSpacing:"0.18em",textTransform:"uppercase"}}>Interior Design</div></div>
          </div>
        </div>
        <nav style={{flex:1,padding:"8px 7px",overflowY:"auto"}}>
          {items.map(item=>{const isA=active===item.id;return <button key={item.id} onClick={()=>onNav(item.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",marginBottom:1,textAlign:"left",background:isA?C.bronzePale:"transparent",color:isA?C.bronzeDark:C.charcoalMid,fontWeight:isA?600:400,fontSize:13,transition:"all 0.13s",fontFamily:font}}><span style={{fontSize:14,opacity:0.8}}>{item.icon}</span>{item.label}{isA&&<div style={{marginLeft:"auto",width:2.5,height:14,borderRadius:2,background:C.bronze}}/>}</button>;})}
        </nav>
        <div style={{padding:"11px 13px",borderTop:`1px solid ${C.borderSoft}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Avatar initials={user.initials} size={30} role={user.role}/>
            <div style={{flex:1,overflow:"hidden"}}><div style={{fontSize:11,fontWeight:600,color:C.charcoal,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div><div style={{fontSize:9,color:C.bronze,textTransform:"uppercase",letterSpacing:"0.05em"}}>{roleLabel[user.role]}</div></div>
            <button onClick={onLogout} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:13,padding:3,borderRadius:5}} onMouseEnter={e=>e.currentTarget.style.color=C.charcoal} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>⎋</button>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="sidebar-mobile" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`1px solid ${C.borderSoft}`,padding:"6px 0 10px",zIndex:200,justifyContent:"space-around",alignItems:"center",boxShadow:`0 -4px 20px ${C.shadow}`}}>
        {items.slice(0,5).map(item=>{const isA=active===item.id;return <button key={item.id} onClick={()=>onNav(item.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 10px",background:"none",border:"none",cursor:"pointer",fontFamily:font}}><span style={{fontSize:18,opacity:isA?1:0.5}}>{item.icon}</span><span style={{fontSize:9,color:isA?C.bronze:C.muted,fontWeight:isA?700:400,textTransform:"uppercase",letterSpacing:"0.04em"}}>{item.label}</span>{isA&&<div style={{width:16,height:2,borderRadius:1,background:C.bronze}}/>}</button>;})}
        <button onClick={onLogout} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 10px",background:"none",border:"none",cursor:"pointer",fontFamily:font}}><span style={{fontSize:18,opacity:0.5}}>⎋</span><span style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em"}}>Exit</span></button>
      </div>
    </>
  );
}

function Shell({user,active,onNav,onLogout,toasts,dismissToast,children}){
  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:C.offWhite,fontFamily:font}}>
      <style>{`@media(max-width:700px){.main-content{padding-bottom:70px!important}}`}</style>
      <Toast toasts={toasts} dismiss={dismissToast}/>
      <Sidebar user={user} active={active} onNav={onNav} onLogout={onLogout}/>
      <main className="main-content" style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>{children}</main>
    </div>
  );
}

function PHeader({title,sub,action}){
  return <div style={{padding:"20px 20px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}><div><h1 style={{margin:0,fontFamily:fontSerif,fontSize:20,color:C.charcoal,fontWeight:600}}>{title}</h1>{sub&&<p style={{margin:"3px 0 0",fontSize:12,color:C.charcoalMid}}>{sub}</p>}</div>{action}</div>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({user,projects,pendingClients,onSelectProject,onNav}){
  const mine = isClient(user)
    ? projects.filter(p=>p.clientId===user.id||(p.clientEmail&&p.clientEmail===user.email))
    : isEngineer(user)
    ? projects.filter(p=>p.engineerId===user.id)
    : projects;
  const pApproval=mine.flatMap(p=>p.stages.filter(s=>s.approvalRequested&&!s.approvalResult).map(s=>({...s,projectName:p.name})));
  return (
    <div>
      <PHeader title={`Good day, ${user.name.split(" ")[0]}`} sub={new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
        action={isSuperAdmin(user)&&<RoleBadge role="hidden_super_admin"/>}/>
      <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
          {[{label:"Projects",value:mine.length,accent:C.charcoal},{label:"In Progress",value:mine.filter(p=>p.status==="In Progress").length,accent:C.sage},{label:"Awaiting Approval",value:mine.filter(p=>p.status==="Waiting for Client Approval").length,accent:C.bronze},...(canManageRegistrations(user)?[{label:"Registrations",value:pendingClients.length,accent:pendingClients.length>0?C.bronze:C.sage}]:[])].map(k=><Card key={k.label} style={{padding:"14px 16px"}}><div style={{fontSize:24,fontWeight:700,color:k.accent,fontFamily:fontSerif}}>{k.value}</div><div style={{fontSize:10,color:C.charcoalMid,marginTop:3,textTransform:"uppercase",letterSpacing:"0.04em"}}>{k.label}</div></Card>)}
        </div>

        {canManageRegistrations(user)&&pendingClients.length>0&&<div style={{background:C.bronzePale,border:`1px solid ${C.bronzeLight}`,borderRadius:11,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><div style={{fontSize:13,fontWeight:600,color:C.charcoal}}>⏳ {pendingClients.length} registration{pendingClients.length!==1?"s":""} to review</div><div style={{fontSize:12,color:C.charcoalMid,marginTop:1}}>Approve to grant portal access</div></div><Btn onClick={()=>onNav("pending")} variant="primary" size="sm">Review</Btn></div>}

        {pApproval.length>0&&<div><div style={{fontSize:13,fontWeight:600,color:C.charcoal,marginBottom:7}}>⚡ Approvals Needed ({pApproval.length})</div>{pApproval.map(s=><div key={s.id} style={{background:C.bronzePale,border:`1px solid ${C.bronzeLight}`,borderRadius:9,padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:5}}><div><div style={{fontSize:13,fontWeight:600,color:C.charcoal}}>{s.title} — <span style={{color:C.charcoalMid}}>{s.projectName}</span></div></div><Pill status="Waiting for Client Approval"/></div>)}</div>}

        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.charcoal,marginBottom:9}}>Projects</div>
          {mine.map(p=>{const delay=calcDelay(p.delays);const prog=calcProgress(p.stages);const newDel=delay>0?addDays(p.originalDelivery,delay):p.originalDelivery;return <Card key={p.id} style={{padding:0,overflow:"hidden",marginBottom:8}} onClick={()=>onSelectProject(p.id)}><div style={{display:"flex"}}><div style={{width:4,flexShrink:0,background:delay>0?`linear-gradient(180deg,${C.bronze},${C.bronzeDark})`:`linear-gradient(180deg,${C.sage},${C.sageDark})`}}/><div style={{flex:1,padding:"13px 15px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}><span style={{fontFamily:fontSerif,fontSize:13,fontWeight:600,color:C.charcoal}}>{p.name}</span><Pill status={p.status}/></div><div style={{fontSize:11,color:C.muted}}>{p.location}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:fontSerif,fontSize:17,fontWeight:700,color:C.charcoal}}>{prog}%</div>{delay>0&&<div style={{fontSize:10,color:C.bronze}}>+{delay}d</div>}</div></div><ProgressTrack value={prog} delay={delay} original={p.originalDuration} showInfo={true} originalDate={p.originalDelivery} newDate={newDel}/></div></div></Card>;})}
          {mine.length===0&&(
            isClient(user)
              ? <div style={{textAlign:"center",padding:"44px 24px",color:C.muted}}><div style={{fontSize:36,opacity:0.2,marginBottom:12}}>◫</div><div style={{fontSize:14,fontWeight:600,color:C.charcoalMid,marginBottom:6}}>No project assigned yet</div><div style={{fontSize:12,lineHeight:1.6}}>No project has been assigned to your account yet.<br/>Please contact the design team directly.</div></div>
              : <div style={{textAlign:"center",padding:36,color:C.muted,fontSize:13}}>No projects yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pending Registrations ────────────────────────────────────────────────────
function PendingClients({pendingClients,onApprove,onReject,user}){
  if(!canManageRegistrations(user)) return <div style={{padding:40,textAlign:"center",color:C.muted,fontSize:13}}>Access restricted</div>;
  return (
    <div>
      <PHeader title="Client Registrations" sub={`${pendingClients.length} request${pendingClients.length!==1?"s":""} waiting`}/>
      <div style={{padding:"0 20px 20px"}}>
        <div style={{marginBottom:14,padding:"10px 14px",background:C.amberTint,borderRadius:9,border:`1px solid ${C.amberDot}`,fontSize:12,color:C.amberText}}>
          ⚠ Email sending is not automated. After approving a client, please send their login credentials manually.
        </div>
        <div style={{marginBottom:14,padding:"9px 13px",background:C.grayTint,borderRadius:9,border:`1px solid ${C.grayDot}`,fontSize:11,color:C.grayText}}>
          🔒 <strong>Demo note:</strong> Client-project access is filtered on the frontend only. For production, access must be enforced at the database/backend level.
        </div>
        {pendingClients.length===0&&<div style={{textAlign:"center",padding:48,color:C.muted}}><div style={{fontSize:24,opacity:0.3,marginBottom:8}}>✓</div><div style={{fontSize:14,fontFamily:fontSerif}}>All caught up</div></div>}
        {pendingClients.map(c=><Card key={c.id} style={{padding:"16px 18px",marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}><div style={{display:"flex",gap:11,alignItems:"flex-start"}}><Avatar initials={(c.name||"??").slice(0,2).toUpperCase()} size={38} variant="sage"/><div><div style={{fontFamily:fontSerif,fontSize:14,fontWeight:600,color:C.charcoal,marginBottom:3}}>{c.name}</div><div style={{fontSize:12,color:C.charcoalMid}}>📧 {c.email}</div><div style={{fontSize:12,color:C.charcoalMid}}>📱 {c.phone} · 📍 {c.city}</div><div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}}><span style={{fontSize:11,background:C.bronzePale,color:C.bronzeDark,borderRadius:6,padding:"2px 8px",fontWeight:600}}>{c.projectType}</span><span style={{fontSize:11,background:C.offWhite,color:C.charcoalMid,borderRadius:6,padding:"2px 8px",border:`1px solid ${C.border}`}}>{c.requestDate}</span></div>{c.notes&&<div style={{marginTop:6,fontSize:11,color:C.charcoalMid,fontStyle:"italic"}}>"{c.notes}"</div>}</div></div><div style={{display:"flex",gap:7,flexShrink:0,flexWrap:"wrap"}}><Btn onClick={()=>onApprove(c.id)} variant="sage" size="sm">✓ Approve</Btn><Btn onClick={()=>onReject(c.id)} variant="danger" size="sm">✗ Decline</Btn></div></div></Card>)}
      </div>
    </div>
  );
}

// ─── Projects List ────────────────────────────────────────────────────────────
function ProjectsList({user,projects,onSelect,onNew,allUsers=[]}){
  const [q,setQ]=useState("");
  const mine = isClient(user)
    ? projects.filter(p=>p.clientId===user.id||(p.clientEmail&&p.clientEmail===user.email))
    : isEngineer(user)
    ? projects.filter(p=>p.engineerId===user.id)
    : projects;
  const filtered=mine.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.location.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PHeader title={isClient(user)?"My Projects":"Projects"} sub={`${mine.length} project${mine.length!==1?"s":""}`} action={canCreateProjects(user)&&<Btn onClick={onNew} variant="primary" size="sm"><span style={{fontSize:15}}>+</span> New</Btn>}/>
      <div style={{padding:"0 20px 20px"}}>
        <div style={{marginBottom:12,position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:13,pointerEvents:"none"}}>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" style={{width:"100%",padding:"10px 13px 10px 34px",background:C.white,border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,color:C.charcoal,fontFamily:font,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.bronze} onBlur={e=>e.target.style.borderColor=C.border}/></div>
        {filtered.map(p=>{const delay=calcDelay(p.delays);const prog=calcProgress(p.stages);const newDel=delay>0?addDays(p.originalDelivery,delay):p.originalDelivery;return <Card key={p.id} style={{padding:"14px 16px",marginBottom:8}} onClick={()=>onSelect(p.id)}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:7,flexWrap:"wrap"}}><div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}><span style={{fontFamily:fontSerif,fontSize:14,fontWeight:600,color:C.charcoal}}>{p.name}</span><Pill status={p.status}/>{p.isPublic&&<span style={{fontSize:9,background:C.sagePale,color:C.sageDark,borderRadius:5,padding:"2px 5px",fontWeight:700}}>PORTFOLIO</span>}</div><div style={{fontSize:11,color:C.muted}}>📍 {p.location} · {p.type}{!isClient(user)&&p.clientEmail&&<span> · 👤 {allUsers.find(u=>u.id===p.clientId)?.name||p.clientEmail}</span>} · Due: <strong style={{color:delay>0?C.bronze:C.charcoalMid}}>{fmtDate(newDel)}</strong>{delay>0&&<span style={{color:C.bronze}}> (+{delay}d)</span>}</div></div><div style={{fontFamily:fontSerif,fontSize:20,fontWeight:700,color:C.charcoal,flexShrink:0}}>{prog}<span style={{fontSize:11,color:C.muted}}>%</span></div></div><ProgressTrack value={prog} delay={delay} original={p.originalDuration}/></Card>;})}
        {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}><div style={{fontSize:32,marginBottom:10,opacity:0.3}}>⌕</div><div style={{fontSize:14,fontWeight:600,color:C.charcoalMid,marginBottom:4}}>{q?"No results for that search":"No projects yet"}</div><div style={{fontSize:12}}>{q?"Try a different keyword":"Projects will appear here once created."}</div></div>}
      </div>
    </div>
  );
}

// ─── Create Modal ────────────────────────────────────────────────────────────
function CreateModal({open,onClose,onCreate,currentUser,allClients,allEngineers}){
  const defCli=allClients[0]||null;
  const defEng=allEngineers?.find(u=>u.id===currentUser.id)||allEngineers?.[0]||null;
  const [f,setF]=useState({name:"",type:"Residential",location:"",description:"",duration:"50",start:nowISO(),clientId:defCli?.id||"",engineerId:defEng?.id||currentUser.id});
  const [picked,setPicked]=useState(STAGES_TEMPLATE.map((_,i)=>i));
  const upd=k=>v=>setF(x=>({...x,[k]:v}));
  const toggle=i=>setPicked(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i].sort((a,b)=>a-b));
  const submit=()=>{
    if(!f.name.trim())return;
    const dur=parseInt(f.duration)||50;
    const stages=picked.map(i=>({id:`s${Date.now()}_${i}`,...STAGES_TEMPLATE[i],status:"Not Started",startDate:"",endDate:"",files:[],comments:[],allowClientUpload:false,approvalRequested:false,approvalRequestDate:null,approvalResponseDate:null,approvalResult:null}));
    const clientEmail=allClients.find(u=>u.id===f.clientId)?.email||"";
    onCreate({...f,clientEmail,originalDuration:dur,originalDelivery:addDays(f.start,dur),engineerId:f.engineerId||currentUser.id,stages});
    setF({name:"",type:"Residential",location:"",description:"",duration:"50",start:nowISO(),clientId:defCli?.id||"",engineerId:defEng?.id||currentUser.id});
    setPicked(STAGES_TEMPLATE.map((_,i)=>i));
  };
  return (
    <Modal open={open} onClose={onClose} title="New Project" width={580}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Field label="Project Name" value={f.name} onChange={upd("name")} placeholder="e.g. Rezaei Villa" required/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label="Type" value={f.type} onChange={upd("type")} options={["Residential","Commercial","Hospitality","Office","F&B","Retail"]}/>
          <Field label="Location" value={f.location} onChange={upd("location")} placeholder="City, Iran"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label="Start Date" value={f.start} onChange={upd("start")} type="date"/>
          <Field label="Duration (days)" value={f.duration} onChange={upd("duration")} type="number"/>
        </div>
        {isAnyAdmin(currentUser)&&allEngineers&&allEngineers.length>0&&<Field label="Assign Engineer" value={f.engineerId} onChange={upd("engineerId")} options={allEngineers.map(u=>({v:u.id,l:u.name}))}/>}
        <div>
          <Field label="Assign to Client (optional)" value={f.clientId} onChange={upd("clientId")} options={[{v:"",l:"— No client yet —"},...allClients.map(u=>({v:u.id,l:u.name}))]}/>
          {allClients.length===0&&<div style={{marginTop:5,fontSize:11,color:C.muted}}>You can assign a client later after approving their registration.</div>}
        </div>
        <Field label="Description" value={f.description} onChange={upd("description")} multiline rows={2} placeholder="Brief overview…"/>
        <div>
          <div style={{fontSize:11,fontWeight:600,color:C.charcoalMid,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:6}}>Stages</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{STAGES_TEMPLATE.map((s,i)=>{const sel=picked.includes(i);return <button key={i} onClick={()=>toggle(i)} style={{padding:"4px 10px",borderRadius:16,fontSize:11,cursor:"pointer",fontFamily:font,background:sel?C.bronzePale:C.offWhite,border:`1.5px solid ${sel?C.bronze:C.border}`,color:sel?C.bronzeDark:C.charcoalMid,fontWeight:sel?600:400}}>{sel&&"✓ "}{s.title}</button>;})}</div>
        </div>
        {f.duration&&f.start&&<div style={{background:C.offWhite,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.charcoalMid,border:`1px solid ${C.border}`}}>Delivery: <strong style={{color:C.charcoal}}>{fmtDate(addDays(f.start,parseInt(f.duration)||0))}</strong></div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={!f.name.trim()}>Create</Btn></div>
      </div>
    </Modal>
  );
}

// ─── Stage Panel ──────────────────────────────────────────────────────────────
function StagePanel({stage,user,project,onUpdate,onAutoDelay}){
  const [comment,setComment]       = useState("");
  const [status,setStatus]         = useState(stage.status);
  const [allowUpload,setAllowUpload] = useState(stage.allowClientUpload||false);
  const canEdit    = canEditStage(user,project);
  const canApprove = canApproveStage(user);
  const canUpload  = canUploadStageFiles(user,{...stage,allowClientUpload:allowUpload});

  const saveStatus=()=>onUpdate({...stage,status,allowClientUpload:allowUpload});
  const requestApproval=()=>onUpdate({...stage,status:"Waiting for Client Approval",approvalRequested:true,approvalRequestDate:nowISO()});
  const decide=result=>{
    const rd=nowISO();const late=diffDays(stage.approvalRequestDate,rd);
    onUpdate({...stage,status:result==="approved"?"Approved":"Rejected",approvalResult:result,approvalResponseDate:rd});
    if(late>1&&onAutoDelay&&stage.approvalRequestDate){onAutoDelay({id:`d${Date.now()}`,type:"Client Approval Delay",party:"Client",reason:`Late approval for "${stage.title}"`,days:late-1,stage:stage.title,startDate:stage.approvalRequestDate,endDate:rd,oldDate:"",newDate:"",affectsDelivery:true,notes:`Requested ${fmtDate(stage.approvalRequestDate)}, responded ${fmtDate(rd)}`,auto:true});}
  };
  const sendComment=()=>{
    if(!comment.trim())return;
    onUpdate({...stage,comments:[...stage.comments,{id:`c${Date.now()}`,userId:user.id,user:user.name,text:comment,time:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short"})+", "+new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),role:user.role}]});
    setComment("");
  };

  return (
    <div style={{padding:"14px 0 2px"}}>
      <div style={{display:"flex",gap:7,marginBottom:9,flexWrap:"wrap"}}><Pill status={stage.status}/>{stage.approvalRequestDate&&<span style={{fontSize:11,color:C.amberText,alignSelf:"center"}}>· Requested {fmtDate(stage.approvalRequestDate)}</span>}{stage.approvalResponseDate&&<span style={{fontSize:11,color:C.greenText,alignSelf:"center"}}>· Responded {fmtDate(stage.approvalResponseDate)}</span>}</div>
      {stage.desc&&<p style={{margin:"0 0 12px",fontSize:13,color:C.charcoalMid,lineHeight:1.6}}>{stage.desc}</p>}
      {canEdit&&(
        <div style={{background:C.offWhite,borderRadius:10,padding:"11px 13px",marginBottom:11,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.charcoalMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Update Stage</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:9}}>
            <div style={{flex:1,minWidth:140}}><Field value={status} onChange={setStatus} options={Object.keys(STATUS).map(s=>({v:s,l:STATUS[s].label}))}/></div>
            <Btn onClick={saveStatus} variant="primary" size="sm">Save</Btn>
            {!stage.approvalRequested&&<Btn onClick={requestApproval} variant="outline" size="sm">Request Approval</Btn>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.white,borderRadius:7,border:`1px solid ${C.border}`}}>
            <input type="checkbox" id={`acu_${stage.id}`} checked={allowUpload} onChange={e=>{setAllowUpload(e.target.checked);onUpdate({...stage,allowClientUpload:e.target.checked});}} style={{width:13,height:13,accentColor:C.sage,cursor:"pointer"}}/>
            <label htmlFor={`acu_${stage.id}`} style={{fontSize:12,color:C.charcoal,cursor:"pointer",fontFamily:font}}>Allow client to upload files for this stage</label>
          </div>
        </div>
      )}
      {canApprove&&stage.approvalRequested&&!stage.approvalResult&&<div style={{background:C.bronzePale,borderRadius:10,padding:"12px 14px",marginBottom:11,border:`1px solid ${C.bronzeLight}`}}><div style={{fontSize:13,fontWeight:600,color:C.charcoal,marginBottom:2}}>Your approval is needed</div><div style={{fontSize:12,color:C.charcoalMid,marginBottom:10}}>Please review this stage and let us know your decision.</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Btn onClick={()=>decide("approved")} variant="sage" size="sm">✓ Approve</Btn><Btn onClick={()=>decide("rejected")} variant="danger" size="sm">✗ Reject</Btn><Btn onClick={()=>onUpdate({...stage,status:"Needs Modification"})} variant="secondary" size="sm">⟳ Revision</Btn></div></div>}
      {stage.allowClientUpload&&isClient(user)&&<div style={{background:C.sagePale,borderRadius:7,padding:"5px 10px",marginBottom:8,border:`1px solid ${C.sageLight}`,fontSize:11,color:C.sageDark}}>✓ You can upload files for this stage</div>}
      <FileUploader files={stage.files||[]} onFilesChange={f=>onUpdate({...stage,files:f})} canUpload={canUpload}/>
      <div style={{fontSize:10,fontWeight:700,color:C.charcoalMid,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:7}}>Discussion</div>
      {stage.comments.length===0&&<p style={{fontSize:12,color:C.muted,marginBottom:8}}>No messages yet.</p>}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
        {stage.comments.map(c=>{const mine=c.userId===user.id;return <div key={c.id} style={{display:"flex",gap:7,flexDirection:mine?"row-reverse":"row",alignItems:"flex-end"}}><Avatar initials={(c.user||"?").split(" ").map(w=>w[0]).join("").slice(0,2)} size={24} variant={c.role==="client"?"sage":"bronze"}/><div style={{maxWidth:"72%",background:mine?`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`:C.offWhite,color:mine?C.white:C.charcoal,borderRadius:mine?"12px 3px 12px 12px":"3px 12px 12px 12px",padding:"7px 11px",boxShadow:`0 1px 3px ${C.shadow}`}}><div style={{fontSize:9,opacity:0.6,marginBottom:2}}>{c.user} · {c.time}</div><div style={{fontSize:12,lineHeight:1.55}}>{c.text}</div></div></div>;})}
      </div>
      <div style={{display:"flex",gap:7}}><Field value={comment} onChange={setComment} multiline rows={2} placeholder="Add a comment…"/><Btn onClick={sendComment} variant="primary" disabled={!comment.trim()} style={{alignSelf:"flex-end",flexShrink:0}}>Send</Btn></div>
    </div>
  );
}

// ─── Delay Modal ──────────────────────────────────────────────────────────────
function DelayModal({open,onClose,onAdd,stages,currentNewDel}){
  const blank={type:"Client Delay",party:"Client",reason:"",startDate:"",endDate:"",days:"",stage:"",notes:"",affectsDelivery:true};
  const [df,setDf]=useState(blank);
  const upd=k=>v=>{const n={...df,[k]:v};if((k==="startDate"||k==="endDate")&&n.startDate&&n.endDate)n.days=String(diffDays(n.startDate,n.endDate));setDf(n);};
  const submit=()=>{
    if(!df.reason||!df.days)return;
    const days=parseInt(df.days)||0;
    onAdd({id:`d${Date.now()}`,...df,days,oldDate:currentNewDel,newDate:df.affectsDelivery&&currentNewDel?addDays(currentNewDel,days):currentNewDel,auto:false});
    setDf(blank);onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Log Delay" width={480}>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label="Delay Type" value={df.type} onChange={upd("type")} options={["Client Delay","Engineer Delay","Force Majeure","Supply Delay","Public Holiday","Government Closure","Natural Disaster","Shipping Delay","Client Approval Delay","Other"]}/>
          <Field label="Party" value={df.party} onChange={upd("party")} options={["Client","Engineer","Supplier","External","Force Majeure"]}/>
        </div>
        <Field label="Reason" value={df.reason} onChange={upd("reason")} multiline rows={2} placeholder="Why did the delay occur?" required/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label="Start Date" value={df.startDate} onChange={upd("startDate")} type="date"/>
          <Field label="End Date" value={df.endDate} onChange={upd("endDate")} type="date" hint={df.startDate&&df.endDate?`= ${diffDays(df.startDate,df.endDate)} days`:""}/>
        </div>
        <Field label="Days" value={df.days} onChange={upd("days")} type="number" placeholder="Auto-filled from dates above" hint="Or enter manually"/>
        <Field label="Stage" value={df.stage} onChange={upd("stage")} options={[{v:"",l:"Whole Project"},...stages.map(s=>({v:s.title,l:s.title}))]}/>
        <Field label="Notes" value={df.notes} onChange={upd("notes")} multiline rows={2} placeholder="Additional context…"/>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:C.offWhite,borderRadius:8,border:`1px solid ${C.border}`}}>
          <input type="checkbox" id="ad" checked={df.affectsDelivery} onChange={e=>upd("affectsDelivery")(e.target.checked)} style={{width:14,height:14,accentColor:C.bronze,cursor:"pointer"}}/>
          <label htmlFor="ad" style={{fontSize:13,color:C.charcoal,cursor:"pointer",fontFamily:font}}>Update project delivery date</label>
        </div>
        {df.days&&df.affectsDelivery&&currentNewDel&&<div style={{background:C.bronzePale,borderRadius:8,padding:"9px 11px",fontSize:12,color:C.charcoalMid,border:`1px solid ${C.bronzeLight}`}}>Delivery: <strong>{fmtDate(currentNewDel)}</strong> → <strong style={{color:C.bronze}}>{fmtDate(addDays(currentNewDel,parseInt(df.days)||0))}</strong></div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="secondary" onClick={()=>{setDf(blank);onClose();}}>Cancel</Btn><Btn variant="primary" onClick={submit} disabled={!df.reason||!df.days}>Log Delay</Btn></div>
      </div>
    </Modal>
  );
}

// ─── Client Assign Row — lets admin reassign client on a project ──────────────
function ClientAssignRow({project,allClients,onSave}){
  const [editing,setEditing]=useState(false);
  const [selId,setSelId]=useState(project.clientId||"");
  const current=allClients.find(u=>u.id===project.clientId);
  if(!editing) return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.offWhite,borderRadius:8,border:`1px solid ${C.borderSoft}`,marginBottom:10,fontSize:12}}>
      <span style={{color:C.muted}}>👤 Assigned client:</span>
      <span style={{fontWeight:600,color:C.charcoal}}>{current?.name||project.clientEmail||"— None —"}</span>
      {project.clientEmail&&!current&&<span style={{color:C.muted,fontSize:11}}>({project.clientEmail})</span>}
      <Btn onClick={()=>setEditing(true)} variant="ghost" size="sm" style={{marginLeft:"auto",fontSize:11}}>Change</Btn>
    </div>
  );
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.bronzePale,borderRadius:8,border:`1px solid ${C.bronzeLight}`,marginBottom:10}}>
      <span style={{fontSize:12,color:C.bronzeDark,fontWeight:600,flexShrink:0}}>👤 Client:</span>
      <select value={selId} onChange={e=>setSelId(e.target.value)} style={{flex:1,padding:"5px 9px",border:`1px solid ${C.bronze}`,borderRadius:6,fontSize:12,fontFamily:font,background:C.white,color:C.charcoal,outline:"none"}}>
        <option value="">— No client —</option>
        {allClients.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
      </select>
      <Btn onClick={()=>{onSave(allClients.find(u=>u.id===selId)||null);setEditing(false);}} variant="primary" size="sm">Save</Btn>
      <Btn onClick={()=>setEditing(false)} variant="secondary" size="sm">Cancel</Btn>
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────
function ProjectDetail({project:init,user,onUpdate,onBack,allUsers,allClients}){
  const [project,setProject]=useState(init);
  const [openStage,setOpenStage]=useState(null);
  const [tab,setTab]=useState("stages");
  const [showDelay,setShowDelay]=useState(false);
  useEffect(()=>setProject(init),[init]);
  const delay=calcDelay(project.delays);const prog=calcProgress(project.stages);const newDel=delay>0?addDays(project.originalDelivery,delay):project.originalDelivery;
  const canEdit=canManageProject(user,project);
  const canDelay=canLogDelay(user,project);
  const save=up=>{setProject(up);onUpdate(up);};
  const updStage=s=>save({...project,stages:project.stages.map(x=>x.id===s.id?s:x)});
  const addDelay=d=>save({...project,delays:[...project.delays,d]});
  const handleAutoDelay=d=>save({...project,delays:[...project.delays,d]});
  const togglePublic=()=>save({...project,isPublic:!project.isPublic});
  const clientUser=(allUsers||INITIAL_USERS).find(u=>u.id===project.clientId)||{name:"Unknown",initials:"??",role:"client"};
  const engineerUser=(allUsers||INITIAL_USERS).find(u=>u.id===project.engineerId)||{name:"Unknown",initials:"??",role:"engineer"};
  const tabs=[{id:"stages",label:`Workflow (${project.stages.length})`},{id:"timeline",label:"Timeline"},{id:"delays",label:`Delays (${project.delays.length})`}];
  return (
    <div>
      <div style={{background:C.white,borderBottom:`1px solid ${C.borderSoft}`,padding:"14px 20px 0"}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:C.charcoalMid,fontSize:12,padding:0,marginBottom:9,display:"flex",alignItems:"center",gap:5,fontFamily:font}}>← Back to Projects</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}><h1 style={{margin:0,fontFamily:fontSerif,fontSize:18,color:C.charcoal,fontWeight:600}}>{project.name}</h1><Pill status={project.status}/>{project.isPublic&&<span style={{fontSize:9,background:C.sagePale,color:C.sageDark,borderRadius:5,padding:"2px 5px",fontWeight:700}}>PORTFOLIO</span>}</div>
            <div style={{fontSize:11,color:C.muted,display:"flex",gap:8,flexWrap:"wrap"}}>
              <span>📍 {project.location}</span><span>·</span><span>{project.type}</span>
              {clientUser.name!=="Unknown"&&<><span>·</span><span>👤 {clientUser.name}</span>{project.clientEmail&&<span style={{color:C.muted}}>({project.clientEmail})</span>}</>}
              {clientUser.name==="Unknown"&&project.clientEmail&&<><span>·</span><span>👤 {project.clientEmail}</span></>}
            </div>
          </div>
          {canEdit&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn onClick={togglePublic} variant="secondary" size="sm">{project.isPublic?"Remove from Portfolio":"Add to Portfolio"}</Btn><Btn onClick={()=>setShowDelay(true)} variant="outline" size="sm">+ Delay</Btn></div>}
        </div>
        {canEdit&&(
          <ClientAssignRow project={project} allClients={allClients} onSave={c=>{const up={...project,clientId:c?.id||"",clientEmail:c?.email||""};save(up);}}/>
        )}
        <div style={{marginBottom:14}}><DelaySummary project={project}/></div>
        <div style={{display:"flex",gap:0}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12,color:tab===t.id?C.bronze:C.charcoalMid,fontWeight:tab===t.id?600:400,borderBottom:`2px solid ${tab===t.id?C.bronze:"transparent"}`,fontFamily:font,transition:"all 0.13s",marginBottom:-1}}>{t.label}</button>)}</div>
      </div>
      <div style={{padding:"18px 20px"}}>
        {tab==="stages"&&<div style={{display:"flex",flexDirection:"column",gap:5}}>{project.stages.map((s,idx)=>{const isOpen=openStage===s.id;const done=["Completed","Approved"].includes(s.status);return <div key={s.id}><div onClick={()=>setOpenStage(isOpen?null:s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:C.white,borderRadius:isOpen?"10px 10px 0 0":8,border:`1px solid ${isOpen?C.bronze:C.borderSoft}`,cursor:"pointer",boxShadow:isOpen?`0 0 0 2px ${C.bronzeLight}`:`0 1px 3px ${C.shadow}`}}><div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:done?`linear-gradient(135deg,${C.sage},${C.sageDark})`:isOpen?`linear-gradient(135deg,${C.bronze},${C.bronzeDark})`:C.offWhite,border:done||isOpen?"none":`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:done||isOpen?C.white:C.muted,fontSize:10,fontWeight:700}}>{done?"✓":idx+1}</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.charcoal}}>{s.title}</div><div style={{fontSize:10,color:C.muted,marginTop:1}}>{s.desc}</div></div><div style={{display:"flex",gap:5,alignItems:"center"}}>{(s.files||[]).length>0&&<span style={{fontSize:10,color:C.muted}}>📎{s.files.length}</span>}{s.comments.length>0&&<span style={{fontSize:10,color:C.muted}}>💬{s.comments.length}</span>}{s.approvalRequested&&!s.approvalResult&&<span style={{fontSize:9,background:C.amberTint,color:C.amberText,borderRadius:4,padding:"1px 5px",fontWeight:700}}>!</span>}<Pill status={s.status}/><span style={{color:C.muted,fontSize:10}}>{isOpen?"▲":"▼"}</span></div></div>{isOpen&&<div style={{background:C.white,border:`1px solid ${C.bronze}`,borderTop:`1px solid ${C.borderSoft}`,borderRadius:"0 0 10px 10px",padding:"3px 14px 14px",boxShadow:`0 0 0 2px ${C.bronzeLight}`}}><StagePanel stage={s} user={user} project={project} onUpdate={updStage} onAutoDelay={handleAutoDelay}/></div>}</div>;})}</div>}
        {tab==="timeline"&&<div style={{position:"relative",paddingLeft:20}}><div style={{position:"absolute",left:8,top:8,bottom:8,width:1.5,background:C.border}}/>{project.stages.map(s=>{const done=["Completed","Approved"].includes(s.status);const active=s.status==="In Progress"||s.status==="Waiting for Client Approval";return <div key={s.id} style={{display:"flex",gap:11,marginBottom:12,position:"relative"}}><div style={{position:"absolute",left:-17,top:5,width:10,height:10,borderRadius:"50%",background:done?C.sage:active?C.bronze:C.offWhite,border:`2px solid ${done?C.sageDark:active?C.bronzeDark:C.border}`,boxShadow:active?`0 0 0 3px ${C.bronzePale}`:"none",zIndex:1}}/><Card style={{flex:1,padding:"10px 12px",opacity:s.status==="Not Started"?0.55:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><span style={{fontSize:12,fontWeight:600,color:C.charcoal}}>{s.title}</span><Pill status={s.status}/></div>{(s.startDate||s.endDate)&&<div style={{fontSize:10,color:C.muted}}>{s.startDate&&fmtDate(s.startDate)}{s.endDate&&` → ${fmtDate(s.endDate)}`}</div>}</Card></div>;})}
        </div>}
        {tab==="delays"&&<div>{project.delays.length===0&&<div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>No delays recorded</div>}<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:11}}>{project.delays.map(d=><Card key={d.id} style={{padding:"13px 15px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.charcoal}}>{d.type}</span>{d.auto&&<span style={{fontSize:9,background:C.amberTint,color:C.amberText,borderRadius:4,padding:"1px 5px",fontWeight:700}}>AUTO</span>}</div><div style={{fontSize:12,color:C.charcoalMid,marginTop:1}}>{d.reason}</div></div><div style={{background:C.bronzePale,color:C.bronzeDark,borderRadius:6,padding:"3px 8px",fontSize:12,fontWeight:700}}>+{d.days}d</div></div><div style={{fontSize:11,color:C.muted}}>{d.party} · {d.stage||"General"}{d.startDate&&d.endDate&&<span> · {fmtDate(d.startDate)} → {fmtDate(d.endDate)}</span>}</div></Card>)}</div>{canDelay&&<Btn onClick={()=>setShowDelay(true)} variant="outline" size="sm">+ Log New Delay</Btn>}</div>}
      </div>
      <DelayModal open={showDelay} onClose={()=>setShowDelay(false)} onAdd={addDelay} stages={project.stages} currentNewDel={newDel}/>
    </div>
  );
}

// ─── Portfolio (inside app) ───────────────────────────────────────────────────
function Portfolio({user,projects}){
  const sw=[C.sand,C.sage,C.bronze,C.sandDark,C.sageDark,C.bronzeLight];
  const all=projects.filter(p=>p.isPublic).map(p=>({id:p.id,title:p.name,location:p.location,type:p.type,year:new Date(p.startDate||Date.now()).getFullYear().toString(),desc:p.description||""}));
  if(all.length===0) return <div><PHeader title="Portfolio" sub="Mark a project as public to add it here"/><div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}><div style={{fontSize:40,marginBottom:12,opacity:0.2}}>◈</div><div style={{fontSize:14,fontWeight:600,color:C.charcoalMid,marginBottom:5}}>Portfolio is empty</div><div style={{fontSize:12}}>Open a project and click "Add to Portfolio" to feature it here and on the public website.</div></div></div>;
  return <div><PHeader title="Portfolio" sub={`${all.length} public project${all.length!==1?"s":""}`}/><div style={{padding:"0 20px 20px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:12}}>{all.map((item,idx)=>{const s=sw[idx%sw.length];return <Card key={item.id} style={{overflow:"hidden",padding:0}}><div style={{height:140,background:`linear-gradient(145deg,${s}44,${s}22)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",borderBottom:`1px solid ${C.borderSoft}`}}><svg width="32" height="32" viewBox="0 0 18 18" fill="none" style={{opacity:0.1}}><path d="M9 1L16 5.5V12.5L9 17L2 12.5V5.5L9 1Z" stroke={C.charcoal} strokeWidth="1" fill={C.charcoal}/></svg><div style={{position:"absolute",top:8,left:8,background:"rgba(255,255,255,0.85)",borderRadius:5,padding:"2px 7px",fontSize:9,fontWeight:600,color:C.charcoalMid}}>{item.type.toUpperCase()}</div><div style={{position:"absolute",top:8,right:8,fontSize:10,color:C.charcoalMid,background:"rgba(255,255,255,0.7)",borderRadius:4,padding:"1px 6px"}}>{item.year}</div></div><div style={{padding:"11px 13px 13px"}}><h3 style={{margin:"0 0 2px",fontFamily:fontSerif,fontSize:13,color:C.charcoal,fontWeight:600}}>{item.title}</h3><div style={{fontSize:10,color:C.muted,marginBottom:5}}>📍 {item.location}</div><p style={{margin:0,fontSize:11,color:C.charcoalMid,lineHeight:1.55}}>{item.desc}</p></div></Card>;})}</div></div>;
}

// ─── Clients List ─────────────────────────────────────────────────────────────
function ClientsList({clients,user}){
  const visible=clients.filter(c=>!c.hidden);
  return <div><PHeader title="Clients" sub={`${visible.length} approved client${visible.length!==1?"s":""}`}/><div style={{padding:"0 20px 20px"}}>{visible.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}><div style={{fontSize:36,marginBottom:10,opacity:0.2}}>👥</div><div style={{fontSize:14,fontWeight:600,color:C.charcoalMid,marginBottom:4}}>No clients yet</div><div style={{fontSize:12}}>Approve a registration to add your first client.</div></div>}{visible.map(u=><Card key={u.id} style={{padding:"13px 16px",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:11}}><Avatar initials={u.initials||(u.name||"?").slice(0,2).toUpperCase()} role="client" size={34}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.charcoal}}>{u.name}</div><div style={{fontSize:11,color:C.charcoalMid}}>{u.email}</div></div><RoleBadge role="client"/></div></Card>)}</div></div>;
}

// ─── About Page (editable by engineer) ───────────────────────────────────────
function AboutPage({company,onSave,user}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(company);
  const upd=k=>v=>setDraft(d=>({...d,[k]:v}));
  const updC=k=>v=>setDraft(d=>({...d,contact:{...d.contact,[k]:v}}));
  const save=()=>{onSave(draft);setEditing(false);};
  const canEdit=canManageCompany(user);
  return (
    <div>
      <PHeader title="About Page" sub="Content shown on the public landing page"
        action={canEdit&&<div style={{display:"flex",gap:7}}>{editing?<><Btn variant="primary" size="sm" onClick={save}>Save</Btn><Btn variant="secondary" size="sm" onClick={()=>{setDraft(company);setEditing(false);}}>Cancel</Btn></>:<Btn variant="outline" size="sm" onClick={()=>setEditing(true)}>✏ Edit</Btn>}</div>}/>
      <div style={{padding:"0 20px 20px",display:"flex",flexDirection:"column",gap:14}}>
        <Card style={{padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.bronze,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:12}}>Company Info</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
            <Field label="Name"     value={draft.name}     onChange={upd("name")}     readOnly={!canEdit||!editing}/>
            <Field label="Tagline"  value={draft.tagline}  onChange={upd("tagline")}  readOnly={!canEdit||!editing}/>
            <Field label="Founded"  value={draft.founded}  onChange={upd("founded")}  readOnly={!canEdit||!editing}/>
            <Field label="Location" value={draft.location} onChange={upd("location")} readOnly={!canEdit||!editing}/>
          </div>
        </Card>
        <Card style={{padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.bronze,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:12}}>About Text</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Field label="About Paragraph" value={draft.about}    onChange={upd("about")}    multiline rows={4} readOnly={!canEdit||!editing}/>
            <Field label="Mission"          value={draft.mission}  onChange={upd("mission")}  multiline rows={3} readOnly={!canEdit||!editing}/>
          </div>
        </Card>
        <Card style={{padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.bronze,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:12}}>Stats</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:9}}>
            {draft.stats.map((s,i)=><div key={i} style={{display:"flex",gap:7}}><Field label="No." value={s.n} onChange={v=>setDraft(d=>({...d,stats:d.stats.map((x,j)=>j===i?{...x,n:v}:x)}))} readOnly={!canEdit||!editing}/><Field label="Label" value={s.l} onChange={v=>setDraft(d=>({...d,stats:d.stats.map((x,j)=>j===i?{...x,l:v}:x)}))} readOnly={!canEdit||!editing}/></div>)}
          </div>
        </Card>
        <Card style={{padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.bronze,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:12}}>Services</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {draft.services.map((s,i)=><div key={i} style={{padding:"10px",background:C.offWhite,borderRadius:8,border:`1px solid ${C.borderSoft}`,display:"grid",gridTemplateColumns:"1fr 2fr",gap:9}}><Field label="Title" value={s.title} onChange={v=>setDraft(d=>({...d,services:d.services.map((x,j)=>j===i?{...x,title:v}:x)}))} readOnly={!canEdit||!editing}/><Field label="Description" value={s.desc} onChange={v=>setDraft(d=>({...d,services:d.services.map((x,j)=>j===i?{...x,desc:v}:x)}))} readOnly={!canEdit||!editing}/></div>)}
          </div>
        </Card>
        <Card style={{padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.bronze,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:12}}>Team Members</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {draft.team.map((m,i)=><div key={i} style={{padding:"10px",background:C.offWhite,borderRadius:8,border:`1px solid ${C.borderSoft}`}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:7}}><Field label="Name" value={m.name} onChange={v=>setDraft(d=>({...d,team:d.team.map((x,j)=>j===i?{...x,name:v}:x)}))} readOnly={!canEdit||!editing}/><Field label="Role" value={m.role} onChange={v=>setDraft(d=>({...d,team:d.team.map((x,j)=>j===i?{...x,role:v}:x)}))} readOnly={!canEdit||!editing}/></div><Field label="Bio" value={m.bio} onChange={v=>setDraft(d=>({...d,team:d.team.map((x,j)=>j===i?{...x,bio:v}:x)}))} multiline rows={2} readOnly={!canEdit||!editing}/></div>)}
          </div>
        </Card>
        <Card style={{padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.bronze,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:12}}>Contact Info</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <Field label="Email"   value={draft.contact.email}   onChange={updC("email")}   readOnly={!canEdit||!editing}/>
            <Field label="Phone"   value={draft.contact.phone}   onChange={updC("phone")}   readOnly={!canEdit||!editing}/>
            <Field label="Address" value={draft.contact.address} onChange={updC("address")} readOnly={!canEdit||!editing}/>
          </div>
        </Card>
        {!canEdit&&<div style={{textAlign:"center",fontSize:12,color:C.muted}}>Only admins can edit this page.</div>}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({user}){
  return <div><PHeader title="Settings" sub="Platform configuration"/><div style={{padding:"0 20px 20px",maxWidth:520,display:"flex",flexDirection:"column",gap:11}}>{[{title:"Platform",items:[["Language","English"],["Timezone","UTC+3:30 — Tehran"],["Currency","IRR — Iranian Rial"]]},{title:"Notifications",items:[["Email","Enabled"],["Approval Reminders","Every 24 hours"],["Delay Alerts","Immediate"]]},{title:"Storage",items:[["Provider","AWS S3 (placeholder)"],["Max File Size","50 MB"]]}].map(({title,items})=><Card key={title} style={{padding:"14px 16px"}}><div style={{fontFamily:fontSerif,fontSize:13,color:C.charcoal,fontWeight:600,marginBottom:9}}>{title}</div>{items.map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.borderSoft}`}}><span style={{fontSize:12,color:C.charcoalMid}}>{l}</span><span style={{fontSize:12,fontWeight:600,color:C.charcoal}}>{v}</span></div>)}<div style={{marginTop:9}}><Btn variant="secondary" size="sm">Edit</Btn></div></Card>)}</div></div>;
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App(){
  // ── All users stored in state — login searches this, approved clients are added here ──
  const [users,setUsers]                   = useState(INITIAL_USERS);
  const [screen,setScreen]                 = useState("home");
  const [user,setUser]                     = useState(null);
  const [page,setPage]                     = useState("dashboard");
  const [projects,setProjects]             = useState(INIT_PROJECTS);
  const [pendingClients,setPendingClients] = useState(INIT_PENDING);
  const [selProjId,setSelProjId]           = useState(null);
  const [showCreate,setShowCreate]         = useState(false);
  const [toasts,setToasts]                 = useState([]);
  const [company,setCompany]               = useState(DEFAULT_COMPANY);
  const tid=useRef(0);

  // Derived lists
  const allClients   = users.filter(u=>u.role==="client"&&!u.hidden);
  const allEngineers = users.filter(u=>(u.role==="engineer"||u.role==="admin_engineer")&&!u.hidden);

  const toast=(title,msg,type="info")=>{ const id=++tid.current; setToasts(p=>[...p,{id,title,msg,type}]); setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500); };

  // ── Login searches users state — newly approved clients can login immediately ──
  const login=(email,pass)=>{
    const found=users.find(u=>u.email===email&&u.pass===pass);
    if(!found) return false;
    setUser(found); setScreen("app");
    toast("Welcome",`Signed in as ${found.name.split(" ")[0]}`,"success");
    return true;
  };
  const logout=()=>{ setUser(null); setScreen("home"); setPage("dashboard"); setSelProjId(null); };
  const nav   =p =>{ setPage(p); setSelProjId(null); };
  const addPending=entry=>setPendingClients(p=>[...p,entry]);

  // ── Approve: generates password, adds new user to state ──
  const approveClient=id=>{
    const c=pendingClients.find(x=>x.id===id);
    if(c){
      const pass=genPass(c.name);
      const nc={id:`u${Date.now()}`,name:c.name,email:c.email,pass,role:"client",initials:(c.name||"CL").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()};
      setUsers(prev=>[...prev,nc]);
      toast("Client Approved — Send credentials manually",`Email: ${c.email} · Password: ${pass}`,"success");
    }
    setPendingClients(p=>p.filter(x=>x.id!==id));
  };
  const rejectClient=id=>{ setPendingClients(p=>p.filter(x=>x.id!==id)); toast("Declined","Registration removed","info"); };

  const createProject=f=>{
    const np={id:`p${Date.now()}`,name:f.name,type:f.type,location:f.location,description:f.description,clientId:f.clientId||"",clientEmail:f.clientEmail||"",engineerId:f.engineerId||user.id,startDate:f.start,originalDuration:f.originalDuration,originalDelivery:f.originalDelivery,status:"In Progress",stages:f.stages,delays:[],isPublic:false};
    setProjects(p=>[...p,np]); setShowCreate(false);
    toast("Created",`"${f.name}" is ready`,"success");
    setSelProjId(np.id); setPage("projects");
  };
  const updateProject=up=>{ setProjects(p=>p.map(x=>x.id===up.id?up:x)); toast("Saved","Changes recorded","success"); };

  const portfolio=projects.filter(p=>p.isPublic).map(p=>({id:p.id,title:p.name,location:p.location,type:p.type,year:new Date(p.startDate||Date.now()).getFullYear().toString(),desc:p.description||""}));
  const selProject=selProjId?projects.find(p=>p.id===selProjId):null;

  useEffect(()=>{
    const s=document.createElement("style");
    s.textContent=`*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`;
    document.head.appendChild(s);
    return()=>document.head.removeChild(s);
  },[]);

  if(screen==="home")  return <PublicLanding onGoLogin={()=>setScreen("login")} company={company} portfolio={portfolio}/>;
  if(screen==="login") return <LoginScreen onLogin={login} onBack={()=>setScreen("home")} onAddPending={addPending} company={company}/>;

  const content=()=>{
    if(selProject&&page==="projects")
      return <ProjectDetail project={selProject} user={user} onUpdate={updateProject} onBack={()=>setSelProjId(null)} allUsers={users} allClients={allClients}/>;
    switch(page){
      case "dashboard": return <Dashboard user={user} projects={projects} pendingClients={pendingClients} onSelectProject={id=>{setSelProjId(id);setPage("projects");}} onNav={nav}/>;
      case "projects":  return <ProjectsList user={user} projects={projects} onSelect={id=>{setSelProjId(id);setPage("projects");}} onNew={()=>setShowCreate(true)} allUsers={users}/>;
      case "pending":   return <PendingClients pendingClients={pendingClients} onApprove={approveClient} onReject={rejectClient} user={user}/>;
      case "users":     return <ClientsList clients={allClients} user={user}/>;
      case "portfolio": return <Portfolio user={user} projects={projects}/>;
      case "about":     return <AboutPage company={company} onSave={setCompany} user={user}/>;
      case "settings":  return <Settings user={user}/>;
      default:          return <Dashboard user={user} projects={projects} pendingClients={pendingClients} onSelectProject={id=>{setSelProjId(id);setPage("projects");}} onNav={nav}/>;
    }
  };

  return (
    <Shell user={user} active={page} onNav={nav} onLogout={logout} toasts={toasts} dismissToast={id=>setToasts(p=>p.filter(t=>t.id!==id))}>
      {content()}
      {canCreateProjects(user)&&<CreateModal open={showCreate} onClose={()=>setShowCreate(false)} onCreate={createProject} currentUser={user} allClients={allClients} allEngineers={allEngineers}/>}
    </Shell>
  );
}
