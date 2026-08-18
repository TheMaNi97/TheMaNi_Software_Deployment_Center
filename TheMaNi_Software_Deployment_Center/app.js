const packages=[
{name:"7-Zip",version:"24.08",category:"Werkzeuge",path:"\\\\SERVER\\Software$\\7-Zip\\24.08\\7z2408-x64.exe"},
{name:"Mozilla Firefox",version:"128.0",category:"Browser",path:"\\\\SERVER\\Software$\\Firefox\\128.0\\FirefoxSetup.exe"},
{name:"VLC media player",version:"3.0.21",category:"Multimedia",path:"\\\\SERVER\\Software$\\VLC\\3.0.21\\vlc-win64.exe"},
{name:"Google Chrome",version:"128.0",category:"Browser",path:"\\\\SERVER\\Software$\\Chrome\\128.0\\ChromeSetup.exe"},
{name:"LibreOffice",version:"25.2.3",category:"Office",path:"\\\\SERVER\\Software$\\LibreOffice\\25.2.3\\LibreOffice.msi"},
{name:"Notepad++",version:"8.6.9",category:"Werkzeuge",path:"\\\\SERVER\\Software$\\NotepadPP\\8.6.9\\npp.exe"}];

const onlinePackages=[];
let currentSource="local";

// Packages imported from external sources are kept separately from the
// built-in demo/local catalog so they survive a page reload.
const importedPackagesKey="themaniImportedPackages_v42";
let importedPackages=[];
try{importedPackages=JSON.parse(localStorage.getItem(importedPackagesKey)||"[]");}catch{importedPackages=[];}
if(!Array.isArray(importedPackages))importedPackages=[];

// Funktion: persistImportedPackages – führt den zugehörigen Anwendungsschritt aus.
function persistImportedPackages(){
  localStorage.setItem(importedPackagesKey,JSON.stringify(importedPackages));
}

// Funktion: packageImportKey – führt den zugehörigen Anwendungsschritt aus.
function packageImportKey(p){
  return `${normalizeSoftwareIdentity(p.name)}|${String(p.version||"").trim().toLowerCase()}`;
}

// Funktion: normalizeSoftwareIdentity – führt den zugehörigen Anwendungsschritt aus.
function normalizeSoftwareIdentity(name){
  let n=String(name||"").trim().toLowerCase();
  n=n.replace(/[®™]/g,"").replace(/\s+/g," ");
  // Treat common display-name variants as the same software.
  const aliases={
    "7zip":"7-zip",
    "7 zip":"7-zip",
    "7-zip":"7-zip",
    "mozilla firefox":"firefox",
    "firefox browser":"firefox",
    "vlc media player":"vlc",
    "vlc":"vlc",
    "notepad++":"notepad++",
    "notepad plus plus":"notepad++"
  };
  return aliases[n]||n;
}

// Funktion: mergePackageIntoCatalog – führt den zugehörigen Anwendungsschritt aus.
function mergePackageIntoCatalog(incoming){
  const identity=normalizeSoftwareIdentity(incoming.name);
  const matches=[];
  packages.forEach((p,i)=>{
    if(normalizeSoftwareIdentity(p.name)===identity)matches.push(i);
  });

  if(matches.length){
    // Keep the first catalog entry and replace it with the authoritative
    // source package. Remove every duplicate of the same software name.
    const keep=matches[0];
    packages[keep]={...packages[keep],...incoming};
    for(let i=matches.length-1;i>0;i--)packages.splice(matches[i],1);
    return {index:keep,replaced:true,removedDuplicates:matches.length-1};
  }

  packages.push(incoming);
  return {index:packages.length-1,replaced:false,removedDuplicates:0};
}

// Funktion: syncImportedPackageStore – führt den zugehörigen Anwendungsschritt aus.
function syncImportedPackageStore(){
  const byIdentity=new Map();
  for(const p of importedPackages){
    const key=normalizeSoftwareIdentity(p.name);
    byIdentity.set(key,p);
  }
  importedPackages=[...byIdentity.values()];
  persistImportedPackages();
}

// Funktion: friendlyPackageName – führt den zugehörigen Anwendungsschritt aus.
function friendlyPackageName(p){
  const file=String(p.file||p.name||"");
  if(/^7z\d{4}-/i.test(file))return "7-Zip";
  if(/^Firefox Setup/i.test(file))return "Mozilla Firefox";
  if(/^vlc[-_]/i.test(file))return "VLC media player";
  if(/^npp[._-]/i.test(file))return "Notepad++";
  return p.name||Path;
}

// Funktion: packageCategory – führt den zugehörigen Anwendungsschritt aus.
function packageCategory(name){
  const n=String(name||"").toLowerCase();
  if(n.includes("firefox")||n.includes("chrome")||n.includes("edge")||n.includes("opera"))return "Browser";
  if(n.includes("vlc")||n.includes("media"))return "Multimedia";
  if(n.includes("office")||n.includes("libreoffice"))return "Office";
  if(n.includes("teams")||n.includes("discord")||n.includes("zoom"))return "Kommunikation";
  if(n.includes("7-zip")||n.includes("notepad")||n.includes("zip"))return "Werkzeuge";
  return "Sonstige";
}

for(const imported of importedPackages){
  mergePackageIntoCatalog(imported);
}
syncImportedPackageStore();
let packageInventory=[];

// Clean up duplicate software entries left by earlier V42/V43 imports.
(function cleanupDuplicateCatalog(){
  const seen=new Map();
  for(let i=packages.length-1;i>=0;i--){
    const key=normalizeSoftwareIdentity(packages[i].name);
    if(seen.has(key)){
      const keep=seen.get(key);
      const importedA=packages[i].sourceType;
      const importedB=packages[keep].sourceType;
      if(importedA==="googledrive" && importedB!=="googledrive"){
        packages[keep]={...packages[keep],...packages[i]};
      }
      packages.splice(i,1);
    }else{
      seen.set(key,i);
    }
  }
})();

const installedSoftware=[];let selected=new Set(),unselected=new Set(),queryData=[];const $=x=>document.getElementById(x);
// Funktion: toast – führt den zugehörigen Anwendungsschritt aus.
function toast(t){const e=$("toast");e.textContent=t;e.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add("hidden"),2500)}
// Funktion: show – führt den zugehörigen Anwendungsschritt aus.
function show(p){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===p));document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===p))}
document.querySelectorAll(".nav button").forEach(x=>x.onclick=()=>show(x.dataset.page));document.querySelectorAll("[data-go]").forEach(x=>x.onclick=()=>show(x.dataset.go));
// ===== TheMaNi: UI-Rendering und Seitenaktualisierung =====
// Funktion: renderInstall – führt den zugehörigen Anwendungsschritt aus.
function renderInstall(){
 const q=$("search").value.toLowerCase();
 const sourcePackages=currentSource==="local"?packages.filter(p=>!p.disabled):onlinePackages;
 $("availableCount").textContent=sourcePackages.length+" Pakete";
 $("available").innerHTML=sourcePackages.filter(p=>`${p.name} ${p.category} ${p.version}`.toLowerCase().includes(q)).map(p=>`<div class="software ${selected.has(p.name)?"selected":""}" data-name="${p.name}">
 <div><b>${p.name}</b><small>Version ${p.version} · ${p.category}</small></div><span class="symbol">${selected.has(p.name)?"✓":"＋"}</span></div>`).join("");
 $("selected").innerHTML=[...selected].map(n=>{let p=sourcePackages.find(x=>x.name===n)||packages.find(x=>x.name===n);return `<div class="software selected" data-remove="${n}"><div><b>${p.name}</b><small>Version ${p.version}</small></div><span>×</span></div>`}).join("");
 $("selectedEmpty").classList.toggle("hidden",selected.size>0);
 $("selectedCount").textContent=selected.size+" ausgewählt";
 $("installSummary").textContent=selected.size+" "+(selected.size===1?"Paket":"Pakete")+" ausgewählt";
 $("sourceModeLabel").textContent=currentSource==="local"?"Lokales Depot":"Online Depot";
 $("localSourceBtn").classList.toggle("active",currentSource==="local");
 $("onlineSourceBtn").classList.toggle("active",currentSource==="online");
 $("onlineInfo").classList.toggle("hidden",currentSource!=="online");
}
$("search").oninput=renderInstall;
$("localSourceBtn").onclick=()=>{currentSource="local";selected.clear();renderInstall()};
$("onlineSourceBtn").onclick=()=>{currentSource="online";selected.clear();renderInstall();toast("Online Depot ausgewählt.")};
$("available").onclick=e=>{let x=e.target.closest(".software");if(!x)return;selected.has(x.dataset.name)?selected.delete(x.dataset.name):selected.add(x.dataset.name);renderInstall()};$("selected").onclick=e=>{let x=e.target.closest("[data-remove]");if(x){selected.delete(x.dataset.remove);renderInstall()}};$("clear").onclick=()=>{selected.clear();renderInstall()};
// Funktion: test – führt den zugehörigen Anwendungsschritt aus.
async function test(target,status){
  const t=$(target).value.trim(), el=$(status);
  if(!t){el.textContent="Bitte Zielcomputer eingeben";return;}
  el.textContent="Verbindung wird geprüft …";
  try{
    const result=await callBackend("/api/target/test",{target:t});
    el.textContent=result.message||"Verbindung erfolgreich.";
    el.className="status ok";
    toast(result.message||"Verbindung erfolgreich.");
  }catch(err){
    el.textContent="Noch nicht verfügbar: "+err.message;
    el.className="status";
    toast("Zielverbindung: "+err.message);
  }
}
$("testInstall").onclick=()=>test("installTarget","installStatus");$("testUninstall").onclick=()=>test("uninstallTarget","uninstallStatus");
$("startInstall").onclick=()=>{if(!selected.size)return toast("Bitte Software auswählen.");if(!$("installTarget").value.trim())return toast("Bitte Zielcomputer eingeben.");toast((currentSource==="online"?"Online-":"") +"Installationsauftrag vorbereitet – Keine Backend-Verbindung.")};
// Funktion: renderUninstall – führt den zugehörigen Anwendungsschritt aus.
function renderUninstall(){$("installed").innerHTML=installedSoftware.map(n=>{let p=packages.find(x=>x.name===n);return `<label><input type="checkbox" data-u="${n}" ${unselected.has(n)?"checked":""}><span><b>${n}</b><small>Version ${p?.version||"unbekannt"}</small></span></label>`}).join("");$("uninstallSummary").textContent=unselected.size+" Programme ausgewählt"}
$("installed").onchange=e=>{let n=e.target.dataset.u;if(!n)return;e.target.checked?unselected.add(n):unselected.delete(n);renderUninstall()};$("refresh").onclick=()=>{toast("Softwareabfrage ist noch nicht mit dem Zielcomputer verbunden.");renderUninstall()};$("startUninstall").onclick=()=>{if(!unselected.size)return toast("Bitte Programme auswählen.");if(!$("uninstallTarget").value.trim())return toast("Bitte Zielcomputer eingeben.");toast("Deinstallationsauftrag vorbereitet – noch kein Backend verbunden.")};
// Funktion: renderQuery – führt den zugehörigen Anwendungsschritt aus.
function renderQuery(){let q=$("querySearch").value.toLowerCase(),rows=queryData.filter(x=>x.name.toLowerCase().includes(q));$("results").innerHTML=rows.map(x=>`<tr><td>${x.name}</td><td>${x.version||"–"}</td><td><span class="pill ${x.installed?"yes":"no"}">${x.installed?"✓ Installiert":"✕ Nicht installiert"}</span></td></tr>`).join("");$("queryEmpty").classList.toggle("hidden",rows.length>0);$("queryInfo").textContent=rows.length+" Pakete"}
$("runQuery").onclick=()=>{let t=$("queryTarget").value.trim();if(!t)return toast("Bitte Zielcomputer eingeben.");queryData=packages.map(p=>({name:p.name,version:p.version,installed:installedSoftware.includes(p.name)?p.version:""}));renderQuery();$("queryStatus").textContent="Abfrage für "+t+" abgeschlossen (Demo)";$("queryStatus").className="status ok"};$("querySearch").oninput=renderQuery;
// Funktion: renderPackages – führt den zugehörigen Anwendungsschritt aus.
function renderPackages(){
 let q=$("packageSearch").value.toLowerCase();
 let list=packages.map((p,i)=>({...p,_i:i})).filter(p=>`${p.name} ${p.category} ${p.version}`.toLowerCase().includes(q));
 $("packageCount").textContent=packages.length+" Pakete";
 $("packageList").innerHTML=list.map(p=>`<div class="package-row ${p.disabled?"package-inactive":""}">
 <b>${p.name}</b><span>${p.version}</span><span>${p.category}</span>
 <span class="path package-source-cell">${p.path||"Keine Installationsquelle hinterlegt"}</span>
 <span class="package-info-cell">
   <span class="info-point" tabindex="0" aria-label="Quellinformationen"
     data-info-source="${String(p.source||"Lokal / manuell").replace(/"/g,"&quot;")}"
     data-info-file="${String(p.file||p.path||"Nicht hinterlegt").replace(/"/g,"&quot;")}"
     data-info-status="${p.disabled?"Deaktiviert":"Verfügbar"}">?</span>
 </span>
 <span class="package-actions">
 <button data-edit="${p._i}">Bearbeiten</button>
 <button data-toggle="${p._i}" class="disabled">${p.disabled?"Aktivieren":"Deaktivieren"}</button>
 <button data-delete="${p._i}" class="delete">Löschen</button>
 </span></div>`).join("");
}

