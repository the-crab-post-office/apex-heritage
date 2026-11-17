#!/usr/bin/env python3
"""Build lean source/web/Linux ZIPs from a validated checkout; no caches/history.
Run after build-web.sh, cargo build --release --features native --bin apex-native,
npm ci, and committing/tagging the release. Cargo/Node dependency notices are
collected from installed packages; small upstream omissions are bundled in data/.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile
import argparse

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)

def run(*args):
    return subprocess.check_output(args, text=True).strip()

version = json.loads(Path('package.json').read_text())['version']
assert json.loads(Path('site/version.json').read_text())['version'] == version
assert Path('target/release/apex-native').exists()
metadata = json.loads(run('cargo', 'metadata', '--format-version', '1',
                          '--filter-platform', 'x86_64-unknown-linux-gnu', '--features', 'native'))
licenses = {}
index = []
for package in metadata['packages']:
    if not package['source']:
        continue
    directory = Path(package['manifest_path']).parent
    name = f"{package['name']}-{package['version']}"
    index.append(f"{name}: {package.get('license')}; {package.get('repository') or ''}")
    for item in directory.iterdir():
        if item.is_file() and item.name.lower().startswith(('license', 'copying', 'notice', 'unlicense')):
            licenses[f'licenses/dependencies/rust/{name}/{item.name}'] = item.read_bytes()
    if package['name'] == 'gilrs':
        licenses[f'licenses/dependencies/rust/{name}/SDL_GameControllerDB-LICENSE'] = (directory / 'SDL_GameControllerDB/LICENSE').read_bytes()
    fallbacks = {
        'gilrs': ['GILRS-MIT', 'GILRS-APACHE'],
        'gilrs-core': ['GILRS-MIT', 'GILRS-APACHE'],
        'dasp_sample': ['DASP-SAMPLE-MIT'],
        'quad-rand': ['QUAD-RAND-MIT.txt'],
    }
    for filename in fallbacks.get(package['name'], []):
        licenses[f'licenses/dependencies/rust/{name}/{filename}'] = (Path('data/dependency-licenses') / filename).read_bytes()
for name in ['three', 'lucide', 'vite']:
    for item in (Path('node_modules') / name).iterdir():
        if item.is_file() and item.name.lower().startswith('license'):
            licenses[f'licenses/dependencies/web/{name}/{item.name}'] = item.read_bytes()
licenses['licenses/dependencies/INDEX.txt'] = ('Dependency declarations collected from installed Cargo packages.\n'
    'License alternatives remain the upstream alternatives, not relicensed MIT.\n'
    'Runtime system OpenGL/X11/ALSA/libudev libraries are not redistributed.\n\n' + '\n'.join(sorted(index)) + '\n').encode()
info = (f'APEX / HERITAGE {version}\nCommit: {run("git", "rev-parse", "HEAD")}\n'
        f'Tag: v{version}\nTrack-data hash: {json.loads(Path("site/version.json").read_text())["hash"]}\n'
        'Physical controller hardware and subjective listening review unverified.\n').encode()
common = {name: Path(name).read_bytes() for name in ['README.md', 'SOURCES.md', 'TESTING.md', 'LICENSE']}
common.update(licenses)
common['licenses/LIVERY-NOTICE.md'] = Path('data/LIVERY-NOTICE.md').read_bytes()
common['licenses/PHOTO-REFERENCE-NOTICE.md'] = Path('data/PHOTO-REFERENCE-NOTICE.md').read_bytes()
common['licenses/DejaVu.txt'] = Path('scripts/fonts/LICENSE-DejaVu.txt').read_bytes()
common['licenses/MONACO-REFERENCE-NOTICE.md'] = Path('data/MONACO-REFERENCE-NOTICE.md').read_bytes()
common['licenses/PHOTO-AUDIT-NOTICE.md'] = Path('data/PHOTO-AUDIT-NOTICE.md').read_bytes()
common['licenses/SPA-MONACO-REFERENCE-NOTICE.md'] = Path('data/SPA-MONACO-REFERENCE-NOTICE.md').read_bytes()
common['licenses/CAR-REFERENCE-PHOTOS.md'] = Path('data/CAR-REFERENCE-PHOTOS.md').read_bytes()
common['licenses/CAR-SCAN-STATUS.md'] = Path('data/CAR-SCAN-STATUS.md').read_bytes()
common['WORKSPACE.md'] = Path('WORKSPACE.md').read_bytes()
common['BUILD-INFO.txt'] = info
common['PREVIEW-SCOPE.txt'] = (Path('data/CORNER-DETAILS-NOTICE.md').read_bytes())
source = {p: Path(p).read_bytes() for p in run('git', 'ls-files').splitlines() if Path(p).is_file()}
source.update(common)
source['GIT-REFS.txt'] = (run('git', 'for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads', 'refs/tags') + '\n').encode()
web = {str(p.relative_to('site')): p.read_bytes() for p in Path('site').rglob('*') if p.is_file()}
web.update(common)
web['START-HERE.txt'] = (f'APEX / HERITAGE {version} — web\n'
    'From this extracted folder: python3 serve.py --port 8080\n'
    'Open http://localhost:8080 in a current desktop browser. Do not open index.html as file://.\n'
    'All runtime game assets are local; no external image/audio service is required.\n'
    'A standard controller requires HTTPS or localhost and may need a button press.\n'
    'Controller: LS steer, RT/LT pedals, B recover, X pits, Y limiter, RB camera, Start pause.\n'
    'Keyboard: WASD/arrows, R recover, P pits, L limiter, C camera, Esc pause.\n'
    'Practice setup offers PIT ENTRY PRACTICE to try a stop without a full lap.\n').encode()
native = dict(common)
native["spa-monaco-update.html"] = Path("web/public/spa-monaco-update.html").read_bytes()
native["photo-accuracy.html"] = Path("web/public/photo-accuracy.html").read_bytes()
native["car-comparison.html"] = Path("web/public/car-comparison.html").read_bytes()
native['apex-native-linux-x86_64'] = Path('target/release/apex-native').read_bytes()
for p in Path('data').iterdir():
    if p.is_file():
        native[str(p)] = p.read_bytes()
for p in Path('web/assets/audio').iterdir():
    if p.is_file():
        native['audio/' + p.name] = p.read_bytes()
native['START-HERE.txt'] = (f'APEX / HERITAGE {version} — Linux x86_64\n'
    'chmod +x apex-native-linux-x86_64 && ./apex-native-linux-x86_64\n'
    'Requires a graphical Linux desktop, OpenGL, ALSA and libudev runtime libraries.\n'
    'The binary embeds its game assets. Included editable data/notices preserve provenance.\n'
    'Menu: arrows track; E era; T team; Enter start. Controller: D-pad track, LB era, RB team, A start.\n'
    'Driving: WASD/arrows or LS+RT/LT. R/B recover; P/X request pits; L/Y limiter; C/RB camera.\n'
    'O stages pit-entry practice; Escape/Start pauses; M/View returns to setup; V toggles sound.\n'
    'Native is simpler free-drive; web has additional scenery detail, races and setup UI.\n').encode()
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,help='Output directory; may be outside a size-limited workspace')
args=parser.parse_args()
release_dir=args.output if args.output else Path('releases') / version
release_dir.mkdir(parents=True,exist_ok=True)
outputs = [('source', 'apex-heritage-source', source), ('web', 'apex-heritage-web', web),
           ('native-linux', 'apex-heritage-linux', native)]
sums = []
for suffix, folder, files in outputs:
    target = release_dir / f'APEX-Heritage-{suffix}.zip'
    temporary = target.with_suffix('.zip.tmp')
    with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in sorted(files.items()):
            entry = zipfile.ZipInfo(f'{folder}/{name}')
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = (0o100755 if name.endswith('apex-native-linux-x86_64') else 0o100644) << 16
            archive.writestr(entry, content)
    temporary.replace(target)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
    sums.append(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name)
    print(f'{target}: {target.stat().st_size / 1024 / 1024:.2f} MiB, {len(files)} files')
(release_dir / 'SHA256SUMS.txt').write_text('\n'.join(sums) + '\n')
