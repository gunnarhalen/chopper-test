export default function Card({
  card,
  canMoveLeft,
  canMoveRight,
  dragging,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
}) {
  function handleClick(event) {
    if (event.target.closest('button')) return;
    onOpen();
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('button')) return;
    event.preventDefault();
    onOpen();
  }

  return (
    <article
      className={`card${dragging ? ' dragging' : ''}`}
      draggable="true"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <h3 className="card-title">{card.title}</h3>
      <p className="card-desc">{card.description || ''}</p>
      <ul className="card-tags">
        {(card.tags || []).map((tag, index) => (
          <li key={`${tag}-${index}`} className="tag">
            {tag}
          </li>
        ))}
      </ul>
      <ul className="card-comments">
        {(card.comments || []).map((comment, index) => (
          <li key={comment.id || index} className="comment">
            {comment.text}
          </li>
        ))}
      </ul>
      <div className="card-actions">
        <button
          type="button"
          data-action="left"
          title="Mover para a esquerda"
          disabled={!canMoveLeft}
          onClick={(event) => {
            event.stopPropagation();
            onMove(-1);
          }}
        >
          ←
        </button>
        <button
          type="button"
          data-action="right"
          title="Mover para a direita"
          disabled={!canMoveRight}
          onClick={(event) => {
            event.stopPropagation();
            onMove(1);
          }}
        >
          →
        </button>
      </div>
    </article>
  );
}
