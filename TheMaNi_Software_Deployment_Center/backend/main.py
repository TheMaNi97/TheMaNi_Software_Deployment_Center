import json
import mimetypes
import os
import threading
import webbrowser
import platform
import subprocess
import ipaddress
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

# ===== TheMaNi: Pfade, Konfiguration und lokale Anwendungsdaten =====
# Konfiguration: APP_ROOT – legt eine zentrale Anwendungseinstellung fest.
APP_ROOT = Path(__file__).resolve().parent.parent
# Konfiguration: CONFIG_DIR – legt eine zentrale Anwendungseinstellung fest.
CONFIG_DIR = APP_ROOT / "config"
# Konfiguration: DATA_DIR – legt eine zentrale Anwendungseinstellung fest.
DATA_DIR = APP_ROOT / "data"
CONFIG_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# Konfiguration: HOST – legt eine zentrale Anwendungseinstellung fest.
HOST = "0.0.0.0"
# Konfiguration: PORT – legt eine zentrale Anwendungseinstellung fest.
PORT = 8765

# Konfiguration: CONFIG_FILE – legt eine zentrale Anwendungseinstellung fest.
CONFIG_FILE = CONFIG_DIR / "settings.json"
if not CONFIG_FILE.exists():
    CONFIG_FILE.write_text(json.dumps({
        "version": 1,
        "sources": []
    }, indent=2, ensure_ascii=False), encoding="utf-8")

# ===== TheMaNi: JSON-Konfiguration lesen und schreiben =====
# Funktion: read_json – führt den zugehörigen Backend-Schritt aus.
def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

# Funktion: write_json – führt den zugehörigen Backend-Schritt aus.
def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# ===== TheMaNi: Unterstützte Software-/Installer-Dateitypen =====
# Konfiguration: EXECUTABLE_EXTENSIONS – legt eine zentrale Anwendungseinstellung fest.
EXECUTABLE_EXTENSIONS = {
    ".exe", ".msi", ".msix", ".msixbundle", ".appx", ".appxbundle",
    ".cmd", ".bat", ".ps1"
}

# ===== TheMaNi: Google-Drive-Quelle prüfen und Ordner-ID ermitteln =====
# Funktion: extract_drive_folder_id – führt den zugehörigen Backend-Schritt aus.
def extract_drive_folder_id(share_url):
    if not share_url:
        raise ValueError("Google-Drive-Freigabelink fehlt.")
    parsed = urlparse(share_url)
    match = re.search(r"/folders/([A-Za-z0-9_-]+)", parsed.path)
    if match:
        return match.group(1)
    # Also accept a bare file/folder ID as a convenience.
    if re.fullmatch(r"[A-Za-z0-9_-]{10,}", share_url.strip()):
        return share_url.strip()
    raise ValueError("Die Google-Drive-URL konnte nicht als Ordner-Freigabelink erkannt werden.")

# Funktion: google_drive_api_get – führt den zugehörigen Backend-Schritt aus.
def google_drive_api_get(url, api_key, resource_key=None):
    if not api_key:
        raise ValueError(
            "Für das Einlesen eines öffentlichen Google-Drive-Ordners wird "
            "ein Google-Drive-API-Key benötigt. Bitte in den Quelleinstellungen eintragen."
        )
    sep = "&" if "?" in url else "?"
    full = url + sep + "key=" + quote(api_key, safe="")
    headers = {"Accept": "application/json"}
    if resource_key:
        headers["X-Goog-Drive-Resource-Keys"] = resource_key
    req = Request(full, headers=headers, method="GET")
    try:
        with urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        if exc.code == 403:
            raise ValueError(
                "Google Drive hat den Zugriff verweigert (HTTP 403). "
                "Prüfe API-Key, Drive API-Aktivierung und die Freigabe des Ordners."
            )
        if exc.code == 404:
            raise ValueError(
                "Der Google-Drive-Ordner wurde nicht gefunden oder ist über den Link nicht erreichbar."
            )
        raise ValueError(f"Google-Drive-API Fehler HTTP {exc.code}: {detail[:300]}")
    except URLError as exc:
        raise ValueError(f"Google Drive konnte nicht erreicht werden: {exc.reason}")

