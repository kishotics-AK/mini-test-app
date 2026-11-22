const { Schema, model } = require('mongoose');

const User = model('User', new Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: String,
  role: { type: String, default: 'student' },
}));

const Question = model('Question', new Schema({
  text: String,
  options: [String],
  correct: Number, // index into options
}));

const Attempt = model('Attempt', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  questions: [Schema.Types.ObjectId], // order shown to the student
  answers: [Number],                  // -1 = unanswered
  score: Number,
  startedAt: Date,
  submittedAt: { type: Date, default: null },
}));

module.exports = { User, Question, Attempt };
