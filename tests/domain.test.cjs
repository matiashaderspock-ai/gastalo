const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../app.js");
const csv = fs.readFileSync(__dirname + "/fixtures/coinkeeper.csv", "utf8");
const load = () =>
  A.importCSV(csv, "2026-01", "fixture", "2026-02-02T00:00:00.000Z");

test("CSV confirmado: cuatro secciones, Transfer de fuente = income, Transfer de cuenta = transfer, Expense = expense", () => {
  const s = load();
  assert.deepEqual(
    [s.sources.length, s.accounts.length, s.categories.length, s.tags.length],
    [1, 2, 1, 2],
  );
  assert.deepEqual(
    s.transactions.map((t) => t.kind),
    ["income", "transfer", "expense", "expense"],
  );
  assert.equal(s.transactions[2].note, 'Almuerzo, con "amigos"\ny café');
  assert.equal(s.transactions[2].amount_cents, 2550);
  assert.equal(s.transactions[0].tag_ids[0], s.tags[0].id);
  assert.equal(s.review.length, 1);
  assert.match(s.review[0].reason, /ausente o ambiguo/);
  assert.equal(s.review[0].raw[2], "No existe");
  assert.equal(s.budgets[0].limit_cents, 20000);
  assert.equal(s.sources[0].expected_cents, 120000);
  assert.equal(
    s.transactions.length,
    4,
    "Received to date nunca genera movimientos",
  );
});

test("fechas contables inválidas se rechazan sin normalizarlas", () => {
  for (const date of [
    "2026-13-01",
    "2026-02-30",
    "2025-02-29",
    "0000-01-01",
    "2026-00-01",
    "2026-1-1",
  ])
    assert.equal(A.dateOK(date), false);
  assert.equal(A.dateOK("2024-02-29"), true);
});

test("saldo inicial = Current amount menos efecto neto, incluye todo el historial", () => {
  const s = load(),
    [bank, cash] = s.accounts;
  assert.equal(bank.opening_balance_cents, 100000); // 1850 − (1000 − 100 − 50)
  assert.equal(cash.opening_balance_cents, 10000); // 174.50 − (100 − 25.50)
  assert.deepEqual(A.balances(s), { [bank.id]: 185000, [cash.id]: 17450 });
  assert.equal(bank.opening_date, "2026-01-05");
});

test("presupuesto por mes: gastado, restante, exceso, cero, sin límite y sin arrastre", () => {
  const s = load(),
    id = s.categories[0].id;
  assert.deepEqual(A.budget(s, id, "2026-01"), {
    limit: 20000,
    spent: 2550,
    remaining: 17450,
  });
  assert.deepEqual(A.budget(s, id, "2026-02"), {
    limit: null,
    spent: 5000,
    remaining: null,
  });
  s.budgets.push({
    id: "feb",
    category_id: id,
    month: "2026-02",
    limit_cents: 0,
  });
  assert.deepEqual(A.budget(s, id, "2026-02"), {
    limit: 0,
    spent: 5000,
    remaining: -5000,
  });
  assert.equal(A.budget(s, id, "2026-01").limit, 20000);
});

test("transferencias no afectan reportes ni presupuestos y conservan saldo total", () => {
  const s = load();
  const before = A.report(s, "2026-01"),
    balanceBefore = A.sum(Object.values(A.balances(s)));
  const transfer = s.transactions.find((t) => t.kind === "transfer");
  transfer.amount_cents = 123456;
  assert.deepEqual(A.report(s, "2026-01"), before);
  assert.equal(A.sum(Object.values(A.balances(s))), balanceBefore);
  assert.equal(before.income, 100000);
  assert.equal(before.expense, 2550);
  assert.equal(before.net, 97450);
  const series = A.evolution(s, "2026-02");
  assert.equal(series.length, 12);
  assert.equal(series[0].month, "2025-03");
  assert.equal(series[11].expense, 5000);
});

