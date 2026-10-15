import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return counter.seq;
}

export async function peekSequence(name) {
  const counter = await Counter.findById(name).lean();
  return (counter?.seq ?? 0) + 1;
}
