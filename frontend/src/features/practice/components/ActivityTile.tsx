import { ChevronRight } from 'lucide-react';
import type { Activity } from '../../../shared/types/api';
import { activities } from '../activities';

export function ActivityTile({ activity, onSelect, action = 'Boshlash' }: { activity: Pick<(typeof activities)[number], 'id' | 'icon' | 'color'> & { title: string; detail: string }; onSelect: (activity: Activity) => void; action?: string }) {
  const Icon = activity.icon;
  return <button className="activity-tile" onClick={() => onSelect(activity.id)}>
    <span className={`tile-icon ${activity.color}`}><Icon size={25} strokeWidth={1.9} /></span>
    <span className="tile-title">{activity.title}</span>
    <span className="tile-detail">{activity.detail}</span>
    <span className="tile-action">{action} <ChevronRight size={16} /></span>
  </button>;
}
