import { STATUSES, createBoard, createCard } from '/shared.js';

const boardEl = document.getElementById('board');
const template = document.getElementById('card-template');
const newCardBtn = document.getElementById('new-card');
const modal = document.getElementById('card-modal');
const modalForm = document.getElementById('card-form');
const modalTitle = document.getElementById('card-modal-title');
const titleField = document.getElementById('card-title');
const descField = document.getElementById('card-description');
const statusField = document.getElementById('card-status');
const cancelBtn = document.getElementById('card-cancel');

let board = createBoard();
let dragId = null;
let editingId = null;

for (const status of STATUSES) {
  const option = document.createElement('option');
  option.value = status.id;
  option.textContent = status.title;
  statusField.append(option);
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

function openCardModal(card = null) {
  editingId = card ? card.id : null;
  modalTitle.textContent = card ? 'Editar cartão' : 'Novo cartão';
  titleField.value = card ? card.title : '';
  descField.value = card ? card.description : '';
  statusField.value = card ? card.status : STATUSES[0].id;
  modal.showModal();
  titleField.focus();
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

  node.querySelector('[data-action="left"]').disabled = index === 0;
  node.querySelector('[data-action="right"]').disabled = index === STATUSES.length - 1;

  node.querySelector('[data-action="left"]').addEventListener('click', () =>
    moveCard(card.id, -1),
  );
  node.querySelector('[data-action="right"]').addEventListener('click', () =>
    moveCard(card.id, 1),
  );
  node.querySelector('[data-action="edit"]').addEventListener('click', () =>
    openCardModal(card),
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

newCardBtn.addEventListener('click', () => openCardModal());
cancelBtn.addEventListener('click', () => modal.close());
modal.addEventListener('close', () => {
  editingId = null;
  modalForm.reset();
});

modalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = titleField.value.trim();
  if (!title) return;
  const description = descField.value;
  const status = statusField.value;

  if (editingId) {
    const card = board.cards.find((c) => c.id === editingId);
    if (card) {
      update(() => {
        card.title = title;
        card.description = description.trim();
        card.status = status;
      });
    }
  } else {
    const card = createCard({ title, description, status });
    update(() => board.cards.push(card));
  }

  modal.close();
});

load().catch((err) => {
  boardEl.textContent = 'Não foi possível carregar o quadro.';
  console.error(err);
});
