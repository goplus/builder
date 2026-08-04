#!/usr/bin/env python3
"""Unpack / inspect / validate / pack XBuilder course-series packages (`.xbcs.zip`).

The importer takes an archive almost entirely at face value, so a malformed one fails mid-import
rather than being rejected up front. `validate` encodes what the importer actually requires;
`pack` writes archives the way the app's exporter does — file entries only, no directory entries,
because the `.xbp` loader turns every zip entry into a project file.

Usage:
    xbcs.py unpack   <archive.xbcs.zip> <outdir>
    xbcs.py pack     <dir> <archive.xbcs.zip>
    xbcs.py validate <archive.xbcs.zip | dir>
    xbcs.py inspect  <archive.xbcs.zip | dir>
"""

import json
import os
import re
import sys
import unicodedata
import zipfile
from urllib.parse import urlparse

MANIFEST = "course-series.json"
FORMAT = "xbuilder-course-series"
# The importer accepts exactly one version and rejects every other with the same opaque
# "Unsupported course series file format". v2 (upstream #3381) is v1 minus `courses[].references`.
# Which one a package must declare is decided by the DEPLOYMENT it is imported into, not by this
# checkout — exporting from the target and reading its version is the reliable way to know.
VERSIONS = {1, 2}
CURRENT_VERSION = 2

# Mirrors ext2mime in spx-gui/src/utils/file.ts — anything else uploads with no MIME type.
KNOWN_EXTS = {
    "png", "jpg", "jpeg", "gif", "svg", "bmp", "webp", "avif",
    "mp3", "wav", "ogg", "webm", "json", "spx", "gmx", "md", "hash",
}

LIMITS = {
    "course_title": 200,
    "course_prompt": 4000,
    "series_title": 200,
    "series_description": 400,
    "project_name": 100,
}

JUNK = re.compile(r"(^|/)(__MACOSX|\.DS_Store|\._)")
PROJECT_NAME = re.compile(r"^[\w-]+$")
LARGE_FILE = 8 * 1024 * 1024
BIG_THUMBNAIL = 2 * 1024 * 1024

IMAGE_MAGIC = [
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"\xff\xd8\xff", "jpg"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
    (b"BM", "bmp"),
]


# --------------------------------------------------------------------------- reading


def read_archive(path):
    """Return {entry_path: bytes} for an archive, plus the raw ZipInfo list."""
    with zipfile.ZipFile(path) as zf:
        infos = zf.infolist()
        data = {i.filename: zf.read(i) for i in infos if not i.filename.endswith("/")}
    return data, infos


def read_dir(root):
    """Return {entry_path: bytes} for an unpacked tree, with projects/<N>/ re-zipped in memory."""
    manifest = json.loads(_read(os.path.join(root, MANIFEST)))
    data = {MANIFEST: canonical_manifest_bytes(manifest)}
    for thumb in thumbnail_paths(manifest):
        p = os.path.join(root, thumb)
        if os.path.isfile(p):
            data[thumb] = _read(p)
    for project in manifest.get("projects", []):
        rel = project.get("path")
        if not isinstance(rel, str):
            continue
        src = os.path.join(root, strip_ext(rel))
        if os.path.isdir(src):
            data[rel] = zip_tree(src)
        elif os.path.isfile(os.path.join(root, rel)):
            data[rel] = _read(os.path.join(root, rel))
    return data, None


def load(target):
    """Read either an archive or an unpacked directory into the same in-memory shape."""
    if os.path.isdir(target):
        return read_dir(target)
    return read_archive(target)


def _read(path):
    with open(path, "rb") as f:
        return f.read()


def strip_ext(path):
    base, _ = os.path.splitext(path)
    return base


def thumbnail_paths(manifest):
    paths = []
    series_thumb = (manifest.get("courseSeries") or {}).get("thumbnail") or {}
    if isinstance(series_thumb.get("path"), str):
        paths.append(series_thumb["path"])
    for course in manifest.get("courses") or []:
        thumb = course.get("thumbnail") or {}
        if isinstance(thumb.get("path"), str):
            paths.append(thumb["path"])
    return paths