const deploymentParamState = {
  exe:new Set(), msi:new Set(), msix:new Set()
};
// Funktion: getDeployTabType – führt den zugehörigen Anwendungsschritt aus.
function getDeployTabType(){
  return document.querySelector(".deployment-tab.active")?.dataset.deployTab||"exe";
}
// Funktion: resetDeploymentParameters – führt den zugehörigen Anwendungsschritt aus.
function resetDeploymentParameters(){
  deploymentParamState.exe.clear();
  deploymentParamState.msi.clear();
  deploymentParamState.msix.clear();
  document.querySelectorAll("[data-inst-param]").forEach(e=>e.checked=false);
  $("deployRebootMode").value="installer";
  $("deployRebootDelay").value=5;
  updateDeploymentRebootFields();
}
// Funktion: updateDeploymentRebootFields – führt den zugehörigen Anwendungsschritt aus.
function updateDeploymentRebootFields(){
  const mode=$("deployRebootMode")?.value||"installer";
  const forced=mode==="force";
  const delay=$("deployRebootDelay");
  const wrap=$("deployRebootDelayWrap");
  if(delay){
    delay.disabled=!forced;
    let value=Math.floor(Number(delay.value));
    if(!Number.isFinite(value)||value<1)value=5;
    if(value>1440)value=1440;
    delay.value=value;
  }
  if(wrap)wrap.classList.toggle("deployment-disabled",!forced);
  const hint=$("deployRebootHint");
  if(hint){
    hint.textContent=mode==="installer"
      ?"Der Installer entscheidet anhand seines Ergebnisses, ob ein Neustart erforderlich ist."
      :mode==="none"
        ?"TheMaNi löst nach dem Deployment keinen automatischen Neustart aus."
        :mode==="recommend"
          ?"Nach erfolgreicher Installation wird dem Benutzer ein Neustart empfohlen. Es erfolgt kein automatischer Countdown."
          :"Der Countdown startet erst nach Abschluss aller ausgewählten Installationen und der Auswertung ihrer Ergebnisse. Mindestzeit: 1 Minute.";
  }
}
// Funktion: getDeploymentOptions – führt den zugehörigen Anwendungsschritt aus.
function getDeploymentOptions(){
  const params={exe:[...deploymentParamState.exe],msi:[...deploymentParamState.msi],msix:[...deploymentParamState.msix]};
  let rebootMode=$("deployRebootMode")?.value||"installer";
  let rebootDelay=Math.max(1,Math.min(1440,Math.floor(Number($("deployRebootDelay")?.value)||5)));
  return {params,rebootMode,rebootDelay};
}
document.querySelectorAll("[data-deploy-tab]").forEach(tab=>{
  tab.addEventListener("click",()=>{
    document.querySelectorAll("[data-deploy-tab]").forEach(t=>t.classList.toggle("active",t===tab));
    document.querySelectorAll("[data-deploy-panel]").forEach(p=>p.classList.toggle("active",p.dataset.deployPanel===tab.dataset.deployTab));
  });
});
document.querySelectorAll("[data-inst-param]").forEach(box=>{
  box.addEventListener("change",()=>{
    const type=getDeployTabType();
    if(type==="reboot")return;
    const key=box.dataset.instParam;
    if(box.checked)deploymentParamState[type].add(key);
    else deploymentParamState[type].delete(key);
  });
});
$("deployRebootMode")?.addEventListener("change",updateDeploymentRebootFields);
$("deployRebootDelay")?.addEventListener("change",updateDeploymentRebootFields);
updateDeploymentRebootFields();


const packageUninstallParamState={exe:new Set(),msi:new Set(),msix:new Set()};
// Funktion: updatePackageCustomUninstallFields – führt den zugehörigen Anwendungsschritt aus.
function updatePackageCustomUninstallFields(){
  const enabled=!!$("pkgCustomUninstall")?.checked;
  const input=$("pkgCustomUninstallCommand");
  const wrap=$("pkgCustomUninstallCommandWrap");
  if(input)input.disabled=!enabled;
  if(wrap)wrap.classList.toggle("deployment-disabled",!enabled);
}
// Funktion: resetPackageUninstallOptions – führt den zugehörigen Anwendungsschritt aus.
function resetPackageUninstallOptions(){
  packageUninstallParamState.exe.clear(); packageUninstallParamState.msi.clear(); packageUninstallParamState.msix.clear();
  document.querySelectorAll("[data-package-uninstall-param]").forEach(e=>e.checked=false);
  if($("pkgCustomUninstall"))$("pkgCustomUninstall").checked=false;
  if($("pkgCustomUninstallCommand"))$("pkgCustomUninstallCommand").value="";
  updatePackageCustomUninstallFields();
}
// Funktion: getPackageUninstallOptions – führt den zugehörigen Anwendungsschritt aus.
function getPackageUninstallOptions(){
  return {
    customUninstall:!!$("pkgCustomUninstall")?.checked,
    customUninstallCommand:$("pkgCustomUninstallCommand")?.value.trim()||"",
    uninstallParams:{exe:[...packageUninstallParamState.exe],msi:[...packageUninstallParamState.msi],msix:[...packageUninstallParamState.msix]}
  };
}
document.querySelectorAll("[data-package-uninstall-tab]").forEach(tab=>{
  tab.addEventListener("click",()=>{
    document.querySelectorAll("[data-package-uninstall-tab]").forEach(t=>t.classList.toggle("active",t===tab));
    document.querySelectorAll("[data-package-uninstall-panel]").forEach(p=>p.classList.toggle("active",p.dataset.packageUninstallPanel===tab.dataset.packageUninstallTab));
  });
});
document.querySelectorAll("[data-package-uninstall-param]").forEach(box=>{
  box.addEventListener("change",()=>{
    const type=document.querySelector("[data-package-uninstall-tab].active")?.dataset.packageUninstallTab||"exe";
    const key=box.dataset.packageUninstallParam;
    if(box.checked)packageUninstallParamState[type].add(key); else packageUninstallParamState[type].delete(key);
  });
});
$("pkgCustomUninstall")?.addEventListener("change",updatePackageCustomUninstallFields);
updatePackageCustomUninstallFields();

const uninstallParamState={exe:new Set(),msi:new Set(),msix:new Set()};
let activeUninstallPackage=null;
// Funktion: setUninstallPackageContext – führt den zugehörigen Anwendungsschritt aus.
function setUninstallPackageContext(pkg){
  activeUninstallPackage=pkg||null;
  const cb=$("uninstallUsePackageCommand"), info=$("uninstallPackageCommandInfo");
  const available=!!(pkg?.customUninstall&&pkg?.customUninstallCommand);
  if(cb){cb.disabled=!available;if(!available)cb.checked=false;}
  if(info)info.textContent=available?`Hinterlegter Befehl: ${pkg.customUninstallCommand}`:"Kein benutzerdefinierter Deinstallationsbefehl ausgewählt.";
}
// Funktion: updateUninstallRebootFields – führt den zugehörigen Anwendungsschritt aus.
function updateUninstallRebootFields(){
  const mode=$("uninstallRebootMode")?.value||"installer", forced=mode==="force";
  const delay=$("uninstallRebootDelay"), wrap=$("uninstallRebootDelayWrap");
  if(delay){
    delay.disabled=!forced;
    let value=Math.floor(Number(delay.value)); if(!Number.isFinite(value)||value<1)value=5; if(value>1440)value=1440; delay.value=value;
  }
  if(wrap)wrap.classList.toggle("deployment-disabled",!forced);
  const hint=$("uninstallRebootHint");
  if(hint)hint.textContent=mode==="installer"
    ?"Der Installer entscheidet anhand seines Ergebnisses, ob ein Neustart erforderlich ist."
    :mode==="none"
      ?"TheMaNi löst nach der Deinstallation keinen automatischen Neustart aus."
      :mode==="recommend"
        ?"Nach erfolgreicher Deinstallation wird ein Neustart empfohlen. Es erfolgt kein automatischer Countdown."
        :"Der Countdown startet erst nach Abschluss aller ausgewählten Deinstallationen und der Auswertung ihrer Ergebnisse. Mindestzeit: 1 Minute.";
}
document.querySelectorAll("[data-uninstall-tab]").forEach(tab=>{
  tab.addEventListener("click",()=>{
    document.querySelectorAll("[data-uninstall-tab]").forEach(t=>t.classList.toggle("active",t===tab));
    document.querySelectorAll("[data-uninstall-panel]").forEach(p=>p.classList.toggle("active",p.dataset.uninstallPanel===tab.dataset.uninstallTab));
  });
});
document.querySelectorAll("[data-uninstall-param]").forEach(box=>{
  box.addEventListener("change",()=>{
    const type=document.querySelector("[data-uninstall-tab].active")?.dataset.uninstallTab||"exe", key=box.dataset.uninstallParam;
    if(box.checked)uninstallParamState[type].add(key); else uninstallParamState[type].delete(key);
  });
});
$("uninstallRebootMode")?.addEventListener("change",updateUninstallRebootFields);
$("uninstallRebootDelay")?.addEventListener("change",updateUninstallRebootFields);
$("uninstallUsePackageCommand")?.addEventListener("change",()=>{
  const info=$("uninstallPackageCommandInfo");
  if(info&&activeUninstallPackage?.customUninstallCommand)
    info.textContent=$("uninstallUsePackageCommand").checked
      ?`Der hinterlegte Paketbefehl wird verwendet: ${activeUninstallPackage.customUninstallCommand}`
      :"Kein benutzerdefinierter Deinstallationsbefehl ausgewählt.";
});
updateUninstallRebootFields();

// Funktion: openPackageModal – führt den zugehörigen Anwendungsschritt aus.
function openPackageModal(index=null){
 $("packageModal").classList.remove("hidden");
 $("editPackageIndex").value=index===null?"":index;
 $("modalTitle").textContent=index===null?"Neues Softwarepaket":"Softwarepaket bearbeiten";
 if(index===null){
  $("packageForm").reset();$("editPackageIndex").value="";
 resetPackageUninstallOptions();
 $("pkgSilentInstall").checked=false;
  return;
 }
 const p=packages[index];
 $("pkgName").value=p.name;$("pkgVersion").value=p.version;$("pkgCategory").value=p.category;
 $("pkgPath").value=p.path;
 $("pkgCustomUninstall").checked=!!p.customUninstall;
 $("pkgCustomUninstallCommand").value=p.customUninstallCommand||"";
 packageUninstallParamState.exe=new Set(p.uninstallParams?.exe||[]);
 packageUninstallParamState.msi=new Set(p.uninstallParams?.msi||[]);
 packageUninstallParamState.msix=new Set(p.uninstallParams?.msix||[]);
 document.querySelectorAll("[data-package-uninstall-param]").forEach(e=>{
   const type=document.querySelector("[data-package-uninstall-tab].active")?.dataset.packageUninstallTab||"exe";
   e.checked=packageUninstallParamState[type].has(e.dataset.packageUninstallParam);
 });
 updatePackageCustomUninstallFields();
 $("pkgDetectName").value=p.detectName||p.name;$("pkgDetectMethod").value=p.detectMethod||"Installierte Anwendung";
}
// Funktion: closePackageModal – führt den zugehörigen Anwendungsschritt aus.
function closePackageModal(){$("packageModal").classList.add("hidden")}
document.querySelectorAll("[data-close-modal]").forEach(e=>e.onclick=closePackageModal);
let pendingDeletePackageIndex=null;
let activeInfoPoint=null;
let activeInfoOverlay=null;

// Funktion: hideInfoTooltip – führt den zugehörigen Anwendungsschritt aus.
function hideInfoTooltip(){
  if(activeInfoOverlay){activeInfoOverlay.remove();activeInfoOverlay=null;}
  activeInfoPoint=null;
}

// Funktion: showInfoTooltip – führt den zugehörigen Anwendungsschritt aus.
function showInfoTooltip(point){
  if(!point)return;
  hideInfoTooltip();
  activeInfoPoint=point;

  const overlay=document.createElement("div");
  overlay.className="info-tooltip-overlay";
  overlay.setAttribute("aria-hidden","true");

  const tip=document.createElement("div");
  tip.className="info-tooltip-portal";

  const title=document.createElement("b");
  title.textContent="Quellinformationen";
  tip.appendChild(title);

  const source=document.createElement("span");
  source.textContent=`Quelle: ${point.dataset.infoSource||"Lokal / manuell"}`;
  tip.appendChild(source);

  const file=document.createElement("span");
  file.textContent=`Installer: ${point.dataset.infoFile||"Nicht hinterlegt"}`;
  tip.appendChild(file);

  const status=document.createElement("span");
  status.textContent=`Status: ${point.dataset.infoStatus||"Verfügbar"}`;
  tip.appendChild(status);

  overlay.appendChild(tip);
  document.body.appendChild(overlay);
  activeInfoOverlay=overlay;

  const r=point.getBoundingClientRect();
  const margin=12;
  const gap=10;
  const width=Math.min(280,window.innerWidth-margin*2);
  tip.style.width=`${width}px`;
  tip.style.visibility="hidden";
  tip.style.opacity="0";

  requestAnimationFrame(()=>{
    if(!activeInfoOverlay)return;
    const tr=tip.getBoundingClientRect();
    let left=r.right+gap;
    let top=r.bottom+gap;

    if(left+tr.width>window.innerWidth-margin) left=r.left-tr.width-gap;
    if(top+tr.height>window.innerHeight-margin) top=r.top-tr.height-gap;

    left=Math.max(margin,Math.min(left,window.innerWidth-tr.width-margin));
    top=Math.max(margin,Math.min(top,window.innerHeight-tr.height-margin));

    tip.style.left=`${left}px`;
    tip.style.top=`${top}px`;
    tip.style.visibility="visible";
    tip.style.opacity="1";
  });
}

// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
document.addEventListener("mouseover",e=>{
  const point=e.target.closest?.(".info-point");
  if(point && point!==activeInfoPoint) showInfoTooltip(point);
});
// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
document.addEventListener("mouseout",e=>{
  const point=e.target.closest?.(".info-point");
  if(point && !point.contains(e.relatedTarget)) hideInfoTooltip();
});
// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
document.addEventListener("focusin",e=>{
  const point=e.target.closest?.(".info-point");
  if(point) showInfoTooltip(point);
});
// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
document.addEventListener("focusout",e=>{
  if(e.target.closest?.(".info-point")) hideInfoTooltip();
});
// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
window.addEventListener("scroll",hideInfoTooltip,true);
// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
window.addEventListener("resize",()=>{
  if(activeInfoPoint) showInfoTooltip(activeInfoPoint);
});

// Funktion: openDeletePackageModal – führt den zugehörigen Anwendungsschritt aus.
function openDeletePackageModal(index){
  const p=packages[index];
  if(!p)return;
  if(typeof hideInfoTooltip==="function") hideInfoTooltip();
  pendingDeletePackageIndex=index;
  $("deletePackageName").textContent=`${p.name} · Version ${p.version||"unbekannt"}`;
  $("deletePackageModal").classList.remove("hidden");
}
// Funktion: closeDeletePackageModal – führt den zugehörigen Anwendungsschritt aus.
function closeDeletePackageModal(){
  pendingDeletePackageIndex=null;
  $("deletePackageModal").classList.add("hidden");
}
// Funktion: confirmDeletePackage – führt den zugehörigen Anwendungsschritt aus.
function confirmDeletePackage(){
  if(pendingDeletePackageIndex===null)return;
  const i=pendingDeletePackageIndex;
  const deleted=packages[i];
  if(!deleted){closeDeletePackageModal();return;}
  packages.splice(i,1);
  importedPackages=importedPackages.filter(p=>p.importKey!==deleted.importKey);
  persistImportedPackages();
  renderPackages();renderInstall();renderPackageInventory();resetDeploymentParameters();
  $("homeCount").textContent=packages.length;
  closeDeletePackageModal();
  toast("Paket gelöscht.");
}
document.querySelectorAll("[data-close-delete-modal]").forEach(e=>e.onclick=closeDeletePackageModal);
$("confirmDeletePackage").onclick=confirmDeletePackage;

$("packageList").onclick=e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.edit!==undefined)openPackageModal(Number(b.dataset.edit));
 if(b.dataset.toggle!==undefined){
   const i=Number(b.dataset.toggle);
   packages[i].disabled=!packages[i].disabled;
   const importedIndex=importedPackages.findIndex(p=>p.importKey&&p.importKey===packages[i].importKey);
   if(importedIndex>=0){importedPackages[importedIndex]={...importedPackages[importedIndex],disabled:packages[i].disabled};persistImportedPackages();}
   renderPackages();renderInstall();toast(packages[i].disabled?"Paket deaktiviert.":"Paket aktiviert.");
 }
 if(b.dataset.delete!==undefined)openDeletePackageModal(Number(b.dataset.delete));
};
$("packageForm").onsubmit=e=>{
 e.preventDefault();
const data={name:$("pkgName").value.trim(),version:$("pkgVersion").value.trim(),category:$("pkgCategory").value,path:$("pkgPath").value.trim(),customUninstall:!!$("pkgCustomUninstall").checked,customUninstallCommand:$("pkgCustomUninstallCommand").value.trim(),uninstallParams:getPackageUninstallOptions().uninstallParams,detectName:$("pkgDetectName").value.trim(),detectMethod:$("pkgDetectMethod").value};
 const idx=$("editPackageIndex").value;
 if(idx===""){
   packages.push(data);
 }else{
   const i=Number(idx);
   packages[i]={...packages[i],...data};
   const importedIndex=importedPackages.findIndex(p=>p.importKey&&p.importKey===packages[i].importKey);
   if(importedIndex>=0){importedPackages[importedIndex]={...importedPackages[importedIndex],...packages[i]};persistImportedPackages();}
 }
 closePackageModal();renderPackages();renderInstall();$("homeCount").textContent=packages.length;toast(idx===""?"Paket hinzugefügt.":"Paket gespeichert.");
};

$("packageSearch").oninput=renderPackages;$("addPackage").onclick=()=>openPackageModal();$("homeCount").textContent=packages.length;renderInstall();renderUninstall();renderPackages();

const defaultConfig={sourceType:"smb",onlineEnabled:true,onlineUrl:"",verifiedOnly:true,backend:"",protocol:"WinRM / PowerShell Remoting",port:"5985",domain:"",user:"",workgroup:false};
const sourceDefinitions={
smb:{title:"SMB / Windows-Freigabe",fields:[["server","Server / IP","FILESERVER01"],["share","Freigabe","Software$"],["path","Unterordner","optional"],["user","Benutzer","optional"],["password","Passwort","Passwort"],["domain","Domäne","optional"]]},
local:{title:"Lokaler Ordner",fields:[["path","Ordnerpfad","D:\\Software"]]},
webdav:{title:"WebDAV / Nextcloud",fields:[["url","Server-Adresse","https://cloud.example.local"],["path","WebDAV-Pfad","/remote.php/dav/files/user/Software"],["user","Benutzer","Benutzername"],["password","Passwort","Passwort"]]},
https:{title:"HTTP / HTTPS",fields:[["url","Basis-Adresse","https://server.example.local/software/"],["user","Benutzer","optional"],["password","Passwort","optional"]]},
sftp:{title:"SFTP",fields:[["server","Server / IP","10.0.0.20"],["port","Port","22"],["path","Pfad","/software"],["user","Benutzer","Benutzername"],["password","Passwort","Passwort"],["key","SSH-Schlüssel","optional"]]},
ftp:{title:"FTP / FTPS",fields:[["server","Server / IP","10.0.0.20"],["port","Port","21"],["security","Verbindungssicherheit","FTP / FTPS"],["path","Pfad","/Software"],["user","Benutzer","Benutzername"],["password","Passwort","Passwort"]]},
onedrive:{title:"Microsoft OneDrive",fields:[["account","Microsoft-Konto","benutzer@example.com"],["path","Ordner","Software"]]},
sharepoint:{title:"Microsoft SharePoint",fields:[["url","SharePoint-Adresse","https://firma.sharepoint.com/sites/Software"],["path","Bibliothek / Ordner","Software"],["account","Konto","benutzer@example.com"]]},
googledrive:{title:"Google Drive",fields:[["account","Google-Konto","benutzer@example.com"],["path","Ordner","Software"]]},
dropbox:{title:"Dropbox",fields:[["account","Konto","benutzer@example.com"],["path","Ordner","/Software"]]},
s3:{title:"Amazon S3 / S3-kompatibel",fields:[["endpoint","Endpoint","https://s3.example.com"],["bucket","Bucket","software"],["region","Region","eu-central-1"],["access","Access Key",""],["secret","Secret Key",""],["path","Prefix / Ordner","software/"]]},
azureblob:{title:"Azure Blob Storage",fields:[["endpoint","Storage Endpoint","https://konto.blob.core.windows.net"],["container","Container","software"],["access","SAS / Access Key",""],["path","Prefix / Ordner",""]]},
azurefiles:{title:"Azure Files",fields:[["server","Storage Account / Server","konto.file.core.windows.net"],["share","Freigabe","software"],["user","Benutzer",""],["password","Passwort / Key",""]]},
nfs:{title:"NFS",fields:[["server","Server / IP","10.0.0.20"],["export","Export","/software"],["path","Unterordner","optional"]]}
};
let savedSources=JSON.parse(localStorage.getItem("themaniSoftwareSources")||"[]");
const accessDefinitions={
smb:{methods:{
"Benutzer / Passwort":[["server","Server / IP","FILESERVER01 oder 10.0.0.10"],["share","Freigabe","Software$"],["path","Unterordner","optional"],["user","Benutzername","z. B. Administrator"],["password","Passwort","Passwort"],["domain","Domäne","optional"]],
"Gast / anonyme Freigabe":[["server","Server / IP","FILESERVER01 oder 10.0.0.10"],["share","Freigabe","Software$"],["path","Unterordner","optional"]]}},
local:{methods:{"Lokaler Zugriff":[["path","Ordnerpfad","D:\\Software"]]}},
webdav:{methods:{
"Benutzer / App-Passwort":[["url","WebDAV-Adresse","https://cloud.example.local/remote.php/dav/files/benutzer/"],["path","Unterordner","Software"],["user","Benutzername","Benutzername"],["password","App-Passwort","App-Passwort"]],
"Öffentlicher Freigabelink":[["shareUrl","Freigabelink","https://cloud.example.local/s/xxxxxxxx"],["sharePassword","Freigabe-Passwort","optional"]]}},
https:{methods:{
"Keine Authentifizierung":[["url","Basis-Adresse","https://server.example.local/software/"]],
"Benutzer / Passwort":[["url","Basis-Adresse","https://server.example.local/software/"],["user","Benutzername","Benutzername"],["password","Passwort","Passwort"]],
"Token / API-Key":[["url","Basis-Adresse","https://server.example.local/software/"],["token","API-Key / Token","Token"]]}},
sftp:{methods:{
"Passwort":[["server","Server / IP","10.0.0.20"],["port","Port","22"],["path","Pfad","/software"],["user","Benutzername","deployment"],["password","Passwort","Passwort"]],
"SSH-Schlüssel":[["server","Server / IP","10.0.0.20"],["port","Port","22"],["path","Pfad","/software"],["user","Benutzername","deployment"],["key","SSH-Schlüssel","Schlüsseldatei"],["passphrase","Schlüssel-Passphrase","optional"]]}},
ftp:{methods:{
"Benutzer / Passwort":[["server","Server / IP","10.0.0.20"],["port","Port","21"],["path","Pfad","/Software"],["user","Benutzername","Benutzername"],["password","Passwort","Passwort"]],
"Anonym":[["server","Server / IP","10.0.0.20"],["port","Port","21"],["path","Pfad","/Software"]]}},
onedrive:{methods:{
"Freigabelink – anonym":[["shareUrl","Freigabelink","https://1drv.ms/..."]],
"Freigabelink – Organisationskonto":[["shareUrl","Freigabelink","https://1drv.ms/..."],["account","Microsoft-Konto","Konto, mit dem der Link geöffnet werden darf"]],
"Microsoft OAuth":[["account","Microsoft-Konto","wird beim Anmelden ausgewählt"],["path","Ordner","Software"]]}},
sharepoint:{methods:{
"Freigabelink – anonym":[["shareUrl","Freigabelink","https://firma.sharepoint.com/:f:/s/..."]],
"Freigabelink – Organisationskonto":[["shareUrl","Freigabelink","https://firma.sharepoint.com/:f:/s/..."],["account","Microsoft-Konto","Organisationskonto"]],
"Microsoft OAuth":[["url","SharePoint-Site","https://firma.sharepoint.com/sites/Software"],["library","Dokumentbibliothek","Dokumente"],["path","Ordner","Software"],["account","Microsoft-Konto","wird beim Anmelden ausgewählt"]]}},
googledrive:{methods:{
"Freigabelink – öffentlich":[["shareUrl","Freigabelink","https://drive.google.com/drive/folders/xxxxxxxxxxxxxxxx"]],
"Google OAuth":[["account","Google-Konto","wird beim Anmelden ausgewählt"],["path","Ordner","Software"]]}},
dropbox:{methods:{
"Freigabelink":[["shareUrl","Freigabelink","https://www.dropbox.com/scl/fo/xxxxxxxx"]],
"Dropbox OAuth":[["account","Dropbox-Konto","wird beim Anmelden ausgewählt"],["path","Ordner","Software"]]}},
s3:{methods:{
"Access Key / Secret Key":[["endpoint","Endpoint","https://s3.example.com"],["bucket","Bucket","software"],["region","Region","eu-central-1"],["access","Access Key","Access Key"],["secret","Secret Key","Secret Key"],["path","Prefix / Ordner","software/"]],
"IAM / Role":[["endpoint","Endpoint","https://s3.example.com"],["bucket","Bucket","software"],["region","Region","eu-central-1"],["path","Prefix / Ordner","software/"]]}},
azureblob:{methods:{
"Microsoft Entra ID / OAuth":[["endpoint","Storage Endpoint","https://konto.blob.core.windows.net"],["container","Container","software"],["account","Azure-Konto","wird beim Anmelden ausgewählt"],["path","Prefix / Ordner",""]],
"SAS":[["endpoint","Storage Endpoint","https://konto.blob.core.windows.net"],["container","Container","software"],["sas","SAS-Token","SAS"],["path","Prefix / Ordner",""]],
"Storage Account Key":[["endpoint","Storage Endpoint","https://konto.blob.core.windows.net"],["container","Container","software"],["access","Storage Account Key","Account Key"],["path","Prefix / Ordner",""]]}},
azurefiles:{methods:{
"SMB – Benutzer / Key":[["server","Storage Account / Server","konto.file.core.windows.net"],["share","Freigabe","software"],["user","Benutzername",""],["password","Passwort / Key",""]],
"Azure OAuth":[["server","Storage Account / Server","konto.file.core.windows.net"],["share","Freigabe","software"],["account","Azure-Konto","wird beim Anmelden ausgewählt"]]}},
nfs:{methods:{"Lokaler Netzwerkzugriff":[["server","Server / IP","10.0.0.20"],["export","Export","/software"],["path","Unterordner","optional"]]}}
};
const sourceGuidance={
googledrive:{"Freigabelink – öffentlich":"Nur den öffentlichen Google-Drive-Freigabelink einfügen. Kein Google-API-Key erforderlich.","Google OAuth":"Das Konto wird über Google OAuth gewählt; der Zielordner wird später über die Drive-API ausgewählt bzw. per ID adressiert."},
onedrive:{"Freigabelink – anonym":"Der Link muss ohne Anmeldung funktionieren. Ein Microsoft-Freigabelink kann je nach Freigabebereich auch eine Anmeldung verlangen.","Freigabelink – Organisationskonto":"Der Link wird zusammen mit einem angemeldeten Microsoft-Konto verwendet. Das Konto ersetzt nicht den Link.","Microsoft OAuth":"Für private bzw. kontrollierte OneDrive-Bestände ist OAuth die robuste Variante; Dateien werden über Microsoft Graph als driveItems abgefragt."},
sharepoint:{"Freigabelink – anonym":"Der Link muss ohne Anmeldung zugänglich sein.","Freigabelink – Organisationskonto":"Wenn der Link eine Anmeldung verlangt, wird zusätzlich ein Organisationskonto benötigt.","Microsoft OAuth":"Für einen stabilen Unternehmenszugriff werden Site, Dokumentbibliothek und Ordner über Microsoft Graph angebunden."},
dropbox:{"Freigabelink":"Für einen geteilten Ordner wird die Freigabe-URL verwendet. Private/API-basierte Zugriffe laufen über OAuth.","Dropbox OAuth":"OAuth stellt die authentifizierte API-Verbindung her; der Ordner wird anschließend über die Dropbox-API ausgewählt."},
webdav:{"Benutzer / App-Passwort":"Bei Nextcloud liegen authentifizierte Dateioperationen typischerweise unter /remote.php/dav/files/{user}/. Bei 2FA/OIDC kann ein App-Passwort erforderlich sein.","Öffentlicher Freigabelink":"Nextcloud stellt für öffentliche Shares einen eigenen /public.php/dav-Endpunkt bereit. Bei passwortgeschützten Shares wird das Share-Passwort benötigt."},
azureblob:{"Microsoft Entra ID / OAuth":"Für produktive Azure-Blob-Zugriffe ist Microsoft Entra ID die bevorzugte Variante.","SAS":"SAS kann Zugriff gezielt auf Ressourcen und Berechtigungen begrenzen.","Storage Account Key":"Technisch möglich, aber weniger bevorzugt als Entra ID oder SAS."}
};


