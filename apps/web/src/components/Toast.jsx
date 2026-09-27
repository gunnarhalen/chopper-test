export default function Toast({
  message,
  actionLabel = "Desfazer",
  onAction,
  onDismiss,
}) {
  return (
    <div className="toast" role="status">
      <span className="toast__message">{message}</span>
      {onAction ? (
        <button type="button" className="toast__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
      <button
        type="button"
        className="toast__close"
        onClick={onDismiss}
        aria-label="Fechar aviso"
      >
        ×
      </button>
    </div>
  );
}
