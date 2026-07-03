import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, RefreshCw } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { Button } from '../components/ui/Button.js';
import { TaskList } from '../components/tasks/TaskList.js';
import { TaskCreateDialog } from '../components/tasks/TaskCreateDialog.js';
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel.js';
import { apiRequest } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import type { TaskItem, TaskDetail, TaskStatus } from '../types/tasks.js';

export type { TaskItem, TaskDetail } from '../types/tasks.js';

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTasks = async () => {
    try {
      const data = await apiRequest<TaskItem[]>('GET', '/tasks');
      setTasks(data);
    } catch {
      // handled by apiRequest toast
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = useCallback(async (taskId: string) => {
    try {
      const data = await apiRequest<TaskDetail>('GET', `/tasks/${taskId}`);
      setSelectedTask(data);
    } catch {
      setSelectedTask(null);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      loadDetail(selectedTaskId);
    } else {
      setSelectedTask(null);
    }
  }, [selectedTaskId, loadDetail]);

  useEffect(() => {
    const socket = getSocket();

    const handleTaskUpdate = (payload: { taskId: string; status: TaskStatus }) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.taskId ? { ...t, status: payload.status } : t
        )
      );
      if (selectedTaskId === payload.taskId) {
        loadDetail(payload.taskId);
      }
    };

    const handleStepUpdate = (payload: { taskId: string }) => {
      if (selectedTaskId === payload.taskId) {
        loadDetail(payload.taskId);
      }
    };

    socket.on('task:update', handleTaskUpdate);
    socket.on('task:step_update', handleStepUpdate);

    return () => {
      socket.off('task:update', handleTaskUpdate);
      socket.off('task:step_update', handleStepUpdate);
    };
  }, [selectedTaskId]);

  const handleRun = async (taskId: string) => {
    try {
      await apiRequest('POST', `/tasks/${taskId}/run`);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: 'running' } : t
        )
      );
      if (selectedTaskId === taskId && selectedTask) {
        setSelectedTask({ ...selectedTask, status: 'running' });
      }
    } catch {
      // handled
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await apiRequest('DELETE', `/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    } catch {
      // handled
    }
  };

  return (
    <AppLayout
      title="任务中心"
      sidebarProps={{ sessions: [] }}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadTasks}>
            <RefreshCw size={14} /> 刷新
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> 新建任务
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/chat')}>
            <ArrowLeft size={14} /> 返回
          </Button>
        </div>
      }
    >
      <div className="flex h-full">
        <div className="w-full border-r border-slate-700/50 lg:w-96">
          <TaskList
            tasks={tasks}
            loading={loading}
            selectedId={selectedTaskId}
            onSelect={setSelectedTaskId}
            onRun={handleRun}
            onDelete={handleDelete}
          />
        </div>
        <div className="hidden flex-1 overflow-y-auto p-4 lg:block">
          {selectedTask ? (
            <TaskDetailPanel task={selectedTask} onRun={() => handleRun(selectedTask.id)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-500">
              <p>选择一个任务查看详情</p>
            </div>
          )}
        </div>
      </div>

      <TaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          loadTasks();
        }}
      />
    </AppLayout>
  );
}