// Funktion: openSettingsPanel – führt den zugehörigen Anwendungsschritt aus.
function openSettingsPanel(id){const p=document.getElementById(id);if(p&&p.tagName==="DETAILS")p.open=true;}

// Funktion: renderSavedSources – führt den zugehörigen Anwendungsschritt aus.
function renderSavedSources(){
  $("sourceSaved").innerHTML=savedSources.length
    ? "<b>Gespeicherte Quellen</b>"+savedSources.map((x,i)=>`
      <div class="saved-source" data-load-source="${i}" title="Quelle laden">
        <div class="saved-source-main">
          <b>${escapeHtml(x.name)}</b>
          <small>${escapeHtml(sourceDefinitions[x.type]?.title||x.type)} · ${escapeHtml(x.access||"Standardzugriff")}</small>
        </div>
        <button type="button" data-remove-source="${i}" title="Quelle entfernen">Entfernen</button>
      </div>`).join("")
    : "";
}
$("cfgSourceType").onchange=renderSourceFields;
$("testSource").onclick=testSourceConnection;
$("saveSource").onclick=()=>{
 const type=$("cfgSourceType").value;
 const methods=accessDefinitions[type]?.methods||{};
 const access=$("src_accessMethod")?.value||Object.keys(methods)[0]||"";
 const fields=methods[access]||[];
 const data={};
 fields.forEach(([id])=>{
   const el=$("src_"+id);
   if(el && !["password","secret","sharePassword","passphrase","sas","apiKey"].includes(id)) data[id]=el.value.trim();
 });
 const name=data.server||data.shareUrl||data.url||data.endpoint||data.bucket||data.container||data.account||sourceDefinitions[type]?.title||type;
 savedSources.push({name,type,access,data});
 localStorage.setItem("themaniSoftwareSources",JSON.stringify(savedSources));
 renderSavedSources();
 toast("Softwarequelle gespeichert.");
};
$("sourceSaved").onclick=e=>{
  const remove=e.target.closest("[data-remove-source]");
  if(remove){
    e.stopPropagation();
    savedSources.splice(+remove.dataset.removeSource,1);
    localStorage.setItem("themaniSoftwareSources",JSON.stringify(savedSources));
    renderSavedSources();
    return;
  }

  const card=e.target.closest("[data-load-source]");
  if(!card)return;
  const source=savedSources[Number(card.dataset.loadSource)];
  if(!source)return;

  const typeEl=$("cfgSourceType");
  if(typeEl){
    typeEl.value=source.type;
    renderSourceFields();
  }

  // renderSourceFields creates the access selector and source inputs.
  const accessEl=$("src_accessMethod");
  if(accessEl && source.access && [...accessEl.options].some(o=>o.value===source.access)){
    accessEl.value=source.access;
    renderSourceFields();
  }

  Object.entries(source.data||{}).forEach(([id,value])=>{
    const field=$("src_"+id);
    if(field)field.value=value??"";
  });

  show("settings");
  openSettingsPanel("source-settings");
  toast(`${source.name} geladen – Verbindung testen oder Quelle einlesen.`);
};
// Funktion: loadSettings – führt den zugehörigen Anwendungsschritt aus.
function loadSettings(){const c={...defaultConfig,...JSON.parse(localStorage.getItem("themaniDeploymentConfig")||"{}")};$("cfgOnlineEnabled").checked=!!c.onlineEnabled;$("cfgOnlineUrl").value=c.onlineUrl||"";$("cfgVerifiedOnly").checked=c.verifiedOnly!==false;$("cfgBackend").value=c.backend||"";$("cfgProtocol").value=c.protocol;$("cfgPort").value=c.port;$("cfgDomain").value=c.domain||"";$("cfgUser").value=c.user||"";$("cfgWorkgroup").checked=!!c.workgroup;$("cfgSourceType").value=c.sourceType||"smb";renderSourceFields();renderSavedSources();const sourcePanel=$("source-settings");if(sourcePanel)sourcePanel.open=false}
// Funktion: saveSettings – führt den zugehörigen Anwendungsschritt aus.
function saveSettings(){const c={sourceType:$("cfgSourceType").value,onlineEnabled:$("cfgOnlineEnabled").checked,onlineUrl:$("cfgOnlineUrl").value.trim(),verifiedOnly:$("cfgVerifiedOnly").checked,backend:$("cfgBackend").value.trim(),protocol:$("cfgProtocol").value,port:$("cfgPort").value,domain:$("cfgDomain").value.trim(),user:$("cfgUser").value.trim(),workgroup:$("cfgWorkgroup").checked};localStorage.setItem("themaniDeploymentConfig",JSON.stringify(c));toast("Konfiguration gespeichert.")}
// Funktion: resetSettings – führt den zugehörigen Anwendungsschritt aus.
function resetSettings(){localStorage.removeItem("themaniDeploymentConfig");localStorage.removeItem("themaniSoftwareSources");loadSettings();toast("Standardeinstellungen wiederhergestellt.")}
$("saveSettings").onclick=saveSettings;$("resetSettings").onclick=resetSettings;loadSettings();

if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
// Funktion: setupWorkgroup – führt den zugehörigen Anwendungsschritt aus.
function setupWorkgroup(domainId, wrapId, checkId){
  const domain=$(domainId), wrap=$(wrapId), check=$(checkId);
  if(!domain||!check)return;
  check.addEventListener("change",()=>{
    domain.disabled=check.checked;
    wrap.classList.toggle("domain-disabled",check.checked);
    if(check.checked) domain.value="";
  });
}
setupWorkgroup("installDomain","installDomainWrap","installWorkgroup");
setupWorkgroup("queryDomain","queryDomainWrap","queryWorkgroup");
setupWorkgroup("uninstallDomain","uninstallDomainWrap","uninstallWorkgroup");

const packageInventoryKey="themaniPackageInventory_v42";
["themaniPackageInventory","themaniPackageInventory_v27","themaniPackageInventory_v26","themaniPackageInventory_v25","themaniPackageInventory_v24"].forEach(k=>{
  try{localStorage.removeItem(k);}catch{}
});

packageInventory=JSON.parse(localStorage.getItem(packageInventoryKey)||"[]");

// Funktion: normalizePackage – führt den zugehörigen Anwendungsschritt aus.
function normalizePackage(p,source){
  const displayName=friendlyPackageName(p);
  return {
    ...p,
    name:displayName,
    originalName:p.name||"",
    category:p.category||packageCategory(displayName),
    source,
    updatedAt:new Date().toISOString()
  };
}

// Funktion: renderPackageInventory – führt den zugehörigen Anwendungsschritt aus.
function renderPackageInventory(){
  const target=$("sourcePackageInventory");
  if(!target)return;
  const list=packageInventory;
  $("sourcePackageHint").textContent=list.length
    ? `${list.length} Paket${list.length===1?"":"e"} im eingelesenen Bestand`
    : "Noch keine Quelle synchronisiert.";

  target.innerHTML=list.length
    ? list.map((p,i)=>{
        const imported=packages.some(x=>x.importKey===packageImportKey(p));
        return `<div class="package-row">
          <div>
            <b>${escapeHtml(p.name)}</b>
            <small>${escapeHtml(p.version||"Version unbekannt")} · ${escapeHtml(p.file||"")} · ${escapeHtml(p.source||"Quelle unbekannt")}</small>
          </div>
          ${p.new?'<span class="new-badge">NEU</span>':"<span></span>"}
          <button type="button" data-add-inventory="${i}" ${imported?'disabled class="secondary"':""}>
            ${imported?"✓ Übernommen":"Hinzufügen"}
          </button>
        </div>`;
      }).join("")
    : '<div class="source-empty">Noch keine Pakete eingelesen.</div>';
}
// Funktion: getCurrentSourcePayload – führt den zugehörigen Anwendungsschritt aus.
async function getCurrentSourcePayload(){
  const type=$("cfgSourceType")?.value||"local";
  const methods=accessDefinitions[type]?.methods||{};
  const access=$("src_accessMethod")?.value||Object.keys(methods)[0]||"";
  const fields=methods[access]||[];
  const data={};
  fields.forEach(([id])=>{const el=$("src_"+id);if(el)data[id]=el.value.trim();});
  return {type,access,data};
}
// Funktion: getBackendBaseUrl – führt den zugehörigen Anwendungsschritt aus.
function getBackendBaseUrl(){
  const configured=(localStorage.getItem("themaniBackendUrl")||"").trim();
  if(configured)return configured.replace(/\/+$/,"");

  // When index.html is opened directly, the browser uses file:// and
  // window.location.hostname is empty. The backend is still HTTP.
  if(window.location.protocol==="file:" || !window.location.hostname){
    return "http://127.0.0.1:8765";
  }

  return `${window.location.protocol}//${window.location.hostname}:8765`;
}


// Funktion: callBackend – führt den zugehörigen Anwendungsschritt aus.
async function callBackend(path,payload,timeoutMs=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(getBackendBaseUrl()+path,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),
      signal:controller.signal,
      cache:"no-store"
    });
    let result;
    try{result=await response.json();}
    catch{throw new Error(`Backend antwortete mit HTTP ${response.status}, aber ohne gültige JSON-Antwort.`);}
    if(!response.ok||result.ok===false)throw new Error(result.message||`Backendfehler HTTP ${response.status}.`);
    return result;
  }catch(err){
    if(err.name==="AbortError")throw new Error("Zeitüberschreitung: Das Backend antwortet nicht innerhalb von 15 Sekunden.");
    if(err instanceof TypeError)throw new Error(`Backend nicht erreichbar unter ${getBackendBaseUrl()}. Läuft das TheMaNi-Backend?`);
    throw err;
  }finally{clearTimeout(timer);}
}

