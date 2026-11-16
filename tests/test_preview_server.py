"""Preview headers, atomic directory swaps and conservative cleanup boundaries."""
import importlib.util, tempfile, threading, unittest, urllib.request
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
serve=module('preview_server','scripts/serve-web.py')
clean=module('preview_clean','scripts/clean-workspace.py')
class PreviewTests(unittest.TestCase):
 def test_no_cache_even_for_conditional_requests_and_atomic_swap(self):
  with tempfile.TemporaryDirectory()as folder:
   root=Path(folder)
   for name in ['one','two']:
    (root/name).mkdir();(root/name/'index.html').write_text(name);(root/name/'version.json').write_text('{"version":"'+name+'"}')
   live=root/'site';live.symlink_to(root/'one',target_is_directory=True)
   server=ThreadingHTTPServer(('127.0.0.1',0),partial(serve.GameHandler,directory=str(live)))
   thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
   try:
    url=f'http://127.0.0.1:{server.server_port}/'
    req=urllib.request.Request(url,headers={'If-Modified-Since':'Wed, 01 Jan 2099 00:00:00 GMT'})
    with urllib.request.urlopen(req)as response:
     self.assertEqual(response.status,200);self.assertEqual(response.read(),b'one');self.assertIn('no-store',response.headers['Cache-Control'])
    next_link=root/'next';next_link.symlink_to(root/'two',target_is_directory=True);next_link.replace(live)
    with urllib.request.urlopen(url)as response:self.assertEqual(response.read(),b'two')
    with urllib.request.urlopen(url+'version.json')as response:self.assertIn('no-store',response.headers['Cache-Control'])
   finally:server.shutdown();server.server_close();thread.join()
 def test_cleanup_excludes_current_preview_but_includes_stale_generated_output(self):
  previous=clean.ROOT
  with tempfile.TemporaryDirectory()as folder:
   clean.ROOT=root=Path(folder)
   active=root/'build/previews/current';active.mkdir(parents=True)
   stale=root/'build/previews/stale';stale.mkdir()
   legacy=root/'build/site';legacy.mkdir()
   (root/'site').symlink_to(active,target_is_directory=True)
   binary=root/'target/release/apex-native';binary.parent.mkdir(parents=True);binary.write_text('keep')
   deps=root/'target/release/deps';deps.mkdir()
   try:
    paths=clean.candidates(release=True)
    self.assertNotIn(active,paths);self.assertIn(stale,paths);self.assertIn(legacy,paths);self.assertIn(deps,paths);self.assertNotIn(binary,paths)
   finally:clean.ROOT=previous
