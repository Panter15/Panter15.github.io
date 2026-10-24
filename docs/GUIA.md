# Cómo construí Luis's Island

Esta es la guía de cómo armé mi portafolio, paso por paso, para que cualquiera (incluido yo dentro de un año) pueda
volver a hacerlo desde cero. Voy capa por capa: qué hice, con qué herramienta y por qué lo hice así.

## La idea

Crecí con el Super Nintendo y el Game Boy Advance, y quería que mi portafolio se sintiera como esos juegos. La
referencia principal es la pantalla de título de *Super Mario World 2: Yoshi's Island* (1995), donde la isla gira
debajo del logo.

El resultado es una isla en pixel art, inclinada como si la vieras desde arriba, que puedes girar con las flechas de
los lados, arrastrando o con la rueda del mouse. Cada edificio es uno de mis proyectos: le das clic, la cámara se
acerca y aparece un cuadro como los de Pokémon que pregunta "Do you want to go there?". Si dices que sí, el proyecto
se abre en otra pestaña. En el centro está La Malinche, el volcán de Tlaxcala, que siempre se queda quieto y de frente.
Las casas y el barco, en cambio, tienen cuatro dibujos (frente, lados y espalda) que cambian según hacia dónde gires.

También hay una "vista clásica" con los mismos enlaces en una lista normal, para quien tenga prisa.

El sitio está en https://panter15.github.io/ y el código en https://github.com/Panter15/Panter15.github.io.

## Lo que necesitas

- Node.js 22 (yo usé la 22.16). Angular 20 pide Node 20.19 o más nuevo.
- El CLI de Angular 20, que puedes usar sin instalarlo con `npx @angular/cli@20`.
- Git y el CLI de GitHub (`gh`), para el repositorio y la publicación.
- Chrome para probar.

## Cómo está organizado

El proyecto tiene dos mitades. La primera es el arte: un script de Node que dibuja toda la isla píxel por píxel y
guarda las imágenes. La segunda es la página: una app de Angular que toma esas imágenes y las acomoda en una escena 3D
hecha solo con CSS.

```
art/render3.js          dibuja todo y genera:
  public/island/ground.png          el suelo (mar e isla) en una sola imagen
  public/island/sprites/*.png       cada objeto por separado (volcán, casas, árboles...)
  src/app/island/island-data.ts     dónde va cada objeto
  art/*.png y art/luis_island.piskel  versiones planas para ver o editar a mano

src/app/                la app de Angular
  island/               la escena 3D, el giro y el zoom
  text-box/             el cuadro de diálogo estilo Pokémon
  classic-view/         la lista de enlaces
  app.*                 la pantalla principal que une todo

.github/workflows/deploy.yml   publica el sitio en GitHub Pages cada vez que subo a main
```

## Paso 1: el arte

### Por qué lo dibujé con código

Pude haberlo dibujado todo en un programa de pixel art, pero preferí un script por tres razones. Siempre sale igual
(el "ruido" que uso para que las cosas no se vean repetidas sale de una fórmula, no de números al azar). No necesita
ninguna librería. Y cada cambio de arte queda en Git como un cambio de código que se puede revisar. Si quiero retocar
algo a mano, el script también genera un archivo de Piskel (más abajo).

Para correrlo: `cd art && node render3.js`. Hay que correrlo dentro de `art/`, porque las imágenes planas se guardan
en la carpeta donde estés parado.

### Cómo se guarda un PNG sin librerías

Un PNG es más simple de lo que parece. Empieza con una firma fija de 8 bytes y después vienen bloques. Cada bloque
lleva su tamaño, un nombre de cuatro letras, los datos y un código de verificación (CRC-32). Solo se necesitan tres
bloques: `IHDR` con el ancho, el alto y el tipo de color (RGBA), `IDAT` con los píxeles comprimidos, e `IEND` para
cerrar. Antes de comprimir, cada fila de píxeles lleva un byte al inicio que indica el tipo de filtro; yo uso 0, que
significa "sin filtro". La compresión es deflate, y Node ya la trae en su módulo `zlib`. Todo eso está en la función
`png()` al final del script.

