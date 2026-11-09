import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import Icon from '../components/Icon';
import { LoadingContent } from '../components/WorkspaceLoading';
import Workspace from '../components/Workspace';
import { resolveProfile } from '../Session';
import { supabase } from '../supabaseClient';
import { localDate } from '../api';
type Entry = {
  id: string;
  kind: string;
  amount: string;
  currency: string;
  category: string;
  note: string;
  occurred_on: string;
  entry_status: string;
  source: string;
  revision: number;
};
type Settings = {
  currency: string;
  next_payday: string;
  reserved_amount: string;
  revision?: number;
};
type Snapshot = {
  settings: Settings | null;
  entries: Entry[];
  income_total: string;
  expense_total: string;
  planned_income: string;
  planned_expenses: string;
  entry_count: number;
};
const empty = (): Entry => ({
  id: crypto.randomUUID(),
  kind: 'expense',
  amount: '',
  currency: 'PHP',
  category: '',
  note: '',
  occurred_on: localDate(),
  entry_status: 'posted',
  source: 'manual',
  revision: 0,
});
export default function Allowance() {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const requestNumber = useRef({ number: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [saved, setSaved] = useState('');
  const [owner, setOwner] = useState('');
  const [data, setData] = useState<Snapshot | null>(null);
  const [settings, setSettings] = useState<Settings>({
    currency: 'PHP',
    next_payday: '',
    reserved_amount: '0',
  });
  const [entry, setEntry] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forecast, setForecast] = useState(localDate());
  async function load(id = owner, refreshSettings = true) {
    const request = ++requestNumber.current.number;
    setHistoryLoading(true);
    try {
      let query = supabase
        .from('allowance_entries')
        .select('*', { count: 'exact' })
        .eq('user_id', id);
      if (filter === 'income' || filter === 'expense') query = query.eq('kind', filter);
      if (filter === 'planned') query = query.eq('entry_status', 'planned');
      if (search.trim()) {
        // Quote PostgREST values and escape LIKE wildcards for literal search.
        const term = search.trim().replace(/[\\%_]/g, '\\$&');
        query = query.or(
          ['category', 'note', 'source']
            .map((column) => `${column}.ilike.${JSON.stringify('%' + term + '%')}`)
            .join(','),
        );
      }
      const [snapshot, result] = await Promise.all([
        supabase.rpc('allowance_forecast_snapshot', {
          p_profile: id,
          p_today: localDate(),
          p_forecast: forecast,
          p_limit: 1,
        }),
        query
          .order('occurred_on', { ascending: false })
          .order('id', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1),
      ]);
      if (request !== requestNumber.current.number) return;
      if (snapshot.error) throw snapshot.error;
      if (result.error) throw result.error;
      const next = Array.isArray(snapshot.data) ? snapshot.data[0] : snapshot.data;
      setTotalEntries(result.count || 0);
      const lastPage = Math.max(1, Math.ceil((result.count || 0) / pageSize));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setData({ ...next, entries: result.data || [] });
      if (next.settings && (refreshSettings || !data)) setSettings(next.settings);
    } finally {
      if (request === requestNumber.current.number) {
        setHistoryLoading(false);
        setInitializing(false);
      }
    }
  }
  const initialize = useEffectEvent(() => {
    resolveProfile()
      .then((p) => {
        if (!p.features?.includes('Allowance'))
          throw new Error('Enable Budget & allowance in Profile & settings.');
        setOwner(p.id);
      })
      .catch((e) => {
        setError(e.message);
        setInitializing(false);
      });
  });
  useEffect(() => {
    initialize();
  }, []);
  const refreshHistory = useEffectEvent(() => {
    load(owner, false).catch((e) => setError(e.message));
  });
  useEffect(() => {
    if (!owner) return;
    const requests = requestNumber.current;
    const timer = setTimeout(() => refreshHistory(), search.trim() ? 250 : 0);
    return () => {
      clearTimeout(timer);
      requests.number++;
    };
  }, [owner, page, filter, search]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const values = {
        ...entry,
        source: entry.kind === 'expense' ? 'manual' : entry.source,
        user_id: owner,
        currency: settings.currency,
      };
      const { revision, ...payload } = values;
      const result = editing
        ? await supabase
            .from('allowance_entries')
            .update(payload)
            .eq('id', entry.id)
            .eq('user_id', owner)
            .eq('revision', revision)
            .select()
        : await supabase.from('allowance_entries').insert(payload).select();
      if (result.error) throw result.error;
      if (!result.data?.length)
        throw new Error('This entry changed elsewhere. Refresh before editing.');
      setEntry(empty());
      setEditing(false);
      await load();
      setSaved(editing ? 'Transaction updated.' : 'Transaction added.');
    });
  }
  const cents = (v: string | number) => Math.round(Number(v) * 100);
  const balance = cents(data?.income_total || 0) - cents(data?.expense_total || 0);
  const spendable = balance - cents(settings.reserved_amount);
  const days = Math.max(
    0,
    Math.round((Date.parse(settings.next_payday) - Date.parse(localDate())) / 86400000),
  );
  const money = (v: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: settings.currency }).format(
      v / 100,
    );
  const pageCount = Math.max(1, Math.ceil(totalEntries / pageSize));
  const pageNumbers =
    pageCount <= 7
      ? Array.from({ length: pageCount }, (_, index) => index + 1)
      : Array.from(
          new Set([
            1,
            page - 1,
            page,
            page + 1,
            pageCount,
            ...(page <= 3 ? [2, 3] : []),
            ...(page >= pageCount - 2 ? [pageCount - 2, pageCount - 1] : []),
          ]),
        )
          .filter((n) => n >= 1 && n <= pageCount)
          .sort((a, b) => a - b);

  const income = cents(data?.income_total || 0);
  const expenses = cents(data?.expense_total || 0);
  const dateLabel = (date: string) =>
    date
      ? new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Not set';
  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const values = {
        currency: settings.currency,
        next_payday: settings.next_payday,
        reserved_amount: settings.reserved_amount,
      };
      const result =
        settings.revision !== undefined
          ? await supabase
              .from('allowance_settings')
              .update(values)
              .eq('user_id', owner)
              .eq('revision', settings.revision)
              .select()
          : await supabase
              .from('allowance_settings')
              .insert({ ...values, user_id: owner })
              .select();
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error('Settings changed elsewhere. Refresh and retry.');
      await load();
      setSaved('Budget settings saved.');
    });
  }
  async function remove(row: Entry) {
    await run(async () => {
      const { data: deleted, error } = await supabase
        .from('allowance_entries')
        .delete()
        .eq('id', row.id)
        .eq('user_id', owner)
        .eq('revision', row.revision)
        .select();
      if (error) throw error;
      if (!deleted?.length) throw new Error('Entry changed elsewhere. Refresh and retry.');
      if (editing && entry.id === row.id) {
        setEditing(false);
        setEntry(empty());
      }
      await load();
      setSaved('Transaction deleted.');
    });
  }
  return (
    <Workspace
      title="Budget & allowance"
      description="A clear picture of your money. A little more peace of mind."
    >
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="budget-success">
          <Icon name="check" size={16} />
          {saved}
          <button
            className="icon-button"
            aria-label="Dismiss confirmation"
            onClick={() => setSaved('')}
          >
            <Icon name="close" size={15} />
          </button>
        </p>
      )}
      {initializing ? (
        <LoadingContent />
      ) : (
        <div className="budget-page">
          <section className="budget-overview" aria-label="Budget overview">
            <div className="budget-balance-card">
              <div className="budget-balance-top">
                <span className="budget-label">AVAILABLE BALANCE</span>
                <span className="budget-currency">
                  {settings.currency}
                  <Icon name="allowance" size={15} />
                </span>
              </div>
              <strong className="budget-balance">{data ? money(balance) : '—'}</strong>
              <p>Your recorded income, minus your spending.</p>
              <div className="budget-balance-footer">
                <div>
                  <span>Safe to spend</span>
                  <strong>{data ? money(spendable) : '—'}</strong>
                </div>
                <span className="budget-balance-divider" />
                <div>
                  <span>Set aside</span>
                  <strong>{data ? money(cents(settings.reserved_amount)) : '—'}</strong>
                </div>
              </div>
            </div>
            <div className="budget-daily-card">
              <div className="budget-card-heading">
                <span className="budget-icon">
                  <Icon name="calendar" size={21} />
                </span>
                <span className="budget-small-label">YOUR DAILY ALLOWANCE</span>
              </div>
              <strong>
                {data && days ? money(Math.floor(Math.max(0, spendable) / days)) : '—'}
                <small>/ day</small>
              </strong>
              <p>
                {days
                  ? `Spread your spendable balance over the next ${days} days.`
                  : 'Set your next payday in budget settings to get started.'}
              </p>
              <div className="budget-payday">
                <span>Next payday</span>
                <b>{dateLabel(settings.next_payday)}</b>
              </div>
            </div>
          </section>
          <section className="budget-summary" aria-label="Recorded totals">
            {[
              {
                label: 'Total income',
                value: income,
                icon: 'arrow',
                tone: 'income',
                hint: 'Money coming in',
              },
              {
                label: 'Total expenses',
                value: expenses,
                icon: 'arrow',
                tone: 'expense',
                hint: 'Money going out',
              },
              {
                label: 'Reserved funds',
                value: cents(settings.reserved_amount),
                icon: 'goals',
                tone: 'reserved',
                hint: 'Kept for what matters',
              },
            ].map((stat) => (
              <div className="budget-summary-card" key={stat.label}>
                <span className={'budget-icon ' + stat.tone}>
                  <Icon name={stat.icon} size={20} />
                </span>
                <div>
                  <span>{stat.label}</span>
                  <strong>{data ? money(stat.value) : '—'}</strong>
                  <small>{stat.hint}</small>
                </div>
              </div>
            ))}
          </section>
          <div className="budget-content-grid">
            <div className="budget-main-column">
              <section className="feature-panel budget-history">
                <header className="budget-panel-header">
                  <div>
                    <h2>Transactions</h2>
                    <p>Your everyday money movements.</p>
                  </div>
                  <span className="budget-count">{data?.entry_count || 0} entries</span>
                </header>
                <div className="budget-history-tools">
                  <div className="budget-filter" role="group" aria-label="Filter transactions">
                    {['all', 'income', 'expense', 'planned'].map((value) => (
                      <button
                        key={value}
                        aria-pressed={filter === value}
                        className={filter === value ? 'selected' : ''}
                        onClick={() => {
                          setPage(1);
                          setFilter(value);
                        }}
                      >
                        {value === 'all'
                          ? 'All transactions'
                          : value === 'expense'
                            ? 'Expenses'
                            : value.charAt(0).toUpperCase() + value.slice(1)}
                      </button>
                    ))}
                  </div>
                  <input
                    className="feature-input budget-search"
                    aria-label="Search transactions"
                    placeholder="Search transactions…"
                    value={search}
                    onChange={(e) => {
                      setPage(1);
                      setSearch(e.target.value);
                    }}
                  />
                </div>
                <div className="budget-ledger" aria-busy={historyLoading}>
                  <div className="budget-ledger-head">
                    <span>Transaction</span>
                    <span>Amount</span>
                    <span className="budget-actions-label">Actions</span>
                  </div>
                  {!historyLoading &&
                    data?.entries.map((row) => (
                      <article className="budget-transaction" key={row.id}>
                        <div
                          className={
                            'budget-icon ' + (row.kind === 'income' ? 'income' : 'expense')
                          }
                        >
                          <Icon name="arrow" size={18} />
                        </div>
                        <div className="budget-transaction-info">
                          <h3>
                            {row.category || (row.kind === 'income' ? 'Income' : 'Expense')}
                            {row.entry_status === 'planned' && (
                              <span className="budget-planned">Planned</span>
                            )}
                          </h3>
                          <p>
                            {dateLabel(row.occurred_on)}
                            <span>·</span>
                            {row.source === 'salary' ? 'Salary' : 'Manual entry'}
                          </p>
                          {row.note && <p className="budget-note">{row.note}</p>}
                        </div>
                        <strong
                          className={
                            'budget-transaction-amount ' + (row.kind === 'income' ? 'income' : '')
                          }
                        >
                          {row.kind === 'expense' ? '−' : '+'}
                          {money(cents(row.amount))}
                        </strong>
                        <div className="budget-transaction-actions">
                          <button
                            className="icon-button"
                            disabled={busy}
                            aria-label={'Edit ' + (row.category || row.kind)}
                            title="Edit transaction"
                            onClick={() => {
                              setEntry(row);
                              setEditing(true);
                              document
                                .getElementById('budget-entry-form')
                                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          >
                            <Icon name="notes" size={17} />
                          </button>
                          <button
                            className="icon-button budget-delete"
                            disabled={busy}
                            aria-label={'Delete ' + (row.category || row.kind)}
                            title="Delete transaction"
                            onClick={() => remove(row)}
                          >
                            <Icon name="close" size={17} />
                          </button>
                        </div>
                      </article>
                    ))}
                  {historyLoading && (
                    <div className="budget-empty" role="status">
                      Loading transactions…
                    </div>
                  )}
                  {!historyLoading && !data?.entries.length && (
                    <div className="budget-empty">
                      <span className="budget-icon">
                        <Icon name="allowance" size={27} />
                      </span>
                      <h3>
                        {filter !== 'all' || search.trim()
                          ? 'No matching transactions'
                          : 'Your next chapter starts here'}
                      </h3>
                      <p>
                        {filter !== 'all' || search.trim()
                          ? 'Try a different filter or search term.'
                          : 'Record your first income or opening balance, then track your spending as you go.'}
                      </p>
                    </div>
                  )}
                </div>
                <footer className="budget-pagination">
                  <p role="status">
                    {historyLoading
                      ? 'Loading…'
                      : totalEntries
                        ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalEntries)} of ${totalEntries} transactions`
                        : '0 transactions'}
                  </p>
                  <nav aria-label="Transaction pages">
                    <button
                      className="budget-page-button"
                      disabled={historyLoading || busy || page === 1}
                      onClick={() => setPage(page - 1)}
                      aria-label="Previous transaction page"
                    >
                      Previous
                    </button>
                    {pageNumbers.map((number, index) => (
                      <span className="budget-page-item" key={number}>
                        {index > 0 && number - pageNumbers[index - 1] > 1 && (
                          <span className="budget-page-gap" aria-hidden="true">
                            …
                          </span>
                        )}
                        <button
                          className={'budget-page-button ' + (page === number ? 'current' : '')}
                          aria-label={'Transaction page ' + number}
                          aria-current={page === number ? 'page' : undefined}
                          disabled={historyLoading || busy}
                          onClick={() => setPage(number)}
                        >
                          {number}
                        </button>
                      </span>
                    ))}
                    <button
                      className="budget-page-button"
                      disabled={historyLoading || busy || page >= pageCount}
                      onClick={() => setPage(page + 1)}
                      aria-label="Next transaction page"
                    >
                      Next
                    </button>
                  </nav>
                </footer>
              </section>
              <section className="feature-panel budget-forecast">
                <header className="budget-panel-header">
                  <div>
                    <span className="eyebrow">LOOKING AHEAD</span>
                    <h2>Your balance, projected</h2>
                    <p>See how planned income and expenses could change your balance.</p>
                  </div>
                  <span className="budget-icon">
                    <Icon name="goals" size={21} />
                  </span>
                </header>
                <div className="budget-forecast-controls">
                  <label>
                    Forecast through
                    <input
                      className="feature-input"
                      type="date"
                      value={forecast}
                      onChange={(e) => setForecast(e.target.value)}
                    />
                  </label>
                  <button
                    className="btn-secondary"
                    disabled={busy || !owner}
                    onClick={() => run(() => load())}
                  >
                    Update forecast
                    <Icon name="arrow" size={16} />
                  </button>
                </div>
                <div className="budget-forecast-totals">
                  <div>
                    <span>Planned income</span>
                    <strong className="income">+{money(cents(data?.planned_income || 0))}</strong>
                  </div>
                  <div>
                    <span>Planned expenses</span>
                    <strong>−{money(cents(data?.planned_expenses || 0))}</strong>
                  </div>
                  <div className="budget-projection">
                    <span>Projected balance</span>
                    <strong>
                      {data
                        ? money(
                            balance +
                              cents(data?.planned_income || 0) -
                              cents(data?.planned_expenses || 0),
                          )
                        : '—'}
                    </strong>
                  </div>
                </div>
              </section>
            </div>
            <aside className="budget-form-column" aria-label="Manage your budget">
              <form
                className="feature-panel budget-entry-form"
                id="budget-entry-form"
                onSubmit={save}
              >
                <header className="budget-panel-header">
                  <div>
                    <h2>{editing ? 'Edit transaction' : 'Add a transaction'}</h2>
                    <p>
                      {editing ? 'Keep your records up to date.' : 'Every little detail adds up.'}
                    </p>
                  </div>
                  <span className="budget-icon">
                    <Icon name={editing ? 'notes' : 'plus'} size={20} />
                  </span>
                </header>
                <div className="budget-type-switch" role="group" aria-label="Transaction type">
                  {['expense', 'income'].map((kind) => (
                    <button
                      type="button"
                      key={kind}
                      aria-pressed={entry.kind === kind}
                      className={entry.kind === kind ? 'selected ' + kind : ''}
                      onClick={() =>
                        setEntry({
                          ...entry,
                          kind,
                          source: kind === 'expense' ? 'manual' : entry.source,
                        })
                      }
                    >
                      <Icon name="arrow" size={16} />
                      {kind === 'expense' ? 'Expense' : 'Income'}
                    </button>
                  ))}
                </div>
                <label className="budget-amount-label">
                  Amount
                  <span className="budget-amount-input">
                    <span>{settings.currency}</span>
                    <input
                      aria-label="Transaction amount"
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={entry.amount}
                      onChange={(e) => setEntry({ ...entry, amount: e.target.value })}
                    />
                  </span>
                </label>
                <div className="budget-field-pair">
                  <label>
                    Date
                    <input
                      className="feature-input"
                      type="date"
                      required
                      value={entry.occurred_on}
                      onChange={(e) => setEntry({ ...entry, occurred_on: e.target.value })}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      className="feature-input"
                      value={entry.entry_status}
                      onChange={(e) => setEntry({ ...entry, entry_status: e.target.value })}
                    >
                      <option value="posted">Posted</option>
                      <option value="planned">Planned</option>
                    </select>
                  </label>
                </div>
                <label>
                  Category
                  <input
                    className="feature-input"
                    placeholder={
                      entry.kind === 'expense' ? 'e.g. Food & drinks' : 'e.g. Monthly salary'
                    }
                    value={entry.category}
                    onChange={(e) => setEntry({ ...entry, category: e.target.value })}
                  />
                </label>
                {entry.kind === 'income' && (
                  <label>
                    Income source
                    <select
                      className="feature-input"
                      value={entry.source}
                      onChange={(e) => setEntry({ ...entry, source: e.target.value })}
                    >
                      <option value="manual">Manual entry</option>
                      <option value="salary">Salary</option>
                    </select>
                  </label>
                )}
                <label>
                  Note <span className="budget-optional">Optional</span>
                  <textarea
                    className="feature-input"
                    rows={2}
                    placeholder="A little context for later…"
                    value={entry.note}
                    onChange={(e) => setEntry({ ...entry, note: e.target.value })}
                  />
                </label>
                <button className="btn-primary" disabled={busy || !owner}>
                  <Icon name={editing ? 'check' : 'plus'} size={17} />
                  {busy ? 'Saving…' : editing ? 'Update transaction' : 'Save transaction'}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busy}
                    onClick={() => {
                      setEntry(empty());
                      setEditing(false);
                    }}
                  >
                    Cancel editing
                  </button>
                )}
              </form>
              <details
                className="feature-panel budget-settings"
                open={!data?.settings ? true : undefined}
              >
                <summary>
                  <span className="budget-icon">
                    <Icon name="settings" size={19} />
                  </span>
                  <span>
                    Budget settings<small>Currency, payday & reserves</small>
                  </span>
                  <span className="budget-settings-chevron">⌄</span>
                </summary>
                <form onSubmit={saveSettings} className="stack">
                  <label>
                    Currency
                    <select
                      className="feature-input"
                      value={settings.currency}
                      disabled={!!data?.entry_count}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    >
                      {['PHP', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CAD', 'CNY', 'INR'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  {!!data?.entry_count && (
                    <p className="budget-field-help">
                      Your ledger uses one currency. It stays locked while transactions exist.
                    </p>
                  )}
                  <label>
                    Next payday
                    <input
                      className="feature-input"
                      type="date"
                      required
                      min={localDate()}
                      value={settings.next_payday}
                      onChange={(e) => setSettings({ ...settings, next_payday: e.target.value })}
                    />
                  </label>
                  <label>
                    Amount to set aside
                    <input
                      className="feature-input"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={settings.reserved_amount}
                      onChange={(e) =>
                        setSettings({ ...settings, reserved_amount: e.target.value })
                      }
                    />
                  </label>
                  <p className="budget-field-help">
                    Reserved money is excluded from your daily allowance.
                  </p>
                  <button className="btn-secondary" disabled={busy || !owner}>
                    Save budget settings
                  </button>
                </form>
              </details>
            </aside>
          </div>
        </div>
      )}
    </Workspace>
  );
}
