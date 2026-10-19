# Especificación funcional para una app propia de gastos

Investigación pública de CoinKeeper realizada el **16 de octubre de 2026**. Entregable de comportamiento y decisiones de producto; no contiene una implementación ni reproduce código, textos de interfaz, iconos o diseño de CoinKeeper. Los identificadores técnicos citados sirven únicamente para localizar evidencia.

## Alcance y lectura de la evidencia

- **[O] Observado:** navegación real con REA, navegador temporal y almacenamiento vacío, sin ingresar credenciales, registrar usuarios ni enviar formularios.
- **[E] Estático:** comportamiento deducido de ramas y estructuras del JS público; no demuestra que una operación se haya ejecutado ni que el servidor la acepte.
- **[D] Documentado:** ayuda oficial pública; cuando corresponde a la web anterior o a móvil se indica expresamente.
- **[R] Requisito aportado:** información del pedido, sin verificación independiente.
- **[P] Propuesta propia:** decisión para que nuestra app tenga un comportamiento definido. No se atribuye a CoinKeeper.
- **[?] Incógnita:** evidencia insuficiente o conflicto de versiones.

**Dos superficies distintas.** El sitio oficial actual enlaza a `https://web.coinkeeper.me/`; esta URL redirigió con HTTP 307 a `/login`, donde solo se observó un formulario de acceso. La ruta anterior `https://coinkeeper.me/introduce-yourself` también muestra acceso, pero descarga públicamente los bundles del tablero anterior. La evidencia funcional estática de ese tablero y su ayuda **no prueba paridad con la web actual**. [O: O1, O2; E: E1, E2]

No hubo acceso a un perfil, lectura de datos privados, creación/edición de movimientos ni exportación real. No se eludió el login. Los assets se examinaron en un directorio temporal fuera de esta carpeta. La única entrega creada en el proyecto es este documento.

## 1. Modelo de datos

### 1.1 Entidades y relaciones

La web anterior representa fuentes, cuentas y categorías mediante una entidad tipada común. Para nuestra app conviene exponer entidades de dominio separadas, con IDs estables, sin utilizar sus nombres como claves. La matriz de direcciones y el constructor de transacciones respaldan la separación funcional siguiente. [E: E2, `CategoryType`, `DirectionManager`, `TransactionBuilder`; P]

| Entidad propia | Campos mínimos propuestos | Función y fundamento |
|---|---|---|
| Perfil financiero | `id`, `base_currency`, `timezone`, configuración del período | Moneda de consolidación y calendario. La moneda base y el período figuran en la ayuda; la zona horaria explícita es propuesta propia. [D1, D2; P] |
| Fuente de ingreso | `id`, `name`, `currency`, `expected_amount?`, `archived_at?` | Clasifica el origen del dinero, por ejemplo un empleo. Lo previsto es una meta de ingreso, no dinero disponible. El recibido es un agregado por período. [D3; E2] |
| Cuenta | `id`, `name`, `currency`, `opening_balance`, `opening_date`, `exclude_from_total`, `archived_at?` | Mantiene dinero real. Separar saldo inicial de movimientos evita duplicaciones. Nombre, saldo y moneda están documentados; exclusión del total aparece en JS. [D4; E2, `exceptFromBalance`; P] |
| Categoría de gasto | `id`, `name`, `currency`, `archived_at?` | Destino clasificatorio del gasto. No es una cuenta ni conserva efectivo. Su acumulado y presupuesto pertenecen a un período. [D5; E2] |
| Presupuesto | `id`, `category_id`, `period_start`, `period_end_exclusive`, `limit_amount`, `currency` | Límite y resultados históricos independientes por período. Guardar instancias por período es propuesta propia. [D2, D5; P] |
| Etiqueta | `id`, `name`, `archived_at?` | Dimensión transversal, varios valores por transacción. Relación `transaction_tags(transaction_id, tag_id)` única por par. [D6; E2, `tags`; P] |
| Regla recurrente | `id`, plantilla de transacción, `frequency`, `interval`, `start_date`, `end_date?`, `next_date`, `status` | Define ocurrencias futuras sin confundirlas con movimientos realizados. Frecuencias concretas y ejecución en web actual siguen desconocidas. [D7; E2, `repeatingParentId`; P] |
| Moneda | `code`, precisión monetaria, datos de presentación propios | Identifica el valor nominal. Usar códigos normalizados cuando sean reconocibles; preservar el valor original de un CSV desconocido. [D1; P] |
| Conversión | moneda origen/destino, importes, tasa, fecha y procedencia, cuando existan | Conserva cómo se obtuvo un equivalente. Fecha/proveedor de tasas de CoinKeeper desconocidos. [E2; D1; P] |

