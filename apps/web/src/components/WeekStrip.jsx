import { lastSevenDays } from "@habits/shared";

export default function WeekStrip({ habit, onToggleDate }) {
  const days = lastSevenDays(habit.checkins);
  return (
    <div className="week" role="group" aria-label="Últimos 7 dias">
      {days.map((day) => (
        <button
          key={day.key}
          type="button"
          className={`week__day${day.done ? " is-done" : ""}`}
          style={day.done ? { backgroundColor: habit.color, borderColor: habit.color } : undefined}
          onClick={() => onToggleDate(day.key)}
          aria-pressed={day.done}
          aria-label={`${day.label}${day.done ? " (feito)" : ""}`}
          title={day.label}
        >
          <span className="week__label">{day.label.slice(0, 2)}</span>
        </button>
      ))}
    </div>
  );
}