def canonical_manifest_bytes(manifest):
    return json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")


# --------------------------------------------------------------------------- writing


def zip_bytes(entries):
    """Zip an in-memory {path: bytes} map. File entries only, fixed timestamps.

    Directory entries are what break `.xbp` — the loader ingests each one as a zero-byte project
    file with an empty name. Nothing here can produce one, which is the point of this helper.
    """
    import io

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for name in sorted(entries):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.external_attr = 0o644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, entries[name])
    return buf.getvalue()


def zip_tree(root):
    entries = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != "__MACOSX"]
        for name in filenames:
            if name == ".DS_Store" or name.startswith("._"):
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            entries[rel] = _read(full)
    return zip_bytes(entries)


# --------------------------------------------------------------------------- commands


def cmd_unpack(archive, outdir):
    data, infos = read_archive(archive)
    if MANIFEST not in data:
        wrapped = [i.filename for i in infos if i.filename.endswith("/" + MANIFEST)]
        hint = f" (found it nested at {wrapped[0]} — the archive has a wrapping folder)" if wrapped else ""
        die(f"missing {MANIFEST}{hint}")
    manifest = json.loads(data[MANIFEST].decode("utf-8-sig"))

    os.makedirs(outdir, exist_ok=True)
    write_file(os.path.join(outdir, MANIFEST), canonical_manifest_bytes(manifest))
    for thumb in thumbnail_paths(manifest):
        if thumb in data:
            write_file(os.path.join(outdir, thumb), data[thumb])

    projects = 0
    for project in manifest.get("projects", []):
        rel = project.get("path")
        if not isinstance(rel, str) or rel not in data:
            continue
        dest = os.path.join(outdir, strip_ext(rel))
        explode(data[rel], dest)
        projects += 1

    print(f"unpacked {len(manifest.get('courses', []))} courses, {projects} projects -> {outdir}")
    print(f"edit under {outdir}, then: xbcs.py pack {outdir} <out.xbcs.zip>")


def explode(xbp_bytes, dest):
    import io

    with zipfile.ZipFile(io.BytesIO(xbp_bytes)) as zf:
        for info in zf.infolist():
            if info.filename.endswith("/"):
                continue
            write_file(os.path.join(dest, *info.filename.split("/")), zf.read(info))


def write_file(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)


def cmd_pack(root, out):
    if not out.endswith(".xbcs.zip"):
        die(f"output must end in .xbcs.zip (the import file picker filters on it): {out}")
    manifest = json.loads(_read(os.path.join(root, MANIFEST)))
    entries = {MANIFEST: canonical_manifest_bytes(manifest)}

    for thumb in thumbnail_paths(manifest):
        src = os.path.join(root, thumb)
        if not os.path.isfile(src):
            die(f"manifest declares {thumb} but it is not in {root}")
        entries[thumb] = _read(src)

    for project in manifest.get("projects", []):
        rel = project.get("path")
        if not isinstance(rel, str):
            die(f"project entry without a path: {project}")
        src = os.path.join(root, strip_ext(rel))
        if os.path.isdir(src):
            entries[rel] = zip_tree(src)
        elif os.path.isfile(os.path.join(root, rel)):
            entries[rel] = _read(os.path.join(root, rel))
        else:
            die(f"manifest declares {rel} but neither {strip_ext(rel)}/ nor {rel} exists in {root}")

    with open(out, "wb") as f:
        f.write(zip_bytes(entries))
    size = os.path.getsize(out)
    print(f"packed {len(manifest.get('projects', []))} projects -> {out} ({size:,} bytes)")
    print(f"now verify it: xbcs.py validate '{out}'")