# Funktion: infer_version_from_filename – führt den zugehörigen Backend-Schritt aus.
def infer_version_from_filename(name):
    """Extract common software versions from installer filenames.

    Besides dotted versions (25.01, 3.0.21, 153.0.3), handle 7-Zip's
    compact release naming such as 7z2501 -> 25.01.
    """
    stem = Path(name).stem

    # 7-Zip uses compact filenames such as 7z2501-x64.msi / 7z2501.exe.
    # The release 25.01 is represented by the digits 2501.
    m7z = re.search(r"(?i)(?:^|[-_\s])7z(\d{2})(\d{2})(?:[-_\s.]|$)", stem)
    if m7z:
        compact = m7z.group(1) + m7z.group(2)
        return f"{compact[:2]}.{compact[2:]}"

    # Standard dotted versions, e.g. 25.01, 3.0.21, 153.0.3.
    m = re.search(r"(?<!\d)(\d+(?:\.\d+){1,3})(?!\d)", stem)
    return m.group(1) if m else ""

# Funktion: normalize_drive_package – führt den zugehörigen Backend-Schritt aus.
def normalize_drive_package(file):
    name = file.get("name", "")
    suffix = Path(name).suffix.lower()
    return {
        "name": Path(name).stem,
        "version": infer_version_from_filename(name) or "unbekannt",
        "file": name,
        "type": suffix.lstrip(".").upper() or "DATEI",
        "mimeType": file.get("mimeType", ""),
        "id": file.get("id", ""),
        "size": file.get("size"),
        "modifiedTime": file.get("modifiedTime"),
        "webViewLink": file.get("webViewLink", "")
    }

# ===== TheMaNi: Öffentliches Software-Depot einlesen =====
# Funktion: scan_google_drive_public – führt den zugehörigen Backend-Schritt aus.
def scan_google_drive_public(source):
    data = source.get("data") or source
    share_url = data.get("shareUrl", "")
    api_key = data.get("apiKey", "")
    resource_key = data.get("resourceKey", "")
    if not resource_key:
        resource_key = parse_qs(urlparse(share_url).query).get("resourcekey", [""])[0]
    folder_id = extract_drive_folder_id(share_url)

    packages = []
    page_token = None
    while True:
        params = [
            "fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,resourceKey)",
            "pageSize=1000",
            "q=" + quote("'" + folder_id + "' in parents and trashed = false", safe="")
        ]
        if page_token:
            params.append("pageToken=" + quote(page_token, safe=""))
        url = "https://www.googleapis.com/drive/v3/files?" + "&".join(params)
        result = google_drive_api_get(url, api_key, resource_key)
        for file in result.get("files", []):
            suffix = Path(file.get("name", "")).suffix.lower()
            if suffix in EXECUTABLE_EXTENSIONS:
                packages.append(normalize_drive_package(file))
        page_token = result.get("nextPageToken")
        if not page_token:
            break

    return {
        "ok": True,
        "implemented": True,
        "type": "googledrive",
        "access": "Freigabelink – öffentlich",
        "folderId": folder_id,
        "packages": packages,
        "count": len(packages),
        "message": f"{len(packages)} installierbare Pakete gefunden."
    }


from html.parser import HTMLParser