test("editar fecha e importe, borrar y restaurar retiran/aplican efectos una sola vez", () => {
  const s = load(),
    t = s.transactions[2],
    id = s.categories[0].id;
  t.occurred_on = "2026-02-07";
  t.amount_cents = 3000;
  assert.equal(A.budget(s, id, "2026-01").spent, 0);
  assert.equal(A.budget(s, id, "2026-02").spent, 8000);
  t.status = "deleted";
  assert.equal(A.budget(s, id, "2026-02").spent, 5000);
  assert.equal(A.balances(s)[s.accounts[1].id], 20000);
  t.status = "posted";
  assert.equal(A.balances(s)[s.accounts[1].id], 17000);
});

test("filtros AND entre dimensiones, OR entre entidades, etiquetas cualquiera/todas sin duplicar", () => {
  const s = load(),
    t = s.transactions[2];
  t.tag_ids = s.tags.map((e) => e.id);
  assert.equal(A.filterTransactions(s, { tags: t.tag_ids }).length, 2);
  assert.equal(
    A.filterTransactions(s, { tags: t.tag_ids, tagMode: "all" }).length,
    1,
  );
  const f = {
    start: "2026-01-01",
    end: "2026-01-31",
    kind: "expense",
    tags: t.tag_ids,
    entities: [s.accounts[1].id],
    text: "AMIGOS",
  };
  assert.equal(A.filterTransactions(s, f).length, 1);
  assert.equal(A.report(s, "2026-01", f).expense, 2550);
  assert.equal(A.evolution(s, "2026-02", f).at(-1).expense, 0);
});

test("CSV soporta BOM, CRLF y vacíos; conserva etiqueta como un nombre completo", () => {
  const s = A.importCSV(
    "\uFEFF" +
      csv
        .replace(/\n/g, "\r\n")
        .replace('"Diario","25.50"', '"Con familia, amigos","25.50"'),
    "2026-01",
  );
  assert.equal(s.transactions[2].note, 'Almuerzo, con "amigos"\r\ny café');
  assert.ok(s.tags.find((t) => t.name === "Con familia, amigos"));
  assert.equal(s.transactions[1].tag_ids.length, 0);
  assert.deepEqual(A.csvRecords('"a",""\n\n'), [["a", ""], [""]]);
});

test("fechas inexistentes, monedas, signos y direcciones incorrectas van a revisión", () => {
  for (const [before, after] of [
    ['"1/5/2026"', '"2/30/2026"'],
    ['"1000.00","BOB"', '"-1000.00","BOB"'],
    ['"1000.00","BOB"', '"1000.00","USD"'],
    ['"Transfer","Trabajo","Banco"', '"Expense","Trabajo","Banco"'],
    ['"Transfer","Trabajo","Banco"', '"Transfer","Banco","Banco"'],
    ['"None","Pago enero"', '"Monthly","Pago enero"'],
    ['"1000.00","BOB","None"', '"999.00","BOB","None"'],
  ]) {
    const s = A.importCSV(csv.replace(before, after), "2026-01");
    assert.equal(s.transactions.length, 3, after);
    assert.equal(s.review.length, 2, after);
    assert.equal(A.report(s, "2026-01").income, 0, after);
  }
});

test("no elige el primer homónimo; cabeceras incorrectas y entidades multimoneda no se aceptan", () => {
  const duplicate = csv.replace(
    '"Banco","1850.00","old-bank","BOB"',
    '"Banco","1850.00","old-bank","BOB"\n"Banco","100.00","other","BOB"',
  );
  const s = A.importCSV(duplicate, "2026-01");
  assert.equal(s.transactions.length, 1);
  assert.equal(s.transactions[0].kind, "expense");
  assert.equal(s.review.length, 4);
  assert.throws(
    () => A.importCSV(csv.replace('"Data"', '"Date"'), "2026-01"),
    /Cabecera/,
  );
  assert.throws(
    () =>
      A.importCSV(
        csv.replace('"old-bank","BOB"', '"old-bank","USD"'),
        "2026-01",
      ),
    /solo admite BOB/,
  );
  assert.throws(() => A.importCSV(csv, "2026-13"), /mes/);
  assert.throws(() => A.csvRecords('"sin cerrar'), /entre comillas/);
});