def cmd_inspect(target):
    data, _ = load(target)
    manifest = json.loads(data[MANIFEST].decode("utf-8-sig"))
    series = manifest.get("courseSeries") or {}
    print(f"series : {series.get('title')!r}  ({len(manifest.get('courses', []))} courses, "
          f"{len(manifest.get('projects', []))} projects)")
    print(f"{'#':>3}  {pad('title', 26)} {pad('judge', 8)} {pad('complete', 16)} "
          f"{pad('opening', 26)} apis")
    for i, course in enumerate(manifest.get("courses", [])):
        cfg = course_config(course.get("prompt", "")) or {}
        complete = cfg.get("complete") or {}
        complete_s = f"{complete.get('log')}×{complete.get('count')}" if complete else ""
        require = (complete.get("require") or {}).get("code") if complete else None
        if require:
            complete_s += " +" + "+".join(require)
        opening = "+".join("/".join(sorted(s)) for s in (cfg.get("opening") or []) if isinstance(s, dict))
        print(f"{i + 1:>3}  {pad(course.get('title', ''), 26)} {pad(cfg.get('judge') or '', 8)} "
              f"{pad(complete_s, 16)} {pad(opening, 26)} {','.join(cfg.get('apis') or [])}")


def display_width(s):
    """CJK titles are double-width, so len() misaligns every column in the inspect table."""
    return sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in str(s))


def pad(s, n):
    s = str(s)
    if display_width(s) > n:
        kept = ""
        for c in s:
            if display_width(kept + c) > n - 1:
                break
            kept += c
        s = kept + "…"
    return s + " " * max(0, n - display_width(s))


def course_config(prompt):
    """Parse the leading ```jsonc block of a course prompt. None if absent or unparseable."""
    block = re.search(r"```jsonc\s*\n([\s\S]*?)\n```", prompt or "")
    if block is None:
        return None
    try:
        return json.loads(strip_jsonc(block.group(1)))
    except json.JSONDecodeError:
        return None


# --------------------------------------------------------------------------- validate


class Report:
    """Collects findings and collapses repeats.

    One systemic fault (a repack, a bad asset convention) hits every project in the series. Printing
    it 31 times buries the two hand-edit mistakes that are the actual news, so findings tagged with
    the same `kind` print once with the affected locations listed after them.
    """

    def __init__(self):
        self.findings = []

    def error(self, msg, kind=None, where=None):
        self.findings.append(("ERROR", kind, where, msg))

    def warn(self, msg, kind=None, where=None):
        self.findings.append(("WARN", kind, where, msg))

    @property
    def errors(self):
        return [f for f in self.findings if f[0] == "ERROR"]

    def finish(self, target):
        for level in ("ERROR", "WARN"):
            for members in self._groups(level):
                print(f"{level:<5}  {members[0][1]}")
                if len(members) > 1:
                    places = [w for w, _ in members if w]
                    shown = ", ".join(places[:6])
                    more = f" (+{len(places) - 6} more)" if len(places) > 6 else ""
                    print(f"         ↳ same in {len(members)} places: {shown}{more}")

        errors, warns = len(self.errors), len(self.findings) - len(self.errors)
        name = os.path.basename(target.rstrip("/")) or target
        if errors:
            print(f"\n{errors} error(s), {warns} warning(s) — {name} will not import cleanly.")
            return 1
        print(f"\n0 errors, {warns} warning(s) — {name} is structurally sound.")
        print("If the import still fails, it isn't the file: check that whoever imports is signed in "
              "as the account owning the series (a non-owner creates duplicate projects, then 403s), "
              "and that a previous partial import didn't leave the series half-updated.")
        return 0

    def _groups(self, level):
        groups, order = {}, []
        for lv, kind, where, msg in self.findings:
            if lv != level:
                continue
            key = kind if kind is not None else ("~unique", len(order))
            if key not in groups:
                groups[key] = []
                order.append(key)
            groups[key].append((where, msg))
        return [groups[k] for k in order]


