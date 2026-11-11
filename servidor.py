"""Servidor de desarrollo del pinball.

Hace lo mismo que `python -m http.server`, pero le dice al navegador que no guarde
nada en caché. Con el servidor normal, el navegador seguía usando el juego.js de su
caché después de cambiarlo, y había que forzar la recarga para ver los cambios.

Además guarda las puntuaciones, un top 10 por mesa: POST /api/puntuacion con
{"mesa": "playa" | "montana", "nombre": "ABC", "puntos": 123} añade la partida a
assets/puntuaciones-<mesa>.txt, que solo conserva las 10 mejores, y devuelve la tabla
resultante. El juego lee esos mismos ficheros con un GET normal.

Uso: python servidor.py [puerto]
El puerto sale del argumento, si no de la variable PORT y si no es el 5173.
"""
import http.server
import json
import os
import re
import sys
import threading

RAIZ = os.path.dirname(os.path.abspath(__file__))
MESAS = ('playa', 'montana')   # solo estos nombres: el de la mesa acaba en una ruta de fichero
MAX_PUNTUACIONES = 10
cerrojo = threading.Lock()   # dos partidas que acaban a la vez no se pisan el fichero


def fichero(mesa):
    return os.path.join(RAIZ, 'assets', f'puntuaciones-{mesa}.txt')


def lee_puntuaciones(mesa):
    """[(nombre, puntos)] de mejor a peor; las líneas mal formadas se ignoran."""
    lista = []
    try:
        with open(fichero(mesa), encoding='utf-8') as f:
            for linea in f:
                m = re.match(r'^([A-Z]{3})\s+(\d{1,12})\s*$', linea)
                if m:
                    lista.append((m.group(1), int(m.group(2))))
    except FileNotFoundError:
        pass
    lista.sort(key=lambda p: -p[1])
    return lista[:MAX_PUNTUACIONES]


def guarda_puntuacion(mesa, nombre, puntos):
    with cerrojo:
        lista = lee_puntuaciones(mesa)
        lista.append((nombre, puntos))
        # a igualdad de puntos manda la más antigua: sort es estable y la nueva va al final
        lista.sort(key=lambda p: -p[1])
        lista = lista[:MAX_PUNTUACIONES]
        tmp = fichero(mesa) + '.tmp'
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            for n, p in lista:
                f.write(f'{n} {p}\n')
        os.replace(tmp, fichero(mesa))   # se escribe aparte y se cambia de golpe: nunca queda a medias
        return lista


class SinCache(http.server.SimpleHTTPRequestHandler):
    # En Windows, respondiendo en HTTP/1.0 (lo de serie) el servidor cierra la conexión nada
    # más escribir el fichero y el navegador perdía el final de los gifs grandes: se quedaba
    # 19 s esperando y acababa en ERR_CONNECTION_RESET. Con HTTP/1.1 la conexión sigue
    # abierta y el navegador sabe por Content-Length cuándo ha llegado todo
    protocol_version = 'HTTP/1.1'

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def responde_json(self, codigo, datos):
        cuerpo = json.dumps(datos).encode('utf-8')
        self.send_response(codigo)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_POST(self):
        if self.path != '/api/puntuacion':
            self.responde_json(404, {'error': 'no existe'})
            return
        try:
            largo = int(self.headers.get('Content-Length', 0))
            if largo > 1000:
                raise ValueError('demasiado grande')
            datos = json.loads(self.rfile.read(largo) or b'{}')
            mesa = datos.get('mesa')
            if mesa not in MESAS:
                raise ValueError('mesa desconocida')
            nombre = str(datos.get('nombre', ''))
            puntos = datos.get('puntos')
            if not re.fullmatch(r'[A-Z]{3}', nombre):
                raise ValueError('el nombre son tres letras mayúsculas')
            if not isinstance(puntos, int) or isinstance(puntos, bool) or not 0 <= puntos < 10**12:
                raise ValueError('puntos no válidos')
        except (ValueError, json.JSONDecodeError) as e:
            self.responde_json(400, {'error': str(e)})
            return
        lista = guarda_puntuacion(mesa, nombre, puntos)
        self.responde_json(200, [{'nombre': n, 'puntos': p} for n, p in lista])


class Servidor(http.server.ThreadingHTTPServer):
    # en Windows, reutilizar la dirección deja que dos servidores escuchen a la vez en el
    # mismo puerto y no se sabe cuál responde: mejor que falle si el puerto está ocupado
    allow_reuse_address = False


if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 5173))
    os.chdir(RAIZ)   # sirve la carpeta del juego aunque se arranque desde otro sitio
    print(f'Pinball en http://localhost:{puerto} (sin caché; Ctrl+C para parar)')
    Servidor(('', puerto), SinCache).serve_forever()
