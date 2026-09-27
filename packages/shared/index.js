export const STATUSES = [
  { id: 'todo', title: 'A fazer' },
  { id: 'doing', title: 'Fazendo' },
  { id: 'done', title: 'Feito' },
];

export function defaultColumns() {
  return STATUSES.map((s) => ({ ...s }));
}

export function createColumn({ title } = {}) {
  const clean = String(title ?? '').trim();
  return { id: randomId(), title: clean || 'Nova coluna' };
}

export function normalizeColumns(input) {
  if (!Array.isArray(input)) return null;

  const columns = [];
  const ids = new Set();

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const title = String(raw.title ?? '').trim();
    if (!title) continue;

    let id = typeof raw.id === 'string' && raw.id ? raw.id : randomId();
    if (ids.has(id)) id = randomId();
    ids.add(id);
    columns.push({ id, title });
  }

  return columns.length ? columns : null;
}

export function createBoard() {
  return { columns: defaultColumns(), cards: [] };
}

export function createCard({
  title,
  description = '',
  status = 'todo',
  tags = [],
  comments = [],
} = {}) {
  return {
    id: randomId(),
    title: String(title ?? '').trim(),
    description: String(description ?? '').trim(),
    status: typeof status === 'string' && status ? status : 'todo',
    tags: normalizeTags(tags),
    comments: normalizeComments(comments),
    createdAt: new Date().toISOString(),
  };
}

export function normalizeTags(input) {
  if (!Array.isArray(input)) return [];

  const tags = [];
  for (const raw of input) {
    const tag = String(raw ?? '').trim().toLowerCase();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function normalizeComments(input) {
  if (!Array.isArray(input)) return [];

  const comments = [];
  for (const raw of input) {
    if (typeof raw === 'string') {
      const text = raw.trim();
      if (!text) continue;
      comments.push({ id: randomId(), text, createdAt: new Date().toISOString() });
      continue;
    }

    if (!raw || typeof raw !== 'object') continue;
    const text = String(raw.text ?? '').trim();
    if (!text) continue;

    comments.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : randomId(),
      text,
      createdAt:
        typeof raw.createdAt === 'string' && raw.createdAt
          ? raw.createdAt
          : new Date().toISOString(),
    });
  }
  return comments;
}

export function normalizeBoard(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.cards)) {
    return null;
  }

  const columns = normalizeColumns(input.columns) || defaultColumns();
  const columnIds = columns.map((c) => c.id);

  const cards = [];
  for (const raw of input.cards) {
    if (!raw || typeof raw !== 'object') continue;
    const title = String(raw.title ?? '').trim();
    if (!title) continue;

    cards.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : randomId(),
      title,
      description: String(raw.description ?? '').trim(),
      status: columnIds.includes(raw.status) ? raw.status : columnIds[0],
      tags: normalizeTags(raw.tags),
      comments: normalizeComments(raw.comments),
      createdAt:
        typeof raw.createdAt === 'string' && raw.createdAt
          ? raw.createdAt
          : new Date().toISOString(),
    });
  }

  return { columns, cards };
}

export function randomId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