Cuando agrando una imagen, cada píxel se copia tal cual varias veces. Así el pixel art se ve nítido y no borroso.

### El tamaño del mapa

Dibujo todo en un mapa de 480×320 píxeles, que son cuatro pantallas de Game Boy Advance (la GBA mide 240×160). Pero
la imagen real es más grande, de 800×640, con mar de sobra alrededor, porque cuando la isla gira en 3D se verían las
orillas de la imagen.

Trabajo con cuatro capas: suelo, volcán, objetos y cielo. Y decidí que el sol siempre está arriba a la derecha, así
que todo tiene el brillo arriba y a la derecha, y la sombra abajo y a la izquierda.

### El agua

Me basé en fotos de islas reales con arrecife: el agua es turquesa en la orilla, luego verde azulado, después azul y
al final azul marino. Para saber qué tan lejos de la isla está cada píxel, uso una elipse con la orilla un poco
ondulada, y según esa distancia elijo el color. En los bordes entre un color y otro mezclo píxeles de los dos (el
famoso "dithering" de las consolas viejas, que tenían pocos colores). En la parte baja del agua dibujé manchas de pasto
marino y bancos de arena, y las olas solo aparecen en el agua profunda.

### La tierra

La isla tiene un pequeño acantilado en el lado sur para que se vea con grosor, como la meseta de Yoshi's Island.
Después viene una franja delgada de arena con una bahía más ancha al sur, y luego un bosque tupido hecho con cientos de
copas de árbol redondas en cinco verdes, también inspirado en fotos de islas de verdad. Donde van las casas y el faro
dejé claros de pasto, para que no queden enterrados entre los árboles. Y puse dos parches de pasto alto como los de
Pokémon.

### La Malinche

La silueta la saqué de fotos reales del volcán: la base ancha de bosque, la cumbre rocosa, un pico chico a la
izquierda y una cresta larga a la derecha que termina en otro pico. Está guardada en `art/malinche.js` como una lista de
puntos del contorno. Cada columna se pinta de arriba hacia abajo: borde oscuro, manchas de nieve, roca con barrancas y
al final bosque, con el lado derecho más claro porque ahí pega el sol. Después le pinto encima el mismo tipo de copas
redondas que tiene el bosque de la isla, para que combinen.

El dibujo también puede hacer el volcán visto de lado o por detrás, pero decidí usar solo la vista de frente, porque
es la silueta que la gente reconoce.

### Cada objeto en su propia imagen

Para la escena 3D cada objeto necesita su propia imagen. Eso lo hace la función `sprite()`. Dibuja el objeto aparte,
lo recorta y guarda el punto exacto donde toca el suelo, que llamo el "ancla". Si el objeto tiene cuatro dibujos, los
cuatro se guardan respecto a ese mismo punto, para que al cambiar de uno a otro el objeto no brinque de lugar.

Las sombras no van en la imagen del objeto, van pintadas en el suelo. Así se quedan planas en el piso en vez de pararse
junto con el objeto.

Las casas tienen cuatro dibujos. De frente se ven la puerta, dos ventanas y el letrero a la derecha. De lado son más
angostas y tienen una sola ventana. Por detrás no hay puerta y hay tres ventanas. El letrero está en la esquina de
adelante a la derecha, así que se ve a la izquierda cuando miras desde el este o desde atrás, y desde el oeste queda
escondido detrás de la casa. El barco tiene su lado con la vela y su vista de proa, que es angosta. El volcán, los
árboles, las palmeras y el faro se ven igual desde todos lados, así que tienen un solo dibujo.

### Lo que genera el script

En `public/island/` quedan el suelo y todos los objetos. En `src/app/island/island-data.ts` queda una lista con el ancla
y los dibujos de cada objeto; ese archivo no se edita a mano, se vuelve a generar. En `art/` quedan las versiones
planas de la isla y `luis_island.piskel`, que se abre en piskelapp.com (Import, luego "Browse .piskel files" y luego
Replace) con sus cuatro capas separadas para poder retocarlas.

