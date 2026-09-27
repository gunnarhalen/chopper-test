import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createBoard,
  createCard,
  createColumn,
  normalizeTags,
} from '@kanban/shared';
import Board from './components/Board.jsx';
import CardModal from './components/CardModal.jsx';
import { commentsFromLines } from './lib/board.js';

export default function App() {
  const [board, setBoard] = useState(() => createBoard());
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [modal, setModal] = useState(null);

  const boardRef = useRef(board);
  boardRef.current = board;

  const load = useCallback(async () => {
    const res = await fetch('/api/boards');
    const data = await res.json();
    if (!Array.isArray(data.columns) || data.columns.length === 0) {
      data.columns = createBoard().columns;
    }
    setBoard(data);
  }, []);

  useEffect(() => {
    load().catch((err) => {
      setError('Não foi possível carregar o quadro.');
      console.error(err);
    });
  }, [load]);

  const save = useCallback(async (next) => {
    const res = await fetch('/api/boards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      console.error('Falha ao salvar', await res.text());
      return;
    }
    const saved = await res.json();
    boardRef.current = saved;
    setBoard(saved);
  }, []);

  const update = useCallback(
    (mutator) => {
      const current = boardRef.current;
      const next = mutator(current);
      if (next === current) return;
      boardRef.current = next;
      setBoard(next);
      save(next);
    },
    [save],
  );

  const moveCard = useCallback(
    (id, direction) => {
      update((current) => {
        const card = current.cards.find((c) => c.id === id);
        if (!card) return current;
        const index = current.columns.findIndex((c) => c.id === card.status);
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= current.columns.length) return current;
        const status = current.columns[nextIndex].id;
        return {
          ...current,
          cards: current.cards.map((c) =>
            c.id === id ? { ...c, status } : c,
          ),
        };
      });
    },
    [update],
  );

  const addColumn = useCallback(() => {
    const next = prompt('Nome da nova coluna');
    if (next === null) return;
    const title = next.trim();
    if (!title) return;
    update((current) => ({
      ...current,
      columns: [...current.columns, createColumn({ title })],
    }));
  }, [update]);

  const renameColumn = useCallback(
    (status) => {
      const next = prompt('Nome da coluna', status.title);
      if (next === null) return;
      const title = next.trim();
      if (!title) return;
      update((current) => ({
        ...current,
        columns: current.columns.map((c) =>
          c.id === status.id ? { ...c, title } : c,
        ),
      }));
    },
    [update],
  );

  const removeColumn = useCallback(
    (status) => {
      if (boardRef.current.columns.length <= 1) return;
      if (!confirm(`Excluir a coluna "${status.title}" e seus cartões?`)) return;
      update((current) => {
        if (current.columns.length <= 1) return current;
        return {
          ...current,
          columns: current.columns.filter((c) => c.id !== status.id),
          cards: current.cards.filter((c) => c.status !== status.id),
        };
      });
    },
    [update],
  );

  const dropCard = useCallback(
    (statusId) => {
      const dragId = draggingId;
      setDraggingId(null);
      if (!dragId) return;
      update((current) => {
        const card = current.cards.find((c) => c.id === dragId);
        if (!card || card.status === statusId) return current;
        return {
          ...current,
          cards: current.cards.map((c) =>
            c.id === dragId ? { ...c, status: statusId } : c,
          ),
        };
      });
    },
    [draggingId, update],
  );

  const handleSubmit = useCallback(
    ({ title, description, status, tags, comments }) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) return;

      const normalizedTags = normalizeTags(tags.split(','));
      const lines = comments.split('\n');
      const editing = modal?.card ?? null;

      update((current) => {
        if (editing) {
          return {
            ...current,
            cards: current.cards.map((c) => {
              if (c.id !== editing.id) return c;
              const validStatus = current.columns.some(
                (column) => column.id === status,
              );
              return {
                ...c,
                title: cleanTitle,
                description: String(description ?? '').trim(),
                status: validStatus ? status : c.status,
                tags: normalizedTags,
                comments: commentsFromLines(lines, c.comments || []),
              };
            }),
          };
        }

        return {
          ...current,
          cards: [
            ...current.cards,
            createCard({
              title: cleanTitle,
              description,
              status,
              tags: normalizedTags,
              comments: lines,
            }),
          ],
        };
      });

      setModal(null);
    },
    [modal, update],
  );

  const handleDelete = useCallback(() => {
    const editing = modal?.card;
    if (!editing) return;
    if (!confirm(`Apagar "${editing.title}"?`)) return;
    update((current) => ({
      ...current,
      cards: current.cards.filter((c) => c.id !== editing.id),
    }));
    setModal(null);
  }, [modal, update]);

  return (
    <>
      <header className="topbar">
        <h1>Kanban pessoal</h1>
        <p className="hint">
          Crie cartões, arraste entre colunas ou use os botões ←/→.
        </p>
      </header>

      <div className="toolbar">
        <button
          type="button"
          className="primary"
          onClick={() => setModal({ card: null, columnId: null })}
        >
          + Novo cartão
        </button>
        <button type="button" onClick={addColumn}>
          + Nova coluna
        </button>
      </div>

      <CardModal
        open={modal !== null}
        card={modal?.card ?? null}
        columnId={modal?.columnId ?? null}
        columns={board.columns}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onClose={() => setModal(null)}
      />

      {error ? (
        <main id="board" className="board" aria-live="polite">
          {error}
        </main>
      ) : (
        <Board
          board={board}
          draggingId={draggingId}
          onOpenCard={(card) => setModal({ card, columnId: null })}
          onMoveCard={moveCard}
          onStartDrag={setDraggingId}
          onEndDrag={() => setDraggingId(null)}
          onAddCard={(columnId) => setModal({ card: null, columnId })}
          onRenameColumn={renameColumn}
          onRemoveColumn={removeColumn}
          onDropCard={dropCard}
        />
      )}
    </>
  );
}