# ===== TheMaNi: Lokale API-Anfragen und Backend-Endpunkte =====
# Klasse: DriveFileLinkParser – bündelt zugehörige Backend-Funktionen.
class DriveFileLinkParser(HTMLParser):
    """Extract file links and their visible names from Google's embedded folder view."""
    # Funktion: __init__ – führt den zugehörigen Backend-Schritt aus.
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.current_href=None
        self.current_text=[]
        self.items=[]

    # Funktion: handle_starttag – führt den zugehörigen Backend-Schritt aus.
    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        attrs=dict(attrs)
        href=attrs.get("href","")
        if href:
            self.current_href=href
            self.current_text=[]

    # Funktion: handle_endtag – führt den zugehörigen Backend-Schritt aus.
    def handle_endtag(self, tag):
        if tag.lower() != "a" or not self.current_href:
            return
        text=" ".join(self.current_text).strip()
        self.items.append((self.current_href,text))
        self.current_href=None
        self.current_text=[]

    # Funktion: handle_data – führt den zugehörigen Backend-Schritt aus.
    def handle_data(self, data):
        if self.current_href and data and data.strip():
            self.current_text.append(data.strip())

# Funktion: _decode_drive_html – führt den zugehörigen Backend-Schritt aus.
def _decode_drive_html(value):
    import html as _html
    value=_html.unescape(value or "")
    value=value.replace("\\u003d","=").replace("\\u0026","&")
    value=value.replace("\\/","/")
    return value

# Funktion: _normalise_drive_filename – führt den zugehörigen Backend-Schritt aus.
def _normalise_drive_filename(value):
    value=_decode_drive_html(value).strip()
    value=value.replace("\\\"","\"")
    return value

# Funktion: _extract_drive_file_id – führt den zugehörigen Backend-Schritt aus.
def _extract_drive_file_id(value):
    value=_decode_drive_html(value)
    m=re.search(r"https?://drive\.google\.com/file/d/([A-Za-z0-9_-]{20,})",value)
    return m.group(1) if m else ""

# Funktion: _extract_embedded_drive_items – führt den zugehörigen Backend-Schritt aus.
def _extract_embedded_drive_items(html):
    """Return (file_id, filename) pairs from the embedded folder view.

    The embedded folder view is not a documented Drive API. It is used here
    only for public-link mode so users do not need to create a Google Cloud
    project/API key. Google may change this representation in the future.
    """
    html=_decode_drive_html(html)
    found={}

    # Most versions expose direct file links in the embedded HTML.
    parser=DriveFileLinkParser()
    parser.feed(html)
    for href,text in parser.items:
        fid=_extract_drive_file_id(href)
        if not fid:
            continue
        name=_normalise_drive_filename(text)
        if name and Path(name).suffix.lower() in EXECUTABLE_EXTENSIONS:
            found[fid]=name

    # Also inspect raw HTML for direct file URLs. Try to associate a nearby
    # quoted filename when the anchor text is not present.
    file_re=re.compile(
        r'https://drive\.google\.com/file/d/([A-Za-z0-9_-]{20,})/view(?:\?[^"\'<>\s]*)?',
        re.I
    )
    for m in file_re.finditer(html):
        fid=m.group(1)
        if fid in found:
            continue
        window=html[max(0,m.start()-700):min(len(html),m.end()+700)]
        candidates=re.findall(r'"name"\s*:\s*"((?:\\.|[^"\\]){1,300})"',window,re.I)
        for candidate in candidates:
            name=_normalise_drive_filename(candidate)
            if Path(name).suffix.lower() in EXECUTABLE_EXTENSIONS:
                found[fid]=name
                break

    # Final fallback: collect any explicit "name" values that are installer
    # filenames. This is useful with older embedded-folder HTML variants.
    if not found:
        for m in re.finditer(r'"name"\s*:\s*"((?:\\.|[^"\\]){1,300})"',html,re.I):
            name=_normalise_drive_filename(m.group(1))
            if Path(name).suffix.lower() in EXECUTABLE_EXTENSIONS:
                # There may be no ID in this representation; retain a
                # deterministic synthetic key so the package is still listed.
                found["name:"+name]=name

    return sorted(
        [{"id":fid if not fid.startswith("name:") else "", "name":name}
         for fid,name in found.items()],
        key=lambda x:x["name"].casefold()
    )