La presentación puede tener un marcador visual propio y opcional. No se reutilizan los valores de `Icon` como recursos gráficos ni se descarga el catálogo de CoinKeeper para nuestra interfaz. [P]

### 1.2 Transacciones

Modelo propio propuesto:

| Campo | Regla |
|---|---|
| `id`, `kind` | ID estable y tipo `expense`, `income` o `transfer`. |
| `occurred_on` | Fecha contable local; separada de `created_at` y `updated_at`. |
| `from_ref`, `to_ref` | Referencias tipadas, nunca solamente nombres. |
| `source_amount`, `source_currency` | Importe positivo nominal del origen. |
| `destination_amount`, `destination_currency` | Importe positivo nominal del destino; puede diferir por conversión. |
| `reporting_amount`, `reporting_currency` | Equivalente para consolidación en moneda base, si se conoce. |
| `tag_ids[]`, `note` | Etiquetas sin duplicados y nota opcional. |
| `recurrence_rule_id?`, `occurrence_key?` | Vínculo a una regla y clave para evitar duplicar una ocurrencia. |
| `status`, `deleted_at?` | Propuesta: `pending`, `posted`, `deleted`; solo `posted` afecta saldos. |
| `import_metadata?` | Valores originales, sección/fila del archivo y ambigüedades sin resolver. |

La existencia de importes de origen, destino y moneda base se apoya en `sourceAmount`, `destinationAmount`, `defaultAmount`, las monedas de ambos extremos, `isComplete` y `deleted` del JS anterior. La propuesta de estados propios no es una traducción exacta de `isComplete`: ese campo también interviene en movimientos importados incompletos. [E2; P]

| Tipo propio | Origen → destino permitido | Efecto contable |
|---|---|---|
| Gasto | Cuenta → categoría de gasto | Debita cuenta; suma gasto de la categoría y del período. |
| Ingreso | Fuente de ingreso → cuenta | Acredita cuenta; suma ingreso recibido de esa fuente. La fuente no tiene un saldo bancario que debitar. |
| Transferencia | Cuenta → otra cuenta | Debita origen y acredita destino; no es ingreso ni gasto del perfil. |

Estas direcciones aparecen en la matriz estática; la misma cuenta se excluye como destino. Fuente → categoría no está permitida por esa matriz. El bundle incluye también deudas y metas, fuera del alcance funcional de este documento. No se extrapolan a reembolsos, inversiones ni transferencias inversas entre categorías. [E2, `DirectionManager`, `CategoryManager.selectDestinations`]

**Invariantes propios:** importe mayor que cero; referencias válidas; monedas coherentes con cada extremo; actualización atómica de ambos lados; guardar una vez por intención; ninguna transferencia aumenta el total de ingresos o gastos. Cambiar un movimiento equivale a retirar sus efectos anteriores y aplicar los nuevos; eliminarlo retira sus efectos, restaurarlo los repone. [P, respaldado parcialmente por E2, `AddTransactionManager.submit`, edición y borrado]

### 1.3 Etiquetas, recurrencia y conversión

**Etiquetas.** La ayuda web permite etiquetar gastos e ingresos y filtrar por etiqueta. El constructor anterior contiene restricciones específicas para añadir/actualizar etiquetas en transferencias entre cuentas; no debe prometerse soporte universal en CoinKeeper. Nuestra app permitirá etiquetas en los tres tipos y contará cada transacción una sola vez en el total aunque tenga varias. [D6, D8; E2, `addNewTag`, `updateTags`; P]

**Recurrencia.** La ayuda web anterior dice que no se puede crear desde web y remite a móvil. El modelo JS conserva un vínculo a una transacción recurrente, pero no prueba un editor ni su ejecución. La ayuda Android describe ocurrencias pendientes que requieren aceptación. Para nuestra app: generar pendientes, confirmar antes de contabilizar y permitir terminar una regla sin borrar las ocurrencias realizadas; alcance de edición de serie explícito. [D7, M2; E2; P]

**Conversión.** La ayuda distingue moneda base y moneda de las entidades. El JS anterior permite ajustar el importe recibido, marcando una conversión personalizada. Su conversor utiliza tasas con referencia USD y redondea a dos decimales. Eso describe el cliente anterior; no verifica tasas del servidor ni idoneidad para monedas de otra precisión. [D1; E2, `CurrencyManager.convert`, `setDestinationAmount`, `hasCustomExchangeRate`]

Nuestra app guardará decimales exactos o unidades menores, importes de ambos extremos y conversión histórica cuando exista; no usará coma flotante binaria para contabilidad. Cambiar moneda base recalculará una vista de reportes sin alterar los importes nominales. Una tasa ausente no se reemplaza por 1. Una transferencia con comisión requiere un gasto separado si no hay un modelo explícito de comisión. Estas son decisiones propias, no comportamiento verificado de CoinKeeper. [P]

## 2. Flujos principales

