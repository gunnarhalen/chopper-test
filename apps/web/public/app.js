import {
  STATUSES,
  createBoard,
  createCard,
  normalizeTags,
  randomId,
} from '/shared.js';

const boardEl = document.getElementById('board');
const modal = document.getElementById('card-modal');
const cardForm = document.getElementById('card-form');
const modalTitle = document.getElementById('card-modal-title');
const openModalButton = document.getElementById('open-card-modal');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const tagsInput = document.getElementById('tags');
const commentsInput = document.getElementById('comments');
const statusSelect = document.getElementById('status');
const template = document.getElementById('card-template');

let board = createBoard();
let dragId = null;
let editingId = null;

for (const status of STATUSES) {
  const option = document.createElement('option');
  option.value = status.id;
  option.textContent = status.title;
  statusSelect.append(option);
}

function indexOfStatus(statusId) {
  return STATUSES.findIndex((s) => s.id === statusId);
}

async function load() {
  const res = await fetch('/api/boards');
  board = await res.json();
  render();
}

async function save() {
  const res = await fetch('/api/boards', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(board),
  });
  if (!res.ok) {
    console.error('Falha ao salvar', await res.text());
    return;
  }
  board = await res.json();
  render();
}

function update(mutator) {
  mutator();
  return save();
}

function moveCard(id, direction) {
  const card = board.cards.find((c) => c.id === id);
  if (!card) return;
  const next = indexOfStatus(card.status) + direction;
  if (next < 0 || next >= STATUSES.length) return;
  card.status = STATUSES[next].id;
  save();
}

function openModal(card = null) {
  editingId = card ? card.id : null;
  modalTitle.textContent = card ? 'Editar cartão' : 'Novo cartão';
  titleInput.value = card ? card.title : '';
  descInput.value = card ? card.description || '' : '';
  tagsInput.value = card ? (card.tags || []).join(', ') : '';
  commentsInput.value = card ? (card.comments || []).map((c) => c.text).join('\n') : '';
  statusSelect.value = card ? card.status : STATUSES[0].id;
  modal.showModal();
  titleInput.focus();
}

function closeModal() {
  editingId = null;
  cardForm.reset();
  modal.close();
}

function commentsFromLines(lines, existing = []) {
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

function render() {
  boardEl.replaceChildren();

  for (const status of STATUSES) {
    const cards = board.cards.filter((c) => c.status === status.id);

    const column = document.createElement('section');
    column.className = 'column';
    column.dataset.status = status.id;

    const heading = document.createElement('h2');
    heading.textContent = status.title;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = ` (${cards.length})`;
    heading.append(count);
    column.append(heading);

    const list = document.createElement('div');
    list.className = 'cards';
    list.dataset.status = status.id;

    for (const card of cards) {
      list.append(renderCard(card));
    }

    column.append(list);
    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      column.classList.add('drag-over');
    });
    column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
    column.addEventListener('drop', (event) => {
      event.preventDefault();
      column.classList.remove('drag-over');
      if (!dragId) return;
      const card = board.cards.find((c) => c.id === dragId);
      dragId = null;
      if (!card || card.status === status.id) return;
      card.status = status.id;
      save();
    });

    boardEl.append(column);
  }
}

function renderCard(card) {
  const node = template.content.firstElementChild.cloneNode(true);
  const index = indexOfStatus(card.status);

  node.dataset.id = card.id;
  node.querySelector('.card-title').textContent = card.title;
  node.querySelector('.card-desc').textContent = card.description || '';

  const tagsEl = node.querySelector('.card-tags');
  for (const tag of card.tags || []) {
    const item = document.createElement('li');
    item.className = 'tag';
    item.textContent = tag;
    tagsEl.append(item);
  }

  const commentsEl = node.querySelector('.card-comments');
  for (const comment of card.comments || []) {
    const item = document.createElement('li');
    item.className = 'comment';
    item.textContent = comment.text;
    commentsEl.append(item);
  }

  node.querySelector('[data-action="left"]').disabled = index === 0;
  node.querySelector('[data-action="right"]').disabled = index === STATUSES.length - 1;

  node.querySelector('[data-action="left"]').addEventListener('click', () =>
    moveCard(card.id, -1),
  );
  node.querySelector('[data-action="right"]').addEventListener('click', () =>
    moveCard(card.id, 1),
  );
  node.querySelector('[data-action="edit"]').addEventListener('click', () =>
    openModal(card),
  );
  node.querySelector('[data-action="delete"]').addEventListener('click', () => {
    if (!confirm(`Apagar "${card.title}"?`)) return;
    update(() => {
      board.cards = board.cards.filter((c) => c.id !== card.id);
    });
  });

  node.addEventListener('dragstart', () => {
    dragId = card.id;
    node.classList.add('dragging');
  });
  node.addEventListener('dragend', () => {
    dragId = null;
    node.classList.remove('dragging');
  });

  return node;
}

openModalButton.addEventListener('click', () => openModal());
cardForm.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

cardForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const description = descInput.value;
  const status = statusSelect.value;
  const tags = normalizeTags(tagsInput.value.split(','));
  const lines = commentsInput.value.split('\n');

  if (editingId) {
    const card = board.cards.find((c) => c.id === editingId);
    if (card) {
      card.title = title;
      card.description = String(description ?? '').trim();
      card.status = STATUSES.some((s) => s.id === status) ? status : card.status;
      card.tags = tags;
      card.comments = commentsFromLines(lines, card.comments || []);
    }
  } else {
    board.cards.push(
      createCard({ title, description, status, tags, comments: lines }),
    );
  }

  closeModal();
  save();
});

load().catch((err) => {
  boardEl.textContent = 'Não foi possível carregar o quadro.';
  console.error(err);
});
