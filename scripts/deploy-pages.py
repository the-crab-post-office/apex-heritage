#!/usr/bin/env python3
"""Publish the verified site to gh-pages without copying dependencies or secrets.
Build first with scripts/build-web.sh. Requires origin push credentials supplied
by the caller (credential manager, GH_TOKEN integration, or GIT_ASKPASS).
No token is read, written or embedded by this script. Repo Pages source must be
configured once as gh-pages / (root), via GitHub Settings or its API.
"""
import json,os,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def git(*args,env=None,cwd=ROOT):
 return subprocess.check_output(['git',*args],cwd=cwd,env=env,text=True).strip()
def main():
 site=(ROOT/'site').resolve()
 if not(site/'index.html').is_file():raise SystemExit('Build site first')
 subprocess.run(['node','scripts/verify-core.mjs'],cwd=ROOT,check=True)
 version=json.loads((site/'version.json').read_text())
 if version['version']!=json.loads((ROOT/'package.json').read_text())['version']:raise SystemExit('Stale site version')
 (site/'.nojekyll').write_text('')
 (site/'deployment.json').write_text(json.dumps({'source_commit':git('rev-parse','HEAD'),**version})+'\n')
 with tempfile.TemporaryDirectory(prefix='apex-pages-')as directory:
  env={**os.environ,'GIT_INDEX_FILE':str(Path(directory)/'index')}
  args=['--git-dir='+str(ROOT/'.git'),'--work-tree='+str(site)]
  git(*args,'add','-A','-f','.',env=env,cwd=site)
  tree=git(*args,'write-tree',env=env,cwd=site)
  parent=subprocess.run(['git','rev-parse','--verify','refs/heads/gh-pages'],cwd=ROOT,capture_output=True,text=True)
  parents=['-p',parent.stdout.strip()]if parent.returncode==0 else []
  commit=git('commit-tree',tree,*parents,'-m',f"Deploy {version['version']} from {git('rev-parse','--short','HEAD')}")
  git('update-ref','refs/heads/gh-pages',commit)
  subprocess.run(['git','-c','credential.helper=','push','origin','gh-pages'],cwd=ROOT,check=True)
  print('Published gh-pages:',commit)
if __name__=='__main__':main()
