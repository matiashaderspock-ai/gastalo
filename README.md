# gástalo

PWA personal de gastos en BOB. HTML/CSS y un `app.js` vanilla, sin dependencias de ejecución ni servidor. Guarda los datos en IndexedDB `gastalo` en este dispositivo.

- Fuentes y cuentas en filas deslizables con cuatro columnas visibles y un botón de creación discreto al final que se descubre al deslizar; categorías en cuatro columnas con el botón al final de la grilla. Desliza horizontalmente sobre nombres, importes o espacios para explorar una fila. Los nombres, importes y espacios también permiten scroll vertical normal; solo el círculo reserva el arrastre. Arrastra un círculo: el primer movimiento del dedo inicia el arrastre, sin espera ni umbral de distancia para registrar movimientos, o usa «+ Movimiento»; confirma importe, fecha, etiquetas y nota. Toca cualquier círculo para ver su historial y gráfico mensual; mantén pulsado 450 ms para mostrar los controles de edición. La navegación queda junto a los tres totales en la barra superior; la marca aparece al pie de la pantalla. Las entidades permiten elegir iconos propios; la X permite quitarlas de Inicio conservando el historial, o eliminarlas completamente junto con sus movimientos y presupuestos tras confirmar. El último cambio se puede deshacer.
- Los movimientos muestran una barra horizontal deslizable de etiquetas habituales encima de Origen/Destino, sin título ni recuadros en los nombres o el botón +. El botón + abre un selector con búsqueda y selección múltiple; permite crear etiquetas que se guardan junto con el movimiento. Al terminar o cancelar un movimiento se conserva la posición de las filas. Los desplegables y selectores de fecha no tienen recuadro; los campos de escritura, como Importe y Nota, sí. El valor de la fecha se alinea con su etiqueta. Los formularios se ajustan al espacio visible sobre el teclado y permiten desplazarse si no caben completos.
- Historial con filtros combinados, edición y borrado con deshacer. Dentro de una entidad, deslizar un movimiento a la izquierda revela Borrar; un deslizamiento completo lo borra con Deshacer disponible. La cabecera de la entidad permanece visible al desplazarse. El último cambio editable/borrado puede deshacerse hasta otra escritura o recarga.
- Límites de categoría recurrentes: se definen una vez y se heredan cada mes hasta el siguiente cambio, sin alterar meses anteriores. Cero es distinto de sin límite; el gasto y el restante se reinician cada mes. Límites de categoría muestra la suma de los límites vigentes del mes. En Inicio, «Gastos planeados» suma lo que queda de cada límite tras descontar su gasto, con mínimo cero por categoría; los excesos y gastos sin límite no consumen el restante de otras categorías. Inicio muestra el consumo como un relleno del círculo desde abajo: gris al iniciar, verde hasta 65%, naranja hasta 100% y rojo al excederlo. El importe planeado de cada categoría aparece pequeño y gris debajo del gasto actual; sin límite no se añade esa línea.
- Gráficos en BOB: torta de gastos antes del detalle, categorías principales rotuladas y pequeñas agrupadas bajo «Otros» conservando sus colores; gráfico y tabla por categoría y últimos 12 meses. Los filtros compactos se comparten con historial; las transferencias no suman ingresos ni gastos.
- Importación CoinKeeper CSV de todo el historial, de varios meses y años, sin mes obligatorio, con período completo en la vista previa y revisión de filas. La opción de importar límites permite indicar desde qué mes rigen; nunca filtra los movimientos. Importación/exportación de respaldo JSON `schemaVersion: 1`. Importar **reemplaza** el conjunto completo, nunca concatena ni duplica importaciones repetidas. Exporta un respaldo antes de reemplazarlo.
- «Restablecer todo» borra datos y ajustes locales tras confirmar, permite descargar un respaldo y desactiva la sincronización sin reemplazar el respaldo remoto por datos vacíos.
- Historial, límites, reportes y datos usan tarjetas y formularios compactos. Límites y reportes comparten el selector de mes de Inicio; cada categoría permite editar el límite desde «Editar», junto al título.
- Selector de 66 iconos en tres páginas (24, 24 y 18), con las opciones habituales primero y las menos frecuentes al final. Incluye ChatGPT, Apple, Revolut, Binance, Grok, eToro, PlayStation, HBO, Banco Unión, Banco BISA, Banco Ganadero, Banco Mercantil Santa Cruz y la espiral de Yango, además de Robot y Calavera. Desliza horizontalmente, usa los botones de página o las flechas/Home/End del teclado. Se conservan todas las claves anteriores y la selección viaja en los respaldos JSON.
- Mantén pulsada una entidad para editar y arrastra su círculo para cambiarla de columna o fila dentro de su grupo. Puedes seguir arrastrando después de la pulsación larga o soltar y mover otro círculo; las posiciones se ajustan mientras lo mueves. Los bordes desplazan las filas y la página para alcanzar entidades fuera de pantalla. «Listo» sale del modo de edición. El orden se guarda, permite Deshacer y viaja en JSON. Con teclado, enfoca una entidad en modo edición y usa Alt + flechas (arriba/abajo avanzan una fila en categorías).
- En Inicio se cambia el período tocando el mes actual, sin flechas. Los demás selectores conservan las flechas anterior/siguiente y el centro de mes/año abre el calendario.

