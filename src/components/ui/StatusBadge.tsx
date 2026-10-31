import { Badge, type BadgeTone } from './Badge';
import { STATUS_MAP } from './status-label';

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = STATUS_MAP[status] ?? [status, 'slate' as BadgeTone];
  return <Badge tone={tone}>{label}</Badge>;
}
