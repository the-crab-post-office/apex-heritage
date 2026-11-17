#!/usr/bin/env python3
"""Idempotent original helmet palette corrections from credited era photographs."""
import json
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'data/roster.json'
d=json.loads(p.read_text())
helmets={'1967-lotus':'#182639','1988-mclaren':'#ecd535','2004-ferrari':'#d82b29','2023-red-bull':'#192c58'}
for era in d['eras']:
 for team in era['teams']:
  if team['id'] in helmets:team['helmet_color']=helmets[team['id']]
p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
