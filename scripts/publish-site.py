#!/usr/bin/env python3
"""Validate a staged web build, then atomically switch the public site symlink.
No live preview directory is emptied during compilation. Old output is retained
until the explicit safe cleanup command runs.
"""
import hashlib, json, os, re, shutil, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'build/staging-site'
def digest(path):
    h = hashlib.sha256()
    for p in sorted(path.rglob('*')):
        if p.is_file():
            h.update(p.relative_to(path).as_posix().encode()); h.update(p.read_bytes())
    return h.hexdigest()
def main():
    subprocess.run(['node', 'scripts/verify-core.mjs'], cwd=ROOT, check=True)
    version = json.loads((ROOT/'package.json').read_text())['version']
    manifest = json.loads((STAGE/'version.json').read_text())
    if manifest['version'] != version: raise SystemExit('Staged build version mismatch')
    html = (STAGE/'index.html').read_text()
    if f'content="{version}"' not in html or '__APEX_VERSION__' in html: raise SystemExit('Unstamped HTML')
    for ref in re.findall(r'(?:src|href)="(/assets/[^"]+)"', html):
        if not (STAGE/ref.lstrip('/')).is_file(): raise SystemExit('Missing entry asset: '+ref)
    css = '\n'.join(p.read_text() for p in (STAGE/'assets').glob('*.css'))
    if version not in css or '__APEX_VERSION__' in css: raise SystemExit('Unstamped CSS')
    wasms = list((STAGE/'assets').glob('*.wasm'))
    if len(wasms) != 1 or wasms[0].read_bytes() != (ROOT/'web/wasm/apex_bg.wasm').read_bytes():
        raise SystemExit('Bundled WASM differs from the verified source core')
    fingerprint = digest(STAGE)
    destination = ROOT/'build/previews'/f'{version}-{fingerprint[:12]}'
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        if digest(destination) != fingerprint: raise SystemExit('Existing preview has different contents')
        shutil.rmtree(STAGE)
    else: STAGE.rename(destination)
    site = ROOT/'site'; temp = ROOT/'site.next'
    if temp.is_symlink(): temp.unlink()
    elif temp.exists(): raise SystemExit('Refusing to replace non-symlink site.next')
    if site.exists() and not site.is_symlink():
        raise SystemExit('site must be absent or a symlink; move the old generated directory out of the way first')
    temp.symlink_to(destination.relative_to(ROOT), target_is_directory=True)
    os.replace(temp, site)
    print('Published coherent preview:', site.readlink())
if __name__ == '__main__': main()
