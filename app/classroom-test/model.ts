export type Period = { id: string; name: string };
export type Student = { id: string; name: string; periodId: string; balance: number; archived: boolean; demo?: boolean };
export type Category = { id: string; name: string; points: number; icon: string };
export type Reward = { id: string; name: string; description: string; cost: number; stock: number; image: string; icon: string; archived: boolean };
export type Classroom = { periods: Period[]; students: Student[]; categories: Category[]; rewards: Reward[]; leaderboard: boolean; demo: boolean };
export type Entry = { studentId: string; delta: number; balanceAfter: number; reason: string; periodId: string };
export type Operation = { id: string; kind: string; summary: string; actor: string; createdAt: string; metadata: Record<string, unknown>; reversesId?: string | null; reversed?: number };
export type LedgerEntry = Entry & { seq: number; operationId: string; createdAt: string; kind: string; actor: string; operationSummary: string; reversed: number };
export type Command = { requestId: string; type: string; [key: string]: unknown };
export type Change = { state: Classroom; entries: Entry[]; summary: string; metadata: Record<string, unknown>; reversesId?: string };

export function initialClassroom(): Classroom {
  return {
    periods: [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: `period-${n}`, name: `Period ${n}` })),
    students: [], rewards: [
      { id: 'chips', name: 'Classic chips', description: 'A crunchy little victory. One individual bag.', cost: 15, stock: 12, image: '', icon: 'chips', archived: false },
      { id: 'candy', name: 'Something sweet', description: 'Pick a candy from the reward basket.', cost: 10, stock: 20, image: '', icon: 'candy', archived: false },
      { id: 'water', name: 'Bottled water', description: 'Stay refreshed. One chilled bottle.', cost: 8, stock: 16, image: '', icon: 'water', archived: false },
      { id: 'soda', name: 'Favorite soda', description: 'Choose an available flavor.', cost: 20, stock: 8, image: '', icon: 'soda', archived: false },
      { id: 'treat', name: 'Mystery treat', description: 'A special reward worth saving for.', cost: 40, stock: 4, image: '', icon: 'treat', archived: false },
    ],
    categories: [
      { id: 'id', name: 'Student ID', points: 1, icon: 'badge' },
      { id: 'login', name: 'Coursework login', points: 1, icon: 'laptop' },
      { id: 'assignment', name: 'Assignment complete', points: 5, icon: 'book' },
      { id: 'course', name: 'Course complete', points: 25, icon: 'graduate' },
      { id: 'positive', name: 'Positive behavior', points: 3, icon: 'heart' },
    ], leaderboard: false, demo: false,
  };
}

function fail(message: string): never { throw new Error(message); }
function label(value: unknown, max = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`Enter text between 1 and ${max} characters.`);
  return value.trim();
}
function whole(value: unknown, min = 0, max = 1000000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail(`Enter a whole number between ${min} and ${max}.`);
  return value;
}

