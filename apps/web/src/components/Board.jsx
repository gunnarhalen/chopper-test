import Card from './Card.jsx';
import Column from './Column.jsx';
import { indexOfStatus } from '../lib/board.js';

export default function Board({
  board,
  draggingId,
  onOpenCard,
  onMoveCard,
  onStartDrag,
  onEndDrag,
  onAddCard,
  onRenameColumn,
  onRemoveColumn,
  onDropCard,
}) {
  return (
    <main id="board" className="board" aria-live="polite">
      {board.columns.map((column) => {
        const cards = board.cards.filter((c) => c.status === column.id);
        const columnIndex = indexOfStatus(board, column.id);

        return (
          <Column
            key={column.id}
            column={column}
            cards={cards}
            canDelete={board.columns.length > 1}
            onAddCard={() => onAddCard(column.id)}
            onRename={() => onRenameColumn(column)}
            onRemove={() => onRemoveColumn(column)}
            onDropCard={onDropCard}
          >
            {cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                canMoveLeft={columnIndex > 0}
                canMoveRight={columnIndex < board.columns.length - 1}
                dragging={draggingId === card.id}
                onOpen={() => onOpenCard(card)}
                onMove={(direction) => onMoveCard(card.id, direction)}
                onDragStart={() => onStartDrag(card.id)}
                onDragEnd={onEndDrag}
              />
            ))}
          </Column>
        );
      })}
    </main>
  );
}
