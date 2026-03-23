import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [taskModal, setTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskReportText, setTaskReportText] = useState('');
  const [taskError, setTaskError] = useState('');

  const openTaskModal = (task) => {
    setSelectedTask(task);
    setTaskReportText(task.report?.text || '');
    setTaskError('');
    setTaskModal(true);
  };
  const closeTaskModal = () => {
    setTaskModal(false);
    setSelectedTask(null);
    setTaskReportText('');
    setTaskError('');
  };
  const isTaskOverdue = (task) => {
    if (task.completed) return false;
    if (!task.dueDate) return false;
    return new Date(task.dueDate).getTime() < Date.now();
  };
  const submitTaskReport = async () => {
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask._id}/report`, {
        text: taskReportText,
      });
      await load();
      closeTaskModal();
    } catch (e) {
      setTaskError(e?.response?.data?.message || 'Failed to submit report');
    }
  };
  const toggleTaskDone = async () => {
    if (!selectedTask) return;
    try {
      await api.put(`/tasks/${selectedTask._id}`, {
        completed: !selectedTask.completed,
      });
      await load();
      setSelectedTask((prev) => ({ ...prev, completed: !prev.completed }));
    } catch (e) {
      setTaskError(e?.response?.data?.message || 'Failed to update task');
    }
  };

  const nowMs = Date.now();
  const upcomingDaysMs = 3 * 24 * 60 * 60 * 1000;
  const upcomingCutoffMs = nowMs + upcomingDaysMs;

  const overdueTasks = tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate).getTime() < nowMs);
  const upcomingTasks = tasks.filter((t) => {
    if (t.completed) return false;
    if (!t.dueDate) return false;
    const ms = new Date(t.dueDate).getTime();
    return ms >= nowMs && ms <= upcomingCutoffMs;
  });

  const overdueProjects = projects.filter((p) => {
    if (p.completed) return false;
    if (!p.deadline) return false;
    return new Date(p.deadline).getTime() < nowMs;
  });
  const upcomingProjects = projects.filter((p) => {
    if (p.completed) return false;
    if (!p.deadline) return false;
    const ms = new Date(p.deadline).getTime();
    return ms >= nowMs && ms <= upcomingCutoffMs;
  });

  const load = async () => {
    setError('');
    try {
      const d = await api.get('/dashboard');
      setProjects(d.data?.projects || []);
      setTasks(d.data?.tasks || []);
      setInvitations(d.data?.invitations || []);
      setNotifications(d.data?.notifications || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load dashboard');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.post('/projects', { name: projectName.trim(), description: projectDesc });
      setProjectName('');
      setProjectDesc('');
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (projectId) => {
    setError('');
    try {
      await api.delete(`/projects/${projectId}`);
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to delete project');
    }
  };

  const respondInvite = async (invId, status) => {
    await api.put(`/invitations/${invId}`, { status });
    await load();
  };

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    await load();
  };

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div>
          <div className="dash-title">Dashboard</div>
          <div className="dash-subtitle">Signed in as {user?.email}</div>
        </div>
        <button className="dash-button" onClick={logout}>
          Logout
        </button>
      </header>

      {error ? <div className="dash-error">{error}</div> : null}

      <div className="dash-grid">
        <section className="dash-card">
          <h2 className="dash-card-title">Reminders</h2>

          {overdueProjects.length === 0 && upcomingProjects.length === 0 && overdueTasks.length === 0 && upcomingTasks.length === 0 ? (
            <div className="dash-empty">No upcoming deadlines</div>
          ) : null}

          {overdueProjects.length > 0 ? (
            <div className="dash-list">
              <div className="dash-row">
                <div className="dash-row-main">
                  <div className="dash-row-title">Overdue projects</div>
                  <div className="dash-row-meta">{overdueProjects.length}</div>
                </div>
              </div>
              {overdueProjects.slice(0, 5).map((p) => (
                <div
                  key={p._id}
                  className="dash-row dash-row-click"
                  onClick={() => navigate(`/projects/${p._id}`)}
                >
                  <div className="dash-row-main">
                    <div className="dash-row-title">{p.name}</div>
                    <div className="dash-row-meta">
                      Deadline: {new Date(p.deadline).toLocaleDateString()} • Progress: {p.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {upcomingProjects.length > 0 ? (
            <div className="dash-list" style={{ marginTop: 10 }}>
              <div className="dash-row">
                <div className="dash-row-main">
                  <div className="dash-row-title">Upcoming projects (3 days)</div>
                  <div className="dash-row-meta">{upcomingProjects.length}</div>
                </div>
              </div>
              {upcomingProjects.slice(0, 5).map((p) => (
                <div
                  key={p._id}
                  className="dash-row dash-row-click"
                  onClick={() => navigate(`/projects/${p._id}`)}
                >
                  <div className="dash-row-main">
                    <div className="dash-row-title">{p.name}</div>
                    <div className="dash-row-meta">
                      Deadline: {new Date(p.deadline).toLocaleDateString()} • Progress: {p.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {overdueTasks.length > 0 ? (
            <div className="dash-list" style={{ marginTop: 10 }}>
              <div className="dash-row">
                <div className="dash-row-main">
                  <div className="dash-row-title">Overdue tasks</div>
                  <div className="dash-row-meta">{overdueTasks.length}</div>
                </div>
              </div>
              {overdueTasks.slice(0, 5).map((t) => (
                <div key={t._id} className="dash-row">
                  <div className="dash-row-main">
                    <div className="dash-row-title">{t.title}</div>
                    <div className="dash-row-meta">
                      Due: {new Date(t.dueDate).toLocaleDateString()} {t.projectId?.name ? `• Project: ${t.projectId.name}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {upcomingTasks.length > 0 ? (
            <div className="dash-list" style={{ marginTop: 10 }}>
              <div className="dash-row">
                <div className="dash-row-main">
                  <div className="dash-row-title">Upcoming tasks (3 days)</div>
                  <div className="dash-row-meta">{upcomingTasks.length}</div>
                </div>
              </div>
              {upcomingTasks.slice(0, 5).map((t) => (
                <div key={t._id} className="dash-row">
                  <div className="dash-row-main">
                    <div className="dash-row-title">{t.title}</div>
                    <div className="dash-row-meta">
                      Due: {new Date(t.dueDate).toLocaleDateString()} {t.projectId?.name ? `• Project: ${t.projectId.name}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="dash-card">
          <h2 className="dash-card-title">Create project</h2>
          <form className="dash-form" onSubmit={createProject}>
            <label className="dash-label">
              Name
              <input
                className="dash-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Website Launch"
              />
            </label>
            <label className="dash-label">
              Description
              <textarea
                className="dash-input"
                rows={2}
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Short description (optional)"
              />
            </label>
            <button className="dash-button" disabled={creating} type="submit">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </form>
        </section>

        <section className="dash-card">
          <h2 className="dash-card-title">Projects</h2>
          {projects.length === 0 ? <div className="dash-empty">No projects</div> : null}
          <div className="dash-list">
            {projects.map((p) => (
              <div key={p._id} className="dash-row dash-row-click" onClick={() => navigate(`/projects/${p._id}`)}>
                <div className="dash-row-main">
                  <div className="dash-row-title">{p.name}</div>
                  <div className="dash-row-meta">Progress: {p.progress}%</div>
                </div>
                {String(p.leader?._id || p.leader) === String(user?._id) ? (
                  <button
                    className="dash-button danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(p._id);
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="dash-card">
          <h2 className="dash-card-title">Assigned tasks</h2>
          {tasks.length === 0 ? <div className="dash-empty">No assigned tasks</div> : null}
          <div className="dash-list">
            {tasks.map((t) => (
              <div key={t._id} className="dash-row dash-row-click" onClick={() => openTaskModal(t)}>
                <div className="dash-row-main">
                  <div className="dash-row-title">{t.title}</div>
                  <div className="dash-row-meta">
                    {t.projectId?.name ? `Project: ${t.projectId.name} • ` : ''}Completed: {t.completed ? 'Yes' : 'No'}
                    {t.dueDate ? ` • Due: ${new Date(t.dueDate).toLocaleDateString()}` : ''}
                    {!t.completed && t.dueDate && new Date(t.dueDate).getTime() < Date.now() ? ' • Overdue' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-card">
          <h2 className="dash-card-title">Pending invitations</h2>
          {invitations.length === 0 ? <div className="dash-empty">No invitations</div> : null}
          <div className="dash-list">
            {invitations.map((inv) => (
              <div key={inv._id} className="dash-row dash-row-split">
                <div className="dash-row-main">
                  <div className="dash-row-title">{inv.projectId?.name}</div>
                  <div className="dash-row-meta">From: {inv.sender?.email}</div>
                </div>
                <div className="dash-actions">
                  <button
                    className="dash-button"
                    onClick={() => respondInvite(inv._id, 'accepted')}
                  >
                    Accept
                  </button>
                  <button
                    className="dash-button danger"
                    onClick={() => respondInvite(inv._id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-card">
          <h2 className="dash-card-title">Notifications</h2>
          {notifications.length === 0 ? <div className="dash-empty">No notifications</div> : null}
          <div className="dash-list">
            {notifications.map((n) => (
              <div key={n._id} className={`dash-row ${n.read ? 'read' : ''}`}>
                <div className="dash-row-main">
                  <div className="dash-row-title">{n.type}</div>
                  <div className="dash-row-meta">{n.message}</div>
                </div>
                {!n.read ? (
                  <button className="dash-button" onClick={() => markRead(n._id)}>
                    Mark read
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      {taskModal && selectedTask ? (
        <div className="modal-overlay" onClick={closeTaskModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Task Details</h3>
            <div className="modal-field">
              <label className="modal-label">Title</label>
              <div className="modal-value">{selectedTask.title}</div>
            </div>
            <div className="modal-field">
              <label className="modal-label">Description</label>
              <div className="modal-value">{selectedTask.description || '—'}</div>
            </div>
            <div className="modal-field">
              <label className="modal-label">Assigned by</label>
              <div className="modal-value">{selectedTask.assignedBy?.email || '—'}</div>
            </div>
            <div className="modal-field">
              <label className="modal-label">Due date</label>
              <div className="modal-value">
                {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : '—'}
                {isTaskOverdue(selectedTask) ? ' • Overdue' : ''}
              </div>
            </div>
            <div className="modal-field">
              <label className="modal-label">Status</label>
              <div className="modal-value">{selectedTask.completed ? 'Completed' : 'Not completed'}</div>
            </div>
            {selectedTask.report?.text ? (
              <div className="modal-field">
                <label className="modal-label">Report</label>
                <div className="modal-value">{selectedTask.report.text}</div>
                <div className="modal-meta">Submitted: {new Date(selectedTask.report.submittedAt).toLocaleString()}</div>
              </div>
            ) : null}
            {taskError ? <div className="modal-error">{taskError}</div> : null}
            <div className="modal-actions">
              <label className="modal-check">
                <input
                  type="checkbox"
                  checked={Boolean(selectedTask.completed)}
                  onChange={toggleTaskDone}
                />
                Done
              </label>
              {isTaskOverdue(selectedTask) && !selectedTask.completed ? (
                <button className="dash-button" onClick={submitTaskReport}>
                  Submit Report
                </button>
              ) : null}
              <button className="dash-button danger" onClick={closeTaskModal}>
                Close
              </button>
            </div>
            {isTaskOverdue(selectedTask) && !selectedTask.completed ? (
              <div className="modal-field" style={{ marginTop: 16 }}>
                <label className="modal-label">Report (optional)</label>
                <textarea
                  className="modal-input"
                  rows={3}
                  value={taskReportText}
                  onChange={(e) => setTaskReportText(e.target.value)}
                  placeholder="Explain why this task is overdue..."
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
