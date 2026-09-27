import { bestStreak, monthSummary, totalCheckins } from "@habits/shared";

export default function StatsPanel({ habits }) {
  const summary = monthSummary(habits);
  const ordered = [
    ...habits.filter((habit) => !habit.archived),
    ...habits.filter((habit) => habit.archived),
  ];

  return (
    <section className="stats" aria-label="Estatísticas">
      <div className="stats__block">
        <h2 className="stats__title">Resumo do mês</h2>
        <div className="stats__grid">
          <div className="stats__metric">
            <span className="stats__value">{summary.daysWithAny}</span>
            <span className="stats__label">
              {summary.daysWithAny === 1
                ? "dia com pelo menos 1 hábito"
                : "dias com pelo menos 1 hábito"}
            </span>
          </div>
          <div className="stats__metric">
            <span className="stats__value">{summary.completion}%</span>
            <span className="stats__label">conclusão média</span>
          </div>
        </div>
      </div>

      <div className="stats__block">
        <h2 className="stats__title">Por hábito</h2>
        {ordered.length === 0 ? (
          <p className="muted">
            Adicione um hábito para começar a acumular retrospectiva.
          </p>
        ) : (
          <ul className="stats__list">
            {ordered.map((habit) => (
              <li
                key={habit.id}
                className="stats__item"
                style={{ "--accent": habit.color }}
              >
                <div className="stats__item-head">
                  <span className="stats__name">{habit.name}</span>
                  {habit.archived ? (
                    <span className="stats__tag">arquivado</span>
                  ) : null}
                </div>
                <div className="stats__item-metrics">
                  <span>
                    <strong>{bestStreak(habit.checkins)}</strong> melhor seq.
                  </span>
                  <span>
                    <strong>{totalCheckins(habit.checkins)}</strong> check-ins
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