### 2.1 Crear un gasto

**CoinKeeper anterior documentado:** la entrada es una línea guiada: elegir cuenta, categoría, importe y fecha; opcionalmente etiquetas y comentario; confirmar. El JS presenta pasos equivalentes y un segundo importe cuando las monedas difieren. [D6; E2, `AddTransactionStep`, `AddTransactionManager`]

**Arrastrar, solicitado para nuestra app:**

1. Tomar una cuenta y arrastrarla hacia una categoría de gasto válida.
2. Al soltar, abrir un formulario con ambos extremos preseleccionados. El gesto todavía no guarda.
3. Ingresar importe; fecha actual predeterminada y editable; etiquetas y nota opcionales. Si cambia la moneda, mostrar y poder corregir el equivalente.
4. Confirmar; actualizar saldo, acumulado de categoría, presupuesto, historial y reportes del período afectado.
5. Cancelar o soltar fuera de un destino válido no modifica datos. Proporcionar selección por clic/teclado equivalente al gesto.

Esto es **[P/R]**, apoyado conceptualmente por el gesto documentado para iOS [M1]. **[?] No se verificó arrastrar en la web actual o anterior.** No se confunden los eventos de arrastre genéricos de librerías con una función financiera implementada.

### 2.2 Crear una transferencia y un ingreso

**Transferencia propia:** arrastrar cuenta A hacia cuenta B → ingresar importe debitado → si las monedas difieren, confirmar importe acreditado/tasa → elegir fecha y nota → guardar una sola transacción con dos efectos. Impedir A → A. No consumir presupuesto de gasto. La dirección, importes dobles y ajuste manual están respaldados estáticamente; el gesto es propuesta propia. [E2; P]

**Ingreso propio:** elegir fuente → cuenta receptora → importe, fecha y datos opcionales → guardar. Aumenta saldo y recibido por fuente. La ayuda web respalda esta secuencia por entrada guiada. En el CSV pedido se representa como `Transfer`, pero en el dominio es `income`. [D6; R; P]

### 2.3 Editar

La ayuda web describe acciones sobre una fila para fecha, comentario y etiqueta. El JS anterior amplía esa evidencia: `handleChangeCategories` y `handleSaveTransaction` reconstruyen origen, destino, importes, monedas, fecha, etiquetas y nota, y recalculan importes relacionados. Esto es capacidad estática, no un formulario probado en un perfil. [D9; E2]

**Flujo propio:** abrir movimiento → modificar → validar extremos/importes/conversión → guardar de forma atómica → recalcular saldos y reportes. Cambiar fecha a otro mes retira el gasto del presupuesto anterior y lo agrega al nuevo. Cancelar conserva el estado previo. Si pertenece a una recurrencia, distinguir editar esta ocurrencia de editar la regla futura. [P]

### 2.4 Borrar y restaurar

El JS anterior cambia una marca de actividad y tiene una función de restauración; la ayuda limita la acción de deshacer visible a antes de recargar la página. No se conoce la retención del servidor. [E2, `delete`, `restore`, `setActivity`; D9]

**Flujo propio:** solicitar borrado de un movimiento → marcarlo borrado → retirar sus efectos → ofrecer deshacer → restaurar el mismo ID y efectos si se solicita. La persistencia y plazo de recuperación se definirán explícitamente en nuestra app. [P]

Eliminar una cuenta o categoría es otra operación: la ayuda permite conservar su historial o eliminar también sus movimientos, y advierte que la entidad no se recupera. Nuestra propuesta predeterminada es archivar y mantener referencias históricas; el borrado de movimientos asociados debe ser una acción separada. [D1; P]

## 3. Presupuestos y cambio de mes

**Confirmado documentalmente para la web anterior:** límite por categoría; período mensual desde el día 1 por defecto; período e inicio configurables; al iniciar el siguiente período se reinician los indicadores de fuentes y categorías, conservando el historial. No se documenta que se reinicien los saldos de cuentas ni que se arrastre el remanente. [D2, D5]

El JS anterior enumera semana, dos semanas, cuatro semanas, mes, trimestre y año. Su calculador parte de un límite mensual: divide entre 4 o 2 para semana/quincena, mantiene cuatro semanas/mes y multiplica por 3 o 12 para trimestre/año, con redondeo. Es una aproximación específica del cliente anterior, no una regla que nuestra app deba copiar. [E2, `DurationOfPeriod`, `PeriodizedLimitAmountCalculator`]

**Contrato propio [P]:**