def cmd_validate(target):
    r = Report()
    is_archive = not os.path.isdir(target)

    if is_archive and not target.endswith(".xbcs.zip"):
        r.error(f"filename must end in .xbcs.zip — the import file picker filters on that exact "
                f"suffix, so {os.path.basename(target)} cannot even be selected")

    try:
        data, infos = load(target)
    except zipfile.BadZipFile as e:
        print(f"ERROR  not a readable zip: {e}")
        return 1
    except FileNotFoundError as e:
        print(f"ERROR  {e}")
        return 1

    if MANIFEST not in data:
        nested = [k for k in data if k.endswith("/" + MANIFEST)]
        r.error(f"missing {MANIFEST}" + (
            f" — found nested at {nested[0]}, so the archive has a wrapping folder; "
            f"re-zip from inside the directory" if nested else ""))
        return r.finish(target)

    raw = data[MANIFEST]
    if raw.startswith(b"\xef\xbb\xbf"):
        r.warn(f"{MANIFEST} starts with a UTF-8 BOM (tolerated, but a sign of a hand edit)")
    try:
        manifest = json.loads(raw.decode("utf-8-sig"))
    except json.JSONDecodeError as e:
        r.error(f"{MANIFEST} is not valid JSON: {e}")
        return r.finish(target)

    version = manifest.get("version")
    if manifest.get("format") != FORMAT or version not in VERSIONS:
        r.error(f"format/version must be {FORMAT!r} with version in {sorted(VERSIONS)}, got "
                f"{manifest.get('format')!r}/{version!r} — the importer rejects anything else with "
                f"'Unsupported course series file format'")
    elif version != CURRENT_VERSION:
        r.warn(f"manifest declares format version {version}; the newest known is {CURRENT_VERSION}. "
               f"A deployment on the newer version rejects this file outright — export from the "
               f"target series and match whatever version it writes")
    if version == 2:
        with_refs = [i + 1 for i, c in enumerate(manifest.get("courses") or []) if "references" in c]
        if with_refs:
            r.warn(f"version 2 dropped courses[].references, but {len(with_refs)} course(s) still "
                   f"carry it (e.g. course {with_refs[0]}); harmless, but the field is dead weight")
    for key in ("courseSeries", "courses", "projects"):
        if key not in manifest:
            r.error(f"{MANIFEST} has no {key!r} — the importer dereferences it unguarded and dies "
                    f"with an opaque TypeError")
    if r.errors:
        return r.finish(target)

    for name in data:
        if JUNK.search(name):
            r.error(f"junk entry {name} would be imported as a project/asset file",
                    kind="junk", where=name)

    if infos is not None:
        outer_dirs = [i.filename for i in infos if i.filename.endswith("/")]
        if outer_dirs:
            r.warn(f"{len(outer_dirs)} directory entries in the outer zip "
                   f"(harmless — only declared paths are read — but a sign of a filesystem re-zip)")

    check_series(manifest, data, r)
    project_names, project_code = check_projects(manifest, data, r)
    check_courses(manifest, data, project_names, project_code, r)
    return r.finish(target)


def check_series(manifest, data, r):
    series = manifest.get("courseSeries") or {}
    check_len(r, "series title", series.get("title", ""), LIMITS["series_title"])
    check_len(r, "series description", series.get("description", ""), LIMITS["series_description"])
    thumb = (series.get("thumbnail") or {}).get("path")
    if not isinstance(thumb, str):
        r.error("courseSeries.thumbnail.path is missing")
    else:
        check_thumbnail(r, thumb, data, "series thumbnail")


