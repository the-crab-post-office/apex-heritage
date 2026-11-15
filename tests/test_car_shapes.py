"""Offline shared chassis assets are deterministic, local and bounded."""
import json, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class CarShapeTests(unittest.TestCase):
 def test_generator_is_offline_and_deterministic(self):
  paths=[ROOT/'data/car-shapes.json',ROOT/'data/car-layouts.json'];before=[p.read_bytes()for p in paths]
  subprocess.run([sys.executable,str(ROOT/'scripts/build-car-shapes.py')],cwd=ROOT,check=True,capture_output=True)
  self.assertEqual(before,[p.read_bytes()for p in paths])
