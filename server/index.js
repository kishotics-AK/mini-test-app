require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Question, Attempt } = require('./models');

const app = express();
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const DURATION = 600; // 10 minutes, in seconds
const GRACE = 60;     // network slack before late answers are ignored

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const sign = (u) => jwt.sign({ id: u._id, role: u.role }, SECRET, { expiresIn: '7d' });
const auth = (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); next(); }
  catch { res.status(401).json({ error: 'Please log in again' }); }
};
const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' });

// ---------- auth ----------
app.post('/api/auth/signup', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email and a password of 6+ characters are required' });
  const e = email.toLowerCase().trim();
  if (await User.findOne({ email: e })) return res.status(409).json({ error: 'Email is already registered' });
  const role = e === (process.env.ADMIN_EMAIL || '').toLowerCase().trim() ? 'admin' : 'student';
  const u = await User.create({ name, email: e, password: await bcrypt.hash(password, 10), role });
  res.json({ token: sign(u), user: { name: u.name, role: u.role } });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password)))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(u), user: { name: u.name, role: u.role } });
}));

// ---------- tests ----------
const ordered = async (a) => {
  const qs = await Question.find({ _id: { $in: a.questions } });
  return a.questions.map((id) => qs.find((q) => q._id.equals(id)));
};
const detail = (a, qs) => ({
  id: a._id, score: a.score, total: qs.length, submittedAt: a.submittedAt,
  review: qs.map((q, i) => ({ text: q.text, options: q.options, chosen: a.answers[i], correct: q.correct })),
});
const grade = async (a, answers) => {
  const qs = await ordered(a);
  a.answers = qs.map((_, i) => (Number.isInteger(answers[i]) ? answers[i] : -1));
  a.score = qs.filter((q, i) => a.answers[i] === q.correct).length;
  a.submittedAt = new Date();
  await a.save();
  return detail(a, qs);
};
const elapsed = (a) => (Date.now() - a.startedAt) / 1000;

// Start a test, or resume the one in progress (so a refresh can't reset the clock).
app.post('/api/tests/start', auth, wrap(async (req, res) => {
  let a = await Attempt.findOne({ user: req.user.id, submittedAt: null }).sort('-startedAt');
  if (a && elapsed(a) > DURATION + GRACE) { await grade(a, []); a = null; }
  if (!a) {
    const picked = await Question.aggregate([{ $sample: { size: 10 } }]);
    if (!picked.length) return res.status(400).json({ error: 'No questions available yet' });
    a = await Attempt.create({ user: req.user.id, questions: picked.map((q) => q._id), startedAt: new Date() });
  }
  const qs = await ordered(a);
  res.json({
    attemptId: a._id,
    secondsLeft: Math.max(0, Math.round(DURATION - elapsed(a))),
    questions: qs.map((q) => ({ _id: q._id, text: q.text, options: q.options })), // no answers sent
  });
}));

app.post('/api/tests/:id/submit', auth, wrap(async (req, res) => {
  const a = await Attempt.findOne({ _id: req.params.id, user: req.user.id });
  if (!a) return res.status(404).json({ error: 'Attempt not found' });
  if (a.submittedAt) return res.status(400).json({ error: 'Already submitted' });
  const late = elapsed(a) > DURATION + GRACE;
  res.json(await grade(a, late || !Array.isArray(req.body.answers) ? [] : req.body.answers));
}));

app.get('/api/tests/attempts', auth, wrap(async (req, res) => {
  const list = await Attempt.find({ user: req.user.id, submittedAt: { $ne: null } }).sort('-submittedAt');
  res.json(list.map((a) => ({ id: a._id, score: a.score, total: a.questions.length, submittedAt: a.submittedAt })));
}));

app.get('/api/tests/attempts/:id', auth, wrap(async (req, res) => {
  const a = await Attempt.findOne({ _id: req.params.id, user: req.user.id, submittedAt: { $ne: null } });
  if (!a) return res.status(404).json({ error: 'Attempt not found' });
  res.json(detail(a, await ordered(a)));
}));

// ---------- admin ----------
app.post('/api/admin/questions', auth, adminOnly, wrap(async (req, res) => {
  const { text, options, correct } = req.body;
  if (!text || !Array.isArray(options) || options.length < 2 || options.some((o) => !o) ||
      !Number.isInteger(correct) || correct < 0 || correct >= options.length)
    return res.status(400).json({ error: 'Enter the question, every option, and mark one correct answer' });
  res.json(await Question.create({ text, options, correct }));
}));

// ---------- serve the React build ----------
const dist = path.join(__dirname, '../client/dist');
app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Something went wrong' }); });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  if (!(await Question.countDocuments())) await Question.insertMany(require('./questions')); // seed once
  app.listen(process.env.PORT || 5000, () => console.log('Server running'));
}).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
