/* gástalo — domain functions are also exported for node --test. No runtime dependencies. */
(function (root) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const TYPES = ["sources", "accounts", "categories"];
  // Original SVG symbols. Persist only their keys, never SVG from user data.
  const ENTITY_ICONS = {
    income: {
      label: "Ingresos",
      path: '<path d="M12 19V5m-5 5 5-5 5 5M5 19h14"/>',
    },
    wallet: {
      label: "Billetera",
      path: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18m-5 5h2M6 6V4h12"/>',
    },
    tag: {
      label: "Etiqueta",
      path: '<path d="m3 12 9 9 9-9V3h-9L3 12Z"/><circle cx="16" cy="8" r="1"/>',
    },
    bank: {
      label: "Banco",
      path: '<path d="m3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18"/>',
    },
    card: {
      label: "Tarjeta",
      path: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
    },
    home: {
      label: "Hogar",
      path: '<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',
    },
    food: {
      label: "Comida",
      path: '<path d="M5 3v6m3-6v6M3 3v6a3 3 0 0 0 6 0M6 12v9M18 3c-4 2-4 9 0 9h2M20 3v18"/>',
    },
    coffee: {
      label: "Café",
      path: '<path d="M3 8h13v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Zm13 1h2a3 3 0 0 1 0 6h-2M6 3v2m4-2v2"/>',
    },
    car: {
      label: "Auto",
      path: '<path d="m4 9 2-5h12l2 5M3 10h18v8H3v-8Zm2 8v3m14-3v3M6 13h2m8 0h2"/>',
    },
    bus: {
      label: "Transporte",
      path: '<rect x="5" y="2" width="14" height="18" rx="3"/><path d="M5 10h14M8 20l-2 2m10-2 2 2M8 15h1m6 0h1M9 5h6"/>',
    },
    health: {
      label: "Salud",
      path: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
    },
    gym: {
      label: "Gimnasio",
      path: '<path d="M7 8h10M7 16h10M3 7h4v10H3V7Zm14 0h4v10h-4V7ZM1 10v4m22-4v4"/>',
    },
    education: {
      label: "Estudios",
      path: '<path d="m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7m4-2v9"/>',
    },
    travel: {
      label: "Viajes",
      path: '<path d="m3 10 7 2 3 9 2-1-1-8 6-6a2 2 0 0 0-2-2l-6 6-8-1-1 1Z"/>',
    },
    gift: {
      label: "Regalo",
      path: '<path d="M3 8h18v5H3V8Zm2 5v8h14v-8M12 8v13M12 8C4 8 5 1 9 3l3 5Zm0 0c8 0 7-7 3-5l-3 5Z"/>',
    },
    work: {
      label: "Trabajo",
      path: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c5 3 13 3 18 0M10 13h4v4h-4z"/>',
    },
    shopping: {
      label: "Compras",
      path: '<path d="M4 7h16l-1 14H5L4 7Zm4 0V5a4 4 0 0 1 8 0v2"/>',
    },
    phone: {
      label: "Teléfono",
      path: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
    },
    spark: {
      label: "Tecnología",
      path: '<path d="m12 2-2 8-8 2 8 2 2 8 2-8 8-2-8-2-2-8Z"/>',
    },
    pet: {
      label: "Mascota",
      path: '<ellipse cx="6" cy="7" rx="2" ry="3"/><ellipse cx="18" cy="7" rx="2" ry="3"/><path d="M5 18c0-3 5-8 7-8s7 5 7 8c0 4-5 1-7 1s-7 3-7-1Z"/>',
    },
    bills: {
      label: "Servicios",
      path: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5h6m-6 4h6m-6 4h3"/>',
    },
    bike: {
      label: "Bicicleta",
      path: '<circle cx="5" cy="16" r="4"/><circle cx="19" cy="16" r="4"/><path d="m5 16 5-9 5 9H5Zm5-9h6m-2-4h3l2 13M8 4h4"/>',
    },
    music: {
      label: "Música",
      path: '<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="19" rx="3" ry="2"/><ellipse cx="18" cy="17" rx="3" ry="2"/>',
    },
    shield: {
      label: "Seguro",
      path: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6"/>',
    },
  };
  function entityIconKey(item, type) {
    return Object.hasOwn(ENTITY_ICONS, item?.icon)
      ? item.icon
      : { sources: "income", accounts: "wallet", categories: "tag" }[type];
  }
  const uid = () => globalThis.crypto.randomUUID();
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  function cents(value) {
    const match = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(String(value).trim());
    assert(
      match,
      "Importe inválido. Usa hasta dos decimales, sin separador de miles.",
    );
    const n = BigInt(match[2]) * 100n + BigInt((match[3] || "").padEnd(2, "0"));
    const signed = match[1] ? -n : n;
    assert(
      signed <= BigInt(Number.MAX_SAFE_INTEGER) &&
        signed >= BigInt(Number.MIN_SAFE_INTEGER),
      "Importe demasiado grande.",
    );
    return Number(signed);
  }
  function sum(values) {
    let n = 0n;
    for (const value of values) n += BigInt(value);
    assert(
      n <= BigInt(Number.MAX_SAFE_INTEGER) &&
        n >= BigInt(Number.MIN_SAFE_INTEGER),
      "Total fuera del rango seguro.",
    );
    return Number(n);
  }
  function dateOK(s) {
    return (
      typeof s === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      s.slice(0, 4) !== "0000" &&
      Number.isFinite(new Date(s + "T12:00:00Z").getTime()) &&
      new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s
    );
  }
  function monthOK(s) {
    return (
      typeof s === "string" &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(s) &&
      s.slice(0, 4) !== "0000"
    );
  }
  function shiftMonth(month, offset) {
    const d = new Date(month + "-15T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + offset);
    return d.toISOString().slice(0, 7);
  }
  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: {
        id: "personal",
        base_currency: "BOB",
        timezone: "America/La_Paz",
      },
      sources: [],
      accounts: [],
      categories: [],
      tags: [],
      budgets: [],
      transactions: [],
      review: [],
      imports: [],
    };
  }
  // Pure gesture rule. Entity types use the same keys as the stored collections.
  function canDrop(from, to) {
    if (!from || !to || from.id === to.id) return false;
    return (
      (from.type === "sources" && to.type === "accounts") ||
      (from.type === "accounts" &&
        (to.type === "categories" || to.type === "accounts"))
    );
  }
  // Decide before capturing the pointer or blocking native page scrolling.
  function gestureIntent({ dx, dy, onCircle, canDrag, canPan }) {
    const vertical = Math.abs(dy),
      horizontal = Math.abs(dx);
    if (onCircle && canDrag)
      return dx !== 0 || dy !== 0 ? "drag" : "pending";
    if (Math.hypot(dx, dy) <= 6) return "pending";
    if (onCircle && canPan && horizontal > vertical * 1.25)
      return "pan";
    return "scroll";
  }
  function transactionSwipeOutcome(offset, width) {
    if (offset >= -32) return "closed";
    return -offset >= Math.max(140, width * 0.65) ? "delete" : "revealed";
  }
  function direction(state, fromId, toId) {
    const resolve = (id) => {
      const type = TYPES.find((key) => state[key].some((e) => e.id === id));
      return type ? { id, type } : null;
    };
    const from = resolve(fromId),
      to = resolve(toId);
    if (!canDrop(from, to)) return null;
    return from.type === "sources"
      ? "income"
      : to.type === "categories"
        ? "expense"
        : "transfer";
  }
  const posted = (state) =>
    state.transactions.filter((t) => t.status === "posted");
  function balances(state) {
    return Object.fromEntries(
      state.accounts.map((a) => [
        a.id,
        sum([
          a.opening_balance_cents,
          ...posted(state).flatMap((t) =>
            t.to_id === a.id
              ? [t.amount_cents]
              : t.from_id === a.id
                ? [-t.amount_cents]
                : [],
          ),
        ]),
      ]),
    );
  }
  function filterTransactions(state, filters = {}) {
    return posted(state).filter(
      (t) =>
        (!filters.start || t.occurred_on >= filters.start) &&
        (!filters.end || t.occurred_on <= filters.end) &&
        (!filters.kind || t.kind === filters.kind) &&
        (!filters.entities?.length ||
          filters.entities.includes(t.from_id) ||
          filters.entities.includes(t.to_id)) &&
        (!filters.tags?.length ||
          (filters.tagMode === "all"
            ? filters.tags.every((id) => t.tag_ids.includes(id))
            : filters.tags.some((id) => t.tag_ids.includes(id)))) &&
        (!filters.text ||
          t.note
            .toLocaleLowerCase("es")
            .includes(filters.text.toLocaleLowerCase("es"))),
    );
  }
  function report(state, month, filters = {}) {
    const ts = filterTransactions(state, filters).filter(
      (t) => t.occurred_on.slice(0, 7) === month,
    );
    const income = sum(
      ts.filter((t) => t.kind === "income").map((t) => t.amount_cents),
    );
    const expense = sum(
      ts.filter((t) => t.kind === "expense").map((t) => t.amount_cents),
    );
    const byCategory = new Map(state.categories.map((c) => [c.id, []]));
    for (const t of ts)
      if (t.kind === "expense") byCategory.get(t.to_id)?.push(t.amount_cents);
    return {
      income,
      expense,
      net: sum([income, -expense]),
      categories: state.categories.map((c) => ({
        id: c.id,
        name: c.name,
        spent: sum(byCategory.get(c.id)),
      })),
    };
  }
  function budget(state, categoryId, month) {
    const limit =
      state.budgets.find(
        (b) => b.category_id === categoryId && b.month === month,
      )?.limit_cents ?? null;
    const spent =
      report(state, month).categories.find((c) => c.id === categoryId)?.spent ||
      0;
    return {
      limit,
      spent,
      remaining: limit === null ? null : sum([limit, -spent]),
    };
  }
  function budgetVisual(limit, spent) {
    if (limit === null || spent === 0) return { fill: 0, tone: "gray" };
    if (spent > limit) return { fill: 100, tone: "red" };
    // Compare integer cents exactly, including budgets near MAX_SAFE_INTEGER.
    const used = BigInt(spent),
      total = BigInt(limit);
    return {
      fill: Number((used * 10000n) / total) / 100,
      tone: used * 100n <= total * 65n ? "green" : "orange",
    };
  }
  function eraseEntity(state, key, id) {
    assert(TYPES.includes(key) && state[key].some((e) => e.id === id),
      "Entidad inexistente.");
    const next = copy(state);
    next[key] = next[key].filter((e) => e.id !== id);
    next.transactions = next.transactions.filter(
      (t) => t.from_id !== id && t.to_id !== id,
    );
    next.budgets = next.budgets.filter((b) => b.category_id !== id);
    return validateState(next);
  }
  function evolution(state, month, filters = {}) {
    return Array.from({ length: 12 }, (_, i) => {
      const m = shiftMonth(month, i - 11);
      return { month: m, ...report(state, m, filters) };
    });
  }
  // Read-only monthly history: flows for sources/categories, closing balance for accounts.
  function entityEvolution(state, id, month) {
    const type = TYPES.find((key) => state[key].some((e) => e.id === id));
    assert(type, "Entidad inexistente.");
    const item = state[type].find((e) => e.id === id);
    const ts = filterTransactions(state, { entities: [id] });
    return Array.from({ length: 12 }, (_, i) => {
      const m = shiftMonth(month, i - 11);
      const end = shiftMonth(m, 1) + "-01";
      const value =
        type === "accounts"
          ? sum([
              item.opening_date < end ? item.opening_balance_cents : 0,
              ...ts
                .filter((t) => t.occurred_on < end)
                .map((t) =>
                  t.to_id === id ? t.amount_cents : -t.amount_cents,
                ),
            ])
          : sum(
              ts
                .filter((t) => t.occurred_on.startsWith(m))
                .map((t) => t.amount_cents),
            );
      return { month: m, value };
    });
  }
  function validateState(s) {
    assert(
      s && s.schemaVersion === SCHEMA_VERSION,
      "Versión de respaldo no compatible.",
    );
    assert(
      s.profile?.base_currency === "BOB" &&
        typeof s.profile.id === "string" &&
        typeof s.profile.timezone === "string",
      "Perfil inválido: v1 usa BOB.",
    );
    try {
      new Intl.DateTimeFormat("es", { timeZone: s.profile.timezone });
    } catch {
      throw new Error("Zona horaria inválida.");
    }
    const collections = [
      ...TYPES,
      "tags",
      "budgets",
      "transactions",
      "review",
      "imports",
    ];
    for (const key of collections)
      assert(Array.isArray(s[key]), `Falta la colección ${key}.`);
    const ids = new Set();
    const integer = (n) => Number.isSafeInteger(n);
    for (const key of collections)
      for (const e of s[key]) {
        assert(
          e && typeof e.id === "string" && e.id.length > 0 && !ids.has(e.id),
          `ID inválido o duplicado en ${key}.`,
        );
        ids.add(e.id);
      }
    for (const key of [...TYPES, "tags"])
      for (const e of s[key]) {
        assert(
          typeof e.name === "string" &&
            e.name.trim() &&
            (e.archived_at === null || typeof e.archived_at === "string"),
          "Entidad inválida.",
        );
        if (key !== "tags") assert(e.currency === "BOB", "v1 solo admite BOB.");
        if (key !== "tags" && e.icon !== undefined)
          assert(
            typeof e.icon === "string" && Object.hasOwn(ENTITY_ICONS, e.icon),
            "Icono de entidad inválido.",
          );
        if (key === "accounts")
          assert(
            integer(e.opening_balance_cents) &&
              dateOK(e.opening_date) &&
              typeof e.exclude_from_total === "boolean",
            "Saldo inicial inválido.",
          );
        if (key === "sources")
          assert(
            e.expected_cents === null ||
              (integer(e.expected_cents) && e.expected_cents >= 0),
            "Meta de ingreso inválida.",
          );
      }
    const months = new Set();
    for (const b of s.budgets) {
      const k = b.category_id + "/" + b.month;
      assert(
        s.categories.some((c) => c.id === b.category_id) &&
          monthOK(b.month) &&
          !months.has(k) &&
          (b.limit_cents === null ||
            (integer(b.limit_cents) && b.limit_cents >= 0)),
        "Presupuesto inválido o duplicado.",
      );
      months.add(k);
    }
    for (const t of s.transactions) {
      assert(
        direction(s, t.from_id, t.to_id) === t.kind && t.kind !== null,
        "Dirección de movimiento inválida.",
      );
      assert(
        integer(t.amount_cents) &&
          t.amount_cents > 0 &&
          dateOK(t.occurred_on) &&
          t.currency === "BOB",
        "Importe, moneda o fecha inválida.",
      );
      assert(
        ["posted", "deleted"].includes(t.status) &&
          typeof t.note === "string" &&
          typeof t.created_at === "string" &&
          typeof t.updated_at === "string",
        "Movimiento inválido.",
      );
      assert(
        Array.isArray(t.tag_ids) &&
          new Set(t.tag_ids).size === t.tag_ids.length &&
          t.tag_ids.every((id) => s.tags.some((tag) => tag.id === id)),
        "Etiquetas inválidas.",
      );
    }
    for (const r of s.review)
      assert(
        typeof r.reason === "string" &&
          Array.isArray(r.raw) &&
          r.raw.every((v) => typeof v === "string") &&
          Number.isSafeInteger(r.record),
        "Fila de revisión inválida.",
      );
    for (const i of s.imports)
      assert(
        typeof i.fingerprint === "string" && typeof i.imported_at === "string",
        "Metadatos de importación inválidos.",
      );
    balances(s); // Reject overflow before a replacement is committed.
    for (const m of new Set(
      s.transactions.map((t) => t.occurred_on.slice(0, 7)),
    )) {
      const r = report(s, m);
      for (const c of r.categories) {
        const b = s.budgets.find(
          (b) => b.month === m && b.category_id === c.id,
        );
        if (b?.limit_cents != null) sum([b.limit_cents, -c.spent]);
      }
    }
    return s;
  }
  function backup(state, now = new Date().toISOString()) {
    validateState(state);
    return JSON.stringify({ ...state, exported_at: now }, null, 2);
  }
  function restore(text) {
    const s = JSON.parse(text);
    validateState(s);
    delete s.exported_at;
    return s;
  }

  async function backupHash(payload) {
    const data = JSON.parse(payload);
    delete data.exported_at;
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode(JSON.stringify(data)),
    );
    return Array.from(new Uint8Array(digest), (v) =>
      v.toString(16).padStart(2, "0")).join("");
  }
  function utf8Base64(text) {
    return btoa(Array.from(new TextEncoder().encode(text), (v) =>
      String.fromCharCode(v)).join(""));
  }
  function shouldSync(config, online, hash) {
    return !!config.token && online && hash !== config.lastHash;
  }
  function syncErrorMessage(status) {
    if (status === 401 || status === 403) return "Token inválido o sin permiso";
    if (status == null) return "Sin conexión, se reintentará";
    if (status === 0) return "Revisa Repo, Branch y Path";
    return "No se pudo sincronizar. Revisa el repositorio y sus permisos";
  }
  function syncRequest(config, payload, sha) {
    const { repo, branch, path, token } = config;
    // Encode each segment and forbid traversal; credentials only go to this host.
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !branch || !path ||
        [...repo.split("/"), ...path.split("/")].some((s) => !s || s === "." || s === ".."))
      throw { status: 0 };
    const url = "https://api.github.com/repos/" +
      repo.split("/").map(encodeURIComponent).join("/") + "/contents/" +
      path.split("/").map(encodeURIComponent).join("/");
    const options = {
      method: payload === undefined ? "GET" : "PUT",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    };
    if (payload === undefined)
      return { url: url + "?ref=" + encodeURIComponent(branch), options };
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify({
      message: "sync: backup " + JSON.parse(payload).exported_at,
      content: utf8Base64(payload),
      branch,
      ...(sha ? { sha } : {}),
    });
    return { url, options };
  }
  async function uploadBackup(config, payload, signal, fetcher = globalThis.fetch) {
    const request = (data, sha) => {
      const { url, options } = syncRequest(config, data, sha);
      return fetcher(url, { ...options, signal });
    };
    // Read only the file SHA. Remote contents never enter the app state.
    for (let attempt = 0; attempt < 2; attempt++) {
      const metadata = await request();
      if (!metadata.ok && metadata.status !== 404)
        throw { status: metadata.status };
      const sha = metadata.status === 404 ? undefined : (await metadata.json()).sha;
      const result = await request(payload, sha);
      if (result.ok) return;
      if (attempt === 0 && [409, 422].includes(result.status)) continue;
      throw { status: result.status };
    }
  }

  // RFC 4180 records, including escaped quotes and embedded CR/LF. Blank records delimit sections.
  function csvRecords(input) {
    let text = input.replace(/^\uFEFF/, "").replace(/^sep=,\r?\n/, "");
    const rows = [];
    let row = [],
      field = "",
      quoted = false,
      closed = false;
    const cell = () => {
      row.push(field);
      field = "";
      closed = false;
    };
    const record = () => {
      cell();
      rows.push(row);
      row = [];
    };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = false;
            closed = true;
          }
        } else field += ch;
      } else if (ch === '"') {
        assert(!field && !closed, "Comillas CSV inválidas.");
        quoted = true;
      } else if (ch === ",") cell();
      else if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        record();
      } else {
        assert(!closed, "Texto después del cierre de comillas.");
        field += ch;
      }
    }
    assert(!quoted, "El CSV termina dentro de una celda entre comillas.");
    if (field || row.length || closed) record();
    return rows;
  }
  const HEADERS = [
    [
      "Data",
      "Type",
      "From",
      "To",
      "Tags",
      "Amount",
      "Currency",
      "Amount converted",
      "Currency of conversion",
      "Recurrence",
      "Note",
    ],
    ["Name", "Budget", "Received to date", "Icon", "Currency"],
    ["Name", "Current amount", "Icon", "Currency"],
    ["Name", "Budget", "Received to date", "Icon", "Currency"],
    ["Name", "Received to date"],
  ];
  function importCSV(
    text,
    month,
    fingerprint = "csv",
    now = new Date().toISOString(),
  ) {
    assert(
      monthOK(month),
      "Elige el mes al que pertenece el presupuesto del CSV.",
    );
    const groups = [];
    let group = [];
    for (const row of csvRecords(text)) {
      if (row.every((v) => v === "")) {
        if (group.length) {
          groups.push(group);
          group = [];
        }
      } else group.push(row);
    }
    if (group.length) groups.push(group);
    assert(
      groups.length === 5,
      "Se esperan transacciones y las cuatro secciones: fuentes, cuentas, categorías y etiquetas.",
    );
    groups.forEach((g, i) =>
      assert(
        JSON.stringify(g[0]) === JSON.stringify(HEADERS[i]),
        `Cabecera inesperada en sección ${i + 1}.`,
      ),
    );
    const s = emptyState(),
      current = new Map();
    let sequence = 0;
    const id = () => "csv-" + ++sequence;
    for (const [index, key] of [
      [1, "sources"],
      [2, "accounts"],
      [3, "categories"],
      [4, "tags"],
    ]) {
      for (const row of groups[index].slice(1)) {
        assert(
          row.length === HEADERS[index].length && row[0].trim(),
          `Entidad incompleta en ${key}.`,
        );
        const e = {
          id: id(),
          name: row[0],
          archived_at: null,
          import_metadata: { raw: row, section: key },
        };
        if (key !== "tags") {
          assert(
            row.at(-1) === "BOB",
            `La entidad «${row[0]}» usa ${row.at(-1)}. v1 solo admite BOB.`,
          );
          e.currency = "BOB";
        }
        if (key === "sources") {
          e.expected_cents = row[1] === "" ? null : cents(row[1]);
          assert(
            e.expected_cents === null || e.expected_cents >= 0,
            "Meta negativa.",
          );
        }
        if (key === "accounts") {
          current.set(e.id, cents(row[1]));
          e.opening_balance_cents = 0;
          e.opening_date = month + "-01";
          e.exclude_from_total = false;
        }
        s[key].push(e);
        if (key === "categories") {
          const n = row[1] === "" ? null : cents(row[1]);
          assert(n === null || n >= 0, "Presupuesto negativo.");
          s.budgets.push({
            id: id(),
            category_id: e.id,
            month,
            limit_cents: n,
          });
        }
      }
    }
    const entities = [...s.sources, ...s.accounts, ...s.categories];
    const resolve = (name) => {
      const matches = entities.filter((e) => e.name === name);
      assert(matches.length === 1, `Extremo ausente o ambiguo: ${name}`);
      return matches[0].id;
    };
    for (const [idx, row] of groups[0].slice(1).entries()) {
      try {
        assert(row.length === 11, "Cantidad de columnas inválida.");
        const [
          rawDate,
          type,
          from,
          to,
          tag,
          amount,
          currency,
          converted,
          convertedCurrency,
          recurrence,
          note,
        ] = row;
        assert(
          type === "Expense" || type === "Transfer",
          "Tipo externo desconocido.",
        );
        assert(recurrence === "None", "Recurrencia no compatible.");
        const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(rawDate);
        assert(match, "Fecha inválida; se espera M/D/YYYY.");
        const date = `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
        assert(dateOK(date), "Fecha inexistente.");
        assert(
          currency === "BOB" &&
            (!convertedCurrency || convertedCurrency === "BOB"),
          "Moneda no compatible.",
        );
        const n = cents(amount);
        assert(n > 0, "El importe debe ser positivo.");
        if (converted !== "")
          assert(
            cents(converted) === n,
            "Importe convertido BOB inconsistente.",
          );
        const fromId = resolve(from),
          toId = resolve(to),
          kind = direction(s, fromId, toId);
        assert(
          kind && (type === "Expense") === (kind === "expense"),
          "Tipo y dirección incompatibles.",
        );
        let tagIds = [];
        if (tag) {
          const matches = s.tags.filter((e) => e.name === tag);
          assert(matches.length <= 1, "Etiqueta ambigua.");
          if (!matches.length)
            s.tags.push({ id: id(), name: tag, archived_at: null });
          tagIds = [s.tags.find((e) => e.name === tag).id];
        }
        s.transactions.push({
          id: id(),
          kind,
          from_id: fromId,
          to_id: toId,
          occurred_on: date,
          amount_cents: n,
          currency: "BOB",
          tag_ids: tagIds,
          note,
          status: "posted",
          created_at: now,
          updated_at: now,
          import_metadata: { fingerprint, record: idx + 2, raw: row },
        });
      } catch (e) {
        s.review.push({
          id: id(),
          record: idx + 2,
          raw: row,
          reason: e.message,
        });
      }
    }
    const net = balances(s);
    const earliest =
      s.transactions.map((t) => t.occurred_on).sort()[0] || month + "-01";
    for (const a of s.accounts) {
      a.opening_balance_cents = sum([current.get(a.id), -net[a.id]]);
      a.opening_date = earliest;
    }
    s.imports.push({
      id: id(),
      fingerprint,
      imported_at: now,
      budget_month: month,
      accepted: s.transactions.length,
      pending: s.review.length,
    });
    return validateState(s);
  }
  const API = {
    SCHEMA_VERSION,
    ENTITY_ICONS,
    entityIconKey,
    cents,
    sum,
    dateOK,
    shiftMonth,
    emptyState,
    direction,
    canDrop,
    gestureIntent,
    transactionSwipeOutcome,
    balances,
    filterTransactions,
    report,
    budget,
    budgetVisual,
    eraseEntity,
    evolution,
    entityEvolution,
    validateState,
    backup,
    restore,
    backupHash,
    utf8Base64,
    shouldSync,
    syncErrorMessage,
    syncRequest,
    uploadBackup,
    csvRecords,
    importCSV,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof document !== "undefined") startApp(API);

  async function startApp() {
    const $ = (selector) => document.querySelector(selector);
    const esc = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    const money = (n) =>
      "Bs " +
      (n < 0 ? "−" : "") +
      Math.trunc(Math.abs(n) / 100).toLocaleString("es-BO") +
      "," +
      String(Math.abs(n) % 100).padStart(2, "0");
    const decimal = (n) =>
      (n < 0 ? "-" : "") +
      Math.trunc(Math.abs(n) / 100) +
      "." +
      String(Math.abs(n) % 100).padStart(2, "0");
    const monthLabel = (m) =>
      new Intl.DateTimeFormat("es-BO", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(m + "-15T12:00:00Z"));
    let state = emptyState(),
      revision = 0,
      db,
      view = "home",
      detailId = null,
      detailScope = "month",
      homeScroll = 0,
      editingEntities = false,
      undo = null,
      pendingImport = null,
      historyLimit = 100,
      busy = false;
    // Separate IndexedDB key: never included in state, backups, imports or erase.
    let syncConfig = {
      repo: "matiashaderspock-ai/gastalo-data",
      branch: "main",
      path: "gastalo-backup.json",
      token: "",
    }, syncReady = false, syncFlight = null, syncQueued = false, syncTimer;
    function syncStatus() {
      return syncConfig.lastError || (syncConfig.lastSuccess
        ? "Última sincronización: " + new Intl.DateTimeFormat("es-BO", {
            dateStyle: "short", timeStyle: "medium", timeZone: "America/La_Paz",
          }).format(new Date(syncConfig.lastSuccess)) + " · America/La_Paz"
        : syncConfig.token ? "Sin sincronizaciones todavía" : "Sincronización desactivada");
    }
    function updateSyncStatus() {
      const line = $("#sync-status");
      if (line) line.textContent = syncStatus();
    }
    function persistSyncConfig(config) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put(config, "sync_config");
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    }
    function scheduleSync() {
      clearTimeout(syncTimer);
      if (syncConfig.token) syncTimer = setTimeout(runSync, 30000);
    }
    async function runSync() {
      if (!syncReady || !syncConfig.token || !navigator.onLine) return;
      if (syncFlight) {
        syncQueued = true;
        return;
      }
      const config = syncConfig, controller = new AbortController();
      syncFlight = controller;
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const payload = backup(state), hash = await backupHash(payload);
        if (controller.signal.aborted || config !== syncConfig ||
            !shouldSync(config, navigator.onLine, hash)) return;
        await uploadBackup(config, payload, controller.signal);
        if (controller.signal.aborted || config !== syncConfig) return;
        config.lastHash = hash;
        config.lastSuccess = new Date().toISOString();
        config.lastError = "";
        await persistSyncConfig(config);
      } catch (error) {
        if (config === syncConfig) {
          config.lastError = syncErrorMessage(error?.status);
          // Never display exception/response text: it may echo credentials.
          await persistSyncConfig(config).catch(() => {});
        }
      } finally {
        clearTimeout(timeout);
        syncFlight = null;
        updateSyncStatus();
        if (syncQueued) {
          syncQueued = false;
          setTimeout(runSync, 0);
        }
      }
    }
    async function saveSyncSettings(disable = false) {
      if (!syncReady) return;
      try {
        const input = $("#sync-token");
        const next = disable ? { ...syncConfig, token: "" } : {
          ...syncConfig,
          repo: $("#sync-repo").value.trim(),
          branch: $("#sync-branch").value.trim(),
          path: $("#sync-path").value.trim(),
          token: input.value.trim() || syncConfig.token,
        };
        if (!disable) syncRequest(next);
        if (["repo", "branch", "path", "token"].some((key) => next[key] !== syncConfig[key])) {
          delete next.lastHash;
          delete next.lastSuccess;
          delete next.lastError;
        }
        syncFlight?.abort();
        clearTimeout(syncTimer);
        syncConfig = next;
        input.value = "";
        input.placeholder = next.token ? "••••" + next.token.slice(-4) : "";
        await persistSyncConfig(next);
        updateSyncStatus();
        if (!disable) void runSync();
      } catch (error) {
        syncConfig.lastError = syncErrorMessage(error?.status ?? 0);
        updateSyncStatus();
      }
    }
    const today = () =>
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: state.profile.timezone,
      }).format(new Date());
    let month = today().slice(0, 7);
    let filters = {
      start: "",
      end: "",
      entities: [],
      tags: [],
      tagMode: "any",
      kind: "",
      text: "",
    };
    const allEntities = () => [
      ...state.sources,
      ...state.accounts,
      ...state.categories,
    ];
    const entity = (id) => allEntities().find((e) => e.id === id);
    const name = (id) => entity(id)?.name || "Sin entidad";
    const labels = {
      income: "Ingreso",
      expense: "Gasto",
      transfer: "Transferencia",
    };
    const active = (key) => state[key].filter((e) => !e.archived_at);
    let notificationTimer;
    function dismissNotification() {
      clearTimeout(notificationTimer);
      $("#toast").hidden = true;
    }
    function notify(message, canUndo = false) {
      clearTimeout(notificationTimer);
      $("#toast").hidden = false;
      $("#toast").innerHTML =
        `<span>${esc(message)}</span>${canUndo ? '<button data-action="undo">Deshacer</button>' : ""}<button data-action="dismiss" aria-label="Cerrar aviso">×</button>`;
      notificationTimer = setTimeout(
        dismissNotification,
        canUndo ? 8000 : 3000,
      );
    }
    async function load() {
      const record = await new Promise((resolve, reject) => {
        const tx = db.transaction("state");
        const r = tx.objectStore("state").get("main");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      state = record?.data || emptyState();
      revision = record?.revision || 0;
      validateState(state);
    }
    async function commit(next, message, reversible = false) {
      assert(!busy, "Espera a que termine el guardado.");
      busy = true;
      const before = copy(state);
      try {
        validateState(next);
        await new Promise((resolve, reject) => {
          const tx = db.transaction("state", "readwrite"),
            store = tx.objectStore("state");
          let conflict = false;
          const r = store.get("main");
          r.onsuccess = () => {
            if ((r.result?.revision || 0) !== revision) {
              conflict = true;
              tx.abort();
            } else store.put({ data: next, revision: revision + 1 }, "main");
          };
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
          tx.onabort = () =>
            reject(
              new Error(
                conflict
                  ? "Otra pestaña cambió tus datos. Recarga antes de guardar."
                  : "No se pudo guardar. Revisa el espacio disponible.",
              ),
            );
        });
        state = next;
        revision++;
        scheduleSync();
        undo = reversible ? before : null;
        render();
        notify(message, reversible);
      } finally {
        busy = false;
      }
    }
    function options(items, value = "", blank = "") {
      return (
        (blank ? `<option value="">${esc(blank)}</option>` : "") +
        items
          .map(
            (e) =>
              `<option value="${esc(e.id)}" ${e.id === value ? "selected" : ""}>${esc(e.name)}${e.archived_at ? " (archivado)" : ""}</option>`,
          )
          .join("")
      );
    }
    function modal(
      title,
      html,
      onSubmit,
      {
        focusSelector = "input:not([type=hidden]),select,button",
        compact = false,
      } = {},
    ) {
      const dialog = $("#dialog");
      dialog.classList.toggle("compact-dialog", compact);
      $("#dialog-title").textContent = title;
      $("#dialog-body").innerHTML = html;
      $("#modal-error").textContent = "";
      $("#modal-form").onsubmit = async (e) => {
        e.preventDefault();
        const button = $('#modal-form button[type="submit"]');
        if (button?.disabled) return;
        if (button) button.disabled = true;
        try {
          await onSubmit(new FormData(e.currentTarget));
          dialog.close();
        } catch (error) {
          $("#modal-error").textContent = error.message;
        } finally {
          if (button) button.disabled = false;
        }
      };
      const initialField = $("#dialog-body").querySelector(focusSelector);
      initialField?.setAttribute("autofocus", "");
      if (!dialog.open) dialog.showModal();
      initialField?.focus();
    }
    const actions = (save = "Guardar") =>
      `<div class="dialog-actions"><button type="button" data-action="close">Cancelar</button><button class="primary" type="submit">${save}</button></div>`;
    function movement(from = "", to = "", transaction = null, reviewId = null) {
      const t = transaction;
      modal(
        t ? "Editar movimiento" : "Nuevo movimiento",
        `
        <div class="form-grid"><label>Origen<select name="from" required>${options(
          [...state.sources, ...state.accounts].filter(
            (e) => !e.archived_at || e.id === (t?.from_id || from),
          ),
          t?.from_id || from,
          "Elige origen",
        )}</select></label>
        <label>Destino<select name="to" required></select></label></div>
        <div class="form-grid"><label>Importe · BOB<input name="amount" inputmode="decimal" required placeholder="0,00" value="${t ? decimal(t.amount_cents) : ""}" autocomplete="off"></label>
        <label>Fecha<input name="date" type="date" required value="${esc(t?.occurred_on || today())}"></label></div>
        <details class="movement-extras" ${t?.note || t?.tag_ids.length ? "open" : ""}><summary>Etiquetas y nota</summary><fieldset><legend>Etiquetas</legend><div class="tag-choices">${
          state.tags
            .filter((tag) => !tag.archived_at || t?.tag_ids.includes(tag.id))
            .map(
              (tag) =>
                `<label><input type="checkbox" name="tags" value="${esc(tag.id)}" ${t?.tag_ids.includes(tag.id) ? "checked" : ""}>${esc(tag.name)}</label>`,
            )
            .join("") || '<span class="muted">Aún no hay etiquetas.</span>'
        }</div></fieldset>
        <label>Nueva etiqueta (opcional)<input name="newTag" maxlength="80" placeholder="Un nombre de etiqueta"></label>
        <label>Nota<textarea name="note" rows="2" maxlength="4000">${esc(t?.note || "")}</textarea></label></details>${actions(t ? "Guardar cambios" : "Registrar")}`,
        async (data) => {
          const next = copy(state),
            fromId = data.get("from"),
            toId = data.get("to"),
            kind = direction(next, fromId, toId),
            amount = cents(data.get("amount"));
          assert(kind, "Elige una dirección válida.");
          assert(amount > 0, "El importe debe ser mayor que cero.");
          const tagIds = data.getAll("tags"),
            tagName = data.get("newTag").trim();
          if (tagName) {
            let tag = next.tags.find((e) => e.name === tagName);
            if (!tag) {
              tag = { id: uid(), name: tagName, archived_at: null };
              next.tags.push(tag);
            }
            tagIds.push(tag.id);
          }
          const now = new Date().toISOString();
          const record = {
            ...(t || {}),
            id: t?.id || uid(),
            kind,
            from_id: fromId,
            to_id: toId,
            occurred_on: data.get("date"),
            amount_cents: amount,
            currency: "BOB",
            tag_ids: [...new Set(tagIds)],
            note: data.get("note"),
            status: "posted",
            created_at: t?.created_at || now,
            updated_at: now,
          };
          if (t)
            next.transactions[
              next.transactions.findIndex((e) => e.id === t.id)
            ] = record;
          else next.transactions.push(record);
          if (reviewId) {
            const r = next.review.find((r) => r.id === reviewId);
            record.import_metadata = {
              raw: r.raw,
              record: r.record,
              resolved_from_review: reviewId,
            };
            next.review = next.review.filter((r) => r.id !== reviewId);
          }
          await commit(
            next,
            t ? "Cambios guardados" : "Movimiento registrado",
            !!t,
          );
        },
        {
          compact: true,
          focusSelector:
            t || (from && to) ? '[name="amount"]' : '[name="from"]',
        },
      );
      const fromSelect = $('#dialog [name="from"]'),
        toSelect = $('#dialog [name="to"]');
      const update = (value) => {
        toSelect.innerHTML = options(
          [...state.accounts, ...state.categories].filter(
            (e) =>
              (!e.archived_at || e.id === t?.to_id) &&
              direction(state, fromSelect.value, e.id),
          ),
          value,
          "Elige destino",
        );
      };
      update(t?.to_id || to);
      fromSelect.onchange = () => update(to);
    }
    function editEntity(key, id = null) {
      const e = id ? state[key].find((e) => e.id === id) : null;
      const title = {
        sources: "fuente",
        accounts: "cuenta",
        categories: "categoría",
        tags: "etiqueta",
      }[key];
      modal(
        (e ? "Editar " : "Crear ") + title,
        `
        ${key !== "tags" ? iconChooser(key, e) : ""}
        <label>Nombre<input name="name" required maxlength="80" value="${esc(e?.name || "")}"></label>
        ${key === "accounts" ? `<label>Saldo inicial · BOB<input name="opening" inputmode="decimal" required value="${e ? decimal(e.opening_balance_cents) : "0.00"}"></label><label>Fecha del saldo inicial<input type="date" name="openingDate" required value="${e?.opening_date || today()}"></label><label class="check"><input type="checkbox" name="exclude" ${e?.exclude_from_total ? "checked" : ""}>Excluir del saldo total</label>` : ""}
        ${key === "sources" ? `<label>Ingreso mensual previsto · BOB (opcional)<input name="expected" inputmode="decimal" value="${e?.expected_cents == null ? "" : decimal(e.expected_cents)}"></label>` : ""}
        ${key === "categories" ? `<label>Presupuesto · ${esc(monthLabel(month))}<input name="limit" inputmode="decimal" value="${e && budget(state, e.id, month).limit !== null ? decimal(budget(state, e.id, month).limit) : ""}" placeholder="Sin límite"></label>` : ""}
        ${e ? `<label class="check"><input type="checkbox" name="archived" ${e.archived_at ? "checked" : ""}>Archivar (conserva historial)</label>` : ""}${actions()}`,
        async (data) => {
          const next = copy(state),
            n = data.get("name").trim();
          assert(n, "Escribe un nombre.");
          assert(
            !next[key].some(
              (item) =>
                item.id !== id &&
                item.name.toLocaleLowerCase("es") === n.toLocaleLowerCase("es"),
            ),
            "Ya existe ese nombre.",
          );
          const item = {
            ...(e || {}),
            id: e?.id || uid(),
            name: n,
            archived_at: data.get("archived")
              ? e?.archived_at || new Date().toISOString()
              : null,
          };
          if (key !== "tags") {
            item.currency = "BOB";
            item.icon = data.get("icon");
          }
          if (key === "accounts") {
            item.opening_balance_cents = cents(data.get("opening"));
            item.opening_date = data.get("openingDate");
            item.exclude_from_total = !!data.get("exclude");
          }
          if (key === "sources") {
            item.expected_cents = data.get("expected")
              ? cents(data.get("expected"))
              : null;
            assert(
              item.expected_cents === null || item.expected_cents >= 0,
              "La meta no puede ser negativa.",
            );
          }
          if (e)
            next[key][next[key].findIndex((item) => item.id === id)] = item;
          else next[key].push(item);
          if (key === "categories") {
            const rawLimit = data.get("limit").trim();
            const limit = rawLimit ? cents(rawLimit) : null;
            assert(
              limit === null || limit >= 0,
              "El límite no puede ser negativo.",
            );
            const record = next.budgets.find(
              (b) => b.category_id === item.id && b.month === month,
            );
            if (record) record.limit_cents = limit;
            else if (limit !== null)
              next.budgets.push({
                id: uid(),
                category_id: item.id,
                month,
                limit_cents: limit,
              });
          }
          await commit(next, "Guardado");
        },
        { compact: true, focusSelector: '[name="name"]' },
      );
    }
    function editBudget(id) {
      const b = budget(state, id, month);
      modal(
        "Presupuesto · " + name(id),
        `<p>${esc(monthLabel(month))}. Este límite solo cambia este mes.</p><label>Límite · BOB<input name="limit" inputmode="decimal" value="${b.limit === null ? "" : decimal(b.limit)}" placeholder="Vacío = sin límite"></label><p class="muted">Cero es un límite válido. El restante no pasa al siguiente mes.</p>${actions()}`,
        async (data) => {
          const next = copy(state),
            n =
              data.get("limit").trim() === "" ? null : cents(data.get("limit"));
          assert(n === null || n >= 0, "El límite no puede ser negativo.");
          let record = next.budgets.find(
            (b) => b.category_id === id && b.month === month,
          );
          if (record) record.limit_cents = n;
          else
            next.budgets.push({
              id: uid(),
              category_id: id,
              month,
              limit_cents: n,
            });
          await commit(next, "Presupuesto guardado");
        },
      );
    }
    function stat(label, amount, cls = "") {
      return `<div class="stat ${cls}"><span>${label}</span><strong><small>Bs</small>${money(amount).slice(3)}</strong></div>`;
    }
    function monthNav(compact = false) {
      const picker = compact
        ? `<label class="month-picker"><span aria-hidden="true">${esc(new Intl.DateTimeFormat("es-BO", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(month + "-15T12:00:00Z")))}</span><input type="month" id="month" aria-label="Mes consultado" value="${month}" required></label>`
        : `<label><span class="sr-only">Mes consultado</span><input type="month" id="month" value="${month}" required></label>`;
      const arrow = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
      return `<div class="month-nav ${compact ? "compact-month" : ""}"><button data-action="prev" aria-label="Mes anterior">${arrow("m14 6-6 6 6 6")}</button>${picker}<button data-action="next" aria-label="Mes siguiente">${arrow("m10 6 6 6-6 6")}</button></div>`;
    }
    function iconSvg(iconKey) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ENTITY_ICONS[iconKey].path}</svg>`;
    }
    function rowIcon(key, item = {}) {
      return iconSvg(entityIconKey(item, key));
    }
    function iconChooser(key, item) {
      const selectedIcon = entityIconKey(item, key);
      return `<fieldset class="icon-field row-${TYPES.indexOf(key)}"><legend>Icono</legend><input type="hidden" name="icon" value="${selectedIcon}"><button type="button" class="icon-preview" data-action="toggle-icons" aria-expanded="false" aria-controls="icon-picker"><span class="entity-mark">${iconSvg(selectedIcon)}</span><span>Cambiar icono</span></button><div id="icon-picker" class="icon-picker" role="group" aria-label="Elegir icono" hidden>${Object.entries(
        ENTITY_ICONS,
      )
        .map(
          ([id, icon]) =>
            `<button type="button" data-action="select-icon" data-icon="${id}" aria-label="${icon.label}" aria-pressed="${id === selectedIcon}">${iconSvg(id)}</button>`,
        )
        .join("")}</div></fieldset>`;
    }
    function setEntityEditing(editing) {
      editingEntities = editing;
      $("#main").classList.toggle(
        "editing-entities",
        editing && view === "home",
      );
      if ($("#entity-edit-bar")) $("#entity-edit-bar").hidden = !editing;
    }
    function removeEntity(key, id) {
      const count = state.transactions.filter(
        (t) => t.from_id === id || t.to_id === id,
      ).length;
      modal(
        "Quitar " + name(id),
        `<fieldset class="remove-options"><legend>¿Qué quieres hacer?</legend><label class="check"><input type="radio" name="removal" value="archive" checked>Quitar de Inicio y conservar historial</label><p class="muted">Conserva movimientos y saldos. Puedes restaurarla en Importar/Exportar.</p><label class="check"><input type="radio" name="removal" value="erase">Eliminar completamente</label></fieldset><div id="erase-warning" hidden><p>Se eliminará la entidad, sus ${count} movimientos de todos los meses y sus presupuestos. Esto puede cambiar los saldos de las cuentas relacionadas.</p><label class="check"><input type="checkbox" name="confirmErase" disabled>Confirmo que quiero eliminar la entidad y su historial.</label></div>${actions("Quitar de Inicio")}`,
        async (data) => {
          if (data.get("removal") === "erase") {
            assert(data.get("confirmErase"), "Confirma la eliminación del historial.");
            await commit(eraseEntity(state, key, id), "Entidad e historial eliminados", true);
            filters.entities = filters.entities.filter((entityId) => entityId !== id);
          } else {
            const next = copy(state);
            next[key].find((e) => e.id === id).archived_at =
              new Date().toISOString();
            await commit(next, "Entidad quitada de Inicio", true);
          }
        },
        { compact: true, focusSelector: 'button[data-action="close"]' },
      );
      document.querySelectorAll('[name="removal"]').forEach((radio) => {
        radio.onchange = () => {
          const erase = $('#dialog [name="removal"]:checked').value === "erase";
          $("#erase-warning").hidden = !erase;
          const confirmation = $('#dialog [name="confirmErase"]');
          confirmation.disabled = !erase;
          confirmation.required = erase;
          $('#modal-form button[type="submit"]').textContent =
            erase ? "Eliminar completamente" : "Quitar de Inicio";
        };
      });
    }
    function homeTotals() {
      const r = report(state, month),
        bs = balances(state);
      const balance = sum(
        state.accounts
          .filter((a) => !a.exclude_from_total)
          .map((a) => bs[a.id]),
      );
      const monthlyBudget = sum(
        state.budgets
          .filter((b) => b.month === month && b.limit_cents !== null)
          .map((b) => b.limit_cents),
      );
      return `<section class="home-totals stats" aria-label="Totales de ${esc(monthLabel(month))}">${stat("Balance actual", balance)}${stat("Gastos efectuados", r.expense)}${stat("Gastos planeados", monthlyBudget)}</section>`;
    }
    function home() {
      const bs = balances(state);
      return `<h1 class="sr-only">Un mes más claro.</h1><div class="home-toolbar"><button data-action="movement">+ Movimiento</button>${monthNav(true)}</div>
        <div id="entity-edit-bar" ${editingEntities ? "" : "hidden"}><span>Editar entidades</span><button data-action="finish-editing">Listo</button></div>
        ${TYPES.map((key, idx) => {
          const carousel = key !== "categories";
          const createLabel = `Crear ${key === "sources" ? "fuente" : key === "accounts" ? "cuenta" : "categoría"}`;
          return `<section class="entity-section row-${idx}" aria-label="${{ sources: "Fuentes de ingreso", accounts: "Cuentas", categories: "Categorías de gasto" }[key]}"><div class="entity-grid">${carousel ? '<div class="entity-strip" tabindex="0" role="group" aria-label="Entidades: desliza horizontalmente para ver más" aria-description="Arrastra desde el círculo. Desliza sobre nombres, importes o espacios para ver más entidades.">' : ""}${active(
            key,
          )
            .map((e) => {
              const value =
                key === "accounts"
                  ? bs[e.id]
                  : key === "sources"
                    ? sum(
                        posted(state)
                          .filter(
                            (t) =>
                              t.kind === "income" &&
                              t.from_id === e.id &&
                              t.occurred_on.startsWith(month),
                          )
                          .map((t) => t.amount_cents),
                      )
                    : budget(state, e.id, month).spent;
              const b =
                key === "categories" ? budget(state, e.id, month) : null;
              const progress = b ? budgetVisual(b.limit, b.spent) : null;
              const plannedLabel = b && b.limit !== null
                ? `Gastos planeados: ${money(b.limit)}` : "";
              const progressLabel = progress
                ? b.limit === null
                  ? "Sin presupuesto este mes"
                  : progress.tone === "red"
                    ? "Presupuesto excedido"
                    : `${progress.fill}% del presupuesto utilizado`
                : "";
              return `<div class="entity-wrap"><button class="entity-card" data-entity="${esc(e.id)}" data-key="${key}" aria-label="Ver historial de ${esc(e.name)}"${progress ? ` aria-description="${plannedLabel ? plannedLabel + ". " : ""}${progressLabel}"` : ""}><span class="entity-name" title="${esc(e.name)}">${esc(e.name)}</span><span class="entity-mark${progress ? ` budget-mark budget-${progress.tone}` : ""}"${progress ? ` style="--budget-fill:${progress.fill}%" title="${progressLabel}"` : ""}>${rowIcon(key, e)}</span><strong${progress ? ` class="budget-amount budget-${progress.tone}"` : ""} title="${money(value)}">${money(value)}</strong>${plannedLabel ? `<small class="entity-planned" title="${plannedLabel}">${money(b.limit).slice(3)}</small>` : ""}${e.exclude_from_total ? '<span class="sr-only">Excluida del balance</span>' : ""}</button><div class="entity-tools"><button class="entity-remove" data-action="remove-entity" data-key="${key}" data-id="${esc(e.id)}" aria-label="Eliminar ${esc(e.name)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg></button><button class="entity-pencil" data-action="edit-entity" data-key="${key}" data-id="${esc(e.id)}" aria-label="Editar ${esc(e.name)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4"/></svg></button></div></div>`;
            })
            .join(
              "",
            )}<button class="entity-add" data-action="add" data-key="${key}" aria-label="${createLabel}" title="${createLabel}"><span class="entity-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span></button>${carousel ? "</div>" : ""}</div></section>`;
        }).join(
          "",
        )}`;
    }
    function filterPanel() {
      return `<details class="panel filters" open><summary>Filtros compartidos con reportes</summary><div class="form-grid">
        <label>Desde<input id="f-start" type="date" value="${esc(filters.start)}"></label><label>Hasta<input id="f-end" type="date" value="${esc(filters.end)}"></label>
        <label>Cuentas, fuentes o categorías<select multiple id="f-entities">${allEntities()
          .map(
            (e) =>
              `<option value="${esc(e.id)}" ${filters.entities.includes(e.id) ? "selected" : ""}>${esc(e.name)}</option>`,
          )
          .join("")}</select></label>
        <label>Etiquetas<select multiple id="f-tags">${state.tags.map((e) => `<option value="${esc(e.id)}" ${filters.tags.includes(e.id) ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>
        <label>Coincidencia de etiquetas<select id="f-tagMode"><option value="any" ${filters.tagMode === "any" ? "selected" : ""}>Cualquiera</option><option value="all" ${filters.tagMode === "all" ? "selected" : ""}>Todas</option></select></label>
        <label>Tipo<select id="f-kind"><option value="">Todos</option>${Object.entries(
          labels,
        )
          .map(
            ([k, v]) =>
              `<option value="${k}" ${filters.kind === k ? "selected" : ""}>${v}</option>`,
          )
          .join("")}</select></label>
        <label class="wide">Buscar en nota<input id="f-text" type="search" value="${esc(filters.text)}" placeholder="Ej. almuerzo"></label></div><div class="inline-actions"><button data-action="apply-filters" class="primary">Aplicar filtros</button><button data-action="clear-filters">Ver todo</button></div></details>`;
    }
    function transactionRow(t, contextId = null) {
      const sign = !contextId
        ? ""
        : t.kind === "expense"
          ? "−"
          : t.kind === "income" || t.to_id === contextId
            ? "+"
            : "−";
      const row = `<article class="transaction"><div class="transaction-symbol ${t.kind}">${{ income: "↙", expense: "↗", transfer: "⇄" }[t.kind]}</div><div class="transaction-info"><strong>${esc(name(t.from_id))} → ${esc(name(t.to_id))}</strong><span>${esc(t.occurred_on)} · ${labels[t.kind]}</span>${t.note ? `<p>${esc(t.note)}</p>` : ""}<div class="tags">${t.tag_ids.map((id) => `<span>${esc(state.tags.find((e) => e.id === id)?.name)}</span>`).join("")}</div></div><div class="transaction-end"><strong>${sign}${money(t.amount_cents)}</strong><div><button data-action="edit-transaction" data-id="${esc(t.id)}">Editar</button><button data-action="delete-transaction" data-id="${esc(t.id)}" aria-label="Borrar movimiento ${esc(t.occurred_on)} ${money(t.amount_cents)}">Borrar</button></div></div></article>`;
      return contextId
        ? `<div class="transaction-swipe" data-swipe-transaction="${esc(t.id)}"><button class="transaction-swipe-delete" data-action="swipe-delete-transaction" data-id="${esc(t.id)}" tabindex="-1" aria-hidden="true" aria-label="Borrar movimiento ${esc(t.occurred_on)} ${money(t.amount_cents)}">Borrar</button>${row}</div>`
        : row;
    }
    function entityChart(id, type) {
      const series = entityEvolution(state, id, month);
      const low = Math.min(0, ...series.map((p) => p.value));
      const high = Math.max(0, ...series.map((p) => p.value));
      const range = high - low || 1;
      const x = (i) => 90 + i * 45;
      const y = (value) => 150 - ((value - low) / range) * 130;
      const points = series.map((p, i) => `${x(i)},${y(p.value)}`).join(" L ");
      const caption =
        type === "accounts"
          ? "Saldo al cierre de cada mes"
          : type === "sources"
            ? "Ingresos por mes"
            : "Gastos por mes";
      const ticks = [...new Set([high, Math.round((high + low) / 2), low])];
      const axisNumber = new Intl.NumberFormat("es-BO", {
        notation: "compact",
        maximumFractionDigits: 1,
      });
      return `<section class="entity-chart" aria-labelledby="chart-heading"><div class="chart-heading"><h2 id="chart-heading">${caption}</h2><span>12 meses · BOB</span></div><svg viewBox="0 0 610 190" role="img" aria-labelledby="chart-title chart-description"><title id="chart-title">${caption} · ${esc(name(id))}</title><desc id="chart-description">${series.map((p) => `${p.month}: ${money(p.value)}`).join("; ")}. Datos disponibles en la tabla siguiente.</desc>${ticks.map((v) => `<line x1="90" x2="585" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/><text x="80" y="${y(v) + 4}" text-anchor="end">${axisNumber.format(v / 100)}</text>`).join("")}<path class="chart-area" d="M ${x(0)},${y(0)} L ${points} L ${x(11)},${y(0)} Z"/><path class="chart-line" d="M ${points}"/><circle cx="${x(11)}" cy="${y(series[11].value)}" r="4" class="chart-dot"/>${[0, 3, 6, 9, 11].map((i) => `<text x="${x(i)}" y="178" text-anchor="middle">${series[i].month.slice(5)}/${series[i].month.slice(2, 4)}</text>`).join("")}</svg><details class="chart-data"><summary>Ver datos del gráfico</summary><table><thead><tr><th>Mes</th><th>${type === "accounts" ? "Saldo" : "Importe"} · BOB</th></tr></thead><tbody>${series.map((p) => `<tr><td>${p.month}</td><td>${money(p.value)}</td></tr>`).join("")}</tbody></table></details></section>`;
    }
    function detailHeader() {
      const type = TYPES.find((key) => state[key].some((e) => e.id === detailId));
      const item = entity(detailId);
      if (!type || !item) return "";
      return `<div class="detail-toolbar"><button data-action="back-home" aria-label="Volver a Inicio"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg></button><div><span class="detail-kind">${{ sources: "Fuente de ingreso", accounts: "Cuenta", categories: "Categoría de gasto" }[type]}</span><h1 title="${esc(item.name)}">${esc(item.name)}</h1></div><button data-action="edit-entity" data-key="${type}" data-id="${esc(detailId)}">Editar</button></div>`;
    }
    function detail() {
      const type = TYPES.find((key) =>
        state[key].some((e) => e.id === detailId),
      );
      if (!type)
        return '<p class="empty">Esta entidad ya no está disponible.</p><button data-view="home">Volver a Inicio</button>';
      const all = filterTransactions(state, { entities: [detailId] }).sort(
        (a, b) =>
          b.occurred_on.localeCompare(a.occurred_on) ||
          b.created_at.localeCompare(a.created_at),
      );
      const ts = all.filter(
        (t) => detailScope === "all" || t.occurred_on.startsWith(month),
      );
      const monthly = all.filter((t) => t.occurred_on.startsWith(month));
      const incoming = sum(
        monthly
          .filter((t) => t.to_id === detailId || t.kind === "income")
          .map((t) => t.amount_cents),
      );
      const outgoing = sum(
        monthly
          .filter((t) => t.from_id === detailId || t.kind === "expense")
          .map((t) => t.amount_cents),
      );
      const groups = new Map();
      for (const t of ts.slice(0, historyLimit)) {
        if (!groups.has(t.occurred_on)) groups.set(t.occurred_on, []);
        groups.get(t.occurred_on).push(t);
      }
      const summary =
        type === "accounts"
          ? stat("Saldo actual", balances(state)[detailId]) +
            stat("Entradas del mes", incoming) +
            stat("Salidas del mes", outgoing)
          : type === "sources"
            ? stat("Ingresos del mes", incoming)
            : stat("Gastos del mes", outgoing) +
              (budget(state, detailId, month).limit !== null
                ? stat(
                    "Presupuesto del mes",
                    budget(state, detailId, month).limit,
                  )
                : "");
      return `<div class="entity-detail row-${TYPES.indexOf(type)}"><div class="detail-period"><button data-action="entity-movement">+ Movimiento</button>${monthNav(true)}</div><div class="detail-totals stats">${summary}</div>${entityChart(detailId, type)}<section class="entity-history" aria-labelledby="entity-history-heading"><div class="chart-heading"><h2 id="entity-history-heading">Historial</h2><span>${ts.length} movimientos</span></div><div class="history-scope" role="group" aria-label="Período del historial"><button data-action="detail-scope" data-scope="month" aria-pressed="${detailScope === "month"}">Este mes</button><button data-action="detail-scope" data-scope="all" aria-pressed="${detailScope === "all"}">Todo el historial</button></div>${[...groups].map(([date, transactions]) => `<section class="history-day"><h3>${esc(new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z")))}</h3><div class="transaction-list">${transactions.map((t) => transactionRow(t, detailId)).join("")}</div></section>`).join("") || '<p class="empty">No hay movimientos en este período.</p>'}${ts.length > historyLimit ? '<button data-action="more">Mostrar 100 más</button>' : ""}</section></div>`;
    }
    function history() {
      const ts = filterTransactions(state, filters).sort(
        (a, b) =>
          b.occurred_on.localeCompare(a.occurred_on) ||
          b.created_at.localeCompare(a.created_at),
      );
      const income = sum(
          ts.filter((t) => t.kind === "income").map((t) => t.amount_cents),
        ),
        expense = sum(
          ts.filter((t) => t.kind === "expense").map((t) => t.amount_cents),
        );
      return `<div class="page-heading"><div class="eyebrow">CADA MOVIMIENTO CUENTA</div><h1>Historial</h1><p>Consulta, edita o borra movimientos individuales.</p></div>${filterPanel()}<div class="stats">${stat("Ingresos filtrados", income, "positive")}${stat("Gastos filtrados", expense)}${stat("Neto filtrado", sum([income, -expense]))}</div><section class="panel"><div class="section-heading"><h2>${ts.length} movimientos</h2><button data-action="movement">+ Nuevo</button></div><div class="transaction-list">${
        ts
          .slice(0, historyLimit)
          .map((t) => transactionRow(t))
          .join("") ||
        '<p class="empty">No hay movimientos con estos filtros.</p>'
      }</div>${ts.length > historyLimit ? '<button data-action="more" class="load-more">Mostrar 100 más</button>' : ""}</section>`;
    }
    function budgets() {
      return `<div class="page-heading"><div class="eyebrow">ESPACIO PARA TUS PLANES</div><h1>Límites de categoría</h1><p>Un límite para cada categoría, un comienzo en cada mes.</p>${monthNav()}</div><section class="budget-grid">${
        state.categories
          .filter(
            (c) =>
              !c.archived_at ||
              budget(state, c.id, month).spent ||
              state.budgets.some(
                (b) => b.category_id === c.id && b.month === month,
              ),
          )
          .map((c) => {
            const b = budget(state, c.id, month);
            return `<article class="panel budget-card"><h2>${esc(c.name)}</h2><div class="budget-spent">${money(b.spent)}<span>gastado</span></div><progress max="${Math.max(b.limit || 0, b.spent, 1)}" value="${b.spent}" aria-label="Gastado ${money(b.spent)}"></progress><dl><div><dt>Límite</dt><dd>${b.limit === null ? "Sin límite" : money(b.limit)}</dd></div><div><dt>${b.remaining !== null && b.remaining < 0 ? "Exceso" : "Restante"}</dt><dd>${b.remaining === null ? "—" : money(Math.abs(b.remaining))}</dd></div></dl><button data-action="budget" data-id="${esc(c.id)}">Editar límite de este mes</button></article>`;
          })
          .join("") ||
        '<p class="empty">Crea una categoría en Inicio para asignarle un presupuesto.</p>'
      }</section><p class="footnote">Cada mes guarda su propio límite. Sin límite y límite cero son distintos. No se arrastra el restante.</p><button data-action="copy-budgets">Copiar límites del mes anterior a los que faltan</button>`;
    }
    function reports() {
      const r = report(state, month, filters),
        series = evolution(state, month, filters),
        max = Math.max(1, ...series.flatMap((m) => [m.income, m.expense]));
      return `<div class="page-heading"><div class="eyebrow">MIRA EL PANORAMA</div><h1>Gráficos</h1><p>Totales por categoría y evolución mensual de ingresos y gastos.</p>${monthNav()}</div>${filterPanel()}<p class="footnote">BOB · ${esc(monthLabel(month))} · Se aplican todos los filtros de arriba, también a la evolución. «Ver todo» quita el rango de fechas.</p><div class="stats">${stat("Ingresos", r.income, "positive")}${stat("Gastos", r.expense)}${stat("Neto", r.net)}</div>
      <section class="panel"><h2>¿Dónde se fue?</h2><p class="muted">Gastos por categoría</p><div role="img" aria-label="Distribución de gastos; datos en la tabla siguiente" class="distribution">${
        r.categories
          .filter((c) => c.spent)
          .map(
            (c) =>
              `<div><span>${esc(c.name)}</span><div class="bar-track"><i style="width:${r.expense ? (c.spent / r.expense) * 100 : 0}%"></i></div><strong>${r.expense ? ((c.spent / r.expense) * 100).toFixed(1) : "0"}%</strong></div>`,
          )
          .join("") ||
        '<p class="empty">Todavía no hay gastos en este período.</p>'
      }</div><div class="table-scroll"><table><thead><tr><th>Categoría</th><th>Gasto · BOB</th><th>Participación</th></tr></thead><tbody>${r.categories.map((c) => `<tr><td>${esc(c.name)}</td><td>${money(c.spent)}</td><td>${r.expense ? ((c.spent / r.expense) * 100).toFixed(1) : "0"}%</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><h2>Doce meses de perspectiva</h2><p class="legend"><span class="income-key">Ingresos</span><span class="expense-key">Gastos</span></p><div class="timeline" role="img" aria-label="Evolución mensual de ingresos y gastos; datos en la tabla siguiente">${series.map((m) => `<div class="timeline-month"><div class="columns"><i class="income-bar" style="height:${(m.income / max) * 100}%"></i><i class="expense-bar" style="height:${(m.expense / max) * 100}%"></i></div><span>${m.month.slice(5)}</span></div>`).join("")}</div><div class="table-scroll"><table><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Neto</th></tr></thead><tbody>${series.map((m) => `<tr><td>${m.month}</td><td>${money(m.income)}</td><td>${money(m.expense)}</td><td>${money(m.net)}</td></tr>`).join("")}</tbody></table></div></section><p class="footnote">Cada movimiento cuenta una vez, aunque tenga varias etiquetas. Transferencias excluidas.</p>`;
    }
    function settings() {
      return `<div class="page-heading"><div class="eyebrow">TU ARCHIVO PERSONAL</div><h1>Importar/Exportar</h1><p>Todo queda en este dispositivo. Tu respaldo viaja contigo.</p></div>
      <section class="panel"><h2>Respaldo completo</h2><p>Descarga un JSON con movimientos, saldos iniciales, límites por mes, etiquetas y revisión pendiente.</p><button class="primary" data-action="export">Descargar respaldo JSON</button><label class="file-label">Restaurar respaldo JSON<input type="file" id="json-file" accept=".json,application/json"></label></section>
      <section class="panel"><h2>Sincronización</h2><p>Respaldo automático en tu repositorio privado de GitHub. Solo se envían datos; no se restaura desde GitHub.</p>
      <form id="sync-form"><label>Repo<input id="sync-repo" value="${esc(syncConfig.repo)}" required autocapitalize="none" spellcheck="false"></label>
      <label>Branch<input id="sync-branch" value="${esc(syncConfig.branch)}" required autocapitalize="none" spellcheck="false"></label>
      <label>Path<input id="sync-path" value="${esc(syncConfig.path)}" required autocapitalize="none" spellcheck="false"></label>
      <label>Token<input id="sync-token" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${esc(syncConfig.token ? "••••" + syncConfig.token.slice(-4) : "")}"></label>
      <p class="muted">Usa un token con permiso de escritura de Contents en el repositorio elegido. «Sincronizar ahora» guarda la configuración en este dispositivo.</p>
      <button class="primary" type="submit">Sincronizar ahora</button> <button type="button" data-action="sync-disable">Desactivar</button></form>
      <p id="sync-status" role="status" aria-live="polite">${esc(syncStatus())}</p></section>
      <section class="panel"><h2>Trae tu historial desde otra app</h2><p>CSV con transacciones y las cuatro secciones. Solo BOB. Verás el resultado antes de reemplazar tus datos.</p><label>Mes del presupuesto del archivo<input id="import-month" type="month" value="${month}" required></label><label class="file-label">Elegir CSV<input id="csv-file" type="file" accept=".csv,text/csv"></label><p class="muted">Los acumulados «Received to date» se conservan como referencia; no se crean movimientos por ellos.</p></section>
      <section class="panel"><h2>Revisión de importación · ${state.review.length}</h2><p>Estas filas no son movimientos y no entran en reportes. El saldo inicial se reconcilia con los movimientos aceptados. Revisa el saldo inicial si agregas una fila manualmente.</p>${
        state.review
          .slice(0, historyLimit)
          .map(
            (r) =>
              `<article class="review-row"><strong>Registro ${r.record}: ${esc(r.reason)}</strong><p>${esc(r.raw.join(" · "))}</p><button data-action="resolve-review" data-id="${esc(r.id)}">Crear movimiento corregido</button></article>`,
          )
          .join("") || '<p class="muted">Sin filas pendientes.</p>'
      }${state.review.length > historyLimit ? '<button data-action="more">Mostrar 100 más</button>' : ""}</section>
      <section class="panel"><h2>Tu calendario</h2><label>Zona horaria<input id="timezone" value="${esc(state.profile.timezone)}" placeholder="America/La_Paz"></label><button data-action="timezone">Guardar zona horaria</button><p class="muted">Moneda base: BOB. Las fechas contables no cambian al cambiar de zona horaria.</p></section>
      <section class="panel"><h2>Organizar entidades</h2>${[...TYPES, "tags"].map((key) => `<details><summary>${{ sources: "Fuentes", accounts: "Cuentas", categories: "Categorías", tags: "Etiquetas" }[key]} (${state[key].length})</summary><button data-action="add" data-key="${key}">+ Crear</button>${state[key].map((e) => `<div class="manage-row"><span>${esc(e.name)}${e.archived_at ? " · archivado" : ""}</span><button data-action="edit-entity" data-key="${key}" data-id="${esc(e.id)}">Editar</button></div>`).join("")}</details>`).join("")}</section>
      <section class="panel"><h2>En tu iPhone</h2><p>En Safari, abre Compartir y elige «Agregar a inicio». Después de la primera carga podrás usar gástalo sin conexión.</p><p class="muted">Borrar los datos de Safari o perder el dispositivo puede borrar el historial. Conserva un respaldo JSON o activa la sincronización.</p><p id="storage-state" class="muted"></p><button data-action="persist">Solicitar almacenamiento persistente</button></section>`;
    }
    function render() {
      resetTransactionSwipe();
      $("#header-totals").innerHTML = view === "home" ? homeTotals()
        : view === "detail" ? detailHeader() : "";
      $("#main").classList.toggle(
        "editing-entities",
        editingEntities && view === "home",
      );
      $("#main").innerHTML = {
        home,
        detail,
        history,
        budgets,
        reports,
        settings,
      }[view]();
      document.querySelectorAll("nav button").forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.view === (view === "detail" ? "home" : view),
        );
        button.setAttribute(
          "aria-current",
          button.dataset.view === (view === "detail" ? "home" : view)
            ? "page"
            : "false",
        );
      });
      $("#undo-button").hidden = !undo;
    }
    async function previewImport(next, source) {
      pendingImport = next;
      modal(
        "Revisar importación",
        `<p>${esc(source)}</p><dl class="import-summary"><div><dt>Movimientos aceptados</dt><dd>${next.transactions.length}</dd></div><div><dt>Filas pendientes</dt><dd>${next.review.length}</dd></div><div><dt>Cuentas</dt><dd>${next.accounts.length}</dd></div><div><dt>Categorías</dt><dd>${next.categories.length}</dd></div></dl><p>Se reemplazarán los datos actuales (${state.transactions.length} movimientos). Puedes descargar un respaldo antes de continuar.</p><button type="button" data-action="export">Descargar respaldo actual</button><label class="check"><input name="confirm" type="checkbox" required>Entiendo que se reemplazarán los datos de este dispositivo.</label>${actions("Importar y reemplazar")}`,
        async () => {
          await commit(pendingImport, "Importación guardada");
          pendingImport = null;
        },
      );
    }
    function download() {
      const url = URL.createObjectURL(
        new Blob([backup(state)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `gastalo-${today()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    async function deleteTransaction(id) {
      const next = copy(state),
        t = next.transactions.find((t) => t.id === id);
      if (!t || t.status === "deleted") return;
      t.status = "deleted";
      t.deleted_at = t.updated_at = new Date().toISOString();
      await commit(next, "Movimiento borrado", true);
    }
    async function handleAction(button) {
      const action = button.dataset.action,
        id = button.dataset.id;
      if (button.dataset.view) {
        view = button.dataset.view;
        editingEntities = false;
        $("#app-menu").open = false;
        historyLimit = 100;
        render();
        window.scrollTo(0, 0);
        $("#main").focus();
        return;
      }
      if (action === "finish-editing") return setEntityEditing(false);
      if (action === "remove-entity")
        return removeEntity(button.dataset.key, id);
      if (action === "toggle-icons") {
        const picker = $("#icon-picker");
        picker.hidden = !picker.hidden;
        button.setAttribute("aria-expanded", String(!picker.hidden));
        return;
      }
      if (action === "select-icon") {
        $('#dialog [name="icon"]').value = button.dataset.icon;
        $(".icon-preview .entity-mark").innerHTML = iconSvg(
          button.dataset.icon,
        );
        document
          .querySelectorAll("[data-action=select-icon]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        $("#icon-picker").hidden = true;
        $(".icon-preview").setAttribute("aria-expanded", "false");
        $(".icon-preview").focus();
        return;
      }
      if (action === "close") return $("#dialog").close();
      if (action === "dismiss") return dismissNotification();
      if (action === "undo") {
        if (undo) await commit(copy(undo), "Cambio deshecho");
        return;
      }
      if (action === "back-home") {
        view = "home";
        render();
        window.scrollTo(0, homeScroll);
        [...document.querySelectorAll("[data-entity]")]
          .find((card) => card.dataset.entity === detailId)
          ?.focus({ preventScroll: true });
        return;
      }
      if (action === "detail-scope") {
        detailScope = button.dataset.scope;
        historyLimit = 100;
        return render();
      }
      if (action === "entity-movement") {
        return movement(
          state.categories.some((c) => c.id === detailId) ? "" : detailId,
          state.categories.some((c) => c.id === detailId) ? detailId : "",
        );
      }
      if (action === "movement") return movement();
      if (action === "add") return editEntity(button.dataset.key);
      if (action === "edit-entity") return editEntity(button.dataset.key, id);
      if (action === "edit-transaction")
        return movement(
          "",
          "",
          state.transactions.find((t) => t.id === id),
        );
      if (action === "budget") return editBudget(id);
      if (action === "delete-transaction" || action === "swipe-delete-transaction")
        return deleteTransaction(id);
      if (action === "prev" || action === "next") {
        month = shiftMonth(month, action === "prev" ? -1 : 1);
        detailScope = "month";
        historyLimit = 100;
        return render();
      }
      if (action === "more") {
        historyLimit += 100;
        return render();
      }
      if (action === "clear-filters") {
        filters = {
          start: "",
          end: "",
          kind: "",
          entities: [],
          tags: [],
          tagMode: "any",
          text: "",
        };
        historyLimit = 100;
        return render();
      }
      if (action === "apply-filters") {
        const next = Object.fromEntries(
          ["start", "end", "kind", "tagMode", "text"].map((key) => [
            key,
            $("#f-" + key).value,
          ]),
        );
        assert(
          !next.start || !next.end || next.start <= next.end,
          "La fecha inicial debe ser anterior a la final.",
        );
        for (const key of ["entities", "tags"])
          next[key] = [...$("#f-" + key).selectedOptions].map((o) => o.value);
        filters = next;
        historyLimit = 100;
        return render();
      }
      if (action === "copy-budgets") {
        const next = copy(state);
        let added = 0;
        for (const b of state.budgets.filter(
          (b) => b.month === shiftMonth(month, -1),
        ))
          if (
            !next.budgets.some(
              (item) =>
                item.month === month && item.category_id === b.category_id,
            )
          ) {
            next.budgets.push({ ...b, id: uid(), month });
            added++;
          }
        return commit(
          next,
          `${added} límites copiados. Sin arrastre de restante.`,
        );
      }
      if (action === "export") return download();
      if (action === "sync-disable") return saveSyncSettings(true);
      if (action === "resolve-review") return movement("", "", null, id);
      if (action === "timezone") {
        const next = copy(state);
        next.profile.timezone = $("#timezone").value.trim();
        return commit(next, "Zona horaria guardada");
      }
      if (action === "persist") {
        const granted = await navigator.storage?.persist?.();
        $("#storage-state").textContent = granted
          ? "Almacenamiento persistente concedido."
          : "El navegador decide la disponibilidad. Mantén un respaldo JSON.";
      }
    }
    document.addEventListener("submit", (e) => {
      if (e.target.id !== "sync-form") return;
      e.preventDefault();
      void saveSyncSettings();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void runSync();
    });
    document.addEventListener("click", (e) => {
      if (!$("#app-menu").contains(e.target)) $("#app-menu").open = false;
      if (e.target.matches(".month-picker input")) {
        try {
          e.target.showPicker?.();
        } catch {
          // Native input interaction remains available on browsers without showPicker.
        }
      }
      const button = e.target.closest("[data-action], [data-view]");
      if (button) handleAction(button).catch((error) => notify(error.message));
      const card = e.target.closest("[data-entity]");
      if (card && !suppressClick && !editingEntities)
        openEntity(card.dataset.entity);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#dialog").open) {
        if ($("#app-menu").open) {
          $("#app-menu").open = false;
          $("#app-menu summary").focus();
        } else if (editingEntities) setEntityEditing(false);
      }
    });
    function openEntity(id) {
      homeScroll = window.scrollY;
      detailId = id;
      detailScope = "month";
      historyLimit = 100;
      view = "detail";
      render();
      window.scrollTo(0, 0);
      $("#main").focus();
    }
    let pointer = null,
      settling = false,
      suppressClick = false,
      clickTimer;
    const vibrate = () => {
      try {
        navigator.vibrate?.(15);
      } catch {
        /* Optional on Safari and PWAs. */
      }
    };
    let transactionSwipe = null,
      openTransactionRow = null,
      swipeClickSuppressed = false;
    function showTransactionSwipe(row, offset) {
      row.style.setProperty("--swipe-offset", `${offset}px`);
      row.classList.toggle("is-revealed", offset < 0);
      const button = row.querySelector(".transaction-swipe-delete");
      button.tabIndex = offset < 0 ? 0 : -1;
      button.setAttribute("aria-hidden", String(offset >= 0));
    }
    function closeTransactionRow() {
      if (openTransactionRow) showTransactionSwipe(openTransactionRow, 0);
      openTransactionRow = null;
    }
    function resetTransactionSwipe() {
      const p = transactionSwipe;
      transactionSwipe = null;
      if (p) {
        cancelAnimationFrame(p.frame);
        p.row.classList.remove("is-swiping");
        if (p.front.hasPointerCapture(p.id)) p.front.releasePointerCapture(p.id);
        showTransactionSwipe(p.row, 0);
      }
      closeTransactionRow();
    }
    document.addEventListener("pointerdown", (e) => {
      if (!e.isPrimary || e.button !== 0 || transactionSwipe) return;
      const row = e.target.closest("[data-swipe-transaction]");
      if (openTransactionRow && openTransactionRow !== row) closeTransactionRow();
      if (!row || e.target.closest(".transaction-swipe-delete, a, input, select, textarea")) return;
      transactionSwipe = {
        id: e.pointerId, row, front: row.querySelector(".transaction"),
        startX: e.clientX, startY: e.clientY,
        startOffset: row === openTransactionRow ? -84 : 0,
        offset: row === openTransactionRow ? -84 : 0,
        width: row.getBoundingClientRect().width, dragging: false,
      };
    });
    document.addEventListener("pointermove", (e) => {
      const p = transactionSwipe;
      if (!p || e.pointerId !== p.id) return;
      const dx = e.clientX - p.startX, dy = e.clientY - p.startY;
      if (!p.dragging) {
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
          transactionSwipe = null;
          return;
        }
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
        p.dragging = true;
        p.row.classList.add("is-swiping");
        p.front.setPointerCapture(p.id);
      }
      e.preventDefault();
      p.offset = Math.max(-p.width, Math.min(0, p.startOffset + dx));
      if (!p.frame) p.frame = requestAnimationFrame(() => {
        p.frame = null;
        showTransactionSwipe(p.row, p.offset);
      });
    }, { passive: false });
    function endTransactionSwipe(e) {
      const p = transactionSwipe;
      if (!p || (e.pointerId !== undefined && e.pointerId !== p.id)) return;
      if (e.type === "lostpointercapture" && p.front.hasPointerCapture(p.id)) return;
      transactionSwipe = null;
      cancelAnimationFrame(p.frame);
      p.row.classList.remove("is-swiping");
      if (p.front.hasPointerCapture(p.id)) p.front.releasePointerCapture(p.id);
      if (!p.dragging) {
        if (p.startOffset < 0) closeTransactionRow();
        return;
      }
      swipeClickSuppressed = true;
      setTimeout(() => { swipeClickSuppressed = false; }, 0);
      const outcome = e.type === "pointerup"
        ? transactionSwipeOutcome(p.offset, p.width) : "closed";
      if (outcome === "delete") {
        showTransactionSwipe(p.row, -p.width);
        openTransactionRow = p.row;
        vibrate();
        deleteTransaction(p.row.dataset.swipeTransaction).catch((error) => {
          closeTransactionRow();
          notify(error.message);
        });
      } else {
        showTransactionSwipe(p.row, outcome === "revealed" ? -84 : 0);
        openTransactionRow = outcome === "revealed" ? p.row : null;
      }
    }
    document.addEventListener("pointerup", endTransactionSwipe);
    document.addEventListener("pointercancel", endTransactionSwipe);
    document.addEventListener("lostpointercapture", endTransactionSwipe);
    window.addEventListener("blur", resetTransactionSwipe);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") resetTransactionSwipe();
    });
    document.addEventListener("click", (e) => {
      if (swipeClickSuppressed && e.target.closest("[data-swipe-transaction]")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    const dropTarget = (p, x, y) => {
      const card = document.elementFromPoint(x, y)?.closest("[data-entity]");
      return card && direction(state, p.from, card.dataset.entity)
        ? card
        : null;
    };
    function paintPointer(p) {
      p.frame = null;
      // Viewport coordinates stay stable while the page is locked.
      p.clone.style.transform = `translate3d(${p.x - 24}px, ${p.y - 64}px, 0) scale(1.4)`;
      const target = dropTarget(p, p.x, p.y);
      if (target !== p.target) {
        p.target?.classList.remove("drop-target");
        target?.classList.add("drop-target");
        p.target = target;
      }
    }
    function startPointer(p) {
      if (pointer !== p || p.dragging) return;
      clearTimeout(p.timer);
      p.dragging = true;
      p.origin = p.card.querySelector(".entity-mark").getBoundingClientRect();
      p.clone = p.card.querySelector(".entity-mark").cloneNode(true);
      p.clone.classList.add("drag-clone");
      p.clone.setAttribute("aria-hidden", "true");
      p.clone.style.setProperty(
        "--row-color",
        getComputedStyle(p.card).getPropertyValue("--row-color"),
      );
      document.body.append(p.clone);
      p.card.classList.add("dragging");
      document.querySelectorAll("[data-entity]").forEach((card) => {
        card.classList.toggle(
          "valid-target",
          !!direction(state, p.from, card.dataset.entity),
        );
        card.classList.toggle(
          "invalid-target",
          card !== p.card && !direction(state, p.from, card.dataset.entity),
        );
      });
      p.scrollX = window.scrollX;
      p.scrollY = window.scrollY;
      // Fixed body also prevents rubber-band page scrolling in installed iOS PWAs.
      document.body.style.top = `-${p.scrollY}px`;
      document.body.style.left = `-${p.scrollX}px`;
      document.documentElement.classList.add("is-dragging");
      p.card.setPointerCapture(p.id);
      paintPointer(p);
      vibrate();
    }
    document.addEventListener("pointerdown", (e) => {
      if (pointer || settling || !e.isPrimary || e.button !== 0) return;
      const card = e.target.closest("[data-entity]");
      if (!card || (editingEntities && !card.closest(".entity-strip"))) return;
      const p = (pointer = {
        id: e.pointerId,
        from: card.dataset.entity,
        card,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        dragging: false,
        strip: card.closest(".entity-strip"),
        scrollStart: card.closest(".entity-strip")?.scrollLeft || 0,
        onCircle: !!e.target.closest(".entity-mark"),
        allowDrag: !editingEntities && card.dataset.key !== "categories",
        pageScrollStart: window.scrollY,
      });
      p.timer = editingEntities
        ? null
        : setTimeout(() => {
            if (pointer !== p) return;
            p.editing = true;
            suppressClick = true;
            p.card.setPointerCapture(p.id);
            setEntityEditing(true);
            vibrate();
          }, 450);
    });
    document.addEventListener(
      "pointermove",
      (e) => {
        const p = pointer;
        if (!p || e.pointerId !== p.id) return;
        p.x = e.clientX;
        p.y = e.clientY;
        if (p.editing) {
          e.preventDefault();
          return;
        }
        const dx = p.x - p.startX,
          dy = p.y - p.startY;
        if (!p.dragging && !p.scrolling && !p.verticalScrolling) {
          const intent = gestureIntent({
            dx,
            dy,
            onCircle: p.onCircle,
            canDrag: p.allowDrag,
            canPan: !!p.strip && p.strip.scrollWidth > p.strip.clientWidth,
          });
          if (intent === "scroll") {
            clearTimeout(p.timer);
            if (p.onCircle && p.card.dataset.key !== "categories") {
              // In edit mode, circles pan the page explicitly because their
              // touch-action is fixed at pointerdown. Text scrolls natively.
              p.verticalScrolling = true;
              p.card.setPointerCapture(p.id);
            } else {
              pointer = null;
              return;
            }
          } else if (intent === "pan") {
            clearTimeout(p.timer);
            p.scrolling = true;
            p.card.setPointerCapture(p.id);
          } else if (intent === "drag") startPointer(p);
        }
        if (p.verticalScrolling) {
          e.preventDefault();
          window.scrollTo(window.scrollX, p.pageScrollStart - dy);
          return;
        }
        if (p.scrolling) {
          e.preventDefault();
          p.strip.scrollLeft = p.scrollStart - dx;
          return;
        }
        if (p.dragging) {
          e.preventDefault();
          if (!p.frame) p.frame = requestAnimationFrame(() => paintPointer(p));
        }
      },
      { passive: false },
    );
    // Safari decides native scrolling at pointerdown, so source circles declare
    // touch-action:none in CSS before the gesture. Gaps and headings still scroll.
    document.addEventListener(
      "touchmove",
      (e) => {
        if (pointer?.dragging || pointer?.scrolling || transactionSwipe?.dragging)
          e.preventDefault();
      },
      { passive: false },
    );
    async function endPointer(e) {
      const p = pointer;
      if (!p || (e.pointerId !== undefined && e.pointerId !== p.id)) return;
      pointer = null;
      clearTimeout(p.timer);
      if (p.editing || p.scrolling || p.verticalScrolling) {
        suppressClick = true;
        if (p.card.hasPointerCapture(p.id)) p.card.releasePointerCapture(p.id);
        clickTimer = setTimeout(() => {
          suppressClick = false;
        }, 0);
        return;
      }
      if (!p.dragging) return;
      settling = true;
      suppressClick = true;
      clearTimeout(clickTimer);
      cancelAnimationFrame(p.frame);
      const target =
        e.type === "pointerup" ? dropTarget(p, e.clientX, e.clientY) : null;
      const rect =
        target?.querySelector(".entity-mark").getBoundingClientRect() ||
        p.origin;
      if (p.card.hasPointerCapture(p.id)) p.card.releasePointerCapture(p.id);
      p.target?.classList.remove("drop-target");
      if (target) vibrate();
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      try {
        const animation = p.clone.animate(
          [
            { transform: p.clone.style.transform },
            { transform: `translate3d(${rect.x}px, ${rect.y}px, 0) scale(1)` },
          ],
          {
            duration: reduced ? 0 : target ? 150 : 200,
            easing: "ease-out",
            fill: "forwards",
          },
        );
        await animation.finished;
      } finally {
        p.clone.remove();
        document
          .querySelectorAll(
            ".dragging, .valid-target, .invalid-target, .drop-target",
          )
          .forEach((card) =>
            card.classList.remove(
              "dragging",
              "valid-target",
              "invalid-target",
              "drop-target",
            ),
          );
        document.documentElement.classList.remove("is-dragging");
        document.body.style.top = "";
        document.body.style.left = "";
        window.scrollTo(p.scrollX, p.scrollY);
        settling = false;
        // A new tap must work immediately after settling; suppress only the drag click.
        clickTimer = setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      render();
      if (target) movement(p.from, target.dataset.entity);
    }
    document.addEventListener("pointerup", endPointer);
    document.addEventListener("pointercancel", endPointer);
    document.addEventListener("lostpointercapture", (e) => {
      // A touch starts on the inner SVG; transferring capture to its card is
      // expected. Cancel only when the card actually loses capture.
      if (pointer && !pointer.card.hasPointerCapture(e.pointerId))
        endPointer(e);
    });
    window.addEventListener("blur", endPointer);
    document.addEventListener("contextmenu", (e) => {
      if (e.target.closest("[data-entity]")) e.preventDefault();
    });
    document.addEventListener("change", async (e) => {
      try {
        if (e.target.id === "month" && monthOK(e.target.value)) {
          month = e.target.value;
          detailScope = "month";
          historyLimit = 100;
          render();
        }
        if (e.target.id === "csv-file" || e.target.id === "json-file") {
          const file = e.target.files[0];
          if (!file) return;
          assert(file.size <= 32 * 1024 * 1024, "El archivo supera 32 MB.");
          const text = await file.text();
          if (e.target.id === "json-file")
            await previewImport(restore(text), file.name);
          else {
            const digest = await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(text),
            );
            const hash = [...new Uint8Array(digest)]
              .map((v) => v.toString(16).padStart(2, "0"))
              .join("");
            await previewImport(
              importCSV(text, $("#import-month").value, hash),
              file.name,
            );
          }
          e.target.value = "";
        }
      } catch (error) {
        notify(error.message);
        e.target.value = "";
      }
    });
    window.addEventListener("online", () => {
      $("#offline").hidden = true;
    });
    window.addEventListener("offline", () => {
      $("#offline").hidden = false;
    });
    $("#offline").hidden = navigator.onLine;
    try {
      db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("gastalo", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("state");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.onblocked = () =>
          reject(
            new Error("Cierra otras pestañas para abrir la base de datos."),
          );
      });
      db.onversionchange = () => {
        db.close();
        notify("Recarga para actualizar la base de datos.");
      };
      await load();
      render();
      // Load sync settings after rendering; configuration/network failures stay local.
      void (async () => {
        try {
          const config = await new Promise((resolve, reject) => {
            const r = db.transaction("state").objectStore("state").get("sync_config");
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          });
          if (config) syncConfig = config;
          syncReady = true;
          if (view === "settings") render();
          void runSync();
        } catch {
          syncConfig.lastError = "No se pudo leer la configuración de sincronización";
          updateSyncStatus();
        }
      })();
    } catch (error) {
      $("#main").innerHTML =
        `<section class="panel"><h1>No se pudo abrir el historial</h1><p>${esc(error.message)}</p><p>Recarga la página. No borres los datos de Safari si necesitas recuperar tu historial.</p></section>`;
    }
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("./sw.js")
        .catch(() =>
          notify(
            "No se pudo preparar el modo sin conexión. Vuelve a abrir con conexión.",
          ),
        );
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