// Funktion: syncInventoryFromSource – führt den zugehörigen Anwendungsschritt aus.
async function syncInventoryFromSource(){
  const status=$("scanStatus");
  const button=$("scanSource");
  const inventory=$("sourceInventory");

  if(button){
    button.disabled=true;
    button.dataset.busy="1";
    button.textContent="Quelle wird eingelesen …";
  }
  if(status){
    status.textContent="Quelle wird eingelesen …";
    status.className="status";
  }
  if(inventory) inventory.classList.remove("hidden");

  try{
    const payload=await getCurrentSourcePayload();
    const result=await callBackend("/api/source/scan",payload);

    const incoming=(result.packages||[]).map(p=>
      normalizePackage(
        p,
        sourceDefinitions[p.sourceType||payload.type]?.title ||
        sourceDefinitions[payload.type]?.title ||
        payload.type
      )
    );

    packageInventory=incoming.map(p=>({...p,new:true}));
    localStorage.setItem(packageInventoryKey,JSON.stringify(packageInventory));

    renderPackageInventory();

    const countEl=$("inventoryCount");
    if(countEl) countEl.textContent=packageInventory.length+" Softwarepakete";

    const listEl=$("inventoryList");
    if(listEl){
      listEl.innerHTML=packageInventory.length
        ? packageInventory.map((p,i)=>
            `<div class="inventory-item">
              <div>
                <b>${escapeHtml(p.name)}</b>
                <small>${escapeHtml(p.file||"")} · Version ${escapeHtml(p.version||"unbekannt")} · ${escapeHtml(p.type||"DATEI")}</small>
              </div>
              <button type="button" data-source-add="${i}">Übernehmen</button>
            </div>`
          ).join("")
        : '<div class="source-note" style="padding:12px">Keine unterstützten Installationspakete gefunden.</div>';
    }

    if(status){
      status.textContent=result.message||`Einlesen abgeschlossen – ${packageInventory.length} Pakete gefunden.`;
      status.className="status ok";
    }
    toast(result.message||"Quelle erfolgreich eingelesen.");
  }catch(err){
    if(status){
      status.textContent="Einlesen fehlgeschlagen: "+err.message;
      status.className="status error";
    }
    toast("Einlesen fehlgeschlagen: "+err.message);
  }finally{
    if(button){
      button.disabled=false;
      button.dataset.busy="0";
      button.textContent="Quelle einlesen";
    }
  }
}
// Funktion: testSourceConnection – führt den zugehörigen Anwendungsschritt aus.
async function testSourceConnection(){
  const status=$("scanStatus");
  const button=$("testSource");

  if(button){
    button.disabled=true;
    button.dataset.busy="1";
    button.textContent="Verbindung wird geprüft …";
  }
  if(status){
    status.textContent="Verbindung wird geprüft …";
    status.className="status";
  }

  try{
    const result=await callBackend("/api/source/test",await getCurrentSourcePayload());
    if(status){
      status.textContent=result.message||"Verbindung erfolgreich.";
      status.className="status ok";
    }
    toast(result.message||"Verbindung erfolgreich.");
  }catch(err){
    if(status){
      status.textContent="Verbindung fehlgeschlagen: "+err.message;
      status.className="status error";
    }
    toast("Verbindung fehlgeschlagen: "+err.message);
  }finally{
    if(button){
      button.disabled=false;
      button.dataset.busy="0";
      button.textContent="Verbindung testen";
    }
  }
}



if($("refreshSourceInventory"))$("refreshSourceInventory").onclick=syncInventoryFromSource;

// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
document.addEventListener("click",e=>{
  const add=e.target.closest("[data-add-inventory],[data-source-add]");
  if(!add)return;

  const idx=Number(add.dataset.addInventory ?? add.dataset.sourceAdd);
  const sourcePackage=packageInventory[idx];
  if(!sourcePackage)return;

  const displayName=friendlyPackageName(sourcePackage);
  const importKey=packageImportKey({...sourcePackage,name:displayName});
  const category=sourcePackage.category||packageCategory(displayName);

  const imported={
    name:displayName,
    version:sourcePackage.version||"unbekannt",
    category,
    path:sourcePackage.downloadUrl||sourcePackage.webViewLink||sourcePackage.file||"",
    file:sourcePackage.file||"",
    downloadUrl:sourcePackage.downloadUrl||"",
    webViewLink:sourcePackage.webViewLink||"",
    source:sourcePackage.source||"Externe Quelle",
    sourceType:sourcePackage.sourceType||"googledrive",
    sourceAccess:sourcePackage.sourceAccess||"Freigabelink – öffentlich",
    sourceUrl:sourcePackage.sourceUrl||"",
    importKey,
    importedAt:new Date().toISOString(),
    installArgs:"",
    uninstallMethod:"Automatisch über Windows",
    uninstallArgs:"",
    detectName:displayName,
    detectMethod:"Installierte Anwendung"
  };

  const result=mergePackageIntoCatalog(imported);

  // Keep exactly one imported copy per software identity.
  const identity=normalizeSoftwareIdentity(displayName);
  importedPackages=importedPackages.filter(
    p=>normalizeSoftwareIdentity(p.name)!==identity
  );
  importedPackages.push(packages[result.index]);
  syncImportedPackageStore();

  renderPackageInventory();
  renderPackages();
  renderInstall();
  $("homeCount").textContent=packages.length;

  if(result.replaced){
    const extra=result.removedDuplicates
      ? ` (${result.removedDuplicates} Duplikat${result.removedDuplicates===1?"":"e"} entfernt)`
      : "";
    toast(`${displayName} aktualisiert: Version ${imported.version}${extra}`);
  }else{
    toast(`${displayName} zur Softwareverwaltung hinzugefügt.`);
  }
});
renderPackageInventory();function renderSourceFields(){
  const typeEl=$("cfgSourceType");
  const container=$("sourceFields");
  if(!typeEl||!container)return;

  const type=typeEl.value;
  const definition=sourceDefinitions?.[type];
  const methods=accessDefinitions?.[type]?.methods||{};
  const methodNames=Object.keys(methods);

  // Google Drive is deliberately explicit here. This prevents the URL field
  // from disappearing if a stale configuration contains an invalid access key.
  let current=$("src_accessMethod")?.value||methodNames[0]||"";
  if(type==="googledrive" && !methodNames.includes(current)){
    current="Freigabelink – öffentlich";
  }

  let fields=methods[current]||[];
  if(type==="googledrive" && current==="Freigabelink – öffentlich"){
    fields=[
      ["shareUrl","Freigabelink","https://drive.google.com/drive/folders/xxxxxxxxxxxxxxxx"]
    ];
  }

  const title=definition?.title||(
    type==="googledrive" ? "Google Drive" : type
  );

  const accessHtml=methodNames.length>1
    ? `<label class="wide">Zugriffsart<select id="src_accessMethod">${methodNames.map(m=>`<option value="${escapeHtml(m)}" ${m===current?"selected":""}>${escapeHtml(m)}</option>`).join("")}</select></label>`
    : "";

  const fieldHtml=fields.map(([id,label,placeholder])=>{
    const secret=["password","secret","sharePassword","passphrase","sas","apiKey"].includes(id);
    const inputType=secret?"password":(id==="shareUrl"||id==="url"?"url":"text");
    return `<label>${escapeHtml(label)}<input id="src_${escapeHtml(id)}" type="${inputType}" placeholder="${escapeHtml(placeholder||"")}" autocomplete="off"></label>`;
  }).join("");

  const guidance=(sourceGuidance?.[type]?.[current]) ||
    (type==="googledrive" && current==="Freigabelink – öffentlich"
      ? "Hier den vollständigen Google-Drive-Freigabelink einfügen. Der Ordner muss für „Jeder mit dem Link“ freigegeben sein. V43 liest die öffentliche eingebettete Ordneransicht ein – kein Google-API-Key erforderlich."
      : "Die Verbindung wird über das lokale Backend aufgebaut.");

  container.innerHTML=
    `<h4>${escapeHtml(title)}</h4>`+
    `<div class="form-grid">${accessHtml}${fieldHtml}</div>`+
    `<div class="source-note">${escapeHtml(guidance)}</div>`;

  const accessEl=$("src_accessMethod");
  if(accessEl)accessEl.onchange=renderSourceFields;
  const scanControls=$("sourceScanControls");
  if(scanControls){
    scanControls.classList.remove("hidden");
  }
}


// Funktion: escapeHtml – führt den zugehörigen Anwendungsschritt aus.
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}


// Funktion: initSourceSettings – führt den zugehörigen Anwendungsschritt aus.
function initSourceSettings(){
  const source=$("cfgSourceType");
  if(!source)return;
  source.onchange=renderSourceFields;
  renderSourceFields();
  const scanButton=$("scanSource");
  if(scanButton){
    scanButton.type="button";
    scanButton.onclick=syncInventoryFromSource;
  }

  const testButton=$("testSource");
  if(testButton){
    testButton.type="button";
    testButton.onclick=testSourceConnection;
  }

}
if(document.readyState==="loading"){
  // Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
  document.addEventListener("DOMContentLoaded",initSourceSettings,{once:true});
}else{
  initSourceSettings();
}

// TheMaNi V27 diagnostic marker

/* V74 - Client Verwaltung: Ordnerstruktur + Live-Ansicht */

/* V80 - Gemeinsame Clientauswahl */
// Statusdaten: sharedClientSelections – speichert zentrale Anwendungsdaten.
const sharedClientSelections={install:null,uninstall:null,query:null};
// Funktion: sharedClientGroups – führt den zugehörigen Anwendungsschritt aus.
function sharedClientGroups(){
 const groups=[...clientManagerState.groups],result=[];
 // Funktion: walk – führt den zugehörigen Anwendungsschritt aus.
 function walk(parent,depth){
  groups.filter(g=>(g.parentId||null)===(parent||null)).forEach(g=>{
   result.push({group:g,depth,clients:clientManagerState.clients.filter(c=>c.groupId===g.id)});
   walk(g.id,depth+1);
  });
 }
 walk(null,0);return result;
}
// ===== TheMaNi: Gemeinsame Clientauswahl für Installation, Deinstallation und Abfrage =====
// Funktion: renderSharedClientSelector – führt den zugehörigen Anwendungsschritt aus.
function renderSharedClientSelector(prefix){
 const box=$(`${prefix}ClientSelect`),info=$(`${prefix}ClientInfo`);
 if(!box||!info)return;
 const label=box.querySelector(".shared-client-dropdown-label");
 const menu=box.querySelector(".shared-client-dropdown-menu");
 const current=sharedClientSelections[prefix]||"";
 // Button: Erzeugt bzw. fügt einen interaktiven Button hinzu.
 let content=`<button type="button" class="shared-client-dropdown-option root-option" data-client-id="" role="option">Client Liste</button>`;
 sharedClientGroups().forEach(({group,depth,clients})=>{
   const indent="　".repeat(depth);
   content+=`<div class="shared-client-dropdown-group">${esc(indent)}📁 ${esc(group.name)}${clients.length?"":" <span>· keine Clients</span>"}</div>`;
   clients.forEach(c=>{
     const icon=c.status==="online"?"🟢":c.status==="offline"?"🔴":"🟡";
     const selected=c.id===current?" selected":"";
     // Button: Erzeugt bzw. fügt einen interaktiven Button hinzu.
     content+=`<button type="button" class="shared-client-dropdown-option${selected}" data-client-id="${esc(c.id)}" role="option"><span>${esc(indent)}${icon} ${esc(c.name)}</span><small>${esc(c.host)}</small></button>`;
   });
 });
 menu.innerHTML=content;
 const selected=current&&clientManagerState.clients.find(c=>c.id===current);
 if(selected){
   const icon=selected.status==="online"?"🟢":selected.status==="offline"?"🔴":"🟡";
   label.textContent=`${icon} ${selected.name} · ${selected.host}`;
 }else{
   label.textContent="Client Liste";
 }
 menu.querySelectorAll("[data-client-id]").forEach(option=>{
   option.addEventListener("click",()=>{
     applySharedClientSelection(prefix,option.dataset.clientId||"");
     closeSharedClientDropdown(prefix);
   });
 });
 if(current&&!clientManagerState.clients.some(c=>c.id===current)){
   sharedClientSelections[prefix]=null;
   label.textContent="Client Liste";
 }
 renderSharedClientInfo(prefix);
}
// Funktion: closeSharedClientDropdown – führt den zugehörigen Anwendungsschritt aus.
function closeSharedClientDropdown(prefix){
 const box=$(`${prefix}ClientSelect`);
 if(!box)return;
 box.classList.remove("open");
 box.querySelector(".shared-client-dropdown-toggle")?.setAttribute("aria-expanded","false");
}
// Funktion: openSharedClientDropdown – führt den zugehörigen Anwendungsschritt aus.
function openSharedClientDropdown(prefix){
 const box=$(`${prefix}ClientSelect`);
 if(!box)return;
 document.querySelectorAll(".shared-client-dropdown.open").forEach(other=>{
   if(other!==box){
     other.classList.remove("open");
     other.querySelector(".shared-client-dropdown-toggle")?.setAttribute("aria-expanded","false");
   }
 });
 box.classList.add("open");
 box.querySelector(".shared-client-dropdown-toggle")?.setAttribute("aria-expanded","true");
}
// Funktion: renderSharedClientInfo – führt den zugehörigen Anwendungsschritt aus.
function renderSharedClientInfo(prefix){
 const info=$(`${prefix}ClientInfo`),id=sharedClientSelections[prefix],c=id&&clientManagerState.clients.find(x=>x.id===id);
 if(!info)return;
 if(!c){info.innerHTML='<span class="shared-client-placeholder">Kein Client ausgewählt.</span>';return}
 const status=c.status||"unknown",icon=status==="online"?"🟢":status==="offline"?"🔴":"🟡",label=status==="online"?"Online":status==="offline"?"Offline":"Unbekannt";
 const checked=c.lastChecked?`Zuletzt geprüft: ${esc(c.lastChecked)}`:"Noch nicht geprüft";
 const latency=typeof c.latencyMs==="number"?` · ${c.latencyMs<1?"<1":Math.round(c.latencyMs)} ms`:"";
 info.innerHTML=`<span class="shared-client-status ${status}">${icon} ${label}</span><b>${esc(c.name)}</b><span>${esc(c.host)}</span><span>${esc(c.os||"Unbekannt")}</span><small>${checked}${status==="online"?latency:""}</small>`;
}
// Funktion: applySharedClientSelection – führt den zugehörigen Anwendungsschritt aus.
function applySharedClientSelection(prefix,id){
 sharedClientSelections[prefix]=id||null;
 const c=id&&clientManagerState.clients.find(x=>x.id===id),target=$(`${prefix}Target`);
 if(c&&target){target.value=c.host||"";target.dataset.clientId=c.id}
 else if(target){target.value="";delete target.dataset.clientId}
 renderSharedClientSelector(prefix);
 renderSharedClientInfo(prefix);
}
// Funktion: refreshAllSharedClientSelectors – führt den zugehörigen Anwendungsschritt aus.
function refreshAllSharedClientSelectors(){
 ["install","uninstall","query"].forEach(renderSharedClientSelector);
}
// Funktion: initSharedClientSelectors – führt den zugehörigen Anwendungsschritt aus.
function initSharedClientSelectors(){
 ["install","uninstall","query"].forEach(prefix=>{
   const box=$(`${prefix}ClientSelect`);
   if(!box)return;
   box.querySelector(".shared-client-dropdown-toggle")?.addEventListener("click",()=>{
     if(box.classList.contains("open"))closeSharedClientDropdown(prefix);else openSharedClientDropdown(prefix);
   });
   $(`[data-client-change="${prefix}"]`)?.addEventListener("click",()=>openSharedClientDropdown(prefix));
   renderSharedClientSelector(prefix);
 });
}
// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
document.addEventListener("click",e=>{
 if(!e.target.closest(".shared-client-dropdown")&&!e.target.closest(".shared-client-change")){
   document.querySelectorAll(".shared-client-dropdown.open").forEach(box=>{
     box.classList.remove("open");
     box.querySelector(".shared-client-dropdown-toggle")?.setAttribute("aria-expanded","false");
   });
 }
});

