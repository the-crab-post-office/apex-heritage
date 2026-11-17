#!/usr/bin/env python3
"""Count actual files under a workspace without following external cache symlinks."""
import argparse,json,os
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root',type=Path,default=Path('/home/user'))
parser.add_argument('--max-bytes',type=int,default=128_000_000)
parser.add_argument('--max-files',type=int,default=10_000)
args=parser.parse_args();count=0;size=0;links=0
for root,dirs,files in os.walk(args.root,followlinks=False):
 for name in dirs[:]:
  p=Path(root)/name
  if p.is_symlink():count+=1;size+=p.lstat().st_size;links+=1;dirs.remove(name)
 for name in files:
  p=Path(root)/name
  try:st=p.lstat()
  except FileNotFoundError:continue
  count+=1;size+=st.st_size
  if p.is_symlink():links+=1
report={'root':str(args.root),'files_and_symlinks':count,'bytes':size,'decimal_MB':round(size/1_000_000,3),'external_or_directory_symlinks':links,'max_files':args.max_files,'max_bytes':args.max_bytes,'within_budget':count<=args.max_files and size<=args.max_bytes}
print(json.dumps(report,indent=2))
raise SystemExit(0 if report['within_budget']else 1)
