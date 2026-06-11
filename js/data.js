/* ============================================================
   Sauna Tracker — data.js
   localStorage CRUD layer for sauna sessions.
   All functions are exposed via window.SaunaData.
   ============================================================ */

const STORAGE_KEY = 'sauna_sessions';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('SaunaData: failed to parse localStorage', e);
    return [];
  }
}

function saveSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('SaunaData: failed to write localStorage', e);
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateStr(d) {
  return d.slice(0, 10);
}

/* ---------- public API ---------- */

window.SaunaData = {

  /** Return all sessions sorted by date descending (newest first). */
  getAllSessions() {
    const sessions = loadSessions();
    sessions.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return (b.id || '').localeCompare(a.id || '');
    });
    return sessions;
  },

  /** Return a single session by id, or null. */
  getSession(id) {
    const sessions = loadSessions();
    return sessions.find(s => s.id === id) || null;
  },

  /** Add a new session.
   *  Fields: { date, time, rounds, total_minutes, temperature, contrast, notes }
   *  date format: 'YYYY-MM-DD'. Returns the created session. */
  addSession({ date, time, rounds, total_minutes, temperature, contrast, notes }) {
    const sessions = loadSessions();
    const session = {
      id: generateId(),
      date: date || todayStr(),
      time: time || '',
      rounds: Number(rounds) || 1,
      total_minutes: Number(total_minutes) || 0,
      temperature: temperature || '',
      contrast: !!contrast,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };
    sessions.push(session);
    saveSessions(sessions);
    return session;
  },

  /** Delete a session by id. Returns true if deleted, false if not found. */
  deleteSession(id) {
    const sessions = loadSessions();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    sessions.splice(idx, 1);
    saveSessions(sessions);
    return true;
  },

  /** Return sessions whose date matches today. */
  getTodaySessions() {
    const today = todayStr();
    return loadSessions().filter(s => s.date === today);
  },

  /** Compute aggregate statistics.
   *  Returns { totalSessions, totalHours, totalMinutes, avgDuration,
   *            longestSession, currentStreak } */
  getStats() {
    const sessions = loadSessions();
    const count = sessions.length;

    if (count === 0) {
      return {
        totalSessions: 0,
        totalHours: 0,
        totalMinutes: 0,
        avgDuration: 0,
        longestSession: 0,
        currentStreak: 0
      };
    }

    const totalMinutesAll = sessions.reduce((sum, s) => sum + (s.total_minutes || 0), 0);
    const totalHours = Math.floor(totalMinutesAll / 60);
    const totalMinutes = totalMinutesAll % 60;
    const avgDuration = Math.round(totalMinutesAll / count);
    const longestSession = sessions.reduce((max, s) => Math.max(max, s.total_minutes || 0), 0);
    const streak = this.calculateStreak(sessions);

    return {
      totalSessions: count,
      totalHours,
      totalMinutes,
      avgDuration,
      longestSession,
      currentStreak: streak
    };
  },

  /** Return an array of the last 7 days with total minutes per day. */
  getWeeklyData() {
    return this._getDateRangeData(7);
  },

  /** Return an array of the last 30 days with total minutes per day. */
  getMonthlyData() {
    return this._getDateRangeData(30);
  },

  /** Helper: build day-by-day aggregation for the last N days. */
  _getDateRangeData(days) {
    const sessions = loadSessions();
    const map = {};

    sessions.forEach(s => {
      const d = dateStr(s.date);
      map[d] = (map[d] || 0) + (s.total_minutes || 0);
    });

    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        date: key,
        total_minutes: map[key] || 0
      });
    }
    return result;
  },

  /** Count the current streak of consecutive days with at least one session.
   *  Gaps of 1-2 days are ignored. */
  calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;

    const dateSet = new Set(sessions.map(s => dateStr(s.date)));
    const dates = Array.from(dateSet).sort().reverse();
    if (dates.length === 0) return 0;

    let streak = 1;
    let skipped = 0;

    for (let i = 0; i < dates.length - 1; i++) {
      const cur = new Date(dates[i]);
      const prev = new Date(dates[i + 1]);
      const diffMs = cur.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
        skipped = 0;
      } else if (diffDays <= 3) {
        streak++;
        skipped += diffDays - 1;
      } else {
        break;
      }
    }

    return streak;
  }
};
