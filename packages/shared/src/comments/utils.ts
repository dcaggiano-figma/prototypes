/** Format a timestamp as a relative time string like "27 min. ago" or "2 hours ago" */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

  const weeks = Math.floor(days / 7);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}

/** Resolve the screen position of a comment, handling node attachment */
export function resolveCommentPosition(
  anchor: { worldX: number; worldY: number; nodeId?: string; nodeOffsetX?: number; nodeOffsetY?: number },
  getNodePosition?: (nodeId: string) => { x: number; y: number } | undefined,
): { worldX: number; worldY: number } {
  if (anchor.nodeId && getNodePosition) {
    const nodePos = getNodePosition(anchor.nodeId);
    if (nodePos) {
      return {
        worldX: nodePos.x + (anchor.nodeOffsetX ?? 0),
        worldY: nodePos.y + (anchor.nodeOffsetY ?? 0),
      };
    }
  }
  return { worldX: anchor.worldX, worldY: anchor.worldY };
}
