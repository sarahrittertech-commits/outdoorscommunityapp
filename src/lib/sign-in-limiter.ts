// FR-AC-19: after 5 wrong passwords for one address in 15 minutes, sign-in
// for that address pauses until the oldest of them is 15 minutes old.
//
// This sits on top of Supabase Auth's own rate limits (per IP address). It
// is kept in this server's memory, not the database, because the anonymous
// role never writes (TR-SEC-2) and a failed sign-in is by definition
// anonymous. The cost: it is per server instance and forgets on a restart.
// Railway runs one instance, so today that covers the whole site; if the
// site ever runs several, each one counts separately (ADR-0009).

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;
/** Addresses tracked at once; beyond this the least recently failed are forgotten, so memory stays bounded. */
export const MAX_TRACKED = 10_000;

export class SignInLimiter {
  private failures = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  private key(email: string): string {
    return email.trim().toLowerCase();
  }

  private recent(key: string): number[] {
    const cutoff = this.now() - WINDOW_MS;
    const times = (this.failures.get(key) ?? []).filter((t) => t > cutoff);
    if (times.length === 0) this.failures.delete(key);
    return times;
  }

  /** True while the address has had 5 failures in the last 15 minutes. */
  isPaused(email: string): boolean {
    return this.recent(this.key(email)).length >= MAX_FAILURES;
  }

  recordFailure(email: string): void {
    const key = this.key(email);
    const times = [...this.recent(key), this.now()].slice(-MAX_FAILURES);
    // Re-insert so the Map's order stays least recently failed first.
    this.failures.delete(key);
    this.failures.set(key, times);
    while (this.failures.size > MAX_TRACKED) {
      const oldest = this.failures.keys().next().value;
      if (oldest === undefined) break;
      this.failures.delete(oldest);
    }
  }

  recordSuccess(email: string): void {
    this.failures.delete(this.key(email));
  }

  /** For tests. */
  get size(): number {
    return this.failures.size;
  }
}

/** The one limiter for this server process. */
export const signInLimiter = new SignInLimiter();
