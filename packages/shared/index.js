export const COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#facc15",
  "#34d399",
  "#fb7185",
];

export const DATE_FORMAT = "YYYY-MM-DD";

export const NOTE_MAX_LENGTH = 80;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(now = new Date()) {
  return dateKey(now);
}

export function formatDisplay(key) {
  const parts = String(key).split("-");
  if (parts.length !== 3) return String(key);
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}

export function isValidDateKey(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function currentStreak(checkins = [], now = new Date()) {
  const done = new Set(checkins);
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!done.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (done.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function lastSevenDays(checkins = [], now = new Date()) {
  const done = new Set(checkins);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const key = dateKey(addDays(today, -offset));
    days.push({ key, label: formatDisplay(key), done: done.has(key) });
  }
  return days;
}

export function normalizeHabit(habit, index = 0) {
  if (!habit || typeof habit !== "object" || Array.isArray(habit)) {
    throw new Error(`habit ${index} must be an object`);
  }
  const name = typeof habit.name === "string" ? habit.name.trim() : "";
  if (!name) {
    throw new Error(`habit ${index} needs a name`);
  }
  const color =
    habit.color === undefined || habit.color === "" ? COLORS[0] : habit.color;
  if (typeof color !== "string" || !COLORS.includes(color)) {
    throw new Error(`habit ${index} has an invalid color`);
  }
  const archived = habit.archived === undefined ? false : habit.archived;
  if (typeof archived !== "boolean") {
    throw new Error(`habit ${index} has an invalid archived flag`);
  }
  const rawNote =
    habit.note === undefined || habit.note === null ? "" : habit.note;
  if (typeof rawNote !== "string") {
    throw new Error(`habit ${index} has an invalid note`);
  }
  const note = rawNote.trim();
  if (note.length > NOTE_MAX_LENGTH) {
    throw new Error(
      `habit ${index} note must be at most ${NOTE_MAX_LENGTH} characters`,
    );
  }
  const id =
    typeof habit.id === "string" && habit.id.trim() ? habit.id.trim() : randomId();
  const createdAt =
    typeof habit.createdAt === "string" && habit.createdAt
      ? habit.createdAt
      : new Date().toISOString();
  const checkins = habit.checkins === undefined ? [] : habit.checkins;
  if (!Array.isArray(checkins) || checkins.some((key) => !isValidDateKey(key))) {
    throw new Error(`habit ${index} has invalid checkins`);
  }
  return {
    id,
    name,
    color,
    createdAt,
    archived,
    note,
    checkins: [...new Set(checkins)].sort(),
  };
}

export function normalizeState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("state must be an object");
  }
  if (!Array.isArray(input.habits)) {
    throw new Error("habits must be an array");
  }
  return { habits: input.habits.map((habit, index) => normalizeHabit(habit, index)) };
}

export function createHabit({ name, color, note } = {}) {
  return normalizeHabit({ name, color, note });
}

export function toggleDate(habit, key) {
  if (!isValidDateKey(key)) {
    throw new Error("toggleDate needs a valid YYYY-MM-DD date");
  }
  const has = habit.checkins.includes(key);
  const checkins = has
    ? habit.checkins.filter((entry) => entry !== key)
    : [...habit.checkins, key].sort();
  return { ...habit, checkins };
}

export function toggleToday(habit, now = new Date()) {
  return toggleDate(habit, todayKey(now));
}

export function weekSummary(checkins = [], now = new Date()) {
  const days = lastSevenDays(checkins, now);
  return {
    done: days.filter((day) => day.done).length,
    total: days.length,
  };
}

function dayNumber(key) {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function bestStreak(checkins = []) {
  const days = [...new Set(checkins)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const key of days) {
    const current = dayNumber(key);
    run = previous !== null && current === previous + 1 ? run + 1 : 1;
    if (run > best) best = run;
    previous = current;
  }
  return best;
}

export function totalCheckins(checkins = []) {
  return new Set(checkins).size;
}

export function monthSummary(habits = [], now = new Date()) {
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const active = habits.filter((habit) => !habit.archived);
  const days = new Set();
  let done = 0;
  for (const habit of active) {
    for (const key of habit.checkins || []) {
      if (key.startsWith(prefix)) {
        days.add(key);
        done += 1;
      }
    }
  }
  const elapsedDays = now.getDate();
  const possible = active.length * elapsedDays;
  return {
    daysWithAny: days.size,
    completion: possible === 0 ? 0 : Math.round((done / possible) * 100),
    totalCheckins: done,
    activeHabits: active.length,
    elapsedDays,
  };
}
