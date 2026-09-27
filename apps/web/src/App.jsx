import { useCallback, useEffect, useState } from "react";
import {
  COLORS,
  createHabit,
  currentStreak,
  formatDisplay,
  lastSevenDays,
  todayKey,
  toggleToday,
} from "@habits/shared";

async function fetchState() {
  const res = await fetch("/api/habits");
  if (!res.ok) throw new Error("Não foi possível carregar os hábitos.");
  return res.json();
}

async function saveState(habits) {
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
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

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
      try {
        const saved = await saveState(nextHabits);
        setHabits(saved.habits);
      } catch (err) {
        setHabits(previous);
        setError(err.message);
      }
    },
    [habits],
  );

  function handleAdd(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    mutate([...habits, createHabit({ name: trimmed, color })]);
  }

  function handleToggle(id) {
    mutate(habits.map((habit) => (habit.id === id ? toggleToday(habit) : habit)));
  }

  function handleDelete(habit) {
    if (!window.confirm(`Excluir "${habit.name}"?`)) return;
    mutate(habits.filter((entry) => entry.id !== habit.id));
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Hábitos</h1>
        <p className="today">{formatDisplay(todayKey())}</p>
      </header>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          className="add-form__name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Novo hábito (ex.: Meditar)"
          maxLength={60}
          aria-label="Nome do hábito"
        />
        <div className="palette" role="radiogroup" aria-label="Cor do hábito">
          {COLORS.map((option) => (
            <button
              key={option}
              type="button"
              className={`palette__dot${color === option ? " is-selected" : ""}`}
              style={{ backgroundColor: option }}
              onClick={() => setColor(option)}
              aria-label={`Cor ${option}`}
              aria-pressed={color === option}
            />
          ))}
        </div>
        <button className="add-form__submit" type="submit" disabled={!name.trim()}>
          Adicionar
        </button>
      </form>

      {error ? <p className="banner banner--error">{error}</p> : null}

      {status === "loading" ? <p className="muted">Carregando…</p> : null}

      {status === "ready" && habits.length === 0 ? (
        <div className="empty">
          <p className="empty__title">Nenhum hábito ainda</p>
          <p className="muted">Adicione o primeiro acima e comece a sequência.</p>
        </div>
      ) : null}

      <ul className="habits">
        {habits.map((habit) => {
          const streak = currentStreak(habit.checkins);
          const days = lastSevenDays(habit.checkins);
          const doneToday = habit.checkins.includes(todayKey());
          return (
            <li key={habit.id} className="habit" style={{ borderColor: habit.color }}>
              <div className="habit__top">
                <span className="habit__name" style={{ color: habit.color }}>
                  {habit.name}
                </span>
                <button
                  className="habit__delete"
                  type="button"
                  onClick={() => handleDelete(habit)}
                  aria-label={`Excluir ${habit.name}`}
                >
                  Excluir
                </button>
              </div>

              <div className="habit__body">
                <button
                  type="button"
                  className={`toggle${doneToday ? " is-done" : ""}`}
                  style={doneToday ? { backgroundColor: habit.color } : undefined}
                  onClick={() => handleToggle(habit.id)}
                  aria-pressed={doneToday}
                >
                  {doneToday ? "Feito hoje" : "Marcar hoje"}
                </button>
                <div className="streak">
                  <span className="streak__value">{streak}</span>
                  <span className="streak__label">
                    {streak === 1 ? "dia seguido" : "dias seguidos"}
                  </span>
                </div>
              </div>

              <div className="week" aria-label="Últimos 7 dias">
                {days.map((day) => (
                  <div key={day.key} className="week__day">
                    <span
                      className={`week__dot${day.done ? " is-done" : ""}`}
                      style={day.done ? { backgroundColor: habit.color } : undefined}
                      title={day.label}
                    />
                    <span className="week__label">{day.label.slice(0, 2)}</span>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
