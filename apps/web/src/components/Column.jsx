import { useState } from 'react';

export default function Column({
  column,
  cards,
  canDelete,
  onAddCard,
  onRename,
  onRemove,
  onDropCard,
  children,
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <section
      className={`column${dragOver ? ' drag-over' : ''}`}
      data-status={column.id}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        onDropCard(column.id);
      }}
    >
      <div className="column-header">
        <h2>
          {column.title}
          <span className="count"> ({cards.length})</span>
        </h2>
        <div className="column-actions">
          <button
            type="button"
            className="icon"
            title="Novo cartão nesta coluna"
            onClick={onAddCard}
          >
            +
          </button>
          <button
            type="button"
            className="icon"
            title="Renomear coluna"
            onClick={onRename}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon danger"
            title="Excluir coluna"
            disabled={!canDelete}
            onClick={onRemove}
          >
            ×
          </button>
        </div>
      </div>
      <div className="cards" data-status={column.id}>
        {children}
      </div>
    </section>
  );
}
