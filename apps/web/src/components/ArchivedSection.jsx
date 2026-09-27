import { useState } from "react";

export default function ArchivedSection({ habits, onRestore, onDelete }) {
  const [open, setOpen] = useState(false);

  if (habits.length === 0) return null;

  return (
    <section className="archived">
      <button
        type="button"
        className="archived__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>Arquivados ({habits.length})</span>
        <span className="archived__chevron" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <ul className="archived__list">
          {habits.map((habit) => (
            <li key={habit.id} className="archived__item">
              <span className="archived__name" style={{ color: habit.color }}>
                {habit.name}
              </span>
              <div className="archived__actions">
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => onRestore(habit.id)}
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  className="text-btn text-btn--danger"
                  onClick={() => onDelete(habit)}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
