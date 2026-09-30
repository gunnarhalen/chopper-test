const createForm = document.querySelector('#create-form');
const urlInput = document.querySelector('#url-input');
const createError = document.querySelector('#create-error');
const result = document.querySelector('#result');
const shortUrl = document.querySelector('#short-url');
const copyButton = document.querySelector('#copy-button');
const shareButton = document.querySelector('#share-button');
const refreshButton = document.querySelector('#refresh-button');
const listEmpty = document.querySelector('#list-empty');
const linksList = document.querySelector('#links-list');
const detailsDialog = document.querySelector('#details-dialog');
const detailsContent = document.querySelector('#details-content');
const detailsClose = document.querySelector('#details-close');

const ERROR_MESSAGES = {
  invalid_url: 'Informe uma URL válida começando com http:// ou https://.',
  invalid_json: 'Não foi possível enviar os dados. Tente novamente.',
  not_found: 'Link não encontrado.',
};

function showError(message) {
  createError.textContent = message;
  createError.hidden = false;
}

function clearError() {
  createError.textContent = '';
  createError.hidden = true;
}

async function readError(res, fallback) {
  try {
    const body = await res.json();
    return ERROR_MESSAGES[body.error] ?? fallback;
  } catch {
    return fallback;
  }
}

async function copy(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

function buildShortUrl(code) {
  return `${window.location.origin}/${code}`;
}

function createButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (className) {
    button.className = className;
  }
  button.addEventListener('click', onClick);
  return button;
}

function renderLinks(links) {
  linksList.textContent = '';
  listEmpty.hidden = links.length > 0;

  for (const link of links) {
    const item = document.createElement('li');
    item.className = 'link-item';

    const info = document.createElement('div');
    info.className = 'link-info';

    const anchor = document.createElement('a');
    anchor.className = 'short-url';
    anchor.href = buildShortUrl(link.code);
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.textContent = buildShortUrl(link.code);

    const target = document.createElement('span');
    target.className = 'link-target';
    target.textContent = link.url;

    info.append(anchor, target);

    const clicks = document.createElement('span');
    clicks.className = 'clicks';
    clicks.textContent = `${link.clicks} clique${link.clicks === 1 ? '' : 's'}`;

    const actions = document.createElement('div');
    actions.className = 'link-actions';
    actions.append(
      createButton('Detalhes', 'ghost', () => showDetails(link.code)),
      createButton('Excluir', 'danger', () => deleteLink(link.code)),
    );

    item.append(info, clicks, actions);
    linksList.append(item);
  }
}

async function loadLinks() {
  const res = await fetch('/links');
  if (!res.ok) {
    showError('Não foi possível carregar a lista de links.');
    return;
  }
  const { links } = await res.json();
  renderLinks(links);
}

async function showDetails(code) {
  const res = await fetch(`/links/${code}/stats`);
  if (!res.ok) {
    showError(await readError(res, 'Não foi possível carregar os detalhes.'));
    return;
  }

  const data = await res.json();
  detailsContent.textContent = '';

  const rows = [
    ['Link curto', buildShortUrl(code)],
    ['URL de destino', data.url],
    ['Cliques', String(data.clicks)],
    ['Criado em', new Date(data.createdAt).toLocaleString('pt-BR')],
  ];

  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    detailsContent.append(dt, dd);
  }

  detailsDialog.showModal();
}

async function deleteLink(code) {
  if (!window.confirm('Deseja realmente excluir este link?')) {
    return;
  }

  const res = await fetch(`/links/${code}`, { method: 'DELETE' });
  if (res.ok) {
    await loadLinks();
    return;
  }
  showError(await readError(res, 'Não foi possível excluir o link.'));
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();
  result.hidden = true;

  const res = await fetch('/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: urlInput.value.trim() }),
  });

  if (!res.ok) {
    showError(await readError(res, 'Não foi possível encurtar o link.'));
    return;
  }

  const { code } = await res.json();
  const generated = buildShortUrl(code);
  shortUrl.href = generated;
  shortUrl.textContent = generated;
  result.hidden = false;
  urlInput.value = '';
  await loadLinks();
});

copyButton.addEventListener('click', async () => {
  const copied = await copy(shortUrl.href);
  copyButton.textContent = copied ? 'Copiado!' : 'Copie manualmente';
  setTimeout(() => {
    copyButton.textContent = 'Copiar';
  }, 2000);
});

shareButton.addEventListener('click', async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Link encurtado', url: shortUrl.href });
      return;
    } catch {
      return;
    }
  }
  const copied = await copy(shortUrl.href);
  shareButton.textContent = copied ? 'Copiado!' : 'Copie manualmente';
  setTimeout(() => {
    shareButton.textContent = 'Compartilhar';
  }, 2000);
});

refreshButton.addEventListener('click', () => {
  clearError();
  loadLinks();
});

detailsClose.addEventListener('click', () => {
  detailsDialog.close();
});

loadLinks();
