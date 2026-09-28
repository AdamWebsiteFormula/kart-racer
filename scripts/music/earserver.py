# One process holds the local ears (CLAP, AST, Audiobox Aesthetics) and answers every screen and quality request, so
# several composers working at once share one copy of the models instead of loading their own (memory). Nothing is
# played. Requests are answered one at a time.
#   python scripts/music/earserver.py        (listens on 127.0.0.1:8765; screen.py and aes.py use it when it is up)
import json, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
os.environ['RASCAL_EAR_LOCAL'] = '1'  # this process computes; it never calls itself
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aes
import screen

PORT = int(os.environ.get('RASCAL_EAR_PORT', '8765'))


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            req = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            if self.path == '/aes':
                out = aes.score(req['path'], req.get('start'), req.get('end'))
            elif self.path == '/screen':
                out = screen.screen(req['path'])
            else:
                raise ValueError(self.path)
            body, code = json.dumps(out).encode(), 200
        except Exception as e:  # report the error to the caller, keep serving
            body, code = json.dumps({'error': f'{type(e).__name__}: {e}'}).encode(), 500
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    aes.predictor()
    import ear
    ear.models()
    print(f'ears ready on 127.0.0.1:{PORT}', flush=True)
    HTTPServer(('127.0.0.1', PORT), H).serve_forever()
