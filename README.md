# Jaime Sánchez · portfolio mezcla (portfolio actual + J06 3D)

Es el portfolio actual (https://prinzip96.github.io/Portfolio-empresarial/), con su paleta, su tipografía y sus secciones y textos reales. El hero y la sección de trabajos se han sustituido por la J06 cromada en 3D, fija en el centro, con las 5 webs girando a su alrededor en un anillo al hacer scroll.

## Abrirlo en local
Necesita un servidor (módulos ES + capturas por URL):
```bash
npm install
npm run serve
```
Abre `http://localhost:8080` (o `http://IP:8080` desde el móvil).

```bash
npm run build   # regenera js/ (app + chunks de Three/escena)
```

## Deploy (Railway)
Igual que el portfolio anterior: `npm start` sirve la carpeta en `$PORT` (`railway.toml`).

## Qué se conserva del portfolio actual
- **Paleta:** fondo `#0a0a0a`, hueso `#f4f2ee`, gris `#8b8b86` y lima `#bcff4d`.
- **Tipografía:** Instrument Serif con palabras en cursiva, más Inter. Está alojada en local, en `assets/fonts/`.
- **Texturas y efectos:** grano, dither de 1 bit y ondas de sonido, con los mismos módulos (`src/portfolio/`).
- **Contenido:** navegación, barra de progreso, el botón flotante "Hablemos" y todas las secciones con sus textos: Lo que hago, Servicios, IA, Proceso, Sonido, Sobre mí, Currículum, Preguntas y Contacto.

## Qué es nuevo (`src/mezcla.js`, `css/mezcla.css`)
- **Escenario fijado de 720vh** (700vh en móvil):
  1. **Hero:** el titular original, con la J06 a la derecha (arriba a la derecha en móvil).
  2. Al hacer scroll, la J se desplaza al centro. Las 5 webs entran desde los lados y forman un anillo con perspectiva y profundidad real: las de detrás se ven más oscuras y desenfocadas.
  3. Cada tramo de scroll gira el anillo 72° y se detiene en una web: Mona Real Estate, KW Solutions, Desbloque, Phobia y Distrito 4.
  4. La placa inferior muestra el número, el nombre, las etiquetas, el año y el enlace de la web que queda al frente. También se puede hacer clic en la pantalla para abrirla. Las cinco abren su ficha en `projects/`; desde ahí se va a la web en vivo.
- **Cromo con acento lima:** el entorno de estudio es oscuro, con tiras blancas y una tira lima. El destello es blanco con halo lima y estela a 26°.
- **Dither de 1 bit en las transiciones:** un pase Bayer 4×4 en lima y hueso entra al formarse el anillo, da un toque en cada giro y vuelve al soltarse el escenario. En reposo, el cromo se ve limpio.
- **Fondo:** sin cuadrículas. Solo fondo oscuro, grano y luz.
- **Movimiento reducido:** con `prefers-reduced-motion`, sin dither ni flotación. Sin WebGL, se muestra la J en SVG.

## Recompilar
```bash
npm install
npm run build        # genera js/app.js
```
`tools/record.js` y `tools/shot.js` (con puppeteer-core) son los scripts con los que se grabaron el vídeo y las capturas.
Las capturas viven en `assets/shots/*.jpg` y se cargan por URL (no van en base64).
