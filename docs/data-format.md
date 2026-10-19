# Contrato de datos v1

El respaldo JSON UTF-8 es un objeto con `schemaVersion: 1`, `exported_at` (ISO UTC) y las colecciones descritas abajo. IDs opacos, estables y únicos entre colecciones; **no usar nombres como claves**. Se preservan metadatos de importación y campos adicionales al restaurar/exportar. Versiones desconocidas o referencias inválidas se rechazan antes de tocar IndexedDB. El orden de arrays no tiene significado contable. En `sources`, `accounts` y `categories` sí determina el orden visual de Inicio y se conserva en el respaldo. Reordenar cambia solo los puestos de las entidades activas dentro de su colección; conserva IDs, campos financieros, posiciones de las archivadas y movimientos. La escritura valida la revisión y permite Deshacer.

Todos los importes con sufijo `_cents` son **enteros seguros** en unidades menores de BOB: `2550` = Bs 25,50. No convertirlos a coma flotante para cálculos. Las sumas se acumulan con BigInt y se valida el rango seguro antes de serializar números JSON. `amount_cents` es positivo; el signo depende de `kind` y sus extremos. No hay conversión de monedas en v1, por lo que un único importe BOB representa origen, destino y reporte.

| Campo raíz | Contenido |
| --- | --- |
| `profile` | `{id, base_currency:"BOB", timezone:"America/La_Paz"}`; zona IANA editable |
| `sources` | `{id,name,currency:"BOB",expected_cents:null\|integer,archived_at:null\|timestamp}` |
| `accounts` | `{id,name,currency:"BOB",opening_balance_cents:integer,opening_date:"YYYY-MM-DD",exclude_from_total:boolean,archived_at:null\|timestamp}` |
| `categories` | `{id,name,currency:"BOB",archived_at:null\|timestamp}` |
| `tags` | `{id,name,archived_at:null\|timestamp}` |
| `budgets` | `{id,category_id,month:"YYYY-MM",limit_cents:null\|integer}`; cambios de límite vigentes desde ese mes, un registro por categoría/mes, límite ≥ 0 |
| `transactions` | Registros contables descritos abajo, incluidos borrados |
| `review` | `{id,record:integer,reason:string,raw:string[]}`; filas pendientes, sin efecto contable |
| `imports` | `{id,fingerprint,imported_at,budget_month,accepted,pending}`; `budget_month` es el mes opcional de inicio de límites o `null`, fingerprint SHA-256 del texto CSV, contadores al importar |

Una transacción contiene:

```json
{
  "id": "movimiento-id",
  "kind": "expense",
  "from_id": "cuenta-id",
  "to_id": "categoria-id",
  "occurred_on": "2026-10-16",
  "amount_cents": 2550,
  "currency": "BOB",
  "tag_ids": ["etiqueta-id"],
  "note": "Almuerzo",
  "status": "posted",
  "created_at": "2026-10-16T16:00:00.000Z",
  "updated_at": "2026-10-16T16:00:00.000Z"
}
```

`kind`: `income` (fuente→cuenta), `expense` (cuenta→categoría), `transfer` (cuenta→otra cuenta). `status`: `posted` o `deleted`; los borrados pueden tener `deleted_at`. Solo `posted` entra en cálculos. `tag_ids` es un conjunto sin duplicados. Archivar una entidad la oculta de nuevas selecciones sin alterar su historial. Cada movimiento puede tener `import_metadata: {fingerprint,record,raw}`; los originales permanecen sin reinterpretar. Al corregir una revisión se conserva `resolved_from_review`.

Fechas `occurred_on` son fechas contables locales, no timestamps UTC. El mes abarca desde el día 1 hasta antes del primer día siguiente. Los timestamps de auditoría no determinan el mes. La zona del perfil solo determina la fecha predeterminada de un movimiento nuevo. Los saldos iniciales representan el estado anterior a los movimientos de este conjunto; `opening_date` documenta esa referencia. El saldo actual suma todos los movimientos contabilizados del conjunto, incluidos los fechados a futuro; el neto del mes usa solo ese mes.

## Lectura para análisis semanal o mensual

1. Conservar solo transacciones con `status === "posted"` y rango contable deseado.
2. Ingresos = suma `income`; gastos = suma `expense`; neto = ingresos − gastos. Transferencias excluidas de estas tres métricas.
3. Saldo de cuenta = saldo inicial + entradas (`to_id`) − salidas (`from_id`) de todos sus movimientos contabilizados. `exclude_from_total` excluye del saldo consolidado, no elimina movimientos ni reportes.
4. Gasto por categoría = suma `expense` con `to_id` igual a esa categoría. El límite vigente es el registro más reciente de esa categoría con `month` menor o igual al mes consultado: se hereda hasta el siguiente cambio. No se generan registros al navegar. Sin registro anterior o con el último `limit_cents:null`, no hay límite; cero es explícito y también se hereda. Restante del mes = límite − gastado; puede ser negativo. El gasto se calcula de nuevo cada mes; no se arrastra remanente. Los respaldos v1 conservan su estructura y los registros históricos actúan como cambios de límite.
5. Filtros entre dimensiones se combinan con AND; entidades elegidas con OR; etiquetas con cualquiera o todas. Una transacción con múltiples etiquetas se cuenta una sola vez. Los subtotales de etiquetas pueden solaparse.
6. `review`, los acumulados originales de entidades, presupuestos y saldos iniciales **no son ingresos ni gastos**.

