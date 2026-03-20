import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import type { Task } from '../types';

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

export function Tasks() {
  const { tasks, addTask, toggleTask, deleteTask, getBatches } = useTasks();
  const [newTitle, setNewTitle] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  const batches = getBatches();
  const unBatchedTasks = tasks.filter((t) => !t.batch);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask(newTitle.trim(), newBatch.trim(), newPriority);
    setNewTitle('');
  };

  const toggleBatch = (batch: string) => {
    setExpandedBatches((prev) => ({ ...prev, [batch]: !prev[batch] }));
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Task Batching</h1>
        <p className="text-slate-500">Group related tasks into batches for focused work</p>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Progress</span>
            <span className="text-sm font-bold text-indigo-600">{completedCount}/{tasks.length} done</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Task Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add New Task
        </h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Task description..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Batch name (optional)..."
              value={newBatch}
              onChange={(e) => setNewBatch(e.target.value)}
              list="batch-list"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <datalist id="batch-list">
              {batches.map((b) => <option key={b} value={b} />)}
            </datalist>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Batches */}
      <div className="space-y-4">
        {batches.map((batch) => {
          const batchTasks = tasks.filter((t) => t.batch === batch);
          const done = batchTasks.filter((t) => t.completed).length;
          const isExpanded = expandedBatches[batch] !== false;

          return (
            <div key={batch} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleBatch(batch)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-slate-900">{batch}</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {done}/{batchTasks.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100">
                  {batchTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Unbatched tasks */}
        {unBatchedTasks.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <span className="font-semibold text-slate-700 text-sm">Uncategorized</span>
            </div>
            {unBatchedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
            ))}
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No Tasks Yet</h3>
            <p className="text-slate-500">Add tasks and group them into batches for efficient work.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 group hover:bg-slate-50 transition-colors ${task.completed ? 'opacity-60' : ''}`}>
      <button onClick={() => onToggle(task.id)} className="text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0">
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>
      <span className={`flex-1 text-sm text-slate-700 ${task.completed ? 'line-through text-slate-400' : ''}`}>
        {task.title}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[task.priority]}`}>
        {task.priority}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