// ===== TheMaNi: Zentrale Clientverwaltung und Clientstatus =====
// Statusdaten: clientManagerState – speichert zentrale Anwendungsdaten.
const clientManagerState={groups:[],clients:[],selectedGroupId:null,editMode:false,selectedGroupIds:new Set(),selectedClientIds:new Set()};
// Funktion: clientUid – führt den zugehörigen Anwendungsschritt aus.
function clientUid(p="client"){return `${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}
// Funktion: esc – führt den zugehörigen Anwendungsschritt aus.
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
// Funktion: group – führt den zugehörigen Anwendungsschritt aus.
function group(id){return clientManagerState.groups.find(g=>g.id===id)||null;}
// Funktion: children – führt den zugehörigen Anwendungsschritt aus.
function children(id){return clientManagerState.groups.filter(g=>(g.parentId||null)===(id||null));}
// Funktion: pathOf – führt den zugehörigen Anwendungsschritt aus.
function pathOf(id){let a=[],g=group(id);while(g){a.unshift(g.name);g=group(g.parentId);}return a;}
// Funktion: updateClientDeleteControls – führt den zugehörigen Anwendungsschritt aus.
function updateClientDeleteControls(){
 const tb=$("deleteSelectedTreeBtn"),ct=$("clientSelectToolbar");
 if(tb){tb.hidden=!clientManagerState.editMode;tb.textContent=clientManagerState.selectedGroupIds.size?`🗑 ${clientManagerState.selectedGroupIds.size} Bereiche löschen`:"🗑 Auswahl löschen";}
 if(ct){ct.hidden=!clientManagerState.editMode;const a=$("selectAllClients"),v=clientManagerState.clients.filter(c=>c.groupId===clientManagerState.selectedGroupId);if(a){a.checked=v.length>0&&v.every(c=>clientManagerState.selectedClientIds.has(c.id));a.indeterminate=v.some(c=>clientManagerState.selectedClientIds.has(c.id))&&!a.checked;}}
}
// Funktion: renderClientTree – führt den zugehörigen Anwendungsschritt aus.
function renderClientTree(){
 const tree=$("clientTree"),empty=$("clientTreeEmpty");if(!tree)return;tree.innerHTML="";
 if(empty)empty.style.display=clientManagerState.groups.length?"none":"block";
 // Funktion: branch – führt den zugehörigen Anwendungsschritt aus.
 function branch(parent,holder,level=0){children(parent).forEach(g=>{
  const kids=children(g.id),count=clientManagerState.clients.filter(c=>c.groupId===g.id).length,item=document.createElement("div");item.className=`client-tree-item level-${Math.min(level,5)}`;
  const row=document.createElement("div");row.className="client-tree-row"+(clientManagerState.selectedGroupId===g.id?" selected":"");
  // Button: Erzeugt bzw. fügt einen interaktiven Button hinzu.
  const t=document.createElement("button");t.type="button";t.className="client-tree-toggle"+(kids.length?" has-children":" empty");t.textContent=g.open?"▾":"▸";t.disabled=!kids.length;t.onclick=e=>{e.stopPropagation();if(kids.length){g.open=!g.open;renderClientTree();}};
  const f=document.createElement("span");f.className="client-folder-icon";f.textContent=g.open&&kids.length?"📂":"📁";
  const n=document.createElement("span");n.className="client-tree-name";n.textContent=g.name;
   const b=document.createElement("span");b.className="client-tree-count";b.textContent=count;
   if(clientManagerState.editMode){
    const cb=document.createElement("input");cb.type="checkbox";cb.className="client-tree-check";cb.checked=clientManagerState.selectedGroupIds.has(g.id);cb.title="Bereich zum Löschen auswählen";
    cb.onclick=e=>{e.stopPropagation();if(cb.checked)clientManagerState.selectedGroupIds.add(g.id);else clientManagerState.selectedGroupIds.delete(g.id);updateClientDeleteControls();};
    row.append(cb);
   }
   row.append(t,f,n,b);
  // Button: Erzeugt bzw. fügt einen interaktiven Button hinzu.
  if(clientManagerState.editMode){const x=document.createElement("button");x.type="button";x.className="client-tree-edit";x.textContent="✎";x.onclick=e=>{e.stopPropagation();renameGroup(g.id)};row.append(x);}
  row.onclick=()=>{clientManagerState.selectedGroupId=g.id;renderClientTree();renderLiveClients()};item.append(row);
  if(g.open&&kids.length){const sub=document.createElement("div");sub.className="client-tree-children";branch(g.id,sub,level+1);item.append(sub)}holder.append(item);
 })}const h=document.createElement("div");branch(null,h);tree.append(...h.children);
 refreshAllSharedClientSelectors();
}
// Funktion: renderLiveClients – führt den zugehörigen Anwendungsschritt aus.
function renderLiveClients(){
 const list=$("clientsList"),empty=$("clientsEmpty"),title=$("selectedClientGroupTitle"),sub=$("selectedClientGroupSubtitle"),sum=$("clientLiveSummary");if(!list)return;
 const g=group(clientManagerState.selectedGroupId),rows=clientManagerState.clients.filter(c=>c.groupId===clientManagerState.selectedGroupId);
 if(title)title.textContent=g?g.name:"Clients";if(sub)sub.textContent=g?`${pathOf(g.id).join(" › ")} · ${rows.length} Client${rows.length===1?"":"s"}`:"Wähle links eine Gruppe oder einen Bereich aus.";
 if(sum){const on=rows.filter(c=>c.status==="online").length,off=rows.filter(c=>c.status==="offline").length,unk=rows.length-on-off;sum.innerHTML=g?`<span class="client-summary-chip">Clients <b>${rows.length}</b></span><span class="client-summary-chip online">● Online <b>${on}</b></span><span class="client-summary-chip offline">● Offline <b>${off}</b></span><span class="client-summary-chip unknown">● Unbekannt <b>${unk}</b></span>`:"";}
 list.innerHTML="";empty.style.display=rows.length?"none":"block";
 rows.forEach(c=>{
  const st=c.status||"unknown",label=st==="online"?"Online":st==="offline"?"Offline":"Noch nicht geprüft";
  const os=c.os||"Unbekannt",oc=os.toLowerCase().includes("linux")?"linux":os.toLowerCase().includes("windows")?"windows":"unknown";
  const latency=typeof c.latencyMs==="number"?` · ${c.latencyMs<1?"<1":Math.round(c.latencyMs)} ms`:"";
  const checkInfo=c.lastChecked?`Zuletzt geprüft: ${esc(c.lastChecked)}${st==="online"?latency:""}`:(c.lastError?`Prüfung fehlgeschlagen: ${esc(c.lastError)}`:"Noch keine Statusprüfung durchgeführt.");
  const r=document.createElement("div");r.className="client-live-row";
  // Button: Erzeugt bzw. fügt einen interaktiven Button hinzu.
  r.innerHTML=`<span class="client-status-dot ${st}"></span><div class="client-live-main"><div class="client-name-line"><b>${esc(c.name)}</b><span class="client-status-label ${st}">${label}</span></div><div class="client-meta"><span>⌁ ${esc(c.host)}</span><span class="client-os ${oc}">▣ ${esc(os)}</span>${c.description?`<span>${esc(c.description)}</span>`:""}</div><small>${checkInfo}</small></div><div class="client-live-actions"><button class="icon-btn" data-edit="${c.id}">✎</button><button class="icon-btn danger" data-del="${c.id}">×</button></div>`;
  list.append(r)
});
 list.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>showClientDialog(clientManagerState.clients.find(c=>c.id===b.dataset.edit)));list.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deleteClient(b.dataset.del));
 list.querySelectorAll("[data-client-check]").forEach(cb=>cb.onchange=()=>{if(cb.checked)clientManagerState.selectedClientIds.add(cb.dataset.clientCheck);else clientManagerState.selectedClientIds.delete(cb.dataset.clientCheck);updateClientDeleteControls();});
 updateClientDeleteControls();
 refreshAllSharedClientSelectors();
}
// Funktion: showClientDialog – führt den zugehörigen Anwendungsschritt aus.
function showClientDialog(c=null){
  const m=document.createElement("div");
  m.className="client-modal-overlay";
  const opts=clientManagerState.groups.map(g=>`<option value="${g.id}" ${c?.groupId===g.id?"selected":""}>${esc(pathOf(g.id).join(" › "))}</option>`).join("");
  const initialStatus=c?.status||"unknown";
  const initialLabel=initialStatus==="online"?"Online":initialStatus==="offline"?"Offline":"Noch nicht geprüft";
  const initialInfo=c?.lastChecked?`Zuletzt geprüft: ${esc(c.lastChecked)}`:"Noch keine Verbindung geprüft.";
  m.innerHTML=`<div class="client-modal" role="dialog" aria-modal="true" aria-labelledby="clientModalTitle">
    <div class="modal-head">
      <div><h3 id="clientModalTitle">${c?"Client bearbeiten":"Client hinzufügen"}</h3><small>Keine Zugangsdaten werden hier gespeichert.</small></div>
      <button class="modal-close" data-close>×</button>
    </div>
    <div class="form-grid">
      <label>Clientname<input id="cfName" value="${esc(c?.name||"")}" placeholder="z. B. PC-PERS-001"></label>
      <label>Hostname / IP-Adresse<input id="cfHost" value="${esc(c?.host||"")}" placeholder="z. B. PC-PERS-001 oder 192.168.1.20"></label>
      <div class="client-connection-check wide">
        <div class="client-check-line">
          <button type="button" class="secondary" id="cfPing">↻ Verbindung prüfen</button>
          <span id="cfPingStatus" class="client-ping-status ${initialStatus}"><span class="client-status-dot ${initialStatus}"></span><b>${initialLabel}</b></span>
        </div>
        <small id="cfPingInfo">${initialInfo}</small>
      </div>
      <label>Bereich<select id="cfGroup" class="themani-select"><option value="">Kein Bereich</option>${opts}</select></label>
      <label>Betriebssystem<select id="cfOs" class="themani-select"><option ${!c?.os||c.os==="Unbekannt"?"selected":""}>Unbekannt</option><option ${c?.os==="Windows"?"selected":""}>Windows</option><option ${c?.os==="Linux"?"selected":""}>Linux</option></select></label>
      <label class="wide">Beschreibung<input id="cfDesc" value="${esc(c?.description||"")}" placeholder="z. B. Arbeitsplatz Vertrieb"></label>
    </div>
    <div class="modal-actions"><button class="secondary" data-close>Abbrechen</button><button class="secondary" id="cfSave">${c?"Speichern":"Client hinzufügen"}</button></div>
  </div>`;
  document.body.append(m);

  m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.remove());

  const pingButton=m.querySelector("#cfPing");
  const pingStatus=m.querySelector("#cfPingStatus");
  const pingInfo=m.querySelector("#cfPingInfo");
  // Keep the result inside the dialog so a newly created client can inherit
  // the optional connection test before it is inserted into the client list.
  let pendingPing = c ? {
    status: c.status || "unknown",
    lastChecked: c.lastChecked || null,
    latencyMs: typeof c.latencyMs==="number" ? c.latencyMs : null,
    lastError: c.lastError || ""
  } : {
    status: "unknown",
    lastChecked: null,
    latencyMs: null,
    lastError: ""
  };

  // Handler/Funktion: setPingUi – verarbeitet die zugehörige Aktion.
  const setPingUi=(status,info,loading=false)=>{
    const label=status==="online"?"Online":status==="offline"?"Offline":"Noch nicht geprüft";
    pingStatus.className=`client-ping-status ${status}`;
    pingStatus.innerHTML=`<span class="client-status-dot ${status}"></span><b>${label}</b>`;
    pingInfo.textContent=info;
    pingButton.disabled=loading;
    pingButton.textContent=loading?"↻ Prüfe Verbindung …":"↻ Verbindung prüfen";
  };

  pingButton.onclick=async()=>{
    const host=m.querySelector("#cfHost").value.trim();
    if(!host){setPingUi("unknown","Bitte zuerst einen Hostnamen oder eine IP-Adresse eingeben.");m.querySelector("#cfHost").focus();return}
    setPingUi("unknown","Verbindung wird geprüft …",true);
    try{
      const result=await callBackend("/api/client/ping",{host},6000);
      const now=new Date().toLocaleString("de-DE");
      pendingPing={
        status: result.status==="online" ? "online" : "offline",
        lastChecked: now,
        latencyMs: typeof result.latencyMs==="number" ? result.latencyMs : null,
        lastError: ""
      };
      if(c){
        c.status=pendingPing.status;
        c.lastChecked=pendingPing.lastChecked;
        c.latencyMs=pendingPing.latencyMs;
        c.lastError="";
      }
      const latency=typeof result.latencyMs==="number"?` · ${result.latencyMs<1?"<1":Math.round(result.latencyMs)} ms`:"";
      setPingUi(pendingPing.status,`${result.message}${pendingPing.status==="online"?latency:""} · ${now}`);
    }catch(err){
      pendingPing={
        status:"unknown",
        lastChecked:new Date().toLocaleString("de-DE"),
        latencyMs:null,
        lastError:err.message||"Verbindung konnte nicht geprüft werden."
      };
      if(c){
        c.status="unknown";
        c.lastChecked=pendingPing.lastChecked;
        c.latencyMs=null;
        c.lastError=pendingPing.lastError;
      }
      setPingUi("unknown",pendingPing.lastError);
    }
  };

  m.querySelector("#cfSave").onclick=()=>{
    const name=m.querySelector("#cfName").value.trim(),host=m.querySelector("#cfHost").value.trim();
    if(!name||!host){alert("Bitte Clientname und Hostname/IP-Adresse eingeben.");return}
    const v={
      name,
      host,
      groupId:m.querySelector("#cfGroup").value||clientManagerState.selectedGroupId||"",
      os:m.querySelector("#cfOs").value,
      description:m.querySelector("#cfDesc").value.trim()
    };
    if(c){
      Object.assign(c,v);
      c.status=pendingPing.status;
      c.lastChecked=pendingPing.lastChecked;
      c.latencyMs=pendingPing.latencyMs;
      c.lastError=pendingPing.lastError||"";
    }else{
      clientManagerState.clients.push({
        id:clientUid(),
        ...v,
        status:pendingPing.status,
        lastChecked:pendingPing.lastChecked,
        latencyMs:pendingPing.latencyMs,
        lastError:pendingPing.lastError||""
      });
    }
    renderClientTree();renderLiveClients();m.remove()
  };
}
// Funktion: addRoot – führt den zugehörigen Anwendungsschritt aus.
function addRoot(){const n=prompt("Name der Hauptgruppe:");if(!n?.trim())return;const g={id:clientUid("group"),name:n.trim(),parentId:null,open:true};clientManagerState.groups.push(g);clientManagerState.selectedGroupId=g.id;renderClientTree();renderLiveClients();}
// Funktion: addSub – führt den zugehörigen Anwendungsschritt aus.
function addSub(){const p=group(clientManagerState.selectedGroupId);if(!p){alert("Bitte zuerst links einen übergeordneten Bereich auswählen.");return}const n=prompt(`Neuer Bereich unter „${p.name}“:`);if(!n?.trim())return;const g={id:clientUid("group"),name:n.trim(),parentId:p.id,open:true};p.open=true;clientManagerState.groups.push(g);clientManagerState.selectedGroupId=g.id;renderClientTree();renderLiveClients();}
// Funktion: renameGroup – führt den zugehörigen Anwendungsschritt aus.
function renameGroup(id){const g=group(id);if(!g)return;const n=prompt("Bereich umbenennen:",g.name);if(n?.trim()){g.name=n.trim();renderClientTree();renderLiveClients()}}
// Funktion: deleteGroup – führt den zugehörigen Anwendungsschritt aus.
function deleteGroup(id){const g=group(id);if(!g)return;const ids=new Set([id]);let again=true;while(again){again=false;clientManagerState.groups.forEach(x=>{if(x.parentId&&ids.has(x.parentId)&&!ids.has(x.id)){ids.add(x.id);again=true}})}if(!confirm(`„${g.name}“ und Unterbereiche löschen?`))return;clientManagerState.groups=clientManagerState.groups.filter(x=>!ids.has(x.id));clientManagerState.clients.forEach(c=>{if(ids.has(c.groupId))c.groupId=""});if(ids.has(clientManagerState.selectedGroupId))clientManagerState.selectedGroupId=null;renderClientTree();renderLiveClients();}
// Funktion: deleteSelectedClients – führt den zugehörigen Anwendungsschritt aus.
function deleteSelectedClients(){
 const ids=[...clientManagerState.selectedClientIds];
 if(!ids.length)return;
 if(!confirm(`${ids.length} Client${ids.length===1?"":"s"} wirklich löschen?`))return;
 clientManagerState.clients=clientManagerState.clients.filter(c=>!ids.includes(c.id));
 clientManagerState.selectedClientIds.clear();renderClientTree();renderLiveClients();
}
// Funktion: deleteSelectedGroups – führt den zugehörigen Anwendungsschritt aus.
function deleteSelectedGroups(){
 const selected=[...clientManagerState.selectedGroupIds];
 if(!selected.length)return;
 const ids=new Set(selected);let changed=true;
 while(changed){changed=false;clientManagerState.groups.forEach(g=>{if(g.parentId&&ids.has(g.parentId)&&!ids.has(g.id)){ids.add(g.id);changed=true;}});}
 const count=clientManagerState.clients.filter(c=>ids.has(c.groupId)).length;
 if(!confirm(`${selected.length} Bereich${selected.length===1?"":"e"} ausgewählt. ${ids.size-selected.length} Unterbereich(e) und ${count} zugeordnete Client(s) werden entfernt. Fortfahren?`))return;
 clientManagerState.groups=clientManagerState.groups.filter(g=>!ids.has(g.id));
 clientManagerState.clients.forEach(c=>{if(ids.has(c.groupId))c.groupId=""});
 clientManagerState.selectedGroupIds.clear();if(ids.has(clientManagerState.selectedGroupId))clientManagerState.selectedGroupId=null;
 renderClientTree();renderLiveClients();
}
// Funktion: deleteClient – führt den zugehörigen Anwendungsschritt aus.
function deleteClient(id){const c=clientManagerState.clients.find(x=>x.id===id);if(c&&confirm(`Client „${c.name}“ wirklich löschen?`)){clientManagerState.clients=clientManagerState.clients.filter(x=>x.id!==id);clientManagerState.selectedClientIds.delete(id);renderClientTree();renderLiveClients()}}
// Funktion: refreshClientStatuses – führt den zugehörigen Anwendungsschritt aus.
async function refreshClientStatuses(){
  const button=$("refreshClientStatusBtn");
  if(button){button.disabled=true;button.classList.add("loading");button.textContent="↻ Prüfe Clients …";}
  renderLiveClients();
  try{
    const clients=[...clientManagerState.clients];
    const now=new Date().toLocaleString("de-DE");
    const batchSize=8;
    for(let i=0;i<clients.length;i+=batchSize){
      const batch=clients.slice(i,i+batchSize);
      await Promise.all(batch.map(async c=>{
        try{
          const result=await callBackend("/api/client/ping",{host:c.host},6000);
          c.status=result.status==="online"?"online":"offline";
          c.lastChecked=now;
          c.latencyMs=typeof result.latencyMs==="number"?result.latencyMs:null;
        }catch(err){
          c.status="unknown";
          c.lastChecked=now;
          c.lastError=err.message||"Statusprüfung fehlgeschlagen.";
          c.latencyMs=null;
        }
      }));
      renderLiveClients();
    }
  }finally{
    if(button){
      button.disabled=false;
      button.classList.remove("loading");
      button.textContent="↻ Status prüfen";
    }
  }
}
// Funktion: toggleEdit – führt den zugehörigen Anwendungsschritt aus.
function toggleEdit(){
 clientManagerState.editMode=!clientManagerState.editMode;
 if(!clientManagerState.editMode){clientManagerState.selectedGroupIds.clear();clientManagerState.selectedClientIds.clear();}
 const b=$("clientEditModeBtn");b.classList.toggle("active",clientManagerState.editMode);b.textContent=clientManagerState.editMode?"✓ Bearbeitungsmodus aktiv":"✎ Bearbeitungsmodus";
 renderClientTree();renderLiveClients();updateClientDeleteControls();
}
// ===== TheMaNi: Clientkonfiguration als lokale JSON-Datei speichern =====
// Funktion: saveClientConfiguration – führt den zugehörigen Anwendungsschritt aus.
function saveClientConfiguration(){
 const p={
  format:"TheMaNi Client Configuration",
  version:2,
  savedAt:new Date().toISOString(),
  groups:clientManagerState.groups.map(g=>({id:g.id,name:g.name,parentId:g.parentId||null,open:!!g.open})),
  clients:clientManagerState.clients.map(c=>({id:c.id,name:c.name,host:c.host,groupId:c.groupId||"",os:c.os||"Unbekannt",description:c.description||""}))
 };
 let filename=window.prompt("Dateiname für die Client-Konfiguration:", "TheMaNi_ClientConfig");
 if(filename===null)return;
 filename=filename.trim().replace(/[\\/:*?"<>|]/g,"_");
 if(!filename)filename="TheMaNi_ClientConfig";
 if(!/\.json$/i.test(filename))filename+=".json";
 const blob=new Blob([JSON.stringify(p,null,2)],{type:"application/json"});
 const u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),1000);
}
// Funktion: loadClientConfiguration – führt den zugehörigen Anwendungsschritt aus.
function loadClientConfiguration(file){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d?.format!=="TheMaNi Client Configuration"||!Array.isArray(d.groups)||!Array.isArray(d.clients))throw 0;clientManagerState.groups=d.groups.map(g=>({id:String(g.id),name:String(g.name||"Unbenannt"),parentId:g.parentId?String(g.parentId):null,open:g.open!==false}));clientManagerState.clients=d.clients.map(c=>({id:String(c.id),name:String(c.name||""),host:String(c.host||""),groupId:String(c.groupId||""),os:String(c.os||"Unbekannt"),description:String(c.description||""),status:"unknown",lastChecked:null}));clientManagerState.selectedGroupId=clientManagerState.groups[0]?.id||null;renderClientTree();renderLiveClients();alert("Client-Konfiguration wurde lokal geladen.")}catch(e){alert("Ungültige TheMaNi Client-Konfiguration.")}};r.readAsText(file);}
// Funktion: initClientManagement – führt den zugehörigen Anwendungsschritt aus.
function initClientManagement(){
 if(!clientManagerState.groups.length){const s={id:clientUid("group"),name:"Server",parentId:null,open:true};clientManagerState.groups=[s,...["Empfang","Vertrieb","Support Desk"].map(n=>({id:clientUid("group"),name:n,parentId:s.id,open:true}))];clientManagerState.selectedGroupId=s.id}
 $("deleteSelectedTreeBtn")?.addEventListener("click",deleteSelectedGroups);
 $("deleteSelectedClientsBtn")?.addEventListener("click",deleteSelectedClients);
 $("selectAllClients")?.addEventListener("change",e=>{const v=clientManagerState.clients.filter(c=>c.groupId===clientManagerState.selectedGroupId);v.forEach(c=>e.target.checked?clientManagerState.selectedClientIds.add(c.id):clientManagerState.selectedClientIds.delete(c.id));renderLiveClients();});
$("addClientBtn")?.addEventListener("click",()=>{
  if(!clientManagerState.selectedGroupId){
    alert("Bitte zuerst links einen Bereich auswählen, dem der Client zugeordnet werden soll.");
    return;
  }
  showClientDialog();
});$("addClientRootGroupBtn")?.addEventListener("click",addRoot);$("addClientSubGroupBtn")?.addEventListener("click",addSub);$("clientEditModeBtn")?.addEventListener("click",toggleEdit);$("refreshClientStatusBtn")?.addEventListener("click",refreshClientStatuses);$("saveClientConfigBtn")?.addEventListener("click",saveClientConfiguration);$("loadClientConfigBtn")?.addEventListener("click",()=>$("clientConfigFileInput")?.click());$("clientConfigFileInput")?.addEventListener("change",e=>{if(e.target.files?.[0])loadClientConfiguration(e.target.files[0]);e.target.value=""});renderClientTree();renderLiveClients();initSharedClientSelectors()
}
// Ereignisbehandlung: Reagiert auf ein Benutzer- oder Systemereignis.
document.addEventListener("DOMContentLoaded",initClientManagement);

window.THEMANI_VERSION = "V92";
console.info("[TheMaNi] Frontend V72 geladen – Demo-Quellenbestand deaktiviert.");


// ===== TheMaNi: Sprachumschaltung Deutsch/Englisch =====
const THEMANI_I18N = {"Interne Softwareverteilung & Rechnerverwaltung":"Internal software deployment & computer management","● Bereit":"● Ready","⌂ Startseite":"⌂ Home","▣ Installation":"▣ Installation","▱ Deinstallation":"▱ Uninstallation","⌕ Abfrage":"⌕ Query","⚙ Softwareverwaltung":"⚙ Software Management","▤ Client Verwaltung":"▤ Client Management","⚙ Einstellungen":"⚙ Settings","Software zentral auswählen, Rechner prüfen und Pakete kontrolliert verteilen.":"Select software centrally, check computers and deploy packages in a controlled way.","Noch nicht verbunden":"Not connected yet","Pakete":"Packages","Lokale Webanwendung":"Local web application","Software installieren":"Install software","Software auswählen und auf Zielrechnern verteilen.":"Select software and deploy it to target computers.","Verbindung testen":"Test connection","Softwarequelle":"Software source","Wähle, woher die Installationspakete bezogen werden.":"Choose where the installation packages are sourced.","Lokales Depot":"Local repository","Interner Fileserver / Software-Share":"Internal file server / software share","Online Depot":"Online repository","Geprüfte Pakete aus dem Internet":"Verified packages from the internet","Zielcomputer":"Target computer","🖥 Zielclient":"🖥 Target client","Client aus der zentralen Client Verwaltung auswählen.":"Select a client from the central Client Management.","Client wechseln":"Change client","Client Liste":"Client List","Kein Client ausgewählt.":"No client selected.","Computername / IP":"Computer name / IP","Domäne":"Domain","Benutzer":"Username","Passwort":"Password","Rechner ist Mitglied einer Arbeitsgruppe":"Computer is a workgroup member","Die Zugangsdaten werden später nur für die jeweilige Verbindung verwendet und nicht in der Web-App gespeichert.":"The credentials are only used for the respective connection and are not stored in the web app.","Noch nicht geprüft":"Not checked yet","Installationsparameter":"Installation parameters","Parameter werden nur für dieses Deployment verwendet.":"Parameters are only used for this deployment.","↻ Neustart":"↻ Restart","Silent / unbeaufsichtigte Installation (häufig verwendet)":"Silent / unattended installation (commonly used)","Silent-Installation (installerabhängig)":"Silent installation (installer dependent)","Sehr stille Installation (z. B. Inno Setup)":"Very silent installation (e.g. Inno Setup)","Stille Installation (installerabhängig)":"Silent installation (installer dependent)","Minimale Benutzerinteraktion (installerabhängig)":"Minimal user interaction (installer dependent)","Automatischen Neustart unterdrücken":"Suppress automatic restart","Keine Benutzeroberfläche":"No user interface","Grundlegende Benutzeroberfläche":"Basic user interface","Unbeaufsichtigte Installation mit Fortschrittsanzeige":"Unattended installation with progress display","Neustart unterdrücken":"Suppress restart","Bei notwendigem Neustart nachfragen":"Prompt if restart is required","Nach der Installation neu starten":"Restart after installation","Ausführliches Windows-Installer-Log":"Detailed Windows Installer log","Laufende Apps des Pakets beenden":"Close running apps from the package","Update unabhängig von der Versionsrichtung zulassen":"Allow update regardless of version direction","Alle verfügbaren Ressourcen installieren":"Install all available resources","Registrierung zurückstellen, wenn das Paket verwendet wird":"Defer registration when the package is in use","Neustartverhalten":"Restart behavior","Installer entscheidet":"Installer decides","Kein Neustart":"No restart","Neustart empfehlen":"Recommend restart","Neustart erzwingen":"Force restart","Neustart nach":"Restart after","Minuten":"minutes","Der Installer entscheidet anhand seines Ergebnisses, ob ein Neustart erforderlich ist.":"The installer decides based on its result whether a restart is required.","Diese Pakete werden später über das abgesicherte Backend aus dem Internet bezogen.":"These packages will later be retrieved from the internet through the secured backend.","Verfügbare Software":"Available software","Ausgewählt":"Selected","Auswahl leeren":"Clear selection","Noch keine Software ausgewählt.":"No software selected yet.","0 Pakete ausgewählt":"0 packages selected","PowerShell-Ausführung wird später angebunden.":"PowerShell execution will be connected later.","Installation starten":"Start installation","Software deinstallieren":"Uninstall software","Installierte Software prüfen und gezielt entfernen.":"Check installed software and remove selected applications.","Installierte Software":"Installed software","Noch keine Abfrage durchgeführt":"No query performed yet","↻ Abfrage aktualisieren":"↻ Refresh query","Deinstallationsquelle":"Uninstallation source","TheMaNi verwendet standardmäßig die in Windows hinterlegte Deinstallation.":"TheMaNi uses the uninstall information registered in Windows by default.","Benutzerdefinierten Deinstallationsbefehl aus dem Softwarepaket verwenden":"Use the custom uninstall command from the software package","Wird nur aktiv, wenn beim ausgewählten Softwarepaket ein eigener Deinstallationsbefehl hinterlegt wurde.":"Enabled only when a custom uninstall command is configured for the selected software package.","Kein benutzerdefinierter Deinstallationsbefehl ausgewählt.":"No custom uninstall command selected.","Deinstallationsparameter":"Uninstallation parameters","Die Parameter gelten nur für diese Deinstallation.":"The parameters apply only to this uninstallation.","Stille Deinstallation":"Silent uninstallation","EXE-Parameter sind installerabhängig. Deshalb werden nur die wichtigsten Optionen angeboten.":"EXE parameters depend on the installer. Only the most important options are therefore provided.","Nach der Deinstallation neu starten":"Restart after uninstallation","0 Programme ausgewählt":"0 programs selected","Nur ausgewählte Programme werden entfernt.":"Only selected programs will be removed.","Deinstallation starten":"Start uninstallation","Softwarebestand abfragen":"Query software inventory","Software, Version und Installationsstatus eines Zielrechners anzeigen.":"Display software, version and installation status of a target computer.","Abfrage starten":"Start query","Noch keine Abfrage durchgeführt.":"No query performed yet.","Softwarestatus":"Software status","Keine Daten":"No data","Software":"Software","Version":"Version","Status":"Status","Softwareverwaltung":"Software Management","Pakete und Installationsinformationen verwalten.":"Manage packages and installation information.","＋ Neues Paket hinzufügen":"＋ Add new package","Softwarepakete":"Software packages","Kategorie":"Category","Installer-Pfad":"Installer path","Aktionen":"Actions","Client Verwaltung":"Client Management","Clients und Gruppen verwalten, Status prüfen und die Konfiguration lokal speichern.":"Manage clients and groups, check status and save the configuration locally.","✎ Bearbeitungsmodus":"✎ Edit mode","＋ Client hinzufügen":"＋ Add client","💾 Lokal speichern":"💾 Save locally","📂 Lokal laden":"📂 Load locally","Clientstruktur":"Client structure","Wähle einen Bereich aus, um dessen Clients rechts live anzuzeigen.":"Select an area to display its clients live on the right.","＋ Hauptgruppe":"＋ Main group","＋ Bereich":"＋ Area","🗑 Auswahl löschen":"🗑 Delete selection","Noch keine Clientstruktur vorhanden.":"No client structure available yet.","Clients":"Clients","Wähle links eine Gruppe oder einen Bereich aus.":"Select a group or area on the left.","↻ Status prüfen":"↻ Check status","Alle Clients auswählen":"Select all clients","Keine Clients in diesem Bereich.":"No clients in this area.","Einstellungen":"Settings","Zentrale Konfiguration für Softwarequellen, Backend und Standardwerte.":"Central configuration for software sources, backend and defaults.","Lokale Konfiguration":"Local configuration","Softwarequellen":"Software sources","Verbindungstyp auswählen – die passenden Eingabefelder erscheinen automatisch.":"Select a connection type – the relevant fields will appear automatically.","Quelle":"Source","SMB / Windows-Freigabe":"SMB / Windows share","Lokaler Ordner":"Local folder","Zugriffsart":"Access type","Freigabelink – öffentlich":"Public share link","Freigabelink":"Share link","Nur den öffentlichen Google-Drive-Freigabelink einfügen. Kein Google-API-Key erforderlich.":"Enter only the public Google Drive sharing link. No Google API key is required.","🔎 Quelle einlesen":"🔎 Load source","Noch keine Verbindung hergestellt":"No connection established yet","0 Dateien":"0 files","Quelle speichern":"Save source","Online Software-Depot":"Online software repository","Optionaler Paketkatalog für einfache Installationen und Paketkataloge.":"Optional package catalog for simple installations and package catalogs.","Depot-Katalog / API":"Repository catalog / API","Online Depot aktivieren":"Enable online repository","Nur verifizierte Pakete verwenden":"Use verified packages only","Backend / PowerShell":"Backend / PowerShell","Adresse und Verbindungsart des späteren internen Backends für Remote-PowerShell und Softwareverteilung.":"Address and connection type of the future internal backend for remote PowerShell and software deployment.","Backend-Adresse":"Backend address","Verbindungsart":"Connection type","Standard-Port":"Default port","Standardwerte für Zielrechner":"Default values for target computers","Diese Werte werden später automatisch in Installation, Deinstallation und Abfrage vorgeschlagen.":"These values will later be suggested automatically in Installation, Uninstallation and Query.","Standard-Domäne":"Default domain","Standardbenutzer":"Default username","Rechner standardmäßig als Arbeitsgruppe behandeln":"Treat computers as workgroup by default","Sicherheit":"Security","Hinweise zum Umgang mit Zugangsdaten und Passwörtern.":"Notes on handling credentials and passwords.","Standardeinstellungen":"Default settings","Konfiguration speichern":"Save configuration","Softwarepaket löschen":"Delete software package","Sie sind dabei, das Softwarepaket zu löschen.":"You are about to delete the software package.","Abbrechen":"Cancel","Bestätigen":"Confirm","Neues Softwarepaket":"New software package","Allgemeine Angaben":"General information","Softwarename":"Software name","Browser":"Browser","Office":"Office","Werkzeuge":"Tools","Multimedia":"Multimedia","Kommunikation":"Communication","Sonstige":"Other","Installationsdatei":"Installation file","Die Installationsparameter werden beim späteren Deployment anhand des Installer-Typs ausgewählt.":"Installation parameters are selected later during deployment based on the installer type.","Benutzerdefinierten Deinstallationsbefehl verwenden":"Use custom uninstall command","Wenn aktiviert, wird der unten hinterlegte Befehl für dieses Softwarepaket verwendet.":"When enabled, the command below is used for this software package.","Deinstallationsbefehl":"Uninstall command","Erkennung":"Detection","Erkennungsname":"Detection name","Erkennungsmethode":"Detection method","Installierte Anwendung":"Installed application","Datei vorhanden":"File exists","Eigene PowerShell-Prüfung":"Custom PowerShell check","Paket speichern":"Save package"};
const THEMANI_I18N_ATTR = {
  "e.g. PC-023 or 10.0.0.23":"z. B. PC-023 oder 10.0.0.23",
  "e.g. COMPANY":"z. B. FIRMA",
  "e.g. Administrator":"z. B. Administrator",
  "Enter password":"Passwort eingeben"
};
let theManiLanguage = localStorage.getItem("themani_language") || "de";

// Funktion: theManiTranslateText – übersetzt einen einzelnen UI-Text ohne Benutzerdaten anzutasten.
function theManiTranslateText(value) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (theManiLanguage === "de") {
    const reverse = Object.create(null);
    Object.entries(THEMANI_I18N).forEach(([de,en]) => reverse[en]=de);
    return value.replace(trimmed, reverse[trimmed] || trimmed);
  }
  return value.replace(trimmed, THEMANI_I18N[trimmed] || trimmed);
}

// Funktion: theManiTranslateDOM – übersetzt sichtbare Texte und relevante Eingabeattribute.
function theManiTranslateDOM() {
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n=>{ n.nodeValue=theManiTranslateText(n.nodeValue); });
  document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{
    const original=el.getAttribute("data-i18n-original-placeholder") || el.getAttribute("placeholder");
    if(!el.hasAttribute("data-i18n-original-placeholder")) el.setAttribute("data-i18n-original-placeholder",original);
    const value=theManiTranslateText(original);
    el.setAttribute("placeholder",value);
  });
  document.documentElement.lang=theManiLanguage;
  document.querySelectorAll(".language-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.language===theManiLanguage));
}

// Funktion: theManiSetLanguage – speichert die Auswahl und aktualisiert die Oberfläche.
function theManiSetLanguage(language) {
  theManiLanguage=language==="en"?"en":"de";
  localStorage.setItem("themani_language",theManiLanguage);
  theManiTranslateDOM();
}

// Ereignisbehandlung: Reagiert auf die beiden Sprachbuttons.
document.addEventListener("click",event=>{
  const btn=event.target.closest(".language-btn");
  if(btn) theManiSetLanguage(btn.dataset.language);
});

// Beobachter: Übersetzt dynamisch erzeugte Oberflächenelemente.
const theManiI18nObserver=new MutationObserver(()=>{
  if(theManiLanguage==="en") theManiTranslateDOM();
});
theManiI18nObserver.observe(document.body,{childList:true,subtree:true});

// Initialisierung: Stellt die gespeicherte Sprache nach dem Laden wieder her.
document.addEventListener("DOMContentLoaded",()=>theManiTranslateDOM());
