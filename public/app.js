import React, { useCallback, useEffect, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

function shortUrlFor(code) {
  return `${window.location.origin}/${code}`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function App() {
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [copied, setCopied] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/links');
      if (!res.ok) {
        throw new Error('Falha ao carregar os links.');
      }
      setLinks(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const closeModal = useCallback(() => {
    setSelected(null);
    setDetails(null);
  }, []);

  useEffect(() => {
    if (!selected) {
      return undefined;
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        closeModal();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected, closeModal]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const res = await fetch('/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          body.error === 'invalid_url'
            ? 'URL inválida. Use http:// ou https://.'
            : 'Não foi possível cadastrar o link.',
        );
        return;
      }
      setUrl('');
      setNotice(`Link criado: ${body.shortUrl}`);
      await refresh();
    } catch {
      setError('Erro de rede ao cadastrar o link.');
    }
  }

  async function handleSelect(code) {
    setSelected(code);
    setDetails(null);
    setError('');
    try {
      const res = await fetch(`/links/${code}/stats`);
      if (!res.ok) {
        throw new Error('Link não encontrado.');
      }
      setDetails(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCopy(code, event) {
    event.stopPropagation();
    setError('');
    try {
      await copyText(shortUrlFor(code));
      setCopied(code);
      setNotice('Link copiado!');
      window.setTimeout(() => setCopied((current) => (current === code ? null : current)), 2000);
    } catch {
      setError('Não foi possível copiar o link.');
    }
  }

  async function handleDelete(code, event) {
    event.stopPropagation();
    if (!window.confirm(`Deletar o link /${code}?`)) {
      return;
    }
    setError('');
    try {
      const res = await fetch(`/links/${code}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        throw new Error('Falha ao deletar o link.');
      }
      if (selected === code) {
        closeModal();
      }
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return html`
    <main className="container">
      <h1>Encurtador de Links</h1>

      <form className="card" onSubmit=${handleSubmit}>
        <label htmlFor="url">URL para encurtar</label>
        <div className="row">
          <input
            id="url"
            type="text"
            placeholder="https://exemplo.com"
            value=${url}
            onInput=${(event) => setUrl(event.target.value)}
          />
          <button type="submit">Encurtar</button>
        </div>
      </form>

      ${notice ? html`<p className="notice">${notice}</p>` : null}
      ${error ? html`<p className="error">${error}</p>` : null}

      <section className="card">
        <h2>Links cadastrados</h2>
        ${links.length === 0
          ? html`<p className="muted">Nenhum link cadastrado ainda.</p>`
          : html`
              <ul className="list">
                ${links.map(
                  (link) => html`
                    <li
                      key=${link.code}
                      className=${selected === link.code ? 'item selected' : 'item'}
                      onClick=${() => handleSelect(link.code)}
                    >
                      <div className="item-main">
                        <code className="short-url">${shortUrlFor(link.code)}</code>
                        <span className="original">${link.url}</span>
                        <span className="clicks">${link.clicks} clique(s)</span>
                      </div>
                      <div className="item-actions">
                        <button
                          className="copy"
                          onClick=${(event) => handleCopy(link.code, event)}
                        >
                          ${copied === link.code ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                          className="danger"
                          onClick=${(event) => handleDelete(link.code, event)}
                        >
                          Deletar
                        </button>
                      </div>
                    </li>
                  `,
                )}
              </ul>
            `}
      </section>

      ${selected
        ? html`
            <div className="modal-backdrop" onClick=${closeModal}>
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label="Detalhes do link"
                onClick=${(event) => event.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>Detalhes do link</h2>
                  <button className="close" onClick=${closeModal} aria-label="Fechar">×</button>
                </div>
                ${details
                  ? html`
                      <dl>
                        <dt>Link</dt>
                        <dd><a href=${shortUrlFor(selected)}>${shortUrlFor(selected)}</a></dd>
                        <dt>URL original</dt>
                        <dd><a href=${details.url}>${details.url}</a></dd>
                        <dt>Cliques</dt>
                        <dd>${details.clicks}</dd>
                        <dt>Criado em</dt>
                        <dd>${new Date(details.createdAt).toLocaleString()}</dd>
                      </dl>
                    `
                  : html`<p className="muted">Carregando…</p>`}
              </div>
            </div>
          `
        : null}
    </main>
  `;
}

createRoot(document.getElementById('root')).render(html`<${App} />`);
