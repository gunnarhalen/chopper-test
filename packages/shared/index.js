export const STATUSES = [
  { id: 'todo', title: 'A fazer' },
  { id: 'doing', title: 'Fazendo' },
  { id: 'done', title: 'Feito' },
];

const STATUS_IDS = STATUSES.map((s) => s.id);

export function createBoard() {
  return { cards: [] };
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
    status: STATUS_IDS.includes(status) ? status : 'todo',
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

  const cards = [];
  for (const raw of input.cards) {
    if (!raw || typeof raw !== 'object') continue;
    const title = String(raw.title ?? '').trim();
    if (!title) continue;

    cards.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : randomId(),
      title,
      description: String(raw.description ?? '').trim(),
      status: STATUS_IDS.includes(raw.status) ? raw.status : 'todo',
      tags: normalizeTags(raw.tags),
      comments: normalizeComments(raw.comments),
      createdAt:
        typeof raw.createdAt === 'string' && raw.createdAt
          ? raw.createdAt
          : new Date().toISOString(),
    });
  }

  return { cards };
}

export function randomId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