## Usar y desarrollar

```sh
python3 -m http.server 8000
# Abrir http://localhost:8000 (no file://)
node --test tests/*.test.cjs
```

En iPhone: abrir en Safari → Compartir → **Agregar a inicio**. Tras la primera carga completa funciona sin conexión. Al volver a primer plano comprueba nuevas versiones y las aplica cuando no hay formularios abiertos ni cambios de ajustes en curso. Al pie se muestra la versión instalada y «Actualizar app» permite comprobarla manualmente. El navegador puede eliminar almacenamiento local: conserva respaldos JSON fuera del dispositivo. La sincronización opcional guarda una copia en GitHub; no restaura datos remotos automáticamente. Sin multimoneda ni movimientos recurrentes en v1.

GitHub Actions ejecuta las pruebas en cada PR. El workflow Pages prueba y publica solo desde `main` (o ejecución manual de esa rama); en Settings → Pages seleccionar **GitHub Actions** como origen. Este PR no publica mientras no se fusione.

Los PR de `matiashaderspock-ai` activan squash auto-merge y esperan el check obligatorio `test`.
Cambios de sincronización, borrado, reset o política de merge reciben `needs-matias` y requieren revisión y merge manual de Matias.
La etiqueta pausa el auto-merge; `test` espera al guard antes de dar verde y nunca deja de ser obligatorio.

Cada cambio de JS/CSS debe subir juntos `?v=` de ambos assets en `index.html`, ambos paths en `FILES` y `CACHE` de `sw.js`. El service worker usa network-first con revalidación, timeout y fallback al shell precargado; respeta el subdirectorio de Pages y activa el nuevo shell cuando termina su descarga. La página espera a que se cierren los formularios y se salga de ajustes antes de recargar una versión nueva.

Prueba opcional de navegador (Chromium instalado; emulación de iPhone, no dispositivo físico):

```sh
npm install --prefix /tmp/gastalo-browser playwright
# Con el servidor en el puerto 4173:
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-smoke.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-entity-swipe.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-compact-icons.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-data-workflows.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-report-pie.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-reorder-months.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-entity-scroll.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-movement-tags.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-form-controls.cjs
# La prueba de actualizaciones levanta su propio servidor de versiones:
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-app-update.cjs
# GASTALO_URL permite probar un subdirectorio; CHROMIUM_PATH cambia el ejecutable.
```

Contrato de respaldo e importación: [docs/data-format.md](docs/data-format.md). Comportamiento de referencia: [SPEC.md](SPEC.md); las precisiones del CSV del pedido prevalecen sobre sus incógnitas. Interfaz, textos, símbolos y gráficos propios.
