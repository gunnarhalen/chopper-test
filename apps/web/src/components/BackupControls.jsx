import { useRef } from "react";
import { normalizeState } from "@habits/shared";

export default function BackupControls({ onImport, onError }) {
  const inputRef = useRef(null);

  async function handleExport() {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) throw new Error("Não foi possível exportar os hábitos.");
      const state = await res.json();
      const body = `${JSON.stringify(state, null, 2)}\n`;
      const blob = new Blob([body], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "habits.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(err.message);
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("o arquivo não é um JSON válido");
      }
      const state = normalizeState(parsed);
      onImport(state.habits);
    } catch (err) {
      onError(`Arquivo inválido: ${err.message}.`);
    }
  }

  return (
    <div className="backup">
      <button type="button" className="btn btn--ghost" onClick={handleExport}>
        Exportar
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => inputRef.current?.click()}
      >
        Importar
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="backup__input"
        onChange={handleFile}
        aria-label="Arquivo de backup"
      />
    </div>
  );
}