## Paso 2: la app de Angular

Creé el proyecto con:

```bash
npx @angular/cli@20 new luis-island --directory . --style=scss --routing=false --ssr=false --skip-git --defaults --skip-tests
npm install gsap@3
```

Elegí Angular porque es lo que uso en mi trabajo (junto con Java y Spring Boot), así que el portafolio también sirve
para que vean cómo programo. Uso componentes standalone y signals, que es la forma actual de trabajar en Angular. No le
puse router porque solo hay una pantalla, ni renderizado en servidor porque es un sitio estático. La fuente es Press
Start 2P, una fuente pixel gratis de Google Fonts, y los colores están en variables CSS en `src/styles.scss` para
cambiarlos en un solo lugar.

Las piezas se hablan así: la isla avisa con un evento cuando eliges un edificio, la pantalla principal muestra el
cuadro de diálogo, y cuando lo cierras le pide a la isla que regrese el zoom. Qué objetos son edificios con enlace
está en `src/app/island/landmarks.ts`.

## Paso 3: la escena 3D, solo con CSS

### El truco del Super Nintendo

El Super Nintendo tenía algo llamado Mode 7: tomaba una sola imagen de fondo y la podía girar, agrandar e inclinar.
Con eso hacían que un mapa plano pareciera un piso en 3D (así funcionan F-Zero y Mario Kart, y así gira la isla en el
título de Yoshi's Island). Las montañas y los castillos eran dibujos aparte puestos encima. Yo hice lo mismo, pero con
las transformaciones 3D que ya trae CSS, que el navegador acelera con la tarjeta de video.

### El suelo

Hay un contenedor, `.scene`, con `perspective: 900px`, que es lo que hace que las cosas lejanas se vean más chicas, y
con el punto de vista un poco arriba del centro. Adentro está el "mundo", con `transform-style: preserve-3d` para que
todo lo de adentro comparta el mismo espacio 3D. El mundo tiene esta transformación:

```
translateZ(zoom) rotateX(60deg) rotateZ(giro) translate(-centro)
```

Se lee de derecha a izquierda. Primero muevo el centro de la isla al punto de origen, para que gire alrededor de su
centro (y al hacer zoom, alrededor del edificio que elegiste). Luego la giro en su propio plano. Luego la inclino 60°
para que parezca un piso visto desde arriba. Y al final la acerco a la cámara para el zoom.

Debajo del suelo puse un disco de mar redondo. Lo hice redondo a propósito: con un rectángulo se verían las esquinas
al girar, y con un círculo no. Además, su orilla de atrás se ve como un horizonte curvo contra el cielo, que es un
degradado de fondo.

Para que el pixel art no se vea borroso uso `image-rendering: pixelated`, y la isla siempre se agranda en números
enteros (2 veces, 3 veces...), calculados según el ancho de la pantalla, para que cada píxel del dibujo ocupe un número
exacto de píxeles en pantalla.

### Los objetos de pie

Cada objeto está dentro del mundo, así que se mueve con la isla. Pero si no hago nada, quedaría acostado en el piso.
Para pararlo le aplico lo contrario de lo que se le aplicó al mundo: `rotateZ(-giro) rotateX(-60deg)`, alrededor de su
ancla. Los giros se cancelan, y el objeto queda de pie y siempre de frente a la cámara, aunque su lugar en la isla sí
gire. Es la misma técnica que usaban Mario Kart, Doom o Yoshi's Island, y se le llama "billboard" (como un anuncio
espectacular que siempre te mira).

Para escoger cuál de los cuatro dibujos mostrar, redondeo el giro al múltiplo de 90° más cercano: 0° es el frente, 90°
el lado este, 180° la espalda y 270° el oeste.

