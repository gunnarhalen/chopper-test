import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "../server.js";
import { createStore } from "../store.js";
import {
  bestStreak,
  currentStreak,
  dateKey,
  lastSevenDays,
  monthSummary,
  toggleDate,
  totalCheckins,
  weekSummary,
  NOTE_MAX_LENGTH,
} from "@habits/shared";

async function startServer(options) {
  const server = createServer(options);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

async function tempFile() {
  const dir = await mkdtemp(path.join(tmpdir(), "habits-"));
  return path.join(dir, "habits.json");
}

test("GET /api/habits retorna lista vazia quando o arquivo nao existe", async () => {
  const store = createStore(await tempFile());
  const { server, base } = await startServer({ store });
  try {
    const res = await fetch(`${base}/api/habits`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { habits: [] });
  } finally {
    server.close();
  }
});

test("PUT /api/habits grava, normaliza e persiste apos reiniciar", async () => {
  const file = await tempFile();
  const { server, base } = await startServer({ store: createStore(file) });
  try {
    const payload = {
      habits: [
        {
          name: "  Meditar  ",
          color: "#38bdf8",
          checkins: ["2026-09-27", "2026-09-26", "2026-09-26"],
        },
      ],
    };
    const res = await fetch(`${base}/api/habits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200);
    const saved = await res.json();
    assert.equal(saved.habits[0].name, "Meditar");
    assert.equal(saved.habits[0].color, "#38bdf8");
    assert.ok(saved.habits[0].id);
    assert.deepEqual(saved.habits[0].checkins, ["2026-09-26", "2026-09-27"]);

    const onDisk = JSON.parse(await readFile(file, "utf8"));
    assert.deepEqual(onDisk.habits, saved.habits);
  } finally {
    server.close();
  }

  const restarted = await startServer({ store: createStore(file) });
  try {
    const res = await fetch(`${restarted.base}/api/habits`);
    const state = await res.json();
    assert.equal(state.habits.length, 1);
    assert.equal(state.habits[0].name, "Meditar");
  } finally {
    restarted.server.close();
  }
});

test("PUT /api/habits rejeita payload invalido com 400", async () => {
  const store = createStore(await tempFile());
  const { server, base } = await startServer({ store });
  const put = (body) =>
    fetch(`${base}/api/habits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
  try {
    assert.equal((await put(JSON.stringify({ habits: [{ color: "#38bdf8" }] }))).status, 400);
    assert.equal((await put(JSON.stringify({ habits: [{ name: "X", color: "#000000" }] }))).status, 400);
    assert.equal((await put(JSON.stringify({ habits: [{ name: "X", checkins: ["26-09-2026"] }] }))).status, 400);
    assert.equal((await put(JSON.stringify({ habits: [{ name: "X", archived: "yes" }] }))).status, 400);
    assert.equal((await put(JSON.stringify({ habits: [{ name: "X", note: 42 }] }))).status, 400);
    assert.equal(
      (await put(JSON.stringify({ habits: [{ name: "X", note: "a".repeat(NOTE_MAX_LENGTH + 1) }] }))).status,
      400,
    );
    assert.equal((await put(JSON.stringify({ habits: "no" }))).status, 400);
    assert.equal((await put('{"habits":[')).status, 400);
    assert.equal((await put("")).status, 400);
  } finally {
    server.close();
  }
});

test("PUT /api/habits preserva arquivados, notas, ordem e aplica defaults", async () => {
  const file = await tempFile();
  const { server, base } = await startServer({ store: createStore(file) });
  try {
    const payload = {
      habits: [
        { name: "Ler", color: "#34d399", note: "  antes de dormir  ", archived: true },
        { name: "Correr", color: "#facc15" },
      ],
    };
    const res = await fetch(`${base}/api/habits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200);
    const saved = await res.json();
    assert.deepEqual(saved.habits.map((habit) => habit.name), ["Ler", "Correr"]);
    assert.equal(saved.habits[0].note, "antes de dormir");
    assert.equal(saved.habits[0].archived, true);
    assert.equal(saved.habits[1].note, "");
    assert.equal(saved.habits[1].archived, false);

    const onDisk = JSON.parse(await readFile(file, "utf8"));
    assert.deepEqual(onDisk.habits, saved.habits);
  } finally {
    server.close();
  }
});

test("metodos e rotas desconhecidas respondem de forma controlada", async () => {
  const store = createStore(await tempFile());
  const { server, base } = await startServer({ store });
  try {
    const del = await fetch(`${base}/api/habits`, { method: "DELETE" });
    assert.equal(del.status, 405);
    const missing = await fetch(`${base}/api/unknown`);
    assert.equal(missing.status, 404);
  } finally {
    server.close();
  }
});

test("serve 503 quando o build do front nao existe", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "habits-dist-"));
  const { server, base } = await startServer({
    store: createStore(await tempFile()),
    distDir: path.join(dir, "missing"),
  });
  try {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 503);
  } finally {
    server.close();
  }
});

test("currentStreak conta dias consecutivos terminando hoje ou ontem", () => {
  const now = new Date(2026, 8, 27);
  assert.equal(currentStreak([], now), 0);
  assert.equal(currentStreak(["2026-09-25"], now), 0);
  assert.equal(
    currentStreak(["2026-09-25", "2026-09-26", "2026-09-27"], now),
    3,
  );
  assert.equal(currentStreak(["2026-09-25", "2026-09-26"], now), 2);
  assert.equal(
    currentStreak(["2026-09-26", "2026-09-27"], new Date(2026, 8, 28)),
    2,
  );
  assert.equal(
    currentStreak(["2026-09-25", "2026-09-26"], new Date(2026, 8, 28)),
    0,
  );
});

test("lastSevenDays devolve 7 dias terminando hoje", () => {
  const now = new Date(2026, 8, 27);
  const days = lastSevenDays(["2026-09-27", "2026-09-21"], now);
  assert.equal(days.length, 7);
  assert.equal(days[6].key, dateKey(now));
  assert.equal(days[6].done, true);
  assert.equal(days[6].label, "27-09-2026");
  assert.equal(days[0].done, true);
  assert.equal(days[1].done, false);
});

test("toggleDate liga e desliga uma data especifica sem mutar", () => {
  const habit = { checkins: ["2026-09-25"] };
  const on = toggleDate(habit, "2026-09-27");
  assert.deepEqual(on.checkins, ["2026-09-25", "2026-09-27"]);
  const off = toggleDate(on, "2026-09-25");
  assert.deepEqual(off.checkins, ["2026-09-27"]);
  assert.deepEqual(habit.checkins, ["2026-09-25"]);
  assert.throws(() => toggleDate(habit, "27-09-2026"));
});

test("weekSummary conta conclusoes dentro dos ultimos 7 dias", () => {
  const now = new Date(2026, 8, 27);
  assert.deepEqual(
    weekSummary(["2026-09-27", "2026-09-21", "2026-09-20"], now),
    { done: 2, total: 7 },
  );
  assert.deepEqual(weekSummary([], now), { done: 0, total: 7 });
});

test("bestStreak encontra a maior sequencia historica", () => {
  assert.equal(bestStreak([]), 0);
  assert.equal(bestStreak(["2026-09-01"]), 1);
  assert.equal(bestStreak(["2026-09-01", "2026-09-02", "2026-09-03"]), 3);
  assert.equal(
    bestStreak([
      "2026-09-01",
      "2026-09-02",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ]),
    4,
  );
  assert.equal(bestStreak(["2026-09-03", "2026-09-01", "2026-09-02"]), 3);
  assert.equal(bestStreak(["2026-08-30", "2026-08-31", "2026-09-01"]), 3);
  assert.equal(bestStreak(["2026-09-01", "2026-09-01", "2026-09-02"]), 2);
});

test("totalCheckins conta checkins unicos", () => {
  assert.equal(totalCheckins([]), 0);
  assert.equal(totalCheckins(["2026-09-01", "2026-09-01", "2026-09-02"]), 2);
});

test("monthSummary resume o mes corrente dos habitos ativos", () => {
  const now = new Date(2026, 8, 27);
  const habits = [
    {
      archived: false,
      checkins: ["2026-09-01", "2026-09-02", "2026-09-27", "2026-08-31"],
    },
    { archived: false, checkins: ["2026-09-02", "2026-09-03"] },
    { archived: true, checkins: ["2026-09-05"] },
  ];
  assert.deepEqual(monthSummary(habits, now), {
    daysWithAny: 4,
    completion: 9,
    totalCheckins: 5,
    activeHabits: 2,
    elapsedDays: 27,
  });
  assert.deepEqual(monthSummary([], now), {
    daysWithAny: 0,
    completion: 0,
    totalCheckins: 0,
    activeHabits: 0,
    elapsedDays: 27,
  });
  assert.equal(monthSummary([{ archived: true, checkins: ["2026-09-05"] }], now).completion, 0);
});
