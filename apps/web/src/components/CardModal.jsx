import { useEffect, useRef, useState } from 'react';

export default function CardModal({
  open,
  card,
  columnId,
  columns,
  onSubmit,
  onDelete,
  onClose,
}) {
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(card ? card.title : '');
    setDescription(card ? card.description || '' : '');
    setTags(card ? (card.tags || []).join(', ') : '');
    setComments(card ? (card.comments || []).map((c) => c.text).join('\n') : '');
    setStatus(columnId || (card ? card.status : columns[0]?.id || ''));
  }, [open, card, columnId, columns]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      titleRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, status, tags, comments });
  }

  return (
    <dialog
      ref={dialogRef}
      className="card-modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <form autoComplete="off" onSubmit={handleSubmit}>
        <h2>{card ? 'Editar cartão' : 'Novo cartão'}</h2>

        <label htmlFor="title">Título</label>
        <input
          ref={titleRef}
          id="title"
          name="title"
          type="text"
          placeholder="Título do cartão"
          maxLength={120}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <label htmlFor="description">Descrição</label>
        <textarea
          id="description"
          name="description"
          placeholder="Descrição (opcional)"
          maxLength={500}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <label htmlFor="tags">Tags</label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="Separe por vírgula (ex.: urgente, estudo)"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />

        <label htmlFor="comments">Comentários</label>
        <textarea
          id="comments"
          name="comments"
          placeholder="Um comentário por linha"
          rows={3}
          value={comments}
          onChange={(event) => setComments(event.target.value)}
        />

        <label htmlFor="status">Coluna</label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>

        <menu className="card-modal-actions">
          <button
            type="button"
            className="danger"
            hidden={!card}
            onClick={onDelete}
          >
            Apagar
          </button>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary">
            Salvar
          </button>
        </menu>
      </form>
    </dialog>
  );
}