Algo importante: como todo comparte el mismo espacio 3D, el navegador acomoda solo qué va delante y qué va detrás. Si
el faro queda detrás del volcán, el volcán lo tapa sin que yo programe nada. Por eso no conviene separar los objetos
en capas distintas con `z-index`: se perdería ese orden y lo de atrás se vería encima.

### Por qué La Malinche no se mueve

Quería que el volcán se quedara quieto mientras la isla gira. Al principio no era así: se desplazaba unos 20 píxeles y
cambiaba de tamaño mientras girabas. La causa era que su ancla estaba 9 píxeles delante del centro de la isla, y como la
isla gira alrededor de su centro, el volcán daba vueltas alrededor de ese punto, acercándose y alejándose de la cámara.
Lo arreglé poniendo su ancla justo en el centro de la isla. Para comprobarlo medí su posición en pantalla a 0°, 45°,
90° y 180°, y salió igual en todos.

## Paso 4: cómo se mueve

Hay cuatro formas de girar la isla. Los botones de los lados la giran 45° cada vez. Arrastrar con el mouse o con el
dedo la gira libremente; para eso uso Pointer Events, que manejan mouse y pantalla táctil con el mismo código, y le
puse `touch-action: none` para que en el celular no se mueva la página. Los primeros 6 píxeles de arrastre no cuentan,
para que un clic no se confunda con un arrastre. La rueda del mouse también la gira, y ahí cancelo el scroll normal de
la página. Y las flechas del teclado hacen lo mismo que los botones.

Mientras el cuadro de diálogo o la vista clásica están abiertos, la isla no responde.

Las animaciones las hice con GSAP. Lo elegí porque lo había usado antes, es gratis, maneja muy bien las curvas de
movimiento, se puede interrumpir a la mitad, y me va a servir para la intro de "PRESS START". GSAP anima un objeto
sencillo con el giro, el zoom y el centro, y en cada cuadro copio esos valores a los signals que usa la página. El giro
dura medio segundo y el zoom 0.6 segundos, y frenan suave al final. Si la persona tiene activado "reducir movimiento"
en su sistema, todo pasa al instante.

Al hacer clic en un edificio, la cámara se centra en él y se acerca. Cuando termina de acercarse aparece el cuadro, y
al cerrarlo regresa al centro.

## Paso 5: el cuadro de diálogo y la vista clásica

El cuadro imita los de Pokémon de GBA: caja blanca con doble borde y una cajita de opciones arriba a la derecha. El
texto aparece letra por letra, una cada 18 milisegundos. Con las flechas de arriba y abajo cambias entre YES y NO, con
Enter eliges y con Esc es como decir que no. Lo marqué como diálogo para los lectores de pantalla.

Si eliges YES, el proyecto se abre en una pestaña nueva, para que la isla siga abierta. Lo abro con la opción
`noopener` para que la otra página no tenga acceso a la mía.

La vista clásica muestra los mismos enlaces como lista. Sirve para reclutadores con prisa, para lectores de pantalla y
para celulares lentos.

## Paso 6: publicarlo

En GitHub, un repositorio que se llama igual que tu usuario más `.github.io` se publica en la dirección principal, en
mi caso https://panter15.github.io/. Mis otros proyectos que ya estaban publicados (el de la agencia de visas y el de
Danza Folclor) siguen funcionando en sus propias rutas.

Lo creé y lo subí con:

```bash
gh repo create Panter15/Panter15.github.io --public --source . --remote origin --push
```

Es público porque GitHub Pages gratis lo pide así. Después le dije que se publique con mi propio workflow en lugar de
una rama:

```bash
gh api -X PUT repos/Panter15/Panter15.github.io/pages -f build_type=workflow
```

El workflow está en `.github/workflows/deploy.yml`. Cada vez que subo algo a `main`, instala las dependencias, compila
la app, copia `index.html` como `404.html`, sube la carpeta `dist/luis-island/browser` y la publica. En menos de un
minuto el cambio ya está en línea.

