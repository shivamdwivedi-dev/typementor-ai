import crypto from 'crypto';

export interface ArenaTicket {
  ticket: string;
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

export class ArenaTicketService {
  private tickets = new Map<string, ArenaTicket>();
  private readonly ttlMs: number;
  private sweepInterval: NodeJS.Timeout | null = null;

  constructor(ttlMs = 60 * 1000) {
    this.ttlMs = ttlMs;
    // Periodic sweep every 60 seconds to prune expired unconsumed tickets
    this.sweepInterval = setInterval(() => {
      this.pruneExpired();
    }, 60 * 1000);
    // Unref sweep timer so it doesn't prevent Node process exit in tests
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  /**
   * Generates a cryptographically random, single-use ticket valid for 60 seconds.
   */
  issueTicket(userId: string, email: string): { ticket: string; expiresIn: number } {
    const ticket = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    this.tickets.set(ticket, {
      ticket,
      userId,
      email,
      createdAt: now,
      expiresAt,
    });

    return {
      ticket,
      expiresIn: Math.floor(this.ttlMs / 1000),
    };
  }

  /**
   * Atomically consumes a ticket.
   * If valid and not expired, removes it immediately (single-use guarantee) and returns user info.
   * If invalid, expired, or already consumed, returns null.
   */
  consumeTicket(ticket: string): { userId: string; email: string } | null {
    if (!ticket || typeof ticket !== 'string') {
      return null;
    }

    const record = this.tickets.get(ticket);
    if (!record) {
      return null;
    }

    // Immediately remove to prevent replay attacks
    this.tickets.delete(ticket);

    if (Date.now() > record.expiresAt) {
      return null;
    }

    return {
      userId: record.userId,
      email: record.email,
    };
  }

  /**
   * Prunes expired tickets from memory.
   */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [ticket, record] of this.tickets.entries()) {
      if (now > record.expiresAt) {
        this.tickets.delete(ticket);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * For testing or reset purposes.
   */
  clear(): void {
    this.tickets.clear();
  }

  destroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    this.tickets.clear();
  }
}

export const arenaTicketService = new ArenaTicketService();
