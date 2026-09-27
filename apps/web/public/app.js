import {
  createBoard,
  createCard,
  createColumn,
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
const addColumnButton = document.getElementById('add-column');
const deleteCardButton = document.querySelector('[data-action="delete-card"]');

let board = createBoard();
let dragId = null;
let editingId = null;

function indexOfStatus(statusId) {
  return board.columns.findIndex((c) => c.id === statusId);
}

function renderStatusOptions() {
  statusSelect.replaceChildren();
  for (const column of board.columns) {
    const option = document.createElement('option');
    option.value = column.id;
    option.textContent = column.title;
    statusSelect.append(option);
  }
}

async function load() {
  const res = await fetch('/api/boards');
  board = await res.json();
  if (!Array.isArray(board.columns) || board.columns.length === 0) {
    board.columns = createBoard().columns;
  }
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
  if (next < 0 || next >= board.columns.length) return;
  card.status = board.columns[next].id;
  save();
}

function openModal(card = null, columnId = null) {
  editingId = card ? card.id : null;
  modalTitle.textContent = card ? 'Editar cartão' : 'Novo cartão';
  titleInput.value = card ? card.title : '';
  descInput.value = card ? card.description || '' : '';
  tagsInput.value = card ? (card.tags || []).join(', ') : '';
  commentsInput.value = card ? (card.comments || []).map((c) => c.text).join('\n') : '';
  renderStatusOptions();
  statusSelect.value = columnId || (card ? card.status : board.columns[0].id);
  deleteCardButton.hidden = !card;
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
  renderStatusOptions();

  for (const status of board.columns) {
    const cards = board.cards.filter((c) => c.status === status.id);

    const column = document.createElement('section');
    column.className = 'column';
    column.dataset.status = status.id;

    const header = document.createElement('div');
    header.className = 'column-header';

    const heading = document.createElement('h2');
    heading.textContent = status.title;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = ` (${cards.length})`;
    heading.append(count);

    const actions = document.createElement('div');
    actions.className = 'column-actions';

    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'icon';
    addCard.title = 'Novo cartão nesta coluna';
    addCard.textContent = '+';
    addCard.addEventListener('click', () => openModal(null, status.id));

    const rename = document.createElement('button');
    rename.type = 'button';
    rename.className = 'icon';
    rename.title = 'Renomear coluna';
    rename.textContent = '✎';
    rename.addEventListener('click', () => {
      const next = prompt('Nome da coluna', status.title);
      if (next === null) return;
      const title = next.trim();
      if (!title) return;
      update(() => {
        status.title = title;
      });
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon danger';
    remove.title = 'Excluir coluna';
    remove.textContent = '×';
    remove.disabled = board.columns.length <= 1;
    remove.addEventListener('click', () => {
      if (board.columns.length <= 1) return;
      if (!confirm(`Excluir a coluna "${status.title}" e seus cartões?`)) return;
      update(() => {
        board.columns = board.columns.filter((c) => c.id !== status.id);
        board.cards = board.cards.filter((c) => c.status !== status.id);
      });
    });

    actions.append(addCard, rename, remove);
    header.append(heading, actions);
    column.append(header);

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
  node.querySelector('[data-action="right"]').disabled = index === board.columns.length - 1;

  node.querySelector('[data-action="left"]').addEventListener('click', (event) => {
    event.stopPropagation();
    moveCard(card.id, -1);
  });
  node.querySelector('[data-action="right"]').addEventListener('click', (event) => {
    event.stopPropagation();
    moveCard(card.id, 1);
  });

  node.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    openModal(card);
  });
  node.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('button')) return;
    event.preventDefault();
    openModal(card);
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
addColumnButton.addEventListener('click', () => {
  const next = prompt('Nome da nova coluna');
  if (next === null) return;
  const title = next.trim();
  if (!title) return;
  update(() => {
    board.columns.push(createColumn({ title }));
  });
});
deleteCardButton.addEventListener('click', () => {
  if (!editingId) return;
  const card = board.cards.find((c) => c.id === editingId);
  if (!card) return;
  if (!confirm(`Apagar "${card.title}"?`)) return;
  update(() => {
    board.cards = board.cards.filter((c) => c.id !== editingId);
  });
  closeModal();
});
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
      card.status = board.columns.some((c) => c.id === status) ? status : card.status;
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
