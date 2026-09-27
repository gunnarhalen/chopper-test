import { formatDisplay, todayKey } from "@habits/shared";

export default function Header({ doneCount, totalCount, saveStatus }) {
  const allDone = totalCount > 0 && doneCount === totalCount;
  return (
    <header className="header">
      <div className="header__main">
        <h1>Hábitos</h1>
        <p className="today">{formatDisplay(todayKey())}</p>
      </div>
      <div className="header__summary">
        <span className="summary">
          <span className="summary__value">{doneCount}</span>
          <span className="summary__label">
            de {totalCount} {totalCount === 1 ? "feito" : "feitos"}
          </span>
        </span>
        {saveStatus === "saving" ? (
          <span className="save save--saving" role="status">
            Salvando…
          </span>
        ) : null}
        {saveStatus === "error" ? (
          <span className="save save--error" role="status">
            Não salvo
          </span>
        ) : null}
        {saveStatus === "saved" && allDone ? (
          <span className="save save--done" role="status">
            Tudo feito
          </span>
        ) : null}
      </div>
    </header>
  );
}
