# gástalo

PWA personal de gastos en BOB. HTML/CSS y un `app.js` vanilla, sin dependencias de ejecución ni servidor. Guarda los datos en IndexedDB `gastalo` en este dispositivo.

- Fuentes y cuentas en filas deslizables con cuatro columnas visibles y un botón de creación discreto al final que se descubre al deslizar; categorías en cuatro columnas con el botón al final de la grilla. Desliza horizontalmente sobre nombres, importes o espacios para explorar una fila. Los nombres, importes y espacios también permiten scroll vertical normal; solo el círculo reserva el arrastre. Arrastra un círculo: el primer movimiento del dedo inicia el arrastre, sin espera ni umbral de distancia para registrar movimientos, o usa «+ Movimiento»; confirma importe, fecha, etiquetas y nota. Toca cualquier círculo para ver su historial y gráfico mensual; mantén pulsado 450 ms para mostrar los controles de edición. La navegación queda junto a los tres totales en la barra superior; la marca aparece al pie de la pantalla. Las entidades permiten elegir iconos propios; la X permite quitarlas de Inicio conservando el historial, o eliminarlas completamente junto con sus movimientos y presupuestos tras confirmar. El último cambio se puede deshacer.
- Historial con filtros combinados, edición y borrado con deshacer. Dentro de una entidad, deslizar un movimiento a la izquierda revela Borrar; un deslizamiento completo lo borra con Deshacer disponible. La cabecera de la entidad permanece visible al desplazarse. El último cambio editable/borrado puede deshacerse hasta otra escritura o recarga.
- Presupuestos independientes por mes, cero distinto de sin límite, sin arrastre. Inicio muestra el consumo del presupuesto como un relleno del círculo desde abajo: gris al iniciar, verde hasta 65%, naranja hasta 100% y rojo al excederlo. El importe planeado de cada categoría aparece pequeño y gris debajo del gasto actual; sin presupuesto no se añade esa línea. Copiar límites anteriores es explícito y no sobreescribe los existentes.
- Reportes en BOB, gráfico y tabla por categoría y últimos 12 meses. Los filtros se comparten con historial; las transferencias no suman ingresos ni gastos.
- Importación CoinKeeper CSV con vista previa y revisión de filas; importación/exportación de respaldo JSON `schemaVersion: 1`. Importar **reemplaza** el conjunto completo, nunca concatena ni duplica importaciones repetidas. Exporta un respaldo antes de reemplazarlo.
- Historial, límites, reportes y datos usan tarjetas y formularios compactos. Límites y reportes comparten el selector de mes de Inicio; cada categoría permite editar el límite desde «Editar», junto al título.
- Selector de 48 iconos en dos páginas de 24: desliza horizontalmente o usa los botones de página o el teclado. Se conservan las 24 claves originales y la selección viaja en los respaldos JSON. Los nuevos símbolos cubren categorías habituales de gasto, tomando como referencia [Actual Budget](https://actualbudget.org/docs/getting-started/starting-fresh/) y [Wallet](https://support.budgetbakers.com/hc/en-us/articles/7077082048146-All-about-Categories-and-Subcategories).

## Usar y desarrollar

```sh
python3 -m http.server 8000
# Abrir http://localhost:8000 (no file://)
node --test tests/*.test.cjs
```

En iPhone: abrir en Safari → Compartir → **Agregar a inicio**. Tras la primera carga completa funciona sin conexión. El navegador puede eliminar almacenamiento local: conserva respaldos JSON fuera del dispositivo. Sin multimoneda, recurrencias ni sincronización en v1.

GitHub Actions ejecuta las pruebas en cada PR. El workflow Pages prueba y publica solo desde `main` (o ejecución manual de esa rama); en Settings → Pages seleccionar **GitHub Actions** como origen. Este PR no publica mientras no se fusione.

Cada cambio de JS/CSS debe subir juntos `?v=` de ambos assets en `index.html`, ambos paths en `FILES` y `CACHE` de `sw.js`. El service worker usa network-first con timeout y fallback al shell precargado, respeta el subdirectorio de Pages y activa actualizaciones cuando se cierran las ventanas anteriores.

Prueba opcional de navegador (Chromium instalado; emulación de iPhone, no dispositivo físico):

```sh
npm install --prefix /tmp/gastalo-browser playwright
# Con el servidor en el puerto 4173:
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-smoke.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-entity-swipe.cjs
NODE_PATH=/tmp/gastalo-browser/node_modules node tests/browser-compact-icons.cjs
# GASTALO_URL permite probar un subdirectorio; CHROMIUM_PATH cambia el ejecutable.
```

Contrato de respaldo e importación: [docs/data-format.md](docs/data-format.md). Comportamiento de referencia: [SPEC.md](SPEC.md); las precisiones del CSV del pedido prevalecen sobre sus incógnitas. Interfaz, textos, símbolos y gráficos propios.