Para trabajar, cada cambio va en su propia rama con un pull request hacia `main`, y se publica al fusionarlo.

## Cómo lo probé

Lo probé con un navegador automático (Playwright). Revisé que los botones, el arrastre y la rueda giren lo que deben,
que al hacer clic en una casa se acerque la cámara y salga el texto correcto, que las flechas cambien la opción, que
Esc cierre y regrese el zoom, y que YES abra la página correcta en otra pestaña. También revisé la vista clásica, el
tamaño de computadora (1280×800) y el de celular (390×844), y en el sitio ya publicado que no hubiera imágenes rotas y
que cargara la fuente. La app compilada pesa unos 79 kB.

## Lo que probé y descarté

Primero hice la isla en 3D de verdad con Three.js, pero no me gustó cómo se veía; quería el pixel art de cuando era
niño. Luego hice un mapa plano que se arrastraba, y funcionaba, pero yo quería que la isla girara como en Yoshi's
Island. Pensé en usar un motor de juegos como Phaser, pero eso solo vale la pena si hubiera un personaje caminando o
muchas animaciones; para esto bastan CSS y botones normales, que además funcionan con teclado y lectores de pantalla.
Y todo el arte es mío: los juegos de Nintendo y Pokémon solo los usé como referencia de estilo, porque copiar sus
dibujos traería problemas de derechos de autor.

## Problemas con los que me topé

- Angular 20.0 no acepta funciones flecha dentro de las plantillas. Algo como `classic.update(c => !c)` no compila;
  hay que escribir `classic.set(!classic())`.
- Como los datos generados terminan con `as const`, un `signal(ISLAND.ground.centerX)` queda con el tipo fijo `400`
  y no acepta otros números. Se arregla escribiendo `signal<number>(...)`.
- Al girar se veían las esquinas del mar. Lo arreglé con el disco de mar redondo.
- Cuando hice el mar gigante y cuadrado desapareció el cielo, porque un piso infinito inclinado 60° tiene su
  horizonte fuera de la pantalla. Con un disco de tamaño limitado su orilla hace de horizonte.
- En el primer prototipo el clic en las casas no abría nada, porque usaba `setPointerCapture` para el arrastre y eso
  mandaba el clic al contenedor. Lo quité y ahora el arrastre se escucha en toda la ventana.
- El volcán daba vueltas porque su ancla no estaba en el centro (lo explico arriba).

## Cómo agregar un edificio nuevo

Cada vez que publique un proyecto nuevo, le toca un edificio:

1. En `art/render3.js`, en la parte donde se acomodan los objetos, agrego `sprite('<id>', <dibujo o cuatro dibujos>,
   [x, y])` con su ancla en el mapa de 480×320. Si necesita un claro de pasto, lo agrego a `CLEARINGS`.
2. Corro `cd art && node render3.js`.
3. En `src/app/island/landmarks.ts` agrego el edificio con su id, nombre, descripción y enlace.
4. Lo pruebo con `npm start`: girar, dar clic, YES.
5. Actualizo esta guía, abro un pull request y lo fusiono.

## Lo que falta

- La página en inglés, español y francés, en el idioma del navegador de cada quien.
- Animaciones del agua, las nubes y la luz del faro, con música chiptune hecha por mí en BeepBox y efectos de sonido,
  todo apagado al principio.
- Una intro con "PRESS START" y la isla girando, solo la primera vez que alguien entra.
- Una estatua del caimán para Danza Folclor.
- Mi avatar en pixel art.

## Para leer más

- Transformaciones 3D en CSS (perspective, preserve-3d, transform-origin): https://developer.mozilla.org/es/docs/Web/CSS/CSS_transforms
- Pointer Events: https://developer.mozilla.org/es/docs/Web/API/Pointer_events
- Signals en Angular: https://angular.dev/guide/signals
- GSAP: https://gsap.com/docs/v3/
- El formato PNG: https://www.w3.org/TR/png/
- GitHub Pages con un workflow propio: https://docs.github.com/es/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
