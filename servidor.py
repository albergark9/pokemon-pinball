"""Servidor de desarrollo del pinball.

Hace lo mismo que `python -m http.server`, pero le dice al navegador que no guarde
nada en caché. Con el servidor normal, el navegador seguía usando el juego.js de su
caché después de cambiarlo, y había que forzar la recarga para ver los cambios.

Uso: python servidor.py [puerto]   (por defecto, 5173)
"""
import http.server
import sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
print(f'Pinball en http://localhost:{puerto} (sin caché; Ctrl+C para parar)')
http.server.ThreadingHTTPServer(('', puerto), SinCache).serve_forever()
