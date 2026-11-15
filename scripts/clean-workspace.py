#!/usr/bin/env python3
"""Conservative cleanup. Dry-run by default; never deletes tracked/user files.
Use --apply after validation; --debug-cache also removes rebuildable Rust debug output.
Source, licenses, reference uploads, latest preview and release ZIPs are preserved.
"""
import argparse,shutil,subprocess,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def candidates(debug=False):
    roots=[ROOT/'test-results',ROOT/'playwright-report',ROOT/'.map-import']
    for folder in ['scripts','tests']:
        roots.extend((ROOT/folder).rglob('__pycache__'))
    if debug:roots += [ROOT/'target/debug',ROOT/'target/wasm32-unknown-unknown/debug']
    return [p for p in roots if p.exists() and not p.is_symlink()]
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');parser.add_argument('--debug-cache',action='store_true');args=parser.parse_args()
    tracked=set(subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines());removed=0
    for p in candidates(args.debug_cache):
        rel=p.relative_to(ROOT).as_posix()
        if any(n==rel or n.startswith(rel+'/')for n in tracked):raise SystemExit('Refusing to remove tracked files under '+rel)
        size=sum(f.stat().st_size for f in p.rglob('*')if f.is_file() and not f.is_symlink())
        print(('REMOVE 'if args.apply else'WOULD REMOVE ')+rel+f' ({size/1048576:.1f} MiB)')
        if args.apply:shutil.rmtree(p);removed+=size
    print(json.dumps({'mode':'apply'if args.apply else'dry-run','bytes_removed':removed,'preserved':['source','licenses','uploads','artifacts','site','releases','target/release','node_modules']}))
if __name__=='__main__':main()
