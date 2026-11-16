#!/usr/bin/env python3
"""Serve a complete local game build without caching entry points or manifests.
Source checkout: python3 scripts/serve-web.py --port 8080
Extracted web ZIP: python3 serve.py --port 8080
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.wasm': 'application/wasm', '.js': 'application/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def send_head(self):
        # Never turn a previously cached old index into a fresh 304 response.
        for header in ['If-Modified-Since', 'If-None-Match']:
            if header in self.headers: del self.headers[header]
        return super().send_head()
    def list_directory(self, path):
        self.send_error(404, 'Directory listing disabled')
def main():
    here = Path(__file__).resolve().parent
    default = here.parent/'site' if here.name == 'scripts' else here
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--bind', default='0.0.0.0')
    parser.add_argument('--directory', type=Path, default=default)
    args = parser.parse_args()
    root = args.directory.absolute()  # keep symlink unresolved so atomic swaps are visible
    if not (root/'index.html').is_file(): raise SystemExit('Missing complete game build: '+str(root))
    server = ThreadingHTTPServer((args.bind,args.port),partial(GameHandler,directory=str(root)))
    print(f'Game ready on {args.bind}:{server.server_port} from {root}', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__ == '__main__': main()