test("importes y agregados usan centavos enteros exactos y rechazan overflow", () => {
  assert.equal(A.cents("0.29"), 29);
  assert.equal(A.cents("123,01"), 12301);
  assert.equal(A.cents("-0.50"), -50);
  assert.equal(A.sum(Array(10000).fill(29)), 290000);
  for (const invalid of [
    "1.001",
    "1e3",
    "NaN",
    "1,000.00",
    "",
    "90071992547409.92",
  ])
    assert.throws(() => A.cents(invalid));
  assert.throws(() => A.sum([Number.MAX_SAFE_INTEGER, 1]), /seguro/);
});

test("respaldo versionado preserva TODO, incluidos archivados, borrados y filas originales", () => {
  const s = load();
  s.transactions[0].status = "deleted";
  s.accounts[0].archived_at = "2026-02-01";
  const serialized = A.backup(s, "2026-03-01T00:00:00.000Z");
  assert.equal(JSON.parse(serialized).schemaVersion, 1);
  assert.deepEqual(A.restore(serialized), s);
  for (const modify of [
    (s) => {
      s.schemaVersion = 99;
    },
    (s) => {
      s.transactions[0].from_id = "missing";
    },
    (s) => {
      s.transactions[0].amount_cents = 0.5;
    },
    (s) => {
      s.transactions[0].tag_ids = ["missing"];
    },
    (s) => {
      s.budgets.push({ ...s.budgets[0], id: "other" });
    },
    (s) => {
      s.tags[0].id = s.accounts[0].id;
    },
    (s) => {
      s.accounts[0].currency = "USD";
    },
    (s) => {
      s.profile.timezone = "bad/zone";
    },
    (s) => {
      s.transactions[0].occurred_on = "2026-02-30";
    },
    (s) => {
      s.review[0].raw = "wrong";
    },
  ]) {
    const bad = structuredClone(s);
    modify(bad);
    assert.throws(() => A.restore(JSON.stringify(bad)));
  }
});

test("5.400 transacciones y 33 cuentas entre 2021–2026 conservan saldos y precisión", () => {
  const rows = [
    "sep=,",
    '"Data","Type","From","To","Tags","Amount","Currency","Amount converted","Currency of conversion","Recurrence","Note"',
  ];
  for (let i = 0; i < 5400; i++) {
    const year = 2021 + (i % 6);
    rows.push(
      `"${1 + (i % 12)}/${1 + (i % 28)}/${year}","Expense","Cuenta ${i % 33}","Comida","Diario","0.29","BOB","0.29","BOB","None","Fila ${i}"`,
    );
  }
  rows.push(
    "",
    '"Name","Budget","Received to date","Icon","Currency"',
    '"Trabajo","0","0","","BOB"',
    "",
    '"Name","Current amount","Icon","Currency"',
  );
  for (let i = 0; i < 33; i++) rows.push(`"Cuenta ${i}","100.00","","BOB"`);
  rows.push(
    "",
    '"Name","Budget","Received to date","Icon","Currency"',
    '"Comida","100","0","","BOB"',
    "",
    '"Name","Received to date"',
    '"Diario","0"',
  );
  const s = A.importCSV(rows.join("\n"), "2026-10");
  assert.equal(s.transactions.length, 5400);
  assert.equal(s.review.length, 0);
  assert.equal(s.accounts.length, 33);
  assert.equal(A.sum(s.transactions.map((t) => t.amount_cents)), 156600);
  assert.ok(Object.values(A.balances(s)).every((n) => n === 10000));
  assert.deepEqual(A.restore(A.backup(s)), s);
});