def check_projects(manifest, data, r):
    """Validate every project payload.

    Returns ({fullName: name}, {fullName: {spx path: source}}) — the first for entrypoint
    cross-checking, the second so a course's `complete.require` can be read against the code the
    learner actually starts with.
    """
    import io

    full_names = {}
    project_code = {}
    seen_names = {}
    for project in manifest.get("projects") or []:
        rel, name, full = project.get("path"), project.get("name"), project.get("fullName")
        label = rel or name or repr(project)

        if not isinstance(name, str) or not PROJECT_NAME.match(name):
            r.error(f"{label}: project name {name!r} must match ^[\\w-]+$ (the server rejects "
                    f"anything else with an opaque 40001)")
        elif len(name) > LIMITS["project_name"]:
            r.error(f"{label}: project name is {len(name)} chars (limit {LIMITS['project_name']})")
        if isinstance(name, str):
            if name in seen_names:
                r.error(f"{label}: duplicate project name {name!r} (also {seen_names[name]}) — the "
                        f"second import overwrites the first")
            seen_names[name] = label
        if isinstance(full, str):
            if len(full.split("/")) != 2 or "" in full.split("/"):
                r.error(f"{label}: fullName {full!r} must be <owner>/<name>")
            full_names[full] = name

        if not isinstance(rel, str) or rel not in data:
            r.error(f"{label}: declared path {rel!r} is not in the archive (lookup is verbatim and "
                    f"case-sensitive)")
            continue

        try:
            with zipfile.ZipFile(io.BytesIO(data[rel])) as zf:
                infos = zf.infolist()
                files = {i.filename: zf.read(i) for i in infos if not i.filename.endswith("/")}
        except zipfile.BadZipFile as e:
            r.error(f"{rel}: not a readable zip ({e})")
            continue

        if isinstance(full, str):
            project_code[full] = {n: b.decode("utf-8", "replace")
                                  for n, b in files.items() if n.endswith(".spx")}

        dirs = [i.filename for i in infos if i.filename.endswith("/")]
        if dirs:
            r.error(f"{rel}: {len(dirs)} directory entries (e.g. {dirs[:2]}) — the .xbp loader turns "
                    f"every zip entry into a project file, so each becomes a zero-byte file with an "
                    f"empty name that gets uploaded and indexed. Repack with `xbcs.py pack`, never "
                    f"with zip -r or a GUI archiver", kind="xbp-dirs", where=rel)
        no_flag = [i.filename for i in infos
                   if not i.filename.isascii() and not (i.flag_bits & 0x800)]
        if no_flag:
            r.warn(f"{rel}: {len(no_flag)} non-ASCII names without the UTF-8 flag — the app forces "
                   f"UTF-8 so this is survivable, but it confirms a filesystem re-zip",
                   kind="xbp-utf8", where=rel)

        check_project_files(r, rel, name, files)

    for name in data:
        if name.endswith(".xbp") and name not in {p.get("path") for p in manifest.get("projects") or []}:
            r.warn(f"{name} is in the archive but not declared in projects[] — it will be ignored")
    return full_names, project_code


def check_project_files(r, rel, project_name, files):
    for junk in [k for k in files if JUNK.search(k)]:
        r.error(f"{rel}: junk entry {junk} would become a project file",
                kind="xbp-junk", where=f"{rel}!{junk}")

    if "builder-meta.json" not in files:
        r.error(f"{rel}: no builder-meta.json")
    else:
        try:
            meta = json.loads(files["builder-meta.json"].decode("utf-8-sig"))
        except json.JSONDecodeError as e:
            r.error(f"{rel}: builder-meta.json is not valid JSON ({e})")
            meta = None
        if meta is not None:
            if meta.get("type", "game") != "game":
                r.error(f"{rel}: project type {meta.get('type')!r} is not supported (must be 'game')")
            if project_name and meta.get("displayName") != project_name:
                r.warn(f"{rel}: displayName {meta.get('displayName')!r} != project name "
                       f"{project_name!r} — usually a leftover from duplicating a project; the "
                       f"editor will show the wrong course", kind="displayname", where=rel)

    for path, blob in files.items():
        ext = path.rsplit(".", 1)[-1].lower() if "." in path.rsplit("/", 1)[-1] else ""
        if ext and ext not in KNOWN_EXTS:
            r.warn(f"{rel}: {path} has extension .{ext}, which the app has no MIME type for",
                   kind=f"ext-{ext}", where=f"{rel}!{path}")
        if len(blob) == 0 and not path.endswith(".spx"):
            r.warn(f"{rel}: {path} is empty", kind="empty-file", where=f"{rel}!{path}")
        if len(blob) > LARGE_FILE:
            r.warn(f"{rel}: {path} is {len(blob):,} bytes — check it against the upload size limit",
                   kind="large-file", where=f"{rel}!{path}")

    check_asset_refs(r, rel, files)