- Un presupuesto pertenece a una categoría, moneda y rango `[inicio, fin exclusivo)`; mes y cuatro semanas son períodos distintos.
- `gastado(c,p)` = suma de gastos contabilizados, no borrados, de la categoría y período, expresados en su moneda. Ingresos, transferencias y pendientes no suman.
- `restante(c,p) = límite(c,p) − gastado(c,p)`. Puede ser negativo para mostrar exceso. `sin límite` se guarda como nulo; un límite cero es una decisión explícita.
- Mostrar límite, gastado, restante y exceso; no depender de colores ni copiar indicadores propietarios.
- Navegar a otro mes cambia el período consultado, sin mover transacciones ni cambiar su fecha.
- El límite se establece una sola vez y se hereda de mes a mes hasta el siguiente cambio explícito. Cada registro indica desde qué mes rige. Los acumulados comienzan en cero y los saldos de cuentas continúan. Editar un límite se aplica desde el mes consultado y conserva los valores anteriores. [R: actualización del pedido]
- Predeterminado propuesto: sin arrastre del remanente. Si se agrega, será una política explícita, distinta de arrastrar saldos bancarios.
- No sumar monedas nominales diferentes. Para un total general, convertir cada categoría a la moneda base con la política declarada.

**Matiz observado en JS:** el resumen anterior calcula lo que aún queda por gastar como la suma de `máximo(0, límite − gastado)` por categoría. Por eso puede diferir de `presupuesto total − gasto total`: los excesos de una categoría no reducen los remanentes de otras. Nuestra app diferenciará remanente neto y suma de remanentes positivos si presenta ambos. [E2, `getExpensesProps`; P]

Ejemplo propio: límites 100 y 100, gastos 120 y 30 → presupuesto total 200, gastado 150, remanente neto 50 y suma de remanentes positivos 70. No etiquetar ambos valores simplemente como «restante».

## 4. Reportes, totales y filtros

La ayuda web anterior describe distribución de gastos por categoría e ingresos por fuente, gráficos circulares y alternativas temporales/lineales, leyendas y navegación a períodos anteriores. También describe detalles de entidad con agrupación por etiquetas. No se observó un gráfico autenticado actual. [D10, D11, D12]

| Reporte propio propuesto | Métrica y comportamiento |
|---|---|
| Resumen de período | Ingresos, gastos y neto `ingresos − gastos`. Excluir transferencias del neto. |
| Distribución de gastos | Total y participación por categoría; gráfico circular o barras y tabla accesible. |
| Distribución de ingresos | Total por fuente y participación en los ingresos seleccionados. |
| Evolución | Totales por día/semana/mes y comparación de períodos usando límites temporales explícitos. |
| Presupuesto frente a gasto | Límite, realizado y desviación por categoría. |
| Detalle de cuenta/categoría/fuente | Movimientos que contribuyen al subtotal; acceso a edición y filtros. |
| Etiquetas | Gastos/ingresos vinculados a una etiqueta; advertir que subtotales de varias etiquetas pueden superponerse. |

Los tres primeros y la navegación/agrupación tienen apoyo documental; la presentación exacta, comparación y reglas de agregación de esta tabla son **[P]**, no una reproducción de pantallas.

**Filtros documentados:** entidad (cuenta/categoría), fecha, etiqueta y tipo ingreso/gasto. [D8] **Contrato propio [P]:** rango de fechas, una o varias cuentas/categorías/fuentes, etiquetas, tipo y búsqueda en nota. Combinar dimensiones con AND; dentro de entidades seleccionadas usar OR; para etiquetas ofrecer «cualquiera» o «todas», con «cualquiera» predeterminado. La combinación de filtros de CoinKeeper sigue desconocida.

Todos los gráficos, subtotales y listado deben consumir el mismo conjunto filtrado. Un movimiento con varias etiquetas cuenta una vez en el total; sus subtotales por etiqueta pueden superar ese total. Si se agrupa por categoría, cada gasto pertenece a una sola categoría en este alcance. Los gastos divididos entre categorías y los reembolsos quedan fuera hasta definirlos. [P]

Reportar moneda, período, filtros y política de conversión junto al total. Si falta una conversión, mostrar total parcial y cantidad de movimientos excluidos; no dar un total completo aparente. Distinguir saldo actual de una cuenta del neto de movimientos durante el período. [P]

## 5. Exportación CSV y mapeo al modelo propio

### 5.1 Qué se sabe y qué no

El siguiente esquema y la codificación de ingresos como `Transfer` provienen del pedido **[R]**. No se dispuso de un archivo real para verificar serialización, signos, fechas, nombres de secciones o valores de recurrencia. La ayuda anterior dice que web no exporta; la ayuda móvil describe elegir cuentas y período y generar un CSV. Esa documentación no publica estas columnas ni confirma la situación de la web actual. [D13, M3; ?]

No llamar a esta especificación «compatibilidad CoinKeeper validada». El esquema se conserva como contrato solicitado y las convenciones nuevas se identifican como propuestas.

### 5.2 Estructura solicitada

Primera línea exacta, que se trata como directiva y no como registro:

