# gástalo

PWA personal de gastos en BOB. HTML/CSS y un `app.js` vanilla, sin dependencias de ejecución ni servidor. Guarda los datos en IndexedDB `gastalo` en este dispositivo.

- Tres filas de fuentes, cuentas y categorías. Arrastra un círculo (mantén pulsado 150 ms o muévelo) o toca origen y destino; confirma importe, fecha, etiquetas y nota.
- Historial con filtros combinados, edición y borrado con deshacer. El último cambio editable/borrado puede deshacerse hasta otra escritura o recarga.
- Presupuestos independientes por mes, cero distinto de sin límite, sin arrastre. Copiar límites anteriores es explícito y no sobreescribe los existentes.
- Reportes en BOB, gráfico y tabla por categoría y últimos 12 meses. Los filtros se comparten con historial; las transferencias no suman ingresos ni gastos.
- Importación CoinKeeper CSV con vista previa y revisión de filas; importación/exportación de respaldo JSON `schemaVersion: 1`. Importar **reemplaza** el conjunto completo, nunca concatena ni duplica importaciones repetidas. Exporta un respaldo antes de reemplazarlo.

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
# GASTALO_URL permite probar un subdirectorio; CHROMIUM_PATH cambia el ejecutable.
```

Contrato de respaldo e importación: [docs/data-format.md](docs/data-format.md). Comportamiento de referencia: [SPEC.md](SPEC.md); las precisiones del CSV del pedido prevalecen sobre sus incógnitas. Interfaz, textos, símbolos y gráficos propios.