def check_asset_refs(r, rel, files):
    """An index.json pointing at a costume/sound that isn't in the package breaks the project."""
    for path, blob in files.items():
        if not path.endswith("index.json"):
            continue
        try:
            config = json.loads(blob.decode("utf-8-sig"))
        except json.JSONDecodeError as e:
            r.error(f"{rel}: {path} is not valid JSON ({e})")
            continue
        directory = path[: path.rfind("/") + 1]
        refs = []
        for key in ("costumes", "backdrops"):
            for item in config.get(key) or []:
                if isinstance(item, dict) and isinstance(item.get("path"), str):
                    refs.append(item["path"])
        if isinstance(config.get("path"), str):
            refs.append(config["path"])
        for ref in refs:
            if ref not in files and (directory + ref) not in files:
                r.error(f"{rel}: {path} references {ref!r}, which is not in the package",
                        kind="asset-ref", where=f"{rel}!{path}")

        # Sprite configs only: the editor removes animation-referenced costumes from the wearable
        # list (animation frames are not costumes there), so a sprite whose animations consume
        # every costume renders NOTHING in edit mode — while the engine, which does no such
        # extraction, renders it fine. The rabbit survived on a standalone `kiko.png`; hand-built
        # sprites tend to forget the standalone costume.
        if "/sprites/" in path and isinstance(config.get("costumes"), list):
            names = [c.get("name") for c in config["costumes"] if isinstance(c, dict)]
            consumed = set()
            for anim in (config.get("fAnimations") or {}).values():
                if not isinstance(anim, dict):
                    continue
                f, t = anim.get("frameFrom"), anim.get("frameTo")
                if f in names and t in names:
                    consumed.update(names[names.index(f):names.index(t) + 1])
            if names and not [n for n in names if n not in consumed]:
                r.error(f"{rel}: {path} has every costume consumed by fAnimations — the sprite "
                        f"will be INVISIBLE in the editor (the engine still renders it, so runtime "
                        f"tests pass). Add one costume no animation references, like the original "
                        f"sprites' standalone default costume",
                        kind="all-costumes-animated", where=f"{rel}!{path}")


def check_courses(manifest, data, project_names, project_code, r):
    for i, course in enumerate(manifest.get("courses") or []):
        label = f"course {i + 1} ({course.get('title')!r})"
        check_len(r, f"{label} title", course.get("title", ""), LIMITS["course_title"], label="")
        check_len(r, f"{label} prompt", course.get("prompt", ""), LIMITS["course_prompt"], label="")

        thumb = (course.get("thumbnail") or {}).get("path")
        if not isinstance(thumb, str):
            r.error(f"{label}: thumbnail.path is missing")
        else:
            check_thumbnail(r, thumb, data, label)

        entry = course.get("entrypoint")
        parsed = parse_entrypoint(entry) if isinstance(entry, str) else None
        if parsed is None:
            r.error(f"{label}: entrypoint {entry!r} does not parse as /editor/<owner>/<name>/…")
        elif parsed not in project_names:
            r.error(f"{label}: entrypoint project {parsed!r} is not in projects[], so the importer "
                    f"leaves the entrypoint pointing at the original owner and the course 404s at "
                    f"course-start time")

        for ref in course.get("references") or []:
            if not isinstance(ref, dict) or ref.get("type") != "project":
                continue
            full = ref.get("fullName")
            if not isinstance(full, str) or len(full.split("/")) != 2 or "" in full.split("/"):
                r.error(f"{label}: reference fullName {full!r} must be <owner>/<name> — the importer "
                        f"throws on anything else")
            elif full not in project_names:
                r.warn(f"{label}: reference {full!r} is not in projects[]; it will keep pointing at "
                       f"the original owner")

        check_course_config(r, label, course.get("prompt", ""),
                            project_code.get(parsed) or {}, entry if isinstance(entry, str) else "")


