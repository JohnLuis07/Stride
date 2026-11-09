import { useEffect, useEffectEvent, useState } from 'react';
import { invoke } from '../api';
type Source = { id: string; name: string; status: string; title?: string };
type Citation = { source_id: string; title: string; page?: number };
type Material = {
  id: string;
  title?: string;
  question?: string;
  answer?: string;
  content?: string;
  citations?: Citation[];
  data?: {
    cards?: { front: string; back: string }[];
    questions?: { question: string; options: string[]; answer: number; explanation: string }[];
  };
};
export default function NoteStudy({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<Material[]>([]);
  const [artifacts, setArtifacts] = useState<Material[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pages, setPages] = useState(1);
  const call = (action: string, extra: Record<string, unknown> = {}) =>
    invoke('notes-ai', { action, note_id: noteId, ...extra });
  async function refresh() {
    const data = await call('overview');
    setSources(data.sources || []);
    setMessages(data.messages || []);
    setArtifacts(data.artifacts || []);
    if (data.warning) setError(data.warning);
  }
  const reload = useEffectEvent(() => {
    refresh().catch((e) => setError(e.message));
  });
  useEffect(() => {
    reload();
  }, [noteId]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function preview(id: string, page?: number) {
    const data = await call('preview_source', { source_id: id });
    window.open(data.url + (page ? '#page=' + page : ''), '_blank', 'noopener,noreferrer');
  }
  const refs = (item: Material) => (
    <div className="row">
      {item.citations?.map((c, i) => (
        <button key={i} disabled={busy} onClick={() => run(() => preview(c.source_id, c.page))}>
          {c.title}
          {c.page ? ' · p. ' + c.page : ''}
        </button>
      ))}
    </div>
  );
  return (
    <div className="modal-overlay">
      <section
        className="study-workspace"
        role="dialog"
        aria-modal="true"
        aria-label="Notebook study tools"
      >
        <div className="row">
          <div>
            <span className="eyebrow">NOTEBOOK</span>
            <h2>Sources & study tools</h2>
          </div>
          <button onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        <div className="study-grid">
          <section className="stack">
            <h3>Your sources</h3>
            <p>Saved note content is included. Select up to three ready PDFs.</p>
            <label>
              PDF page count
              <input
                className="feature-input"
                type="number"
                min="1"
                max="1000"
                value={pages}
                onChange={(e) => setPages(Number(e.target.value))}
              />
            </label>
            <label>
              Attach PDF (up to 10 MB)
              <input
                type="file"
                accept="application/pdf"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  run(async () => {
                    if (file.size > 10 * 1024 * 1024 || file.size === 0)
                      throw new Error('Choose a PDF up to 10 MB.');
                    if (!(await file.slice(0, 1024).text()).includes('%PDF-'))
                      throw new Error('Invalid PDF file.');
                    const upload = await call('begin_upload', {
                      name: file.name,
                      bytes: file.size,
                      pages,
                    });
                    const response = await fetch(upload.upload_url, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/pdf' },
                      body: file,
                    });
                    if (!response.ok)
                      throw new Error(
                        'Upload failed. Refresh, remove the pending source and retry.',
                      );
                    await call('index_source', { source_id: upload.source.id });
                    await refresh();
                  });
                }}
              />
            </label>
            {sources.map((s) => (
              <article className="feature-panel stack" key={s.id}>
                <label>
                  <input
                    type="checkbox"
                    disabled={
                      s.status !== 'ready' ||
                      busy ||
                      (!selected.includes(s.id) && selected.length >= 3)
                    }
                    checked={selected.includes(s.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, s.id]
                          : selected.filter((id) => id !== s.id),
                      )
                    }
                  />
                  {s.name || s.title} · {s.status}
                </label>
                <div className="row">
                  <button disabled={busy} onClick={() => run(() => preview(s.id))}>
                    Preview
                  </button>
                  {s.status !== 'ready' && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await call('index_source', { source_id: s.id });
                          await refresh();
                        })
                      }
                    >
                      Prepare / retry
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await call('delete_source', { source_id: s.id });
                        setSelected(selected.filter((id) => id !== s.id));
                        await refresh();
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
            <button disabled={busy} onClick={() => run(refresh)}>
              Refresh sources & history
            </button>
          </section>
          <section className="stack">
            <h3>Ask your notebook</h3>
            {messages.map((m) => (
              <article className="feature-panel stack" key={m.id}>
                <strong>{m.question}</strong>
                <p className="preserve-text">{m.answer || m.content}</p>
                {refs(m)}
              </article>
            ))}
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await call('chat', {
                    question,
                    source_ids: selected,
                    request_id: crypto.randomUUID(),
                  });
                  setQuestion('');
                  await refresh();
                });
              }}
            >
              <label>
                Question
                <textarea
                  className="feature-input"
                  required
                  maxLength={3000}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </label>
              <button className="btn-primary" disabled={busy}>
                {busy ? 'Working…' : 'Ask question'}
              </button>
            </form>
            <h3>Create study material</h3>
            <div className="row wrap">
              {['summary', 'study_guide', 'flashcards', 'quiz'].map((kind) => (
                <button
                  key={kind}
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await call('generate', {
                        kind,
                        source_ids: selected,
                        request_id: crypto.randomUUID(),
                      });
                      await refresh();
                    })
                  }
                >
                  {kind.replace('_', ' ')}
                </button>
              ))}
            </div>
            {artifacts.map((a) => (
              <article className="feature-panel stack" key={a.id}>
                <h3>{a.title}</h3>
                <p className="preserve-text">{a.content}</p>
                {a.data?.cards?.map((c, i) => (
                  <details key={i}>
                    <summary>{c.front}</summary>
                    <p>{c.back}</p>
                  </details>
                ))}
                {a.data?.questions?.map((q, i) => (
                  <fieldset key={i}>
                    <legend>{q.question}</legend>
                    {q.options.map((o, j) => (
                      <label key={j}>
                        <input type="radio" name={a.id + i} />
                        {o}
                      </label>
                    ))}
                    <details>
                      <summary>Reveal answer</summary>
                      <p>{q.options[q.answer]}</p>
                      <p>{q.explanation}</p>
                    </details>
                  </fieldset>
                ))}
                {refs(a)}
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await call('save_artifact', {
                        artifact_id: a.id,
                        save_id: crypto.randomUUID(),
                      });
                      setError('Saved as an editable note. Reopen Notes to view it.');
                    })
                  }
                >
                  Save as note
                </button>
              </article>
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}
