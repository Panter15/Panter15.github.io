# Guía de construcción: Luis's Island

Esta guía explica, paso a paso, cómo se construyó este portafolio: qué se hizo en cada capa, con qué tecnología y
**por qué**, citando la documentación oficial en la que se basa cada decisión. El objetivo es que una persona pueda
reconstruir el proyecto desde cero sin haber visto las conversaciones en las que se diseñó.

> Se actualiza con cada cambio. Si cambias el código, actualiza la sección correspondiente en el mismo PR.

---

## 0. Qué es y cómo se ve

Un portafolio con forma de isla en pixel art, al estilo de los juegos de Super Nintendo / Game Boy Advance
(referencia principal: la pantalla de título de *Super Mario World 2: Yoshi's Island*, 1995).

- La isla está inclinada en 3D y **gira**: con los botones ◀ ▶, arrastrando, con la rueda del mouse o con las flechas.
- Los edificios son proyectos: al hacer clic en uno, la cámara **se acerca** y aparece un cuadro de diálogo estilo
  Pokémon: *"Do you want to go there? ▶YES / NO"*. YES abre el proyecto en una pestaña nueva.
- **La Malinche** (el volcán de Tlaxcala) está en el centro y no se mueve. Las casas y el barco tienen 4 dibujos
  (frente, lados, espalda) que cambian según el ángulo.
- *Classic view* muestra los mismos enlaces como lista de texto.

Sitio: https://panter15.github.io/ · Repositorio: https://github.com/Panter15/Panter15.github.io

---

## 1. Requisitos

| Herramienta | Versión usada | Para qué |
|---|---|---|
| Node.js | 22.16 | Generar el arte (`art/render3.js`) y compilar Angular |
| Angular CLI | 20.0.x (`npx @angular/cli@20`) | Crear y compilar la app |
| Git + GitHub CLI (`gh`) | cualquiera reciente | Repositorio, PRs, configurar Pages |
| Navegador Chrome | cualquiera reciente | Probar (CSS 3D y Pointer Events) |

Angular 20 exige Node `^20.19`, `^22.12` o `^24` (ver https://angular.dev/reference/versions).

---

## 2. Arquitectura: las capas

```
 art/render3.js  (Node, sin dependencias)
   │  dibuja píxel por píxel y escribe:
   ├─► public/island/ground.png ............ capa 1: el suelo (mar + isla), plano
   ├─► public/island/sprites/*.png ......... capa 2: cada objeto (volcán, casas, árboles...)
   ├─► src/app/island/island-data.ts ........ capa 3: dónde va cada objeto (datos)
   └─► art/*.png, art/luis_island.piskel ..... versiones planas 2D (concepto, edición en Piskel)

 src/app (Angular 20)
   ├─ island/      capa 4: escena 3D en CSS (suelo inclinado + billboards), giro, zoom
   ├─ text-box/    capa 5: cuadro de diálogo estilo Pokémon (YES / NO)
   ├─ classic-view capa 5: lista de enlaces en texto
   └─ app.*        une todo y abre el proyecto elegido

 .github/workflows/deploy.yml  capa 6: compila y publica en GitHub Pages en cada push a main
```

La idea central: **el arte se genera con código** (reproducible, versionable, sin programas de dibujo obligatorios) y
**la escena 3D es CSS puro** (sin motor de juegos), así cada pieza es pequeña y explicable.

---

## 3. Capa 1 y 2: el arte pixel (`art/render3.js`)

### 3.1 Por qué generar el arte con código

- Es **reproducible**: `node art/render3.js` regenera todas las imágenes idénticas (el "ruido" usa una función hash
  determinista, no `Math.random`).
- **Sin dependencias**: no hace falta instalar librerías de imágenes; el script escribe los PNG a mano.
- Los cambios de arte quedan en el historial de Git como cambios de código, fáciles de revisar.

### 3.2 Cómo se escribe un PNG sin librerías

Un PNG es una firma de 8 bytes seguida de *chunks* (bloques). Cada chunk tiene: longitud (4 bytes), tipo (4 letras),
datos y un CRC-32 de tipo+datos. Usamos tres: `IHDR` (ancho, alto, profundidad de bit 8, tipo de color 6 = RGBA),
`IDAT` (los píxeles comprimidos con zlib/deflate) y `IEND` (fin). Antes de comprimir, cada fila de píxeles empieza con
un byte de "filtro" (usamos 0 = sin filtro). Todo esto está definido en la especificación PNG del W3C:
https://www.w3.org/TR/png/ (secciones *Chunk layout*, *IHDR*, *Filtering*). Node trae deflate en el módulo `zlib`
(https://nodejs.org/api/zlib.html), así que no hace falta nada externo. Ver la función `png()` al final del script.

Para que el pixel art se vea nítido al ampliarlo, las ampliaciones son **por vecino más cercano** (cada píxel se
repite N veces), igual que hace el navegador con `image-rendering: pixelated` (sección 5.5).

### 3.3 Coordenadas y lienzo

- **Vista del mapa: 480×320 px**, que son 2×2 pantallas de Game Boy Advance (la GBA mide 240×160). Todo se dibuja en
  estas coordenadas.
- **Lienzo real: 800×640 px** (`CW`, `CH`), con el mapa desplazado `OX = 160`, `OY = 138`. Ese margen de mar extra
  existe porque en 3D la isla gira, y sin él se verían los bordes de la imagen.
- **Capas de dibujo**: `Ground`, `Malinche`, `Objects`, `Sky`. Cada una es un búfer RGBA. `px(x, y, color)` pinta en
  la capa actual; `get(x, y)` lee el color visible (la capa más alta con píxel).
- **Luz**: el sol está arriba a la derecha. Todas las piezas tienen brillo arriba/derecha y sombra abajo/izquierda.

### 3.4 El agua por profundidad

Inspirada en fotos reales de islas de arrecife: turquesa en la orilla, luego verde azulado, azul y azul marino.

- La forma de la isla es una elipse "ondulada": `shape(x, y)` devuelve la distancia normalizada al centro
  (`CX = 240, CY = 182, RX = 214, RY = 122`) dividida por un radio que varía con senos (`3θ, 5θ, 9θ`). `d < 1` es
  tierra y `d > 1` es agua; cuanto mayor `d`, más profundo.
- El color sale de una tabla de umbrales (`STEPS`) sobre `d`, con un pequeño desplazamiento aleatorio por píxel
  (`hash`) que **difumina los bordes con *dithering*** (mezcla de píxeles), técnica típica de las consolas con pocos
  colores.
- En aguas poco profundas, una función de senos dibuja manchas de pasto marino oscuras y bancos de arena claros.
- Las olas (trazos claros con sombra) solo aparecen en agua profunda y paran antes del borde del lienzo.

### 3.5 La tierra

- **Acantilado** al sur: los píxeles justo debajo del borde (`CLIFF = 4`) se pintan como roca, para dar grosor a la
  isla, como la meseta de Yoshi's Island.
- **Arena** fina con una bahía más ancha al sur, y una línea de espuma.
- **Bosque denso** (inspirado en fotos de islas reales): cientos de copas redondas superpuestas en 5 tonos de verde,
  cada una con sombra abajo-izquierda y brillo arriba-derecha.
- **Claros** (`CLEARINGS`): elipses de pasto donde van las casas y el faro, para que no queden "dentro" de los árboles.
- **Pasto alto** al estilo Pokémon: bloques de 8×8 con hojas claras.

### 3.6 La Malinche (`art/malinche.js`)

- La silueta se tomó de **fotos reales** del volcán: base ancha de bosque, cumbre rocosa y escarpada, un pináculo
  pequeño a la izquierda y una cresta larga a la derecha que termina en otro pico. Se guarda como lista de puntos
  `TOP` (contorno superior) y `TREE` (línea donde empieza el bosque), en coordenadas 0–1.
- Cada columna se pinta de arriba abajo: contorno oscuro, nieve en manchas, roca con barrancas verticales y bosque.
  La pendiente que mira a la derecha (al sol) usa colores claros.
- Después, `forestCanopy()` repinta el bosque del volcán con copas redondas, igual que el de la isla, recortadas a los
  píxeles de bosque.
- `drawMalinche` también acepta perfiles laterales y espejo (`side`, `mirror`) por si algún día se quiere que gire;
  hoy se usa solo la vista frontal (decisión de diseño, sección 6.3).

### 3.7 Objetos como *sprites* separados

Para la escena 3D, cada objeto necesita su propia imagen. La función `sprite(id, views, anchor)`:

1. Dibuja cada vista en una capa temporal y recorta su caja (*bounding box*).
2. Guarda el **ancla**: el punto donde el objeto toca el suelo. Cada vista se guarda como desplazamiento (`dx`, `dy`)
   desde ese ancla, para que las 4 vistas queden paradas en el mismo lugar.
3. Copia la vista frontal a la imagen plana (para las versiones 2D).

**Sombras**: los objetos llaman a `shadow()`, que pinta en la capa del suelo (`onGround`), no en el sprite. Así la
sombra queda plana en el piso y no "de pie" con el objeto.

**4 vistas** (`[frente, este, espalda, oeste]`):

| Objeto | Vistas | Detalle |
|---|---|---|
| Casas | 4 | Frente: puerta + 2 ventanas + letrero a la derecha. Lados: más angosta (`HOUSE_DEPTH = 26`), 1 ventana. Espalda: sin puerta, 3 ventanas. El letrero está en la esquina frente-derecha, así que se ve a la izquierda desde el este y la espalda, y desde el oeste queda oculto |
| Barco | 4 | De costado (vela a un lado o al otro) y de proa (angosto) |
| Volcán, árboles, palmeras, faro | 1 | Se ven iguales desde todos lados |

### 3.8 Salidas del script

| Archivo | Uso |
|---|---|
| `public/island/ground.png` | Suelo completo 800×640 para la escena 3D |
| `public/island/sprites/<id>.png` o `<id>-<vista>.png` | Cada objeto |
| `src/app/island/island-data.ts` | Datos generados: ancla y vistas de cada objeto. **No editar a mano** |
| `art/island_concept_v3.png`, `art/island_v3_1x.png` | Imagen plana 2D (3× y 1×) |
| `art/luis_island.piskel` | Archivo de [Piskel](https://www.piskelapp.com) con las 4 capas, para editar a mano |

El `.piskel` es JSON: `{ modelVersion: 2, piskel: { width, height, layers: [...] } }`, donde cada capa es a su vez
un texto JSON con `chunks: [{ layout: [[0]], base64PNG: "data:image/png;base64,..." }]`. Se verificó importándolo en
piskelapp.com (*Import → Browse .piskel files → Replace*).

**Comando**: `node art/render3.js` (desde la raíz o desde `art/`).

---

## 4. Capa de aplicación: el proyecto Angular

### 4.1 Creación

```bash
npx @angular/cli@20 new luis-island --directory . --style=scss --routing=false --ssr=false --skip-git --defaults --skip-tests
npm install gsap@3
```

- **Por qué Angular**: es el stack principal de Luis (Java/Spring Boot + Angular), así que el portafolio también es
  una muestra de código. Se usan **componentes standalone** y **signals**, el modelo recomendado en Angular moderno:
  https://angular.dev/guide/signals
- **Sin router**: solo hay una pantalla (la isla) y vistas superpuestas, así que no hace falta.
- **Sin SSR**: es un sitio estático en GitHub Pages.
- **SCSS** para anidar estilos.

### 4.2 Estructura

```
src/app/
  app.ts / app.html / app.scss    raíz: header, isla, cuadro de diálogo, vista clásica
  island/island.ts / .html / .scss la escena 3D y toda la interacción
  island/island-data.ts           GENERADO por art/render3.js
  island/landmarks.ts             qué objetos son edificios con enlace (id, nombre, URL, descripción)
  text-box/                       cuadro de diálogo Pokémon
  classic-view/classic-view.ts    lista de enlaces
src/styles.scss                   colores globales (variables CSS) y fuente
src/index.html                    título, descripción y la fuente "Press Start 2P"
```

- **Fuente**: *Press Start 2P* de Google Fonts, una fuente pixel gratuita (https://fonts.google.com/specimen/Press+Start+2P).
- **Colores**: variables CSS en `:root` (`--ink`, `--paper`, `--frame`, `--accent`) para cambiar el tema en un solo lugar.
- **Plantillas**: se usa el *control flow* nativo (`@if`, `@for`): https://angular.dev/guide/templates/control-flow
- **Comunicación entre componentes**: `input()` y `output()` (https://angular.dev/guide/components/inputs,
  https://angular.dev/guide/components/outputs) y `viewChild()` para llamar a la isla desde la raíz
  (https://angular.dev/guide/components/queries).

---

## 5. Capa 4: la escena 3D en CSS (`island/`)

### 5.1 La idea: "Mode 7" con CSS

El Super Nintendo tenía el **Mode 7**: tomaba una sola imagen de fondo y la rotaba, escalaba e inclinaba con una
matriz, cambiándola en cada línea de la pantalla para simular perspectiva (así funcionan *F-Zero* y *Super Mario Kart*,
y la pantalla de título de *Yoshi's Island* gira la isla así). Los objetos (montañas, castillos) eran *sprites*
aparte. Aquí se hace lo mismo con transformaciones 3D de CSS, que el navegador acelera por GPU.

### 5.2 Las propiedades clave (MDN)

| Propiedad | Qué hace | Dónde se usa |
|---|---|---|
| `perspective` | Distancia del espectador al plano z=0; da la sensación de profundidad a los hijos 3D. https://developer.mozilla.org/en-US/docs/Web/CSS/perspective | `.scene { perspective: 900px }` |
| `perspective-origin` | Desde dónde "mira" el espectador. https://developer.mozilla.org/en-US/docs/Web/CSS/perspective-origin | `50% 30%` (mirada desde arriba) |
| `transform-style: preserve-3d` | Los hijos viven en el mismo espacio 3D que el padre (si no, se aplanan). https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style | `.world` |
| `transform-origin` | Punto alrededor del cual rota un elemento. https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin | `0 0` en el mundo; el ancla en cada sprite |
| `transform` | Lista de funciones; se aplican de derecha a izquierda sobre los puntos del elemento. https://developer.mozilla.org/en-US/docs/Web/CSS/transform | ver 5.3 |

### 5.3 El mundo

```
.world (en el 50% / 62% de la pantalla, tamaño 0, origen 0 0)
  transform: translateZ(zoom) rotateX(60deg) rotateZ(giro) translate(-focoX·s, -focoY·s)
```

Leído de derecha a izquierda sobre un punto del suelo:

1. `translate(-foco)`: lleva el **foco** (normalmente el centro de la isla) al origen. Por eso la isla gira alrededor
   de su centro y, al hacer zoom, alrededor del edificio elegido.
2. `rotateZ(giro)`: gira la isla en su propio plano.
3. `rotateX(60deg)`: inclina el suelo 60° alejándolo del espectador (el "Mode 7").
4. `translateZ(zoom)`: acerca la cámara (zoom).

Dentro del mundo están: un **disco de mar** (`.open-sea`, `border-radius: 50%`, radio `560·s`), el **suelo**
(`ground.png`) y los **sprites**. El disco es redondo a propósito: un rectángulo mostraría sus esquinas al girar, y un
círculo no; además su borde lejano dibuja un **horizonte curvo** contra el cielo (degradado de fondo de `.scene`).

### 5.4 Los *billboards* (objetos de pie)

Cada objeto es un `<img>` (o `<button>` si es un edificio con enlace) dentro del mundo, con:

```css
transform: rotateZ(calc(-1 * var(--rot))) rotateX(calc(-1 * var(--tilt)));
transform-origin: <ancla del objeto>;
```

El mundo aplica `rotateX(60°)·rotateZ(giro)` y el objeto aplica lo contrario, `rotateZ(-giro)·rotateX(-60°)`. Las
rotaciones se cancelan, así que el objeto **queda de pie y mirando a la cámara** siempre, pero su posición sí gira con
la isla. Es la técnica *billboard* de Mario Kart, Doom o la propia Yoshi's Island. `--rot` y `--tilt` son variables CSS
que el mundo hereda a sus hijos.

**Elegir la vista** (`island.ts`, `side`): `((round(giro / 90) % 4) + 4) % 4`. Con +90° la cara este del objeto queda
hacia la cámara, por eso el orden de las vistas es `[frente, este, espalda, oeste]`.

**Profundidad**: con `preserve-3d`, el navegador ordena los objetos por distancia real, así que lo que está detrás del
volcán queda tapado por él sin programar nada. **Importante**: no separes los objetos en capas con `z-index`, porque
eso rompe este orden (lo de atrás se vería delante).

### 5.5 Píxeles nítidos

- `image-rendering: pixelated` (https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering) para que el
  navegador no difumine el pixel art al ampliarlo.
- **Escala entera** `s` (1×, 2×, 3×...): `max(1, floor(anchoPantalla · 0.85 / 428))`, donde 428 es el ancho de la
  tierra en el arte 1×. Con escalas enteras cada píxel del arte ocupa un número exacto de píxeles de pantalla.

---

## 6. Capa 4: interacción (`island.ts`)

### 6.1 Formas de girar

| Entrada | Implementación | Documentación |
|---|---|---|
| Botones ◀ ▶ | `turn(±1)`: va al siguiente múltiplo de 45° (`STEP`), animado | — |
| Arrastrar (mouse y dedo) | `pointerdown` en la escena y `pointermove/pointerup` en `window`; 0.25°/px; los primeros 6 px no cuentan, para que un clic no se confunda con arrastre | Pointer Events unifican mouse, touch y lápiz: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events · `touch-action: none` evita que el navegador haga scroll en el táctil: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action |
| Rueda / trackpad | `(wheel)` con `preventDefault()` para que la página no haga scroll; 0.15°/unidad | https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event |
| Teclado ← → | `HostListener('window:keydown')` | — |

Mientras el cuadro de diálogo o la vista clásica están abiertos, la isla queda bloqueada (`locked`).

> **Bug que se encontró**: en el primer prototipo se usaba `setPointerCapture`, que redirige el `click` al contenedor
> y hacía que el clic en una casa no abriera nada. Se quitó: el arrastre escucha en `window` y el clic queda en el botón.

### 6.2 Animación con GSAP

- **Por qué GSAP**: maneja curvas de animación (*easing*), se puede interrumpir, y sus *timelines* servirán para la
  intro "PRESS START". Es gratuito, incluidos sus plugins. Documentación de `gsap.to()`:
  https://gsap.com/docs/v3/GSAP/gsap.to()
- **Cómo**: GSAP anima un **objeto plano** `cam = { rot, zoom, focusX, focusY }` y en `onUpdate` se copian sus
  valores a los *signals* que lee la plantilla (`sync()`). Separar "estado animado" de "estado de la vista" evita
  pelear con el detector de cambios de Angular.
- Curva `power3.out` (rápida al inicio, suave al final); giro de 0.5 s, zoom de 0.6 s.
- **Movimiento reducido**: si el usuario lo pide en su sistema (`prefers-reduced-motion`,
  https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), las animaciones duran 0 s.

### 6.3 La Malinche no se mueve

Decisión: La Malinche se ve **siempre de frente** (una sola vista) y **no se mueve** mientras la isla gira; las casas
sí muestran sus lados.

> **Bug que se encontró y su causa**: el volcán estaba anclado 9 px delante del centro de la isla. Como la isla gira
> alrededor de su centro, el volcán daba vueltas alrededor de ese punto: se desplazaba ~20 px y cambiaba de tamaño
> (409 → 423 px de ancho) al acercarse y alejarse de la cámara. **Solución** (PR #1): anclarlo exactamente en el centro
> (`[CX, CY]`). Se verificó midiendo su caja en pantalla a 0°, 45°, 90° y 180°: idéntica.

### 6.4 Zoom a un edificio

Al hacer clic en un edificio, el foco se mueve a su ancla y la cámara se acerca 380 px (`ZOOM_IN`). Al terminar la
animación se emite `selected` y la raíz muestra el cuadro de diálogo. Con NO o Esc, `zoomOut()` vuelve al centro.

---

## 7. Capa 5: cuadro de diálogo y vista clásica

### 7.1 Cuadro estilo Pokémon (`text-box/`)

- Caja blanca con doble borde (borde oscuro + `box-shadow inset` azulado) y una caja pequeña de opciones arriba a la
  derecha, como en los juegos de GBA.
- **Texto que se escribe solo**: un `setInterval` de 18 ms agrega una letra a un *signal*; con movimiento reducido
  aparece completo.
- **Teclado**: ↑/↓ cambian la opción (el ▶ se dibuja con `::before` sobre `aria-selected="true"`), Enter elige
  (botones nativos) y Esc = NO. El foco se mueve a la opción activa con un `effect()`.
- **Accesibilidad**: `role="dialog"`, `aria-modal`, `aria-labelledby`; opciones con `role="option"`.

### 7.2 Abrir el proyecto

`window.open(url, '_blank', 'noopener')`: pestaña nueva para que la isla siga abierta; `noopener` impide que la página
abierta controle la nuestra (https://developer.mozilla.org/en-US/docs/Web/API/Window/open).

### 7.3 Vista clásica

Los mismos enlaces (`LANDMARKS` + `EXTRA_LINKS` de `landmarks.ts`) como lista. Sirve para reclutadores con prisa,
lectores de pantalla y teléfonos lentos.

---

## 8. Capa 6: publicación en GitHub Pages

1. **Repositorio** `Panter15/Panter15.github.io`: un repo con el nombre `<usuario>.github.io` es el *sitio de usuario*
   y se publica en la raíz `https://<usuario>.github.io/` (tipos de sitio:
   https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages). Los sitios de proyecto
   existentes (`/visa-agency-fe/`, `/danza-folclor/`) siguen funcionando en sus rutas.
2. **Crear y subir**:
   ```bash
   gh repo create Panter15/Panter15.github.io --public --source . --remote origin --push
   ```
   Público porque GitHub Pages gratuito lo requiere.
3. **Publicar con un workflow propio** en vez de una rama:
   ```bash
   gh api -X PUT repos/Panter15/Panter15.github.io/pages -f build_type=workflow
   ```
   (https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
4. **`.github/workflows/deploy.yml`**: en cada push a `main` → `npm ci` → `ng build` → copia `index.html` a
   `404.html` → `actions/upload-pages-artifact` con `dist/luis-island/browser` → `actions/deploy-pages`. Permisos
   mínimos (`pages: write`, `id-token: write`) y `persist-credentials: false` en el checkout.

Flujo de trabajo: cada cambio va en una rama con PR hacia `main`; al fusionar se publica en ~1 minuto.

---

## 9. Cómo se verificó

Con Playwright (navegador automatizado) contra `ng serve`:

- Giro con botón, arrastre y rueda: el ángulo cambia lo esperado (por ejemplo, rueda de 300 → -45°).
- Clic en una casa → zoom → cuadro con el texto correcto; ↓ mueve el ▶ a NO; Esc cierra y vuelve el zoom; Enter en
  YES abre la URL correcta en una pestaña nueva.
- Vista clásica: 4 enlaces; se abre y se cierra.
- Tamaños 1280×800 y 390×844 (teléfono).
- Sitio publicado: 23 sprites, ninguna imagen rota, fuente cargada.
- `ng build`: ~79 kB transferidos.

---

## 10. Decisiones y alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Isla 3D con Three.js | Se probó la idea y al autor no le gustó el look 3D; quería pixel art de su infancia |
| Mapa plano para arrastrar (2D) | Funcionaba, pero el autor quería que la isla **girara** como en Yoshi's Island |
| Phaser / PixiJS (motores de juego) | Solo valen la pena con un personaje que camine, muchos sprites animados o partículas; aquí bastan CSS y botones HTML, que además son accesibles |
| React / Next.js | Angular muestra el stack principal del autor |
| Arte robado de Nintendo / Pokémon | Derechos de autor: todo el arte es original; los juegos solo son referencia de estilo |

**Errores encontrados durante la construcción** (útiles para quien lo replique):

- Angular 20.0 **no acepta funciones flecha en plantillas** (`classic.update(c => !c)` falla); usar `classic.set(!classic())`.
- `ISLAND ... as const` hace que `signal(ISLAND.ground.centerX)` tenga tipo literal (`400`); declararlo `signal<number>(...)`.
- Al girar se veían las **esquinas del mar** → disco de mar redondo bajo el suelo.
- Un mar gigante cuadrado **tapaba el cielo** (el horizonte de un plano infinito inclinado 60° queda fuera de la
  pantalla) → disco de tamaño limitado, cuyo borde hace de horizonte.
- Volcán anclado fuera del centro → daba vueltas (sección 6.3).

---

## 11. Receta: agregar un edificio nuevo (un proyecto desplegado)

1. En `art/render3.js`, sección *place everything*, agrega `sprite('<id>', <vista o 4 vistas>, [x, y])` con su ancla
   en coordenadas del mapa (480×320). Si necesita un claro de pasto, agrégalo a `CLEARINGS`.
2. Corre `node art/render3.js` (regenera `public/island/` e `island-data.ts`).
3. En `src/app/island/landmarks.ts`, agrega `{ id: '<id>', name, place, about, url }` a `LANDMARKS` (y quítalo de
   `EXTRA_LINKS` si estaba ahí).
4. `npm start`, prueba girar, clic, YES.
5. Actualiza esta guía, abre un PR y fusiónalo.

---

## 12. Pendiente

- Inglés / español / francés con selector (idioma del navegador por defecto).
- Animaciones (agua, nubes, luz del faro) + música chiptune propia hecha en BeepBox y efectos, silenciados al inicio.
- Intro "PRESS START" con la isla girando (solo la primera visita).
- Estatua del caimán para Danza Folclor (falta foto de referencia; aclarar Ciénaga vs. Plato).
- Avatar pixel del autor (falta foto).
