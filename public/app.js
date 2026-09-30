import React, { useCallback, useEffect, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);

function App() {
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);

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
        setSelected(null);
        setDetails(null);
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
                        <code>/${link.code}</code>
                        <span className="original">${link.url}</span>
                        <span className="clicks">${link.clicks} clique(s)</span>
                      </div>
                      <button
                        className="danger"
                        onClick=${(event) => handleDelete(link.code, event)}
                      >
                        Deletar
                      </button>
                    </li>
                  `,
                )}
              </ul>
            `}
      </section>

      ${selected
        ? html`
            <section className="card">
              <h2>Detalhes do link</h2>
              ${details
                ? html`
                    <dl>
                      <dt>Código</dt>
                      <dd><code>/${selected}</code></dd>
                      <dt>URL original</dt>
                      <dd><a href=${details.url}>${details.url}</a></dd>
                      <dt>Cliques</dt>
                      <dd>${details.clicks}</dd>
                      <dt>Criado em</dt>
                      <dd>${new Date(details.createdAt).toLocaleString()}</dd>
                    </dl>
                  `
                : html`<p className="muted">Carregando…</p>`}
            </section>
          `
        : null}
    </main>
  `;
}

createRoot(document.getElementById('root')).render(html`<${App} />`);
