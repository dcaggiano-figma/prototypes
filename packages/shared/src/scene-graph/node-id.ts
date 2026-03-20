/**
 * Node ID utilities.
 *
 * Node IDs are single 32-bit integers. The upper 12 bits store the session ID,
 * the lower 20 bits store the local ID.
 *
 * Session 0 is the default (single-player/server). Positive sessions are for
 * multiplayer clients. Negative sessions are reserved for special operations
 * (e.g., paste uses its own session so code can identify pasted nodes).
 */

/** A node ID is a plain number — 32-bit integer under the hood. */
export type NodeId = number

const LOCAL_BITS = 20
const LOCAL_MASK = (1 << LOCAL_BITS) - 1 // 0xFFFFF

/** Combine a session ID and local ID into a single NodeId. */
export function makeNodeId(sessionId: number, localId: number): NodeId {
  return (sessionId << LOCAL_BITS) | (localId & LOCAL_MASK)
}

/** Extract the session ID (upper 12 bits, signed). */
export function getSessionId(id: NodeId): number {
  // Arithmetic right shift preserves sign
  return id >> LOCAL_BITS
}

/** Extract the local ID (lower 20 bits). */
export function getLocalId(id: NodeId): number {
  return id & LOCAL_MASK
}

/**
 * Generates unique NodeIds within a session.
 * Session 0 fast-paths: returns nextLocalId directly without bit shifting.
 */
export class NodeIdGenerator {
  readonly sessionId: number
  private nextLocalId: number

  constructor(sessionId: number = 0, startLocalId: number = 1) {
    this.sessionId = sessionId
    this.nextLocalId = startLocalId
  }

  generate(): NodeId {
    const localId = this.nextLocalId++
    if (this.sessionId === 0) return localId
    return makeNodeId(this.sessionId, localId)
  }

  /** Ensure future IDs are above the given local ID. */
  advancePast(localId: number): void {
    if (localId >= this.nextLocalId) {
      this.nextLocalId = localId + 1
    }
  }
}