## CoinKeeper CSV

Contrato confirmado en el pedido: `sep=,`, cabecera `Data,Type,From,To,Tags,Amount,Currency,Amount converted,Currency of conversion,Recurrence,Note`; fecha M/D/YYYY; `Expense` o `Transfer`; recurrencia `None`; una etiqueta completa por celda. Se soportan BOM, CRLF, comas, comillas escapadas y notas multilínea. Importes decimales exactos, sin separador de miles, hasta dos decimales. Rechazar importes cero/negativos o convertidos BOB inconsistentes; conservar filas en revisión.

Secciones separadas por líneas vacías, en orden:

1. Transacciones, con cabecera de 11 columnas.
2. Fuentes: `Name,Budget,Received to date,Icon,Currency`.
3. Cuentas: `Name,Current amount,Icon,Currency`.
4. Categorías: `Name,Budget,Received to date,Icon,Currency` (igual a fuentes).
5. Etiquetas: `Name,Received to date`.

Primero se leen entidades y luego se resuelven transacciones. Un nombre de extremo ausente o duplicado entre entidades genera revisión; nunca se toma la primera coincidencia. `Transfer` desde fuente→cuenta es `income`; desde cuenta→cuenta, `transfer`. `Expense` requiere cuenta→categoría. Los recursos `Icon` y acumulados se conservan en metadatos originales, sin reutilizar gráficos ni crear movimientos. Una etiqueta nueva se crea si no está en la sección; varias etiquetas homónimas generan revisión. Una entidad de otra moneda rechaza la importación completa; una fila de transacción inválida queda en revisión.

Se importan todos los años y meses del archivo con sus fechas originales; no se requiere elegir un mes. Para cada cuenta: **saldo inicial = Current amount − efecto neto de todos los movimientos aceptados**. La fecha inicial es la primera fecha aceptada del conjunto; sin movimientos, se usa la fecha de importación (o el inicio del mes opcional de límites). Así el saldo actual coincide con el archivo; puede absorber efectos de historia ausente o filas en revisión. Resolver manualmente una fila requiere revisar también ese saldo inicial para conservar la reconciliación. El mes opcional solo asigna desde cuándo rige `Budget` de categorías; nunca filtra movimientos. Sin mes, no se crean límites y sus valores originales se conservan en `import_metadata`. Las metas de fuentes se guardan como `expected_cents`.

Importar CSV o JSON ofrece vista previa y reemplaza el estado de forma atómica después de confirmar en la app. Importar dos veces el mismo archivo no duplica movimientos. No hay fusión implícita de archivos solapados. Los IDs de CSV son deterministas dentro de una importación; las entidades/transacciones creadas manualmente usan UUID. Los borrados permanecen en JSON; deshacer restaura el mismo ID. La acción deshacer está disponible hasta otra escritura o recarga.

## Persistencia y fallos

IndexedDB `gastalo`, versión 1, almacén `state`, clave `main`: `{revision,data}`. La escritura reemplaza el estado en una sola transacción y verifica su revisión para evitar que dos pestañas se sobrescriban silenciosamente. Un conflicto exige recargar la pestaña antigua. Una escritura rechazada conserva el estado anterior; no se muestra éxito. El archivo se valida completamente antes del reemplazo. Exportar devuelve solo el contrato financiero, sin el envoltorio de persistencia.

La clave independiente `sync_config` guarda el destino de GitHub, token y estado de sincronización. No forma parte del JSON financiero; importar o eliminar entidades no la modifica. «Desactivar» elimina el token guardado. El token solo se envía a `api.github.com`.

«Restablecer todo» requiere confirmación y ofrece exportar antes de borrar. Guarda `emptyState()` en `main`, incrementa la revisión y elimina `sync_config` en una misma transacción, con el control de concurrencia habitual. Borra la opción de deshacer y reinicia filtros, período y ajustes. Cancela la sincronización pendiente o en curso, sin enviar el estado vacío ni eliminar el respaldo remoto. Un conflicto o fallo de almacenamiento conserva los datos y ajustes guardados.

La sincronización es unidireccional: envía exactamente el respaldo v1 mediante Contents API, sin restaurar contenido remoto. Con token y conexión, se intenta al abrir la app, al volver a primer plano, 30 segundos después de la última escritura y con «Sincronizar ahora». El hash SHA-256 excluye únicamente `exported_at` para omitir respaldos idénticos. iOS puede suspender la PWA en segundo plano; vuelve a abrirla para reintentar cambios pendientes. La hora de éxito se muestra en `America/La_Paz`.

Las fuentes, cuentas y categorías admiten el campo opcional `icon`: una clave del catálogo SVG propio de la app. Los respaldos v1 sin ese campo siguen siendo válidos y usan el icono predeterminado del tipo. El campo se conserva en exportación/restauración.
