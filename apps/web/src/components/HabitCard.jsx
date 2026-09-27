import { currentStreak, todayKey, weekSummary } from "@habits/shared";
import WeekStrip from "./WeekStrip.jsx";

export default function HabitCard({
  habit,
  isFirst,
  isLast,
  onToggle,
  onToggleDate,
  onEdit,
  onDelete,
  onArchive,
  onMoveUp,
  onMoveDown,
}) {
  const streak = currentStreak(habit.checkins);
  const summary = weekSummary(habit.checkins);
  const doneToday = habit.checkins.includes(todayKey());

  return (
    <li className="habit" style={{ "--accent": habit.color }}>
      <div className="habit__top">
        <span className="habit__name">{habit.name}</span>
        <div className="habit__actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`Mover ${habit.name} para cima`}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={`Mover ${habit.name} para baixo`}
          >
            ↓
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={onEdit}
            aria-label={`Editar ${habit.name}`}
          >
            Editar
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={onArchive}
            aria-label={`Arquivar ${habit.name}`}
          >
            Arquivar
          </button>
          <button
            type="button"
            className="text-btn text-btn--danger"
            onClick={onDelete}
            aria-label={`Excluir ${habit.name}`}
          >
            Excluir
          </button>
        </div>
      </div>

      {habit.note ? <p className="habit__note">{habit.note}</p> : null}

      <div className="habit__body">
        <button
          type="button"
          className={`toggle${doneToday ? " is-done" : ""}`}
          style={doneToday ? { backgroundColor: habit.color } : undefined}
          onClick={onToggle}
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

      <div className="habit__week">
        <WeekStrip habit={habit} onToggleDate={onToggleDate} />
        <span className="week__score" aria-label="Conclusão da semana">
          {summary.done}/{summary.total}
        </span>
      </div>
    </li>
  );
}
