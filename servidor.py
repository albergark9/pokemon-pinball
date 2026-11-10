"""Servidor de desarrollo del pinball.

Hace lo mismo que `python -m http.server`, pero le dice al navegador que no guarde
nada en caché. Con el servidor normal, el navegador seguía usando el juego.js de su
caché después de cambiarlo, y había que forzar la recarga para ver los cambios.

Uso: python servidor.py [puerto]
El puerto sale del argumento, si no de la variable PORT y si no es el 5173.
"""
import http.server
import os
import sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Servidor(http.server.ThreadingHTTPServer):
    # en Windows, reutilizar la dirección deja que dos servidores escuchen a la vez en el
    # mismo puerto y no se sabe cuál responde: mejor que falle si el puerto está ocupado
    allow_reuse_address = False


puerto = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 5173))
print(f'Pinball en http://localhost:{puerto} (sin caché; Ctrl+C para parar)')
Servidor(('', puerto), SinCache).serve_forever()
