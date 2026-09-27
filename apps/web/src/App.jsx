import { useCallback, useEffect, useState } from "react";
import { createHabit, todayKey, toggleDate } from "@habits/shared";
import Header from "./components/Header.jsx";
import HabitForm from "./components/HabitForm.jsx";
import HabitCard from "./components/HabitCard.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import ArchivedSection from "./components/ArchivedSection.jsx";

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
    mutate(habits.map((habit) => (habit.id === id ? { ...habit, archived: true } : habit)));
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

  function confirmDelete() {
    if (!confirming) return;
    const id = confirming.id;
    setConfirming(null);
    mutate(habits.filter((habit) => habit.id !== id));
  }

  const activeHabits = habits.filter((habit) => !habit.archived);
  const archivedHabits = habits.filter((habit) => habit.archived);
  const today = todayKey();
  const doneCount = activeHabits.filter((habit) => habit.checkins.includes(today)).length;

  return (
    <div className="app">
      <Header
        doneCount={doneCount}
        totalCount={activeHabits.length}
        saveStatus={saveStatus}
      />

      <HabitForm key="new" onSubmit={handleAdd} submitLabel="Adicionar" />

      {error ? <p className="banner banner--error">{error}</p> : null}

      {status === "loading" ? <p className="muted">Carregando…</p> : null}

      {status === "ready" && activeHabits.length === 0 ? (
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

      <ul className="habits">
        {activeHabits.map((habit, index) =>
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
              isLast={index === activeHabits.length - 1}
              onToggle={() => handleToggle(habit.id)}
              onToggleDate={(key) => handleToggleDate(habit.id, key)}
              onEdit={() => setEditingId(habit.id)}
              onDelete={() => setConfirming(habit)}
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
        onDelete={setConfirming}
      />

      {confirming ? (
        <ConfirmDialog
          title="Excluir hábito"
          message={`Excluir "${confirming.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </div>
  );
}