```csv
sep=,
```

Cabecera de transacciones exacta y en este orden; conservar **`Data`**, sin corregirla a `Date`:

```csv
Data,Type,From,To,Tags,Amount,Currency,Amount converted,Currency of conversion,Recurrence,Note
```

Después de los movimientos, secciones de fuentes de ingreso, cuentas y categorías. Las cabeceras confirmadas por el requisito son:

```csv
Name,Budget,Received to date,Icon,Currency
```

```csv
Name,Current amount,Icon,Currency
```

La sección de categorías es obligatoria en el contrato solicitado, pero **su cabecera exacta no fue aportada ni verificada**. Para nuestro formato se propone provisionalmente `Name,Budget,Spent to date,Icon,Currency`; no se presupone que una exportación de CoinKeeper use esos nombres. Tampoco se conocen sus separadores de sección, títulos o líneas vacías. [R; P; ?]

### 5.3 Mapeo de transacciones

| Columna | Mapeo propio y precaución |
|---|---|
| `Data` | `occurred_on`. Preservar el literal original; formato/locale reales desconocidos. Propuesta de exportación propia: `YYYY-MM-DD`. |
| `Type` | Conservar `external_type`. Clasificar por tipo de los extremos, no solo por esta cadena. |
| `From` | Resolver a fuente de ingreso o cuenta mediante la sección correspondiente. Nombre duplicado → ambigüedad, no elegir el primero. |
| `To` | Resolver a cuenta o categoría de gasto de igual modo. |
| `Tags` | `tag_ids[]`, manteniendo el texto bruto. Delimitador interno y escape reales desconocidos; no dividir por espacios a ciegas. |
| `Amount` | Importe nominal asociado a `Currency`; atribuir a origen/destino solo cuando la semántica se haya resuelto. |
| `Currency` | Moneda del importe nominal, preservando códigos desconocidos. |
| `Amount converted` | Importe equivalente asociado a la columna siguiente. No asumir que acredita la cuenta receptora. |
| `Currency of conversion` | Moneda del equivalente; puede ser moneda base o del destino. Sin muestra no está resuelto. |
| `Recurrence` | Conservar descriptor bruto; no reconstruir automáticamente una regla activa ni generar duplicados. |
| `Note` | `note`, manteniendo comas, comillas y saltos de línea mediante un parser CSV real. |

**Clasificación requerida [R/P]:**

| Caso externo | Resolución de extremos | Tipo propio |
|---|---|---|
| `Transfer` | Fuente de ingreso → cuenta | `income`; acredita la cuenta y suma recibido de la fuente. |
| `Transfer` | Cuenta → cuenta | `transfer`; no sumar a ingresos ni a gastos. |
| Movimiento de gasto, etiqueta externa por verificar | Cuenta → categoría de gasto | `expense`. El literal exacto del tipo externo no fue verificado. |
| Extremos ausentes, ambiguos o dirección incompatible | Sin resolución fiable | Fila pendiente de revisión; conservar original y no contabilizar. |

**Convención para nuestro exportador [P], pendiente de decidir compatibilidad externa:** `Amount/Currency` expresará importe del origen y `Amount converted/Currency of conversion` el equivalente de reporte en moneda base. Si un importador encuentra que la segunda moneda coincide con el destino, puede usarla como importe del destino únicamente bajo una convención explícitamente validada para ese archivo.

El CSV tiene dos pares importe/moneda, mientras el modelo puede necesitar tres: origen, destino y base. Una transferencia entre dos monedas distintas de la base **no puede reconstruirse sin pérdida** a partir de este esquema si el segundo par representa la base. No inventar el importe acreditado ni usar la tasa actual para fingir una tasa histórica; conservar la fila como incompleta o ampliar un formato propio versionado. [E2; P; ?]

Ejemplos conceptuales propios, no filas observadas: `Transfer` desde una fuente «Trabajo» hacia una cuenta «Cuenta diaria», 100 BOB, se clasifica como ingreso. `Transfer` desde «Cuenta diaria» hacia otra cuenta «Reserva», 20 BOB, se clasifica como transferencia. La diferencia depende del tipo de entidad, no de los nombres ni de un signo supuesto.

### 5.4 Mapeo de secciones de entidades

| Sección | Mapeo |
|---|---|
| Fuentes de ingreso | `Name` → nombre; `Budget` → ingreso previsto del período; `Received to date` → agregado recibido de referencia; `Currency` → moneda. `Icon` se conserva como metadato de origen sin reutilizar el recurso. |
| Cuentas | `Name` → nombre; `Current amount` → saldo observado al exportar; `Currency` → moneda; `Icon` → metadato. El saldo actual no es un ingreso ni necesariamente el saldo inicial. |
| Categorías | Nombre → categoría; presupuesto → límite del período; gastado → agregado de referencia, **si esas columnas existen y se identifican en una muestra**. Cabecera y semántica exactas pendientes. |