# Funktion: fetch_public_drive_embedded_html – führt den zugehörigen Backend-Schritt aus.
def fetch_public_drive_embedded_html(share_url):
    folder_id=extract_drive_folder_id(share_url)
    parsed=urlparse(share_url)
    query=parse_qs(parsed.query)
    resource_key=query.get("resourcekey",[""])[0]

    url=f"https://drive.google.com/embeddedfolderview?id={quote(folder_id,safe='')}"
    if resource_key:
        url += "&resourcekey="+quote(resource_key,safe="")
    url += "#list"

    req=Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/140.0 Safari/537.36"
            ),
            "Accept":"text/html,application/xhtml+xml"
        },
        method="GET"
    )
    try:
        with urlopen(req,timeout=25) as response:
            return response.geturl(),response.read().decode("utf-8","replace")
    except HTTPError as exc:
        detail=exc.read().decode("utf-8",errors="replace")
        if exc.code in (401,403):
            raise ValueError(
                "Google Drive verweigert den öffentlichen Zugriff (HTTP "
                f"{exc.code}). Prüfe, ob der Ordner wirklich auf „Jeder mit "
                "dem Link“ gestellt ist und ob der Freigabelink ggf. einen "
                "resourcekey enthält."
            )
        if exc.code==404:
            raise ValueError("Der Google-Drive-Ordner wurde nicht gefunden oder ist nicht öffentlich erreichbar.")
        raise ValueError(f"Google Drive antwortete mit HTTP {exc.code}: {detail[:250]}")
    except URLError as exc:
        raise ValueError(f"Google Drive konnte nicht erreicht werden: {exc.reason}")

# Funktion: scan_google_drive_public_no_api – führt den zugehörigen Backend-Schritt aus.
def scan_google_drive_public_no_api(source):
    data=source.get("data") or source
    share_url=data.get("shareUrl","").strip()
    if not share_url:
        raise ValueError("Google-Drive-Freigabelink fehlt.")

    parsed=urlparse(share_url)
    if parsed.scheme not in ("http","https") or "drive.google.com" not in parsed.netloc:
        raise ValueError("Bitte einen gültigen Google-Drive-Freigabelink eintragen.")

    folder_id=extract_drive_folder_id(share_url)
    final_url,html=fetch_public_drive_embedded_html(share_url)

    if not html or len(html)<500:
        raise ValueError("Google Drive hat keine verwertbare Ordneransicht geliefert.")

    items=_extract_embedded_drive_items(html)
    packages=[]
    for item in items:
        name=item["name"]
        fid=item["id"]
        package={
            "name":Path(name).stem,
            "version":infer_version_from_filename(name) or "unbekannt",
            "file":name,
            "type":Path(name).suffix.lstrip(".").upper(),
            "mimeType":"",
            "id":fid,
            "size":None,
            "modifiedTime":None,
            "webViewLink":(
                f"https://drive.google.com/file/d/{fid}/view"
                if fid else share_url
            ),
            "downloadUrl":(
                f"https://drive.usercontent.google.com/download?id={quote(fid,safe='')}&export=download"
                if fid else ""
            )
        }
        packages.append(package)

    return {
        "ok":True,
        "implemented":True,
        "type":"googledrive",
        "access":"Freigabelink – öffentlich",
        "folderId":folder_id,
        "packages":packages,
        "count":len(packages),
        "message":(
            f"{len(packages)} installierbare Pakete gefunden."
            if packages else
            "Der öffentliche Google-Drive-Ordner wurde erreicht, aber es wurden "
            "keine unterstützten Installationsdateien gefunden. Unterstützt "
            "werden aktuell EXE, MSI, MSIX, MSIXBundle, APPX, APPXBundle, CMD, BAT und PS1."
        ),
        "sourceUrl":share_url,
        "resolvedUrl":final_url
    }


