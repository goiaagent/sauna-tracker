/* ============================================================
   Sauna Tracker — timer.js
   Timer logic for sauna sessions. Manages start/stop/reset
   and provides formatted time output.
   ============================================================ */

window.SaunaTimer = {
  /** 'idle' | 'running' | 'stopped' */
  state: 'idle',

  /** Timestamp (ms) when the timer was last started. */
  startTime: null,

  /** Accumulated elapsed time in ms (carried over from paused segments). */
  elapsed: 0,

  /** Interval handle for the ticking callback. */
  timerInterval: null,

  /** The DOM element where formatted time is displayed. */
  displayEl: null,

  /** Initialize with a display element id or reference. */
  init(displayId) {
    if (typeof displayId === 'string') {
      this.displayEl = document.getElementById(displayId);
    } else {
      this.displayEl = displayId;
    }
    this._updateDisplay();
  },

  /** Start or resume the timer. */
  start() {
    if (this.state === 'running') return;

    this.state = 'running';
    this.startTime = Date.now();

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this._tick();
    }, 200); // update 5x / sec for smooth display

    this._tick(); // immediate update
    this.onStart();
  },

  /** Pause the timer (does NOT save the session). */
  stop() {
    if (this.state !== 'running') return;

    // Accumulate elapsed time
    const now = Date.now();
    this.elapsed += (now - this.startTime);

    this.state = 'stopped';
    this.startTime = null;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this._updateDisplay();
    this.onStop();
  },

  /** Reset the timer back to idle / 00:00. */
  reset() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.state = 'idle';
    this.startTime = null;
    this.elapsed = 0;
    this._updateDisplay();
    this.onReset();
  },

  /** Return the total elapsed time in milliseconds. */
  getElapsedMs() {
    if (this.state === 'running' && this.startTime !== null) {
      return this.elapsed + (Date.now() - this.startTime);
    }
    return this.elapsed;
  },

  /** Return total elapsed seconds (rounded). */
  getElapsedSeconds() {
    return Math.floor(this.getElapsedMs() / 1000);
  },

  /** Return formatted time string 'MM:SS'. */
  getFormattedTime() {
    const totalSec = this.getElapsedSeconds();
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  },

  /* ---------- internal ---------- */

  _tick() {
    this._updateDisplay();
  },

  _updateDisplay() {
    if (this.displayEl) {
      this.displayEl.textContent = this.getFormattedTime();
    }
  },

  /* ---------- event hooks (overridable) ---------- */

  /** Called when the timer starts running. */
  onStart() {
    // hook for UI updates — override as needed
  },

  /** Called when the timer is paused/stopped. */
  onStop() {
    // hook for UI updates — override as needed
  },

  /** Called when the timer is reset. */
  onReset() {
    // hook for UI updates — override as needed
  },

  /** Save the current timer reading as a session.
   *  Call this after stop() or during running state.
   *  @param {Object} opts - { temperature, notes }
   *  @returns {Object|null} saved session, or null if duration is zero.
   */
  onSave({ temperature, notes } = {}) {
    const seconds = this.getElapsedSeconds();
    if (seconds <= 0) {
      alert('Session duration must be greater than 0 seconds.');
      return null;
    }

    const session = window.SaunaData.addSession({
      date: new Date().toISOString().slice(0, 10),
      duration_seconds: seconds,
      temperature: temperature != null ? Number(temperature) : null,
      notes: notes || ''
    });

    // Reset timer after saving
    this.reset();
    return session;
  }
};