No importar `Received to date` ni un acumulado de gasto como transacciones adicionales: se duplicarían los movimientos. Si existe historial completo y una fecha de corte, se puede reconciliar saldo inicial = saldo observado − efecto neto de movimientos hasta ese corte. Si el archivo contiene solo un período o una selección de cuentas, esa reconstrucción puede ser indeterminada. Mantener un saldo de referencia y solicitar resolución, sin inventar historia. [P]

### 5.5 Reglas del formato propio e importación segura

Propuestas **[P]**: UTF-8, coma como delimitador de campos, punto decimal, sin separador de miles, comillas dobles cuando sean necesarias y comillas interiores duplicadas. Analizar registros CSV, no líneas físicas, porque una nota puede contener saltos. No se verificaron BOM, terminadores de línea ni formato numérico de CoinKeeper.

Reconocer `sep=,` antes de parsear; localizar secciones por cabeceras verificadas/configuradas y conservar títulos desconocidos. Para nuestro exportador, orden de secciones: movimientos → fuentes → cuentas → categorías. Encabezados repetidos, entidades homónimas, fechas ambiguas y valores de recurrencia desconocidos generan un informe de revisión. No fusionar movimientos únicamente por fecha, importe y nota: dos compras iguales pueden ser reales. La estrategia de importación repetida necesita identidad del archivo/fila y revisión de solapamientos. [R; P]

No activar recurrencias al importar historial. El CSV solicitado es un reporte con pérdida potencial de IDs, zona horaria, tasas y reglas; no equivale a una copia de respaldo íntegra. [P]

## 6. Pantallas y propósito

No se prescribe la composición visual propietaria. Una pantalla puede implementarse como vista, panel o diálogo propio.

| Pantalla o superficie | Propósito | Evidencia / estatus |
|---|---|---|
| Acceso | Entrar a un perfil existente. | Única pantalla de app actual observada; no se utilizó. [O1] |
| Selección de perfil | Elegir perfil cuando haya varios. | Ruta candidata presente en JS de acceso actual; no observada. [E1] |
| Configuración inicial | Elegir moneda, saldos y categorías con límites. | Ayuda web anterior, no ejecutada. [D14] |
| Resumen financiero | Ver cuentas, fuentes, categorías y resultados del período. | Estructura del tablero anterior y documentación. [E2, D15] |
| Crear movimiento | Elegir extremos, importes, fecha y datos opcionales; confirmar. | Entrada guiada anterior documentada/estática. Gesto de arrastre propuesto. [D6, E2; P] |
| Historial | Buscar y filtrar movimientos; acceder a edición/borrado. | Ayuda y componente de línea temporal anterior. [D8, D9, E2] |
| Detalle/edición de movimiento | Corregir un movimiento y su conversión; eliminar/restaurar. | Lógica estática anterior; no ejecutada. [E2] |
| Gestión de cuentas | Crear/editar cuentas, moneda, saldo y archivo. | Ayuda anterior; archivo como política propia. [D4; P] |
| Gestión de fuentes de ingreso | Definir procedencia e ingreso esperado. | Ayuda anterior. [D3] |
| Gestión de categorías y presupuestos | Definir categorías, límites y período consultado. | Ayuda/JS anteriores; historial de límites propuesto. [D5, E2; P] |
| Detalle de entidad | Revisar movimientos y distribución por etiquetas de una cuenta/fuente/categoría. | Ayuda anterior. [D12] |
| Reportes | Totales, distribución y evolución según filtros compartidos. | Ayuda anterior; contrato de filtros propio. [D8, D10–D12; P] |
| Gestión de etiquetas | Crear/renombrar/archivar sin romper movimientos históricos. | Pantalla independiente propuesta; etiquetas documentadas. [P; D6] |
| Recurrencias | Crear reglas, revisar pendientes y terminar series. | Pantalla propuesta; no verificada en web. [P; D7] |
| Ajustes | Moneda base, zona horaria y período. | Moneda/período documentados; zona horaria propuesta. [D1, D2; P] |
| Exportar/importar y revisión | Seleccionar alcance, descargar CSV, resolver ambigüedades y reconciliar. | Pantalla propia; no observada en web. Export móvil documentado. [P; D13, M3] |

## 7. Incógnitas y conclusiones acotadas

