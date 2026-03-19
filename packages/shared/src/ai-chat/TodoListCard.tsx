import clsx from 'clsx';
import { LoadingSpinner } from '@figma/fpl-components';
import { Icon24CheckLarge, Icon24Ellipse } from '@figma/fpl-icons';
import type { Task, TaskStatus } from './types';

/* ------------------------------------------------------------------ */
/*  TodoItem - renders a single task row based on status               */
/* ------------------------------------------------------------------ */

function getTaskIcon(status: TaskStatus) {
  if (status === 'complete') return <Icon24CheckLarge className="icon-success" />;
  if (status === 'in_progress') return <LoadingSpinner size="md" />;
  return <Icon24Ellipse className="fill-icon-secondary" />;
}

function TodoItem({ task }: { task: Task }) {
  return (
    <li className={clsx('flex flex-col gap-1', task.status === 'in_progress' && 'text-text')}>
      <div className="flex items-start gap-2">
        <span className="w-4 icon-secondary">{getTaskIcon(task.status)}</span>
        <span>{task.label}</span>
      </div>
      {task.children}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  TodoList - renders a list of tasks                                 */
/* ------------------------------------------------------------------ */

export interface TodoListProps {
  tasks: Task[];
}

export function TodoList({ tasks }: TodoListProps) {
  return (
    <ul className="list-none list-inside text-text-secondary space-y-2 px-12px pt-1 pb-3">
      {tasks.map((task) => (
        <TodoItem key={task.label} task={task} />
      ))}
    </ul>
  );
}