def check_course_config(r, label, prompt, code_files, entrypoint):
    block = re.search(r"```jsonc\s*\n([\s\S]*?)\n```", prompt)
    if block is None:
        r.warn(f"{label}: no ```jsonc config block — the course falls back to legacy "
               f"copilot-driven setup")
        return
    try:
        config = json.loads(strip_jsonc(block.group(1)))
    except json.JSONDecodeError as e:
        r.error(f"{label}: the jsonc config block does not parse ({e}); the frontend silently falls "
                f"back to an empty config, so hide/apis/opening/judge are all lost")
        return

    def warn_pinned(entry, field):
        r.warn(f"{label}: {field} entry {entry!r} pins the engine module version — the spx v2→v3 "
               f"bump silently broke exactly this (the entry matches nothing, so the API panel "
               f"stops narrowing). Use a bare or dotted name; add '#N' to pin an overload "
               f"(e.g. 'step#0')", kind="api-id-pinned", where=label)

    for e in config.get("apis") or []:
        if isinstance(e, str) and "?" in e:
            warn_pinned(e, "apis")
    for step in config.get("opening") or []:
        if not isinstance(step, dict):
            continue
        video = step.get("video")
        if isinstance(video, str) and "?" in video:
            warn_pinned(video, "opening video")
        spotlight = step.get("spotlight")
        if isinstance(spotlight, dict) and isinstance(spotlight.get("api"), str) and "?" in spotlight["api"]:
            warn_pinned(spotlight["api"], "opening spotlight")

    judge = config.get("judge", "code")
    if judge not in ("code", "copilot"):
        r.warn(f"{label}: judge {judge!r} is neither 'code' nor 'copilot'")
    complete = config.get("complete")
    if judge == "code" and isinstance(complete, dict):
        if not complete.get("log"):
            r.error(f"{label}: complete.log is empty, so completion can never be detected")
        count = complete.get("count", 1)
        if not isinstance(count, int) or count < 1:
            r.error(f"{label}: complete.count {count!r} must be an integer >= 1")
        check_require(r, label, complete.get("require"), code_files, entrypoint)
    elif judge == "copilot" and isinstance(complete, dict) and complete.get("require"):
        r.warn(f"{label}: complete.require is only checked under judge 'code'; here it does nothing")
    for step in config.get("opening") or []:
        if not isinstance(step, dict):
            r.warn(f"{label}: opening step {step!r} is not an object and will be dropped")
        elif not ({"prelude", "video", "spotlight"} & set(step)):
            r.warn(f"{label}: opening step {list(step)} has no prelude/video/spotlight key and will "
                   f"be dropped")


def check_require(r, label, require, code_files, entrypoint):
    """A course's secondary goal: tokens the learner's code must contain once the runtime signal
    lands. Its whole point is to reject the shortcut the primary goal alone would accept, so the
    failure worth catching is a requirement that is already satisfied before the learner types
    anything."""
    if require is None:
        return
    if not isinstance(require, dict):
        r.error(f"{label}: complete.require must be an object, not {require!r}")
        return
    tokens = require.get("code")
    if not isinstance(tokens, list) or not tokens or not all(isinstance(t, str) and t for t in tokens):
        r.error(f"{label}: complete.require.code must be a non-empty list of strings; the frontend "
                f"drops a requirement that names no token, so the course silently loses it")
        return
    if not (require.get("hint") or "").strip():
        r.warn(f"{label}: complete.require has no hint — the retry dialog then only says the goal "
               f"was reached, without telling the learner what is still missing")

    # The starting code is the file the entrypoint opens; fall back to every .spx if it can't be
    # identified, since matching anywhere is still enough to make the requirement free.
    sprite = None
    segments = [s for s in urlparse(entrypoint).path.split("/") if s]
    if "sprites" in segments:
        sprite = segments[segments.index("sprites") + 1] if len(segments) > segments.index("sprites") + 1 else None
    sources = ([code_files[f"{sprite}.spx"]] if sprite and f"{sprite}.spx" in code_files
               else list(code_files.values()))
    for src in sources:
        if all(re.search(rf"\b{re.escape(t)}\b", strip_code_noise(src)) for t in tokens):
            r.warn(f"{label}: complete.require.code {tokens} already appears in the starting code, "
                   f"so the secondary goal is met before the learner changes anything and adds "
                   f"nothing to the primary goal", kind="require-preheld", where=label)
            return


