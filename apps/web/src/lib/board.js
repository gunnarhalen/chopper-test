import { randomId } from '@kanban/shared';

export function indexOfStatus(board, statusId) {
  return board.columns.findIndex((c) => c.id === statusId);
}

export function commentsFromLines(lines, existing = []) {
  const pool = existing.slice();
  const comments = [];

  for (const line of lines) {
    const text = String(line ?? '').trim();
    if (!text) continue;

    const match = pool.findIndex((c) => c.text === text);
    if (match !== -1) {
      comments.push(pool.splice(match, 1)[0]);
    } else {
      comments.push({ id: randomId(), text, createdAt: new Date().toISOString() });
    }
  }

  return comments;
}