| ID | Incógnita o límite | Evidencia disponible y consecuencia |
|---|---|---|
| U1 | Paridad entre la web actual y la anterior | O1 solo alcanza login; O2/E2 corresponden a otra superficie. No atribuir funciones del tablero anterior a la actual. |
| U2 | Arrastrar para crear movimientos en web | D6 documenta entrada por texto; M1 es iOS. No apareció `drag` en `ck-dashboard.js`, pero la búsqueda no cubre toda la app ni prueba ausencia. Implementarlo solo como requisito propio. |
| U3 | Validaciones y persistencia reales | E2 muestra matriz, pasos y mutaciones del cliente; no hubo peticiones financieras autenticadas. Saldo insuficiente, límites de importes, concurrencia y fallos del servidor no están verificados. |
| U4 | Retención de movimientos borrados | E2 tiene marca y restauración; D9 limita el deshacer visible. No prueba recuperación tras recargar ni plazo del servidor. |
| U5 | Presupuestos históricos, cero y arrastre | D2 habla de reinicio de indicadores; E2 normaliza límites vacíos a cero. No prueba saldo remanente transferible ni límites históricos independientes. |
| U6 | Tasa, fecha y política de conversión actuales | E2 muestra tasas y redondeo del cliente anterior; D1 describe cambios de moneda. Proveedor, actualización y recálculo histórico del servidor desconocidos. |
| U7 | Editor y ejecución de recurrencias en web | D7 niega creación en la versión documentada; E2 conserva vínculo. M2 es Android. No concluir que la web actual genera/cobra automáticamente. |
| U8 | Semántica exacta del CSV | Esquema del pedido sin muestra; D13/M3 no publican campos. Faltan sección de categorías, títulos, fechas, signos, separador de etiquetas, valores de recurrencia y significado del equivalente. |
| U9 | Pérdida de información en CSV | E2 almacena hasta tres importes; contrato pedido solo dos pares. No prometer reconstrucción completa de transferencias multimoneda. |
| U10 | Combinación de filtros y reportes actuales | D8 confirma dimensiones, no AND/OR ni selección múltiple; no se ejecutaron reportes actuales. Las reglas de §4 son propias. |
| U11 | Etiquetas en transferencias | E2 tiene restricciones del constructor anterior, no una regla probada de toda la plataforma. La app propia las admite por decisión explícita. |
| U12 | Reembolsos, divisiones y recurrencias complejas | No hay evidencia suficiente en el alcance revisado. No inventar reversos, prorrateos, fin de mes o cambio de zona horaria como comportamiento observado. |

### Registro de evidencia REA y cobertura

| Ref. | Procedencia y resultado |
|---|---|
| O1 | `capture_browser_scenario`, Chrome temporal, `https://web.coinkeeper.me/`, espera de 5 s, DOM/accesibilidad/red. Redirect a `/login`; campos vacíos; ninguna acción sobre formularios. Evidence `ev_68515729a4dc4ef97ce9353df995723506fc356ff43ad5461b97e2873e78ee27`. |
| O2 | Mismo método en `https://coinkeeper.me/introduce-yourself`, espera de 4 s. Acceso anterior y URLs de scripts públicos. Evidence `ev_927d911e8a4add0b855b99a78f41941d080756f641c84eddca2036ccdf6e8c51`. |
| E1 | `export_web_scripts` y `analyze_javascript_application` de dos chunks actuales de acceso/error. Análisis padre `ev_96a486570ba25ff200da3a41b0d6e5eef12063801e7d235e79065f4bf8dfbad7`; vista resumen `ev_d69942962f0f7188720be8468165e91c99237efeafc1ba9bdade0a34c1d7a3b4`. El chunk de acceso identifica destinos `/app` y `/profile-pick`; no demuestra su contenido autenticado. |
| E2 | GET público de los scripts anunciados por O2; REA analizó `ck-dashboard.js` y `ck-localization.js`, 293.165 bytes, dos archivos parseados sin fallos. Análisis padre `ev_abdb1c98c66873a9b2f6b65a791c248d6bedf20417d964df8e6e2985e6f1a036`; resumen `ev_8bb610458414ba03bd86d99e6422bf3e3ef658392e60eeed8b0bd3ca4ce3efeb`; vista del módulo `ev_3d7f3003cde2219e220dcca2c90927f85130564b5095c4d818414191b1c85fd0`. Lectura focal de funciones y campos citados, sin ejecutarlos aisladamente. |

Identidad reproducible de assets examinados:

