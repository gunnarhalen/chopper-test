import { useState } from "react";
import { COLORS, NOTE_MAX_LENGTH } from "@habits/shared";

export default function HabitForm({
  initial,
  submitLabel = "Adicionar",
  onSubmit,
  onCancel,
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [note, setNote] = useState(initial?.note ?? "");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, color, note: note.trim() });
    if (!initial) {
      setName("");
      setNote("");
      setColor(COLORS[0]);
    }
  }

  return (
    <form className="habit-form" onSubmit={handleSubmit}>
      <input
        className="habit-form__name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nome do hábito (ex.: Meditar)"
        maxLength={60}
        aria-label="Nome do hábito"
      />
      <input
        className="habit-form__note"
        type="text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Nota curta (opcional)"
        maxLength={NOTE_MAX_LENGTH}
        aria-label="Nota curta"
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
      <div className="habit-form__actions">
        {onCancel ? (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
        <button className="btn btn--primary" type="submit" disabled={!name.trim()}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