/** Pure domain rules. The store commits this change and its ledger atomically. */
export function applyCommand(current: Classroom, command: Command, original?: { operation: Operation; entries: Entry[] }): Change {
  const state: Classroom = structuredClone(current);
  const entries: Entry[] = [];
  let summary = ''; let metadata: Record<string, unknown> = {}; let reversesId: string | undefined;
  const id = () => crypto.randomUUID();
  const student = (value: unknown, includeArchived = false) => state.students.find(s => s.id === value && (includeArchived || !s.archived)) ?? fail('Student is unavailable. Refresh and try again.');
  const reward = (value: unknown, includeArchived = false) => state.rewards.find(r => r.id === value && (includeArchived || !r.archived)) ?? fail('Reward is unavailable.');
  const addPoints = (s: Student, delta: number, reason: string) => {
    if (!Number.isSafeInteger(s.balance + delta) || s.balance + delta < 0) fail(`${s.name} does not have enough points.`);
    s.balance += delta;
    entries.push({ studentId: s.id, delta, balanceAfter: s.balance, reason, periodId: s.periodId });
  };
  switch (command.type) {
    case 'demo': {
      if (state.students.length) fail('Demo data can only be loaded into an empty classroom.');
      const names = ['Alex Morgan', 'Jordan Lee', 'Taylor Brooks', 'Sam Rivera', 'Casey Ellis', 'Riley Chen', 'Avery James', 'Quinn Parker', 'Jamie Carter', 'Dakota Reed', 'Charlie Hayes', 'Skyler Bell'];
      names.forEach((name, i) => {
        const s: Student = { id: id(), name, periodId: state.periods[Math.floor(i / 6)].id, balance: 0, archived: false, demo: true };
        state.students.push(s); addPoints(s, [42, 28, 65, 18, 36, 52, 24, 45, 12, 33, 57, 8][i], 'Fictional demo starting points');
      }); state.demo = true; summary = 'Loaded fictional demo classroom'; break;
    }
    case 'finishDemo': {
      state.students.filter(s => s.demo).forEach(s => { s.archived = true; });
      state.demo = false; summary = 'Archived fictional demo students'; break;
    }
    case 'student': {
      const name = label(command.name); const periodId = label(command.periodId);
      if (!state.periods.some(p => p.id === periodId)) fail('Choose an existing class period.');
      if (command.id) { const s = student(command.id, true); metadata = { before: { ...s } }; s.name = name; s.periodId = periodId; summary = `Updated ${name}`; }
      else { if (state.students.length >= 5000) fail('The classroom student limit has been reached.'); state.students.push({ id: id(), name, periodId, balance: 0, archived: false }); summary = `Added ${name}`; }
      break;
    }
    case 'archiveStudent': case 'restoreStudent': {
      const s = student(command.id, true); s.archived = command.type === 'archiveStudent'; summary = `${s.archived ? 'Archived' : 'Restored'} ${s.name}`; metadata = { studentId: s.id }; break;
    }
    case 'period': {
      const name = label(command.name, 60);
      if (state.periods.some(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== command.id)) fail('A period with that name already exists.');
      if (command.id) { const p = state.periods.find(p => p.id === command.id) ?? fail('Period not found.'); metadata = { before: { ...p } }; p.name = name; }
      else state.periods.push({ id: id(), name }); summary = `Saved ${name}`; break;
    }
    case 'deletePeriod': {
      if (state.periods.length <= 1) fail('Keep at least one class period.');
      if (state.students.some(s => s.periodId === command.id)) fail('Move all students, including archived students, to another period first.');
      const p = state.periods.find(p => p.id === command.id) ?? fail('Period not found.'); state.periods = state.periods.filter(p => p.id !== command.id); summary = `Removed ${p.name}`; break;
    }
    case 'category': {
      const name = label(command.name, 60); const points = whole(command.points, 1, 10000);
      const value: Category = { id: command.id ? label(command.id) : id(), name, points, icon: 'star' };
      if (command.id) { const index = state.categories.findIndex(c => c.id === command.id); if (index < 0) fail('Category not found.'); metadata = { before: state.categories[index] }; state.categories[index] = { ...value, icon: state.categories[index].icon }; }
      else state.categories.push(value); summary = `Saved point category: ${name}`; break;
    }
    case 'deleteCategory': {
      const c = state.categories.find(c => c.id === command.id) ?? fail('Category not found.'); state.categories = state.categories.filter(c => c.id !== command.id); summary = `Removed point category: ${c.name}`; metadata = { before: c }; break;
    }
    case 'award': case 'adjust': {
      if (!Array.isArray(command.studentIds) || command.studentIds.length < 1 || command.studentIds.length > 500) fail('Select between 1 and 500 students.');
      const ids = [...new Set(command.studentIds)];
      const category = command.categoryId ? state.categories.find(c => c.id === command.categoryId) ?? fail('Category not found.') : undefined;
      const amount = category ? category.points : whole(command.amount, -10000, 10000);
      if (!amount) fail('Points cannot be zero.');
      if (command.type === 'award' && amount < 0) fail('Use a point adjustment to deduct points.');
      const reason = category ? category.name : label(command.reason, 240);
      ids.forEach(value => addPoints(student(value), amount, reason));
      summary = `${amount > 0 ? '+' : ''}${amount} points · ${ids.length} student${ids.length === 1 ? '' : 's'} · ${reason}`; metadata = { categoryId: category?.id, reason }; break;
    }
    case 'reward': {
      const image = typeof command.image === 'string' ? command.image.trim() : '';
      if (image && (!/^https:\/\//i.test(image) || image.length > 2000)) fail('Use a secure https image URL.');
      const value: Reward = { id: command.id ? label(command.id) : id(), name: label(command.name), description: typeof command.description === 'string' ? command.description.slice(0, 500) : '', cost: whole(command.cost, 1, 100000), stock: whole(command.stock), image, icon: 'treat', archived: false };
      if (command.id) { const r = reward(command.id, true); metadata = { before: { ...r } }; Object.assign(r, value, { icon: r.icon }); }
      else state.rewards.push(value); summary = `Saved reward: ${value.name}`; break;
    }
    case 'archiveReward': {
      const r = reward(command.id); r.archived = true; summary = `Removed reward: ${r.name}`; metadata = { rewardId: r.id }; break;
    }
    case 'restock': {
      const r = reward(command.id); const quantity = whole(command.quantity, 1, 100000); r.stock = whole(r.stock + quantity); summary = `Restocked ${r.name} · +${quantity}`; metadata = { rewardId: r.id, quantity }; break;
    }
    case 'redeem': {
      const s = student(command.studentId); const r = reward(command.rewardId); const quantity = whole(command.quantity, 1, 100);
      if (r.stock < quantity) fail('There is not enough stock for this purchase.');
      if (command.expectedCost !== r.cost) fail('The reward price changed. Review the new price and try again.');
      addPoints(s, -r.cost * quantity, `${r.name} × ${quantity}`); r.stock -= quantity;
      summary = `${s.name} redeemed ${r.name}${quantity > 1 ? ` × ${quantity}` : ''}`; metadata = { rewardId: r.id, rewardName: r.name, quantity, unitCost: r.cost, studentId: s.id }; break;
    }
    case 'reverse': {
      if (!original || original.operation.reversed || !['award', 'adjust', 'redeem'].includes(original.operation.kind)) fail('This transaction cannot be reversed.');
      const reason = label(command.reason, 240);
      original.entries.forEach(e => addPoints(student(e.studentId, true), -e.delta, `Correction: ${reason}`));
      if (original.operation.kind === 'redeem') { const r = reward(original.operation.metadata.rewardId, true); r.stock += whole(original.operation.metadata.quantity, 1, 100); }
      reversesId = original.operation.id; summary = `Reversed: ${original.operation.summary}`; metadata = { reason, originalId: reversesId }; break;
    }
    case 'settings': state.leaderboard = command.leaderboard === true; summary = `${state.leaderboard ? 'Enabled' : 'Disabled'} teacher leaderboard`; break;
    default: fail('Unknown classroom action.');
  }
  return { state, entries, summary, metadata, reversesId };
}
