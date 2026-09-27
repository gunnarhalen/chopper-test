import { useCallback, useEffect, useState } from "react";
import { createHabit, todayKey, toggleDate } from "@habits/shared";
import Header from "./components/Header.jsx";
import HabitForm from "./components/HabitForm.jsx";
import HabitCard from "./components/HabitCard.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import ArchivedSection from "./components/ArchivedSection.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import BackupControls from "./components/BackupControls.jsx";
import Toast from "./components/Toast.jsx";

async function fetchState() {
  const res = await fetch("/api/habits");
  if (!res.ok) throw new Error("Não foi possível carregar os hábitos.");
  return res.json();
}

async function putState(habits) {
  const res = await fetch("/api/habits", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habits }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Não foi possível salvar.");
  }
  return res.json();
}

export default function App() {
  const [habits, setHabits] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [editingId, setEditingId] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [view, setView] = useState("habits");
  const [query, setQuery] = useState("");
  const [undo, setUndo] = useState(null);

  useEffect(() => {
    let active = true;
    fetchState()
      .then((state) => {
        if (!active) return;
        setHabits(state.habits);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!undo) return undefined;
    const timer = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(timer);
  }, [undo]);

  const mutate = useCallback(
    async (nextHabits) => {
      const previous = habits;
      setHabits(nextHabits);
      setError("");
      setSaveStatus("saving");
      try {
        const saved = await putState(nextHabits);
        setHabits(saved.habits);
        setSaveStatus("saved");
      } catch (err) {
        setHabits(previous);
        setError(err.message);
        setSaveStatus("error");
      }
    },
    [habits],
  );

  function showUndo(message, snapshot) {
    setUndo({ id: Date.now(), message, habits: snapshot });
  }

  function handleUndo() {
    if (!undo) return;
    const snapshot = undo.habits;
    setUndo(null);
    mutate(snapshot);
  }

  function handleAdd(values) {
    mutate([...habits, createHabit(values)]);
  }

  function handleEdit(id, values) {
    setEditingId(null);
    mutate(
      habits.map((habit) =>
        habit.id === id ? { ...habit, name: values.name, color: values.color, note: values.note } : habit,
      ),
    );
  }

  function handleToggle(id) {
    mutate(habits.map((habit) => (habit.id === id ? toggleDate(habit, todayKey()) : habit)));
  }

  function handleToggleDate(id, key) {
    mutate(habits.map((habit) => (habit.id === id ? toggleDate(habit, key) : habit)));
  }

  function handleArchive(id) {
    const next = habits.map((habit) =>
      habit.id === id ? { ...habit, archived: true } : habit,
    );
    mutate(next);
    showUndo("Hábito arquivado", habits);
  }

  function handleRestore(id) {
    mutate(habits.map((habit) => (habit.id === id ? { ...habit, archived: false } : habit)));
  }

  function handleMove(id, direction) {
    const active = habits.filter((habit) => !habit.archived);
    const pos = active.findIndex((habit) => habit.id === id);
    const target = pos + direction;
    if (pos < 0 || target < 0 || target >= active.length) return;
    const a = active[pos];
    const b = active[target];
    mutate(
      habits.map((habit) => {
        if (habit.id === a.id) return b;
        if (habit.id === b.id) return a;
        return habit;
      }),
    );
  }

  function handleImport(nextHabits) {
    setConfirming({ type: "import", habits: nextHabits });
  }

  function handleConfirm() {
    if (!confirming) return;
    const pending = confirming;
    setConfirming(null);
    if (pending.type === "import") {
      mutate(pending.habits);
      setView("habits");
      setQuery("");
      showUndo("Backup importado", habits);
      return;
    }
    const id = pending.habit.id;
    mutate(habits.filter((habit) => habit.id !== id));
    showUndo("Hábito excluído", habits);
  }

  const activeHabits = habits.filter((habit) => !habit.archived);
  const archivedHabits = habits.filter((habit) => habit.archived);
  const today = todayKey();
  const doneCount = activeHabits.filter((habit) => habit.checkins.includes(today)).length;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleHabits = normalizedQuery
    ? activeHabits.filter((habit) =>
        habit.name.toLowerCase().includes(normalizedQuery),
      )
    : activeHabits;

  return (
    <div className="app">
      <Header
        doneCount={doneCount}
        totalCount={activeHabits.length}
        saveStatus={saveStatus}
      />

      <nav className="tabs" role="tablist" aria-label="Seções">
        <button
          type="button"
          role="tab"
          aria-selected={view === "habits"}
          className={`tab${view === "habits" ? " is-active" : ""}`}
          onClick={() => setView("habits")}
        >
          Hábitos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "stats"}
          className={`tab${view === "stats" ? " is-active" : ""}`}
          onClick={() => setView("stats")}
        >
          Estatísticas
        </button>
      </nav>

      {error ? <p className="banner banner--error">{error}</p> : null}

      {status === "loading" ? <p className="muted">Carregando…</p> : null}

      {status === "ready" && view === "habits" ? (
        <>
          <div className="search">
            <input
              type="search"
              className="search__input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar hábito…"
              aria-label="Buscar hábitos por nome"
            />
          </div>

          <HabitForm key="new" onSubmit={handleAdd} submitLabel="Adicionar" />

          {activeHabits.length === 0 ? (
            <div className="empty">
              <p className="empty__title">
                {archivedHabits.length > 0 ? "Nada ativo por aqui" : "Nenhum hábito ainda"}
              </p>
              <p className="muted">
                {archivedHabits.length > 0
                  ? "Restaure um hábito arquivado ou crie um novo acima."
                  : "Adicione o primeiro acima e comece a sequência."}
              </p>
            </div>
          ) : null}

          {activeHabits.length > 0 && visibleHabits.length === 0 ? (
            <p className="muted">Nenhum hábito encontrado para “{query.trim()}”.</p>
          ) : null}

          <ul className="habits">
            {visibleHabits.map((habit, index) =>
              editingId === habit.id ? (
                <li key={habit.id} className="habit habit--editing">
                  <HabitForm
                    initial={habit}
                    submitLabel="Salvar"
                    onSubmit={(values) => handleEdit(habit.id, values)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  isFirst={index === 0}
                  isLast={index === visibleHabits.length - 1}
                  onToggle={() => handleToggle(habit.id)}
                  onToggleDate={(key) => handleToggleDate(habit.id, key)}
                  onEdit={() => setEditingId(habit.id)}
                  onDelete={() => setConfirming({ type: "delete", habit })}
                  onArchive={() => handleArchive(habit.id)}
                  onMoveUp={() => handleMove(habit.id, -1)}
                  onMoveDown={() => handleMove(habit.id, 1)}
                />
              ),
            )}
          </ul>

          <ArchivedSection
            habits={archivedHabits}
            onRestore={handleRestore}
            onDelete={(habit) => setConfirming({ type: "delete", habit })}
          />
        </>
      ) : null}

      {status === "ready" && view === "stats" ? (
        <>
          <StatsPanel habits={habits} />
          <div className="stats__block">
            <h2 className="stats__title">Backup local</h2>
            <p className="muted">
              Exporta o mesmo <code>habits.json</code> usado pelo servidor. Importar
              substitui o estado atual.
            </p>
            <BackupControls onImport={handleImport} onError={setError} />
          </div>
        </>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title={confirming.type === "import" ? "Importar backup" : "Excluir hábito"}
          message={
            confirming.type === "import"
              ? "Importar este arquivo substitui todos os hábitos atuais. Continuar?"
              : `Excluir "${confirming.habit.name}"? Você ainda poderá desfazer por alguns segundos.`
          }
          confirmLabel={confirming.type === "import" ? "Importar" : "Excluir"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      ) : null}

      {undo ? (
        <Toast
          message={undo.message}
          onAction={handleUndo}
          onDismiss={() => setUndo(null)}
        />
      ) : null}
    </div>
  );
}
