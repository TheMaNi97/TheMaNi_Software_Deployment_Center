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

function persistImportedPackages(){
  localStorage.setItem(importedPackagesKey,JSON.stringify(importedPackages));
}

function packageImportKey(p){
  return `${normalizeSoftwareIdentity(p.name)}|${String(p.version||"").trim().toLowerCase()}`;
}

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

function syncImportedPackageStore(){
  const byIdentity=new Map();
  for(const p of importedPackages){
    const key=normalizeSoftwareIdentity(p.name);
    byIdentity.set(key,p);
  }
  importedPackages=[...byIdentity.values()];
  persistImportedPackages();
}

function friendlyPackageName(p){
  const file=String(p.file||p.name||"");
  if(/^7z\d{4}-/i.test(file))return "7-Zip";
  if(/^Firefox Setup/i.test(file))return "Mozilla Firefox";
  if(/^vlc[-_]/i.test(file))return "VLC media player";
  if(/^npp[._-]/i.test(file))return "Notepad++";
  return p.name||Path;
}

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
function toast(t){const e=$("toast");e.textContent=t;e.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add("hidden"),2500)}
function show(p){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===p));document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===p))}
document.querySelectorAll(".nav button").forEach(x=>x.onclick=()=>show(x.dataset.page));document.querySelectorAll("[data-go]").forEach(x=>x.onclick=()=>show(x.dataset.go));
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
function renderUninstall(){$("installed").innerHTML=installedSoftware.map(n=>{let p=packages.find(x=>x.name===n);return `<label><input type="checkbox" data-u="${n}" ${unselected.has(n)?"checked":""}><span><b>${n}</b><small>Version ${p?.version||"unbekannt"}</small></span></label>`}).join("");$("uninstallSummary").textContent=unselected.size+" Programme ausgewählt"}
$("installed").onchange=e=>{let n=e.target.dataset.u;if(!n)return;e.target.checked?unselected.add(n):unselected.delete(n);renderUninstall()};$("refresh").onclick=()=>{toast("Softwareabfrage ist noch nicht mit dem Zielcomputer verbunden.");renderUninstall()};$("startUninstall").onclick=()=>{if(!unselected.size)return toast("Bitte Programme auswählen.");if(!$("uninstallTarget").value.trim())return toast("Bitte Zielcomputer eingeben.");toast("Deinstallationsauftrag vorbereitet – noch kein Backend verbunden.")};
function renderQuery(){let q=$("querySearch").value.toLowerCase(),rows=queryData.filter(x=>x.name.toLowerCase().includes(q));$("results").innerHTML=rows.map(x=>`<tr><td>${x.name}</td><td>${x.version||"–"}</td><td><span class="pill ${x.installed?"yes":"no"}">${x.installed?"✓ Installiert":"✕ Nicht installiert"}</span></td></tr>`).join("");$("queryEmpty").classList.toggle("hidden",rows.length>0);$("queryInfo").textContent=rows.length+" Pakete"}
$("runQuery").onclick=()=>{let t=$("queryTarget").value.trim();if(!t)return toast("Bitte Zielcomputer eingeben.");queryData=packages.map(p=>({name:p.name,version:p.version,installed:installedSoftware.includes(p.name)?p.version:""}));renderQuery();$("queryStatus").textContent="Abfrage für "+t+" abgeschlossen (Demo)";$("queryStatus").className="status ok"};$("querySearch").oninput=renderQuery;
function renderPackages(){
 let q=$("packageSearch").value.toLowerCase();
 let list=packages.map((p,i)=>({...p,_i:i})).filter(p=>`${p.name} ${p.category} ${p.version}`.toLowerCase().includes(q));
 $("packageCount").textContent=packages.length+" Pakete";
 $("packageList").innerHTML=list.map(p=>`<div class="package-row ${p.disabled?"package-inactive":""}">
 <b>${p.name}</b><span>${p.version}</span><span>${p.category}</span><span class="path">${p.path}</span>
 <span class="package-actions">
 <button data-edit="${p._i}">Bearbeiten</button>
 <button data-toggle="${p._i}" class="disabled">${p.disabled?"Aktivieren":"Deaktivieren"}</button>
 <button data-delete="${p._i}" class="delete">Löschen</button>
 </span></div>`).join("");
}
function openPackageModal(index=null){
 $("packageModal").classList.remove("hidden");
 $("editPackageIndex").value=index===null?"":index;
 $("modalTitle").textContent=index===null?"Neues Softwarepaket":"Softwarepaket bearbeiten";
 if(index===null){
  $("packageForm").reset();$("editPackageIndex").value="";
  return;
 }
 const p=packages[index];
 $("pkgName").value=p.name;$("pkgVersion").value=p.version;$("pkgCategory").value=p.category;
 $("pkgPath").value=p.path;$("pkgInstallArgs").value=p.installArgs||"";
 $("pkgUninstallMethod").value=p.uninstallMethod||"Automatisch über Windows";
 $("pkgUninstallArgs").value=p.uninstallArgs||"";
 $("pkgDetectName").value=p.detectName||p.name;$("pkgDetectMethod").value=p.detectMethod||"Installierte Anwendung";
}
function closePackageModal(){$("packageModal").classList.add("hidden")}
document.querySelectorAll("[data-close-modal]").forEach(e=>e.onclick=closePackageModal);
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
 if(b.dataset.delete!==undefined){
   const i=Number(b.dataset.delete);
   if(confirm(`"${packages[i].name}" wirklich löschen?`)){
     const deleted=packages[i];
     packages.splice(i,1);
     importedPackages=importedPackages.filter(p=>p.importKey!==deleted.importKey);
     persistImportedPackages();
     renderPackages();renderInstall();renderPackageInventory();toast("Paket gelöscht.")
   }
 }
};
$("packageForm").onsubmit=e=>{
 e.preventDefault();
 const data={name:$("pkgName").value.trim(),version:$("pkgVersion").value.trim(),category:$("pkgCategory").value,path:$("pkgPath").value.trim(),installArgs:$("pkgInstallArgs").value.trim(),uninstallMethod:$("pkgUninstallMethod").value,uninstallArgs:$("pkgUninstallArgs").value.trim(),detectName:$("pkgDetectName").value.trim(),detectMethod:$("pkgDetectMethod").value};
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
  toast(`${source.name} geladen – Verbindung testen oder Quelle einlesen.`);
};
function loadSettings(){const c={...defaultConfig,...JSON.parse(localStorage.getItem("themaniDeploymentConfig")||"{}")};$("cfgOnlineEnabled").checked=!!c.onlineEnabled;$("cfgOnlineUrl").value=c.onlineUrl||"";$("cfgVerifiedOnly").checked=c.verifiedOnly!==false;$("cfgBackend").value=c.backend||"";$("cfgProtocol").value=c.protocol;$("cfgPort").value=c.port;$("cfgDomain").value=c.domain||"";$("cfgUser").value=c.user||"";$("cfgWorkgroup").checked=!!c.workgroup;$("cfgSourceType").value=c.sourceType||"smb";renderSourceFields();renderSavedSources()}
function saveSettings(){const c={sourceType:$("cfgSourceType").value,onlineEnabled:$("cfgOnlineEnabled").checked,onlineUrl:$("cfgOnlineUrl").value.trim(),verifiedOnly:$("cfgVerifiedOnly").checked,backend:$("cfgBackend").value.trim(),protocol:$("cfgProtocol").value,port:$("cfgPort").value,domain:$("cfgDomain").value.trim(),user:$("cfgUser").value.trim(),workgroup:$("cfgWorkgroup").checked};localStorage.setItem("themaniDeploymentConfig",JSON.stringify(c));toast("Konfiguration gespeichert.")}
function resetSettings(){localStorage.removeItem("themaniDeploymentConfig");localStorage.removeItem("themaniSoftwareSources");loadSettings();toast("Standardeinstellungen wiederhergestellt.")}
$("saveSettings").onclick=saveSettings;$("resetSettings").onclick=resetSettings;loadSettings();

if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js").catch(()=>{});
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
async function getCurrentSourcePayload(){
  const type=$("cfgSourceType")?.value||"local";
  const methods=accessDefinitions[type]?.methods||{};
  const access=$("src_accessMethod")?.value||Object.keys(methods)[0]||"";
  const fields=methods[access]||[];
  const data={};
  fields.forEach(([id])=>{const el=$("src_"+id);if(el)data[id]=el.value.trim();});
  return {type,access,data};
}
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


function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}


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
  document.addEventListener("DOMContentLoaded",initSourceSettings,{once:true});
}else{
  initSourceSettings();
}

// TheMaNi V27 diagnostic marker
window.THEMANI_VERSION = "V45";
console.info("[TheMaNi] Frontend V45 geladen – Demo-Quellenbestand deaktiviert.");
