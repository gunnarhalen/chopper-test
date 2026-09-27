import { STATUSES, createBoard, createCard } from '/shared.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SPRITE = '/icons/tabler-sprite.svg';

const boardEl = document.getElementById('board');
const template = document.getElementById('card-template');
const newCardBtn = document.getElementById('new-card-btn');

const cardModal = document.getElementById('card-modal');
const cardForm = document.getElementById('card-form');
const cardModalTitle = document.getElementById('card-modal-title');
const titleInput = document.getElementById('card-title');
const descInput = document.getElementById('card-description');
const statusSelect = document.getElementById('card-status');

let board = createBoard();
let dragId = null;
let editingId = null;

function makeIcon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `${SPRITE}#tabler-${name}`);
  svg.append(use);
  return svg;
}

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

  const leftBtn = node.querySelector('[data-action="left"]');
  const rightBtn = node.querySelector('[data-action="right"]');
  const editBtn = node.querySelector('[data-action="edit"]');
  const deleteBtn = node.querySelector('[data-action="delete"]');

  leftBtn.append(makeIcon('arrow-left'));
  rightBtn.append(makeIcon('arrow-right'));
  editBtn.append(makeIcon('pencil'), ' Editar');
  deleteBtn.append(makeIcon('trash'), ' Apagar');

  leftBtn.disabled = index === 0;
  rightBtn.disabled = index === STATUSES.length - 1;

  leftBtn.addEventListener('click', () => moveCard(card.id, -1));
  rightBtn.addEventListener('click', () => moveCard(card.id, 1));
  editBtn.addEventListener('click', () => openCardModal(card));
  deleteBtn.addEventListener('click', () => {
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

function openCardModal(card = null) {
  editingId = card ? card.id : null;
  cardModalTitle.textContent = card ? 'Editar cartão' : 'Novo cartão';
  titleInput.value = card ? card.title : '';
  descInput.value = card ? card.description || '' : '';
  statusSelect.value = card ? card.status : STATUSES[0].id;
  cardModal.showModal();
  titleInput.focus();
}

newCardBtn.addEventListener('click', () => openCardModal());

for (const btn of cardModal.querySelectorAll('[data-action="close"]')) {
  btn.addEventListener('click', () => cardModal.close());
}

cardModal.addEventListener('click', (event) => {
  if (event.target === cardModal) cardModal.close();
});

cardForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }
  const description = descInput.value.trim();
  const status = statusSelect.value;

  if (editingId) {
    const card = board.cards.find((c) => c.id === editingId);
    if (card) {
      card.title = title;
      card.description = description;
      card.status = status;
    }
  } else {
    board.cards.push(createCard({ title, description, status }));
  }

  editingId = null;
  cardModal.close();
  save();
});

load().catch((err) => {
  boardEl.textContent = 'Não foi possível carregar o quadro.';
  console.error(err);
});
