import { useState, useEffect, useRef } from 'react';
import { api } from './api.js';

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [view, setView] = useState('home');
  const [result, setResult] = useState(null);

  const onAuth = (d) => {
    localStorage.setItem('token', d.token);
    localStorage.setItem('user', JSON.stringify(d.user));
    setUser(d.user);
  };
  const logout = () => { localStorage.clear(); setUser(null); setView('home'); };
  const show = (r) => { setResult(r); setView('result'); };

  if (!user) return <Auth onAuth={onAuth} />;
  return (
    <div className="app">
      <header>
        <b>Mini Test App</b>
        <nav>
          <button onClick={() => setView('home')}>Home</button>
          <button onClick={() => setView('history')}>History</button>
          {user.role === 'admin' && <button onClick={() => setView('admin')}>Add question</button>}
          <button onClick={logout}>Log out ({user.name})</button>
        </nav>
      </header>
      <main>
        {view === 'home' && <Home onStart={() => setView('test')} />}
        {view === 'test' && <Test onDone={show} />}
        {view === 'result' && <Result r={result} />}
        {view === 'history' && <History onOpen={show} />}
        {view === 'admin' && <Admin />}
      </main>
    </div>
  );
}

function Auth({ onAuth }) {
  const [signup, setSignup] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { onAuth(await api(signup ? '/auth/signup' : '/auth/login', 'POST', f)); }
    catch (x) { setErr(x.message); }
  };
  return (
    <div className="card auth">
      <h2>{signup ? 'Create your account' : 'Log in to take the test'}</h2>
      <form onSubmit={submit}>
        {signup && <input placeholder="Name" value={f.name} onChange={set('name')} required />}
        <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (6+ characters)" value={f.password} onChange={set('password')} required />
        {err && <p className="err">{err}</p>}
        <button className="primary">{signup ? 'Sign up' : 'Log in'}</button>
      </form>
      <p className="muted">
        {signup ? 'Already registered?' : 'New here?'}{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); setErr(''); setSignup(!signup); }}>
          {signup ? 'Log in' : 'Create an account'}
        </a>
      </p>
    </div>
  );
}

function Home({ onStart }) {
  return (
    <div className="card">
      <h2>Ready when you are</h2>
      <p>10 multiple-choice questions. You have 10 minutes, and the test submits itself when the time is up.</p>
      <button className="primary" onClick={onStart}>Start test</button>
    </div>
  );
}

function Test({ onDone }) {
  const [t, setT] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [left, setLeft] = useState(600);
  const [err, setErr] = useState('');
  const end = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    api('/tests/start', 'POST')
      .then((d) => { end.current = Date.now() + d.secondsLeft * 1000; setLeft(d.secondsLeft); setT(d); })
      .catch((e) => setErr(e.message));
  }, []);

  const submit = async () => {
    if (done.current || !t) return;
    done.current = true;
    try { onDone(await api(`/tests/${t.attemptId}/submit`, 'POST', { answers: t.questions.map((_, i) => answers[i] ?? -1) })); }
    catch (e) { done.current = false; setErr(e.message); }
  };

  useEffect(() => {
    if (!t) return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((end.current - Date.now()) / 1000)); // from the clock, not a counter
      setLeft(s);
      if (s === 0) { clearInterval(id); submit(); }
    }, 500);
    return () => clearInterval(id);
  }, [t, answers]);

  if (!t) return err ? <p className="err">{err}</p> : <p>Loading questions…</p>;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pick = (i, j) => { const a = [...answers]; a[i] = j; setAnswers(a); };

  return (
    <div>
      <div className={'timer' + (left <= 60 ? ' low' : '')}>{mm}:{ss}</div>
      {t.questions.map((q, i) => (
        <div className="card" key={q._id}>
          <p className="q">{i + 1}. {q.text}</p>
          {q.options.map((o, j) => (
            <label key={j} className="opt">
              <input type="radio" name={q._id} checked={answers[i] === j} onChange={() => pick(i, j)} /> {o}
            </label>
          ))}
        </div>
      ))}
      {err && <p className="err">{err}</p>}
      <button className="primary" onClick={submit}>Submit test</button>
    </div>
  );
}

function Result({ r }) {
  if (!r) return null;
  return (
    <div>
      <div className="card">
        <h2>You scored {r.score} out of {r.total}</h2>
        <p className="muted">{new Date(r.submittedAt).toLocaleString()}</p>
      </div>
      {r.review.map((q, i) => {
        const ok = q.chosen === q.correct;
        return (
          <div key={i} className={'card ' + (ok ? 'right' : 'wrong')}>
            <p className="q">{i + 1}. {q.text} <span>{ok ? 'Correct' : q.chosen < 0 ? 'Not answered' : 'Wrong'}</span></p>
            {q.options.map((o, j) => (
              <div key={j} className={j === q.correct ? 'good' : j === q.chosen ? 'bad' : ''}>
                {o}{j === q.correct && ' (correct answer)'}{j === q.chosen && j !== q.correct && ' (your answer)'}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function History({ onOpen }) {
  const [list, setList] = useState(null);
  useEffect(() => { api('/tests/attempts').then(setList); }, []);
  if (!list) return <p>Loading…</p>;
  if (!list.length) return <div className="card">No attempts yet. Take your first test from Home.</div>;
  return (
    <table>
      <thead><tr><th>Date</th><th>Score</th><th></th></tr></thead>
      <tbody>
        {list.map((a) => (
          <tr key={a.id}>
            <td>{new Date(a.submittedAt).toLocaleString()}</td>
            <td>{a.score} / {a.total}</td>
            <td><button onClick={async () => onOpen(await api('/tests/attempts/' + a.id))}>View answers</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Admin() {
  const empty = { text: '', options: ['', '', '', ''], correct: 0 };
  const [q, setQ] = useState(empty);
  const [msg, setMsg] = useState('');
  const setOpt = (i, v) => { const options = [...q.options]; options[i] = v; setQ({ ...q, options }); };
  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    try { await api('/admin/questions', 'POST', q); setQ(empty); setMsg('Question added'); }
    catch (x) { setMsg(x.message); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <h2>Add a question</h2>
      <textarea placeholder="Question" value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} required />
      {q.options.map((o, i) => (
        <div className="row" key={i}>
          <input type="radio" name="correct" checked={q.correct === i} onChange={() => setQ({ ...q, correct: i })} title="Correct answer" />
          <input placeholder={'Option ' + (i + 1)} value={o} onChange={(e) => setOpt(i, e.target.value)} required />
        </div>
      ))}
      <p className="muted">Select the radio button next to the correct option.</p>
      <button className="primary">Save question</button>
      {msg && <p className="muted">{msg}</p>}
    </form>
  );
}