- [Bundle del tablero anterior](https://coinkeeper.me/scripts/ck-dashboard?v=phYhJf0K77X3pgs2xSZAGoKY7QKMULrGufynT1goC4I1): 216.753 bytes; SHA-256 `020a9986187ed05b77e40d32cc8fd07b859e0c484834f4a8c7ac31327ec9c7ac`.
- [Localización anterior](https://coinkeeper.me/scripts/ck-localization?v=_0P_99bW23uQNrmoRJjQlxNzI1XiVU2QTsHRMG_Rmbg1): 76.412 bytes; SHA-256 `dcccecf16133e897aa7930f6fb6c58e813f7091f0adf0009cb814002e986b2ff`.
- [Chunk de acceso actual](https://web.coinkeeper.me/_next/static/chunks/3loyim3kriveo.js): 4.317 bytes; SHA-256 `d6a843914fc5a5becfe29062fa42ec3cf56947ffff61804cf785e6b1334f443f`.

**Limitaciones técnicas:** los cuerpos de más de 64 KiB no se conservaron en la captura de red REA. Para E2 se descargaron separadamente los assets públicos anunciados, conservando identidad por hash; no se equiparan esos bytes a cuerpos retenidos en O2. REA limitó el grafo semántico del análisis anterior por cantidad de nodos y dejó cuatro archivos fuera del análisis seleccionado. Las conclusiones estáticas se apoyan en lectura de ramas concretas, no en cobertura completa del grafo. Solo hubo búsquedas focales adicionales en bundles compartidos; no se analizaron todos sus componentes. No se consultaron source maps, ni se probaron operaciones autenticadas, ni se invocaron endpoints financieros identificados en el JS.

### Fuentes oficiales documentales

Ayuda pública sin fecha editorial visible, asociada a la web anterior; no tratar como prueba de vigencia de la web actual:

- **D1:** [Monedas, conversión y eliminación de entidades](https://ruhelpd.coinkeeper.me/729a9cdbcefd4e4990eadc79e20aa1bf).
- **D2:** [Período de reporte y reinicio de indicadores](https://ruhelpd.coinkeeper.me/9ca3c9b82f9c4a7f9674dd0598ad3aad).
- **D3:** [Fuentes de ingreso](https://ruhelpd.coinkeeper.me/b897f3e388184b57adf7c816a6a1932f).
- **D4:** [Cuentas](https://ruhelpd.coinkeeper.me/3b6ab6135c4f49d3906e9be86b359757).
- **D5:** [Categorías y límites](https://ruhelpd.coinkeeper.me/4b2651ab9d0a43d1adf4350d547e3fff).
- **D6:** [Crear gastos e ingresos en web](https://ruhelpd.coinkeeper.me/23b835cefe78479bac72e13a262a51de).
- **D7:** [Limitación documental de recurrencia en web](https://ruhelpd.coinkeeper.me/b87c0064231448a7a9fcb3e609f8797c).
- **D8:** [Filtros del historial](https://ruhelpd.coinkeeper.me/222746293f804ca98033c95684930e74).
- **D9:** [Edición y borrado de movimientos](https://ruhelpd.coinkeeper.me/1b126451386646eb8f3c78cad5eca44b).
- **D10:** [Reportes de ingresos](https://ruhelpd.coinkeeper.me/cb075c29cb864bd79239797f5fa87f7c).
- **D11:** [Reportes de gastos](https://ruhelpd.coinkeeper.me/bd4a5deb0da948679156df997df524d9).
- **D12:** [Detalle por etiquetas](https://ruhelpd.coinkeeper.me/7482b7dc957c4b9f937f3271c4a30b13).
- **D13:** [Limitación documental de exportación web](https://ruhelpd.coinkeeper.me/4b2fef964d3545a69f359dd119c46fe6).
- **D14:** [Configuración inicial web](https://ruhelpd.coinkeeper.me/web-dbf17e6ffc1f4d999eca5cbab4ba1d75).
- **D15:** [Ubicación de estadísticas en el tablero](https://ruhelpd.coinkeeper.me/7a2fee82575e422a9b8609ef91e1a2ff).

Fuentes móviles, utilizadas únicamente para el alcance indicado:

- **M1:** [Gesto de creación en iOS](https://ruhelpd.coinkeeper.me/0fe9625d1d1f4bbfaf03c87a58e24005).
- **M2:** [Recurrencia en Android](https://ruhelpd.coinkeeper.me/f7af8ae86c4148218340efc9b49a803d).
- **M3:** [Exportación móvil de CSV por cuentas y período](https://enhelp.coinkeeper.me/Exporting-data-1c59893444ee493bbfb57d7421691a8a).

### Cobertura del pedido

| Tema | Resultado de investigación |
|---|---|
| Modelo de datos | Parcialmente establecido por JS/ayuda anteriores; modelo propio definido. |
| Crear, editar y borrar | Secuencias y ramas anteriores identificadas; sin ejecución autenticada. Arrastre web sin verificar. |
| Presupuestos y mes | Períodos y agregados anteriores establecidos; arrastre e historial de límites desconocidos. |
| Reportes y filtros | Documentados para la web anterior; reglas de combinación actuales desconocidas. |
| CSV | Esquema solicitado conservado y mapeado; formato real completo sin verificar. |
| Pantallas | Inventario con propósito y distinción entre observado, estático, documentado y propuesto. |
| Incógnitas y evidencia | U1–U12, IDs REA, hashes y fuentes oficiales incluidos. |