# Funktion: ping_client_target – führt den zugehörigen Backend-Schritt aus.
def ping_client_target(target, timeout_ms=1800):
    """Ping one hostname/IP without a shell.

    Returns a small, frontend-friendly result. A failed ICMP echo is treated
    as offline; malformed input or a missing ping executable is reported as
    an error instead of silently looking like an offline client.
    """
    target = str(target or "").strip()
    if not target:
        raise ValueError("Hostname/IP-Adresse fehlt.")

    # Keep the target intentionally strict: hostname, IPv4/IPv6 and common
    # Windows DNS names are accepted, but shell metacharacters are rejected.
    if re.search(r'[\s;&|`$<>"]', target):
        raise ValueError("Ungültiger Hostname bzw. ungültige IP-Adresse.")

    system = platform.system().lower()
    if system == "windows":
        command = ["ping", "-n", "1", "-w", str(int(timeout_ms)), target]
        process_timeout = max(3.0, timeout_ms / 1000 + 1.0)
    else:
        # Linux: -W is timeout per reply in seconds.
        wait_seconds = max(1, int((timeout_ms + 999) / 1000))
        command = ["ping", "-c", "1", "-W", str(wait_seconds), target]
        process_timeout = max(3.0, wait_seconds + 1.0)

    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            errors="replace",
            timeout=process_timeout,
            shell=False
        )
    except FileNotFoundError:
        raise RuntimeError(
            "Das Systemprogramm „ping“ wurde auf dem Rechner des TheMaNi-Backends nicht gefunden."
        )
    except subprocess.TimeoutExpired:
        return {
            "status": "offline",
            "reachable": False,
            "host": target,
            "latencyMs": None,
            "message": "Keine Antwort innerhalb des Prüfzeitraums."
        }
    except OSError as exc:
        raise RuntimeError(f"Ping konnte nicht ausgeführt werden: {exc}")

    if completed.returncode == 0:
        latency = None
        output = (completed.stdout or "") + "\n" + (completed.stderr or "")
        # Windows: time=12ms / time<1ms; Linux: time=12.3 ms
        match = re.search(r'time[=<]\s*(\d+(?:[.,]\d+)?)\s*ms', output, re.I)
        if match:
            try:
                latency = float(match.group(1).replace(",", "."))
            except ValueError:
                latency = None
        return {
            "status": "online",
            "reachable": True,
            "host": target,
            "latencyMs": latency,
            "message": "Ping beantwortet."
        }

    return {
        "status": "offline",
        "reachable": False,
        "host": target,
        "latencyMs": None,
        "message": "Keine Ping-Antwort erhalten."
    }

