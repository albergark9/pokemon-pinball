# Pinball Alola

Un pinball de mesa única ambientado en Alola, escrito en canvas 2D **sin dependencias**:
sin motor de físicas, sin framework y sin build. Los sprites son GIF animados que el
juego descodifica por su cuenta (decodificador LZW propio, incluido en `juego.js`).

## Arrancar

El juego carga los sprites con `fetch`, así que **no vale abrir `index.html` a doble clic**:
`file://` bloquea esas peticiones y la mesa saldría con los dibujos de canvas en vez de los GIF.
Hace falta servirlo por HTTP:

```bash
npm start
```

Eso levanta `python -m http.server` en http://localhost:5173. Si prefieres Node:

```bash
npm run start:node
```

## Cómo está montado

| Archivo | Qué hay dentro |
|---|---|
| `index.html` | La estructura: HUD, banner, pokédex y el canvas |
| `styles.css` | Todo el estilo, con la paleta en variables CSS |
| `juego.js` | Físicas, render, pokédex y el descodificador de GIF |
| `assets/sprites/` | Los 43 GIF que usa la mesa |

## Los sprites

Cada sprite se identifica por una clave, y la clave es el nombre del archivo sin extensión:
`assets/sprites/bunneary.gif` → `bunneary`. Al arrancar, `juego.js` rellena las rutas solo:

```js
const RUTA_SPRITES='assets/sprites/';
for(const k in SPRITES_EXTERNOS) if(!SPRITES_EXTERNOS[k]) SPRITES_EXTERNOS[k]=RUTA_SPRITES+k+'.gif';
```

Para **probar un sprite distinto** sin tocar la carpeta, arrastra un GIF sobre la ventana:
se carga al vuelo y pisa al de disco hasta que recargues. Los espacios del nombre cuentan
como guiones (`scorbunny corriendo.gif` → `scorbunny-corriendo`).

Si falta un GIF, el juego no se rompe: dibuja esa pieza con el trazado de canvas de repuesto.

### Sprites con segmentos

Algunos GIF meten dos animaciones en una sola tira, y `SEGMENTOS` dice qué trozo es cuál:

- `fennekin-decoracion` — reposo en la primera mitad, la llama en el último cuarto
- `starmie` — reposo en la segunda mitad, el giro en la primera
- `chandelure-fuego` es un GIF aparte que sustituye a `chandelure` mientras dispara

## Cómo se juega

Flippers con las flechas izquierda y derecha, lanzas la bola con espacio. Tienes 3 bolas.
Los capturables van entrando en la pokédex según los golpeas; Mew no entra en el sorteo y
solo se consigue en el bonus del laboratorio secreto.

## Sobre los sprites de Pokémon

Los GIF son de Pokémon, propiedad de Nintendo / Game Freak / The Pokémon Company.
Esto es un proyecto de fan, sin ánimo de lucro y sin relación con ellos.