def strip_code_noise(src):
    """Mirror the frontend's check: comments and string literals do not count as using the code."""
    src = re.sub(r"/\*[\s\S]*?\*/", " ", src)
    src = re.sub(r"//[^\n]*", " ", src)
    return re.sub(r'"(?:[^"\\\n]|\\.)*"', '""', src)


def strip_jsonc(text):
    """Drop // comments and trailing commas, leaving string contents alone."""
    out = []
    in_string = escaped = False
    i = 0
    while i < len(text):
        ch = text[i]
        if in_string:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
            out.append(ch)
            i += 1
            continue
        if text.startswith("//", i):
            while i < len(text) and text[i] != "\n":
                i += 1
            continue
        if text.startswith("/*", i):
            end = text.find("*/", i + 2)
            i = len(text) if end == -1 else end + 2
            continue
        out.append(ch)
        i += 1
    return re.sub(r",(\s*[}\]])", r"\1", "".join(out))


def parse_entrypoint(value):
    """Mirror the importer: only /editor/<owner>/<name>/… is recognized and rewritten."""
    path = urlparse(value).path if "://" in value else urlparse(value).path
    segments = [s for s in path.split("/") if s]
    if len(segments) < 3 or segments[0] != "editor":
        return None
    return f"{segments[1]}/{segments[2]}"


def check_thumbnail(r, path, data, label):
    if path not in data:
        r.error(f"{label}: declared thumbnail {path!r} is not in the archive")
        return
    blob = data[path]
    if len(blob) > BIG_THUMBNAIL:
        r.warn(f"{label}: {path} is {len(blob):,} bytes for a card image — worth downscaling; the "
               f"whole archive has to travel through the browser on both export and import",
               kind="thumb-size", where=path)
    ext = path.rsplit(".", 1)[-1].lower()
    if ext not in KNOWN_EXTS:
        r.warn(f"{label}: thumbnail extension .{ext} has no MIME mapping; it will upload untyped",
               kind=f"thumb-ext-{ext}", where=path)
    actual = sniff_image(blob)
    if actual is None:
        r.warn(f"{label}: {path} does not look like an image", kind="thumb-notimage", where=path)
    elif actual != ext and not (actual == "jpg" and ext == "jpeg"):
        r.warn(f"{label}: {path} is actually {actual.upper()} data — the extension decides the "
               f"uploaded MIME type, so it will be served as the wrong type",
               kind="thumb-ext", where=path)


def sniff_image(blob):
    for magic, kind in IMAGE_MAGIC:
        if blob.startswith(magic):
            return kind
    if blob[:4] == b"RIFF" and blob[8:12] == b"WEBP":
        return "webp"
    if blob[4:12] in (b"ftypavif", b"ftypavis"):
        return "avif"
    head = blob[:200].lstrip()
    if head.startswith(b"<svg") or head.startswith(b"<?xml"):
        return "svg"
    return None


def check_len(r, what, value, limit, label=None):
    if not isinstance(value, str):
        r.error(f"{what} is not a string")
    elif len(value) > limit:
        r.error(f"{what} is {len(value)} chars, over the server limit of {limit} "
                f"(surfaces as an opaque 40001)")


# --------------------------------------------------------------------------- entry


def die(msg):
    print(f"ERROR  {msg}", file=sys.stderr)
    sys.exit(1)


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    command, args = argv[1], argv[2:]
    try:
        if command == "unpack" and len(args) == 2:
            cmd_unpack(*args)
        elif command == "pack" and len(args) == 2:
            cmd_pack(*args)
        elif command == "validate" and len(args) == 1:
            return cmd_validate(*args)
        elif command == "inspect" and len(args) == 1:
            cmd_inspect(*args)
        else:
            print(__doc__)
            return 2
    except (json.JSONDecodeError, zipfile.BadZipFile, OSError) as e:
        die(f"{type(e).__name__}: {e}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
