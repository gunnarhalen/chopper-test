export const STATUSES = [
  { id: 'todo', title: 'A fazer' },
  { id: 'doing', title: 'Fazendo' },
  { id: 'done', title: 'Feito' },
];

const STATUS_IDS = STATUSES.map((s) => s.id);

export function createBoard() {
  return { cards: [] };
}

export function createCard({ title, description = '', status = 'todo' } = {}) {
  return {
    id: randomId(),
    title: String(title ?? '').trim(),
    description: String(description ?? '').trim(),
    status: STATUS_IDS.includes(status) ? status : 'todo',
    createdAt: new Date().toISOString(),
  };
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
