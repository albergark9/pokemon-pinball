# Pinball Alola

Un pinball de dos mesas ambientado en Alola (la playa al atardecer y la montaña de la cascada),
escrito en canvas 2D **sin dependencias**:
sin motor de físicas, sin framework y sin build. Los sprites son GIF animados que el
juego descodifica por su cuenta (decodificador LZW propio, incluido en `juego.js`).

## Arrancar

El juego carga los sprites con `fetch`, así que **no vale abrir `index.html` a doble clic**:
`file://` bloquea esas peticiones y la mesa saldría con los dibujos de canvas en vez de los GIF.
Hace falta servirlo por HTTP:

```bash
npm start
```

Eso levanta `servidor.py` en http://localhost:5173. Es el mismo servidor que
`python -m http.server`, pero le dice al navegador que no guarde nada en caché: con el
normal, al recargar seguía saliendo el `juego.js` viejo y había que forzar con Ctrl+F5.
Si prefieres Node:

```bash
npm run start:node
```

## Cómo está montado

| Archivo | Qué hay dentro |
|---|---|
| `index.html` | La estructura: HUD, banner, pokédex y el canvas |
| `styles.css` | Todo el estilo, con la paleta en variables CSS |
| `juego.js` | Físicas, render, pokédex y el descodificador de GIF |
| `assets/sprites/` | Los 43 GIF de la playa y los bonus |
| `assets/sprites/segundo tablero/` | Los GIF de la montaña |
| `assets/music/` | La música de fondo: `tablero.mp3` en las mesas y `bonus.mp3` en los bonus |

## Los sprites

Cada sprite se identifica por una clave, y la clave es el nombre del archivo sin extensión:
`assets/sprites/bunneary.gif` → `bunneary`. Al arrancar, `juego.js` rellena las rutas solo:

```js
const RUTA_SPRITES='assets/sprites/';
for(const k in SPRITES_EXTERNOS) if(!SPRITES_EXTERNOS[k]) SPRITES_EXTERNOS[k]=RUTA_SPRITES+k+'.gif';
```

Los de la montaña viven en `assets/sprites/segundo tablero/` y tienen la ruta escrita a mano
justo debajo (`RUTA_BOSQUE`). Varios traen mucho lienzo vacío alrededor del dibujo, así que
los que están en `RECORTAR` se recortan al cargarlos.

Para **probar un sprite distinto** sin tocar la carpeta, arrastra un GIF sobre la ventana:
se carga al vuelo y pisa al de disco hasta que recargues. Los espacios del nombre cuentan
como guiones y las tildes se ignoran (`scorbunny corriendo.gif` → `scorbunny-corriendo`,
`venomoth-decoración.gif` → `venomoth-decoracion`).

Si falta un GIF, el juego no se rompe: dibuja esa pieza con el trazado de canvas de repuesto.

### Sprites con segmentos

Algunos GIF meten dos animaciones en una sola tira, y `SEGMENTOS` dice qué trozo es cuál:

- `fennekin-decoracion` — reposo en la primera mitad, la llama en el último cuarto
- `starmie` — reposo en la segunda mitad, el giro en la primera
- `chandelure-fuego` es un GIF aparte que sustituye a `chandelure` mientras dispara
- `machamp-decoracion` — flexiona en el primer tercio y lanza el gancho en el segundo; el último no se usa

## Cómo se juega

Flippers con las flechas izquierda y derecha, lanzas la bola con espacio. Tienes 3 bolas.
La mesa se elige en el menú de inicio. Los capturables van entrando en la pokédex según
los golpeas; Mew no entra en el sorteo y solo se consigue en el bonus del laboratorio secreto.

En la **montaña**, cada vez que cuelas la bola en la cueva sale Venomoth; al golpearlo
poliniza la pradera y brotan flores (rojas: Bounsweet x2; con las azules, x3). La tercera
visita saca a Spinda, que abre el modo captura. Al acabar la captura las flores se marchitan
y se vuelve a empezar. El detalle de las dos mesas está en «Ver información», dentro del juego.

## Sobre los sprites de Pokémon

Los GIF son de Pokémon, propiedad de Nintendo / Game Freak / The Pokémon Company.
Esto es un proyecto de fan, sin ánimo de lucro y sin relación con ellos.