# Klasse: Handler – bündelt zugehörige Backend-Funktionen.
class Handler(BaseHTTPRequestHandler):
    server_version = "TheMaNiBackend/0.1"

    # Funktion: log_message – führt den zugehörigen Backend-Schritt aus.
    def log_message(self, fmt, *args):
        print("[TheMaNi]", fmt % args)

    # Funktion: send_json – führt den zugehörigen Backend-Schritt aus.
    def send_json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        # CORS headers are required on the ACTUAL response as well as OPTIONS.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(raw)

    # Funktion: do_GET – führt den zugehörigen Backend-Schritt aus.
    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/health":
            return self.send_json(200, {
                "ok": True,
                "application": "TheMaNi Software Deployment Center",
                "backend": "standalone",
                "version": "0.1"
            })

        if path == "/api/target/test":
            return self.send_json(501, {
                "ok": False,
                "implemented": False,
                "message": "Zielcomputer-Connector ist noch nicht implementiert."
            })

        if path == "/api/config":
            return self.send_json(200, read_json(CONFIG_FILE, {"version": 1, "sources": []}))

        if path == "/":
            return self.serve_file(APP_ROOT / "index.html")

        # Static frontend files
        rel = path.lstrip("/")
        candidate = (APP_ROOT / rel).resolve()
        try:
            candidate.relative_to(APP_ROOT.resolve())
        except ValueError:
            return self.send_json(403, {"error": "forbidden"})

        if candidate.is_file():
            return self.serve_file(candidate)

        return self.send_json(404, {"error": "not_found"})

    # Funktion: do_OPTIONS – führt den zugehörigen Backend-Schritt aus.
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    # Funktion: do_POST – führt den zugehörigen Backend-Schritt aus.
    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            return self.send_json(400, {"error": "invalid_json"})

        if path == "/api/config":
            if not isinstance(body, dict):
                return self.send_json(400, {"error": "config_must_be_object"})
            write_json(CONFIG_FILE, body)
            return self.send_json(200, {"ok": True})
        if path == "/api/client/ping":
            try:
                target = body.get("host", "")
                result = ping_client_target(target)
                return self.send_json(200, {
                    "ok": True,
                    "implemented": True,
                    **result
                })
            except ValueError as exc:
                return self.send_json(400, {
                    "ok": False,
                    "implemented": True,
                    "status": "unknown",
                    "message": str(exc)
                })
            except RuntimeError as exc:
                return self.send_json(500, {
                    "ok": False,
                    "implemented": True,
                    "status": "unknown",
                    "message": str(exc)
                })


        if path == "/api/health":
            return self.send_json(200, {
                "ok": True,
                "service": "TheMaNi Backend",
                "version": "0.1"
            })

        if path == "/api/source/test":
            source_type = body.get("type", "unknown")
            access = body.get("access", "unknown")
            if source_type == "googledrive" and access == "Freigabelink – öffentlich":
                try:
                    result = scan_google_drive_public_no_api(body)
                    if result["count"] == 0:
                        return self.send_json(200, {
                            "ok": True,
                            "implemented": True,
                            "type": source_type,
                            "access": access,
                            "count": 0,
                            "message": "Google Drive ist erreichbar, aber es wurden keine unterstützten Installationsdateien gefunden."
                        })
                    return self.send_json(200, {
                        "ok": True,
                        "implemented": True,
                        "type": source_type,
                        "access": access,
                        "count": result["count"],
                        "message": f"Google Drive erreichbar – {result['count']} unterstützte Pakete gefunden."
                    })
                except Exception as exc:
                    return self.send_json(400, {
                        "ok": False,
                        "implemented": True,
                        "type": source_type,
                        "access": access,
                        "message": str(exc)
                    })
            return self.send_json(400, {
                "ok": False,
                "implemented": False,
                "type": source_type,
                "access": access,
                "message": "Für diese Quelle ist noch kein echter Connector verfügbar."
            })

        if path == "/api/source/scan":
            source_type = body.get("type", "unknown")
            access = body.get("access", "unknown")

            if source_type == "googledrive" and access == "Freigabelink – öffentlich":
                try:
                    result = scan_google_drive_public_no_api(body)
                    return self.send_json(200, result)
                except Exception as exc:
                    return self.send_json(400, {
                        "ok": False,
                        "implemented": True,
                        "type": source_type,
                        "access": access,
                        "packages": [],
                        "message": str(exc)
                    })

            return self.send_json(200, {
                "ok": False,
                "implemented": False,
                "type": source_type,
                "access": access,
                "packages": [],
                "message": "Für diese Quelle ist der echte Connector noch nicht implementiert."
            })

        return self.send_json(404, {"error": "not_found"})

    # Funktion: serve_file – führt den zugehörigen Backend-Schritt aus.
    def serve_file(self, path):
        mime, _ = mimetypes.guess_type(str(path))
        if path.suffix == ".js":
            mime = "application/javascript"
        elif path.suffix == ".css":
            mime = "text/css"
        elif path.suffix == ".json":
            mime = "application/json"

        try:
            data = path.read_bytes()
        except OSError:
            return self.send_json(404, {"error": "not_found"})

        self.send_response(200)
        self.send_header("Content-Type", (mime or "application/octet-stream") + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

# Funktion: start – führt den zugehörigen Backend-Schritt aus.
def start():
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"TheMaNi läuft auf http://{HOST}:{PORT}")
    print("Backend beenden mit STRG+C.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

# ===== TheMaNi: Backend-Server starten =====
if __name__ == "__main__":
    start()
