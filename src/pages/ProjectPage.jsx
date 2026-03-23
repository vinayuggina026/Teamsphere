import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/project.css';

const ProjectPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [workflowItems, setWorkflowItems] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [error, setError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');

  const [projectDeadline, setProjectDeadline] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const [chatText, setChatText] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef(null);

  const [wfTitle, setWfTitle] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfDueDate, setWfDueDate] = useState('');

  const [editingWorkflowId, setEditingWorkflowId] = useState('');
  const [editWfTitle, setEditWfTitle] = useState('');
  const [editWfDesc, setEditWfDesc] = useState('');
  const [editWfDueDate, setEditWfDueDate] = useState('');

  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskReportText, setTaskReportText] = useState('');

  const isLeader = useMemo(() => {
    return project?.leader?._id ? String(project.leader._id) === String(user?._id) : false;
  }, [project, user]);

  const loadAll = async () => {
    setError('');
    try {
      const [p, t, m, w] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks/project/${id}`),
        api.get(`/messages/${id}`),
        api.get(`/workflows/project/${id}`),
      ]);
      setProject(p.data);
      setTasks(t.data);
      setMessages(m.data);
      setWorkflowItems(w.data);

      if (!newTaskAssignee && p.data?.members?.length) {
        setNewTaskAssignee(p.data.members[0]._id);
      }

      setProjectDeadline(p.data?.deadline ? String(p.data.deadline).slice(0, 10) : '');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load project');
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const onInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      await api.post('/invitations', {
        projectId: id,
        receiverEmail: inviteEmail.trim().toLowerCase(),
      });
      setInviteEmail('');
      await loadAll();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to send invitation');
    }
  };

  const onCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      if (newTaskAssignee === 'ALL_MEMBERS') {
        await api.post('/tasks/bulk', {
          title: newTaskTitle.trim(),
          description: newTaskDesc,
          projectId: id,
          dueDate: newTaskDueDate ? newTaskDueDate : null,
        });
      } else {
        await api.post('/tasks', {
          title: newTaskTitle.trim(),
          description: newTaskDesc,
          assignedTo: newTaskAssignee,
          projectId: id,
          dueDate: newTaskDueDate ? newTaskDueDate : null,
        });
      }
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskDueDate('');
      await loadAll();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to create task');
    }
  };

  const onToggleCompleted = async (taskId, completed) => {
    try {
      await api.put(`/tasks/${taskId}`, { completed });
      await loadAll();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to update task');
    }
  };

  const openTaskModal = async (taskId) => {
    try {
      setError('');
      setSelectedTaskId(taskId);
      setTaskModalOpen(true);
      const { data } = await api.get(`/tasks/${taskId}`);
      setSelectedTask(data);
      setTaskReportText(data?.report?.text || '');
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to load task');
      setTaskModalOpen(false);
      setSelectedTaskId('');
      setSelectedTask(null);
    }
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setSelectedTaskId('');
    setSelectedTask(null);
    setTaskReportText('');
  };

  const onDeleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      await loadAll();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to delete task');
    }
  };

  const uploadOne = async (file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', id);

    const { data } = await api.post('/uploads-api/project', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
  };

  const onSendMessage = async (e) => {
    e.preventDefault();
    if (!chatText.trim() && chatFiles.length === 0) return;
    try {
      setUploading(true);
      const attachments = [];
      for (const f of chatFiles) {
        // eslint-disable-next-line no-await-in-loop
        const meta = await uploadOne(f);
        attachments.push(meta);
      }

      await api.post('/messages', {
        projectId: id,
        message: chatText.trim(),
        attachments,
      });
      setChatText('');
      setChatFiles([]);
      await loadAll();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  if (!project) {
    return (
      <div className="project-page">
        <div className="project-top">
          <Link className="project-back" to="/">
            Back
          </Link>
        </div>
        {error ? <div className="project-error">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="project-page">
      <div className="project-top">
        <Link className="project-back" to="/">
          Back
        </Link>
        <div className="project-head">
          <div className="project-title">{project.name}</div>
          <div className="project-meta">
            Leader: {project.leader?.email || project.leader?.name || '—'}
          </div>
        </div>
      </div>

      {error ? <div className="project-error">{error}</div> : null}

      <div className="project-progress">
        <div className="project-progress-row">
          <div className="project-progress-label">Progress</div>
          <div className="project-progress-value">{project.progress}%</div>
        </div>
        <div className="project-progress-bar">
          <div className="project-progress-fill" style={{ width: `${project.progress}%` }} />
        </div>

        <div className="project-item-meta" style={{ marginTop: 8 }}>
          Progress is capped at 99% until the leader clicks “Mark project completed”.
        </div>

        <div className="project-item-meta">
          {(() => {
            const hasDeadline = Boolean(project.deadline);
            const overdue =
              !project.completed && hasDeadline && new Date(project.deadline).getTime() < Date.now();
            return (
              <>
                Project deadline: {hasDeadline ? new Date(project.deadline).toLocaleDateString() : '—'}
                {overdue ? ' • Overdue' : ''}
              </>
            );
          })()}
        </div>

        {isLeader ? (
          <form
            className="project-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.put(`/projects/${id}/deadline`, {
                  deadline: projectDeadline ? projectDeadline : null,
                });
                await loadAll();
              } catch (e2) {
                setError(e2?.response?.data?.message || 'Failed to update deadline');
              }
            }}
          >
            <div className="project-form-title">Schedule project deadline</div>
            <label className="project-label" style={{ gridColumn: '1 / -1' }}>
              Deadline
              <input
                className="project-input"
                type="date"
                value={projectDeadline}
                onChange={(e) => setProjectDeadline(e.target.value)}
              />
            </label>
            <button className="project-button" type="submit">
              Save deadline
            </button>
          </form>
        ) : null}

        {isLeader ? (
          <button
            className="project-button"
            type="button"
            onClick={async () => {
              const ok = window.confirm('Mark project as completed (100%) and mark all tasks as done?');
              if (!ok) return;
              try {
                await api.put(`/projects/${id}/complete`);
                await loadAll();
              } catch (e2) {
                setError(e2?.response?.data?.message || 'Failed to mark project complete');
              }
            }}
          >
            Mark project completed
          </button>
        ) : null}
      </div>

      <div className="project-tabs">
        <button
          className={`project-tab ${activeTab === 'workflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflow')}
        >
          Workflow
        </button>
        <button
          className={`project-tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
        <button
          className={`project-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button
          className={`project-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
      </div>

      {activeTab === 'workflow' ? (
        <div className="project-section">
          {isLeader ? (
            <form
              className="project-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!wfTitle.trim()) return;
                try {
                  await api.post('/workflows', {
                    projectId: id,
                    title: wfTitle.trim(),
                    description: wfDesc,
                    dueDate: wfDueDate ? wfDueDate : null,
                  });
                  setWfTitle('');
                  setWfDesc('');
                  setWfDueDate('');
                  await loadAll();
                } catch (e2) {
                  setError(e2?.response?.data?.message || 'Failed to add workflow item');
                }
              }}
            >
              <div className="project-form-title">Add workflow item</div>
              <div className="project-form-grid">
                <label className="project-label">
                  Title
                  <input
                    className="project-input"
                    value={wfTitle}
                    onChange={(e) => setWfTitle(e.target.value)}
                  />
                </label>
                <label className="project-label">
                  Due date
                  <input
                    className="project-input"
                    type="date"
                    value={wfDueDate}
                    onChange={(e) => setWfDueDate(e.target.value)}
                  />
                </label>
                <label className="project-label" style={{ gridColumn: '1 / -1' }}>
                  Description
                  <textarea
                    className="project-input"
                    rows={2}
                    value={wfDesc}
                    onChange={(e) => setWfDesc(e.target.value)}
                  />
                </label>
              </div>
              <button className="project-button" type="submit">
                Add
              </button>
            </form>
          ) : null}

          <div className="project-list">
            {workflowItems.length === 0 ? (
              <div className="project-muted">No workflow items yet</div>
            ) : null}

            {workflowItems.map((w) => (
              <div key={w._id} className="project-item">
                <div className="project-item-main">
                  {isLeader && editingWorkflowId === w._id ? (
                    <form
                      className="project-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await api.put(`/workflows/${w._id}`, {
                            title: editWfTitle,
                            description: editWfDesc,
                            dueDate: editWfDueDate ? editWfDueDate : null,
                          });
                          setEditingWorkflowId('');
                          setEditWfTitle('');
                          setEditWfDesc('');
                          setEditWfDueDate('');
                          await loadAll();
                        } catch (e2) {
                          setError(e2?.response?.data?.message || 'Failed to update workflow item');
                        }
                      }}
                    >
                      <div className="project-form-title">Edit workflow item</div>
                      <div className="project-form-grid">
                        <label className="project-label">
                          Title
                          <input
                            className="project-input"
                            value={editWfTitle}
                            onChange={(e) => setEditWfTitle(e.target.value)}
                          />
                        </label>
                        <label className="project-label">
                          Due date
                          <input
                            className="project-input"
                            type="date"
                            value={editWfDueDate}
                            onChange={(e) => setEditWfDueDate(e.target.value)}
                          />
                        </label>
                        <label className="project-label" style={{ gridColumn: '1 / -1' }}>
                          Description
                          <textarea
                            className="project-input"
                            rows={2}
                            value={editWfDesc}
                            onChange={(e) => setEditWfDesc(e.target.value)}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button className="project-button" type="submit">
                          Save
                        </button>
                        <button
                          className="project-button danger"
                          type="button"
                          onClick={() => {
                            setEditingWorkflowId('');
                            setEditWfTitle('');
                            setEditWfDesc('');
                            setEditWfDueDate('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="project-item-title">{w.title}</div>
                      <div className="project-item-meta">
                        {w.description || '—'}
                        {w.dueDate ? ` • Due: ${new Date(w.dueDate).toLocaleDateString()}` : ''}
                        {!w.completed && w.dueDate && new Date(w.dueDate).getTime() < Date.now()
                          ? ' • Overdue'
                          : ''}
                      </div>
                    </>
                  )}
                </div>
                <div className="project-item-actions">
                  <label className="project-check">
                    <input
                      type="checkbox"
                      checked={Boolean(w.completed)}
                      disabled={!isLeader}
                      onChange={async (e) => {
                        try {
                          await api.put(`/workflows/${w._id}/toggle`, { completed: e.target.checked });
                          await loadAll();
                        } catch (e2) {
                          setError(e2?.response?.data?.message || 'Failed to update workflow item');
                        }
                      }}
                    />
                    Done
                  </label>

                  {isLeader ? (
                    <button
                      className="project-button"
                      type="button"
                      onClick={() => {
                        setEditingWorkflowId(w._id);
                        setEditWfTitle(w.title || '');
                        setEditWfDesc(w.description || '');
                        setEditWfDueDate(w.dueDate ? String(w.dueDate).slice(0, 10) : '');
                      }}
                      disabled={editingWorkflowId === w._id}
                    >
                      Edit
                    </button>
                  ) : null}

                  {isLeader ? (
                    <button
                      className="project-button danger"
                      type="button"
                      onClick={async () => {
                        try {
                          await api.delete(`/workflows/${w._id}`);
                          await loadAll();
                        } catch (e2) {
                          setError(e2?.response?.data?.message || 'Failed to delete workflow item');
                        }
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'tasks' ? (
        <div className="project-section">
          {isLeader ? (
            <form className="project-form" onSubmit={onCreateTask}>
              <div className="project-form-title">Create task</div>
              <div className="project-form-grid">
                <label className="project-label">
                  Title
                  <input
                    className="project-input"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </label>
                <label className="project-label">
                  Assign to
                  <select
                    className="project-input"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                  >
                    <option value="ALL_MEMBERS">All members</option>
                    {project.members.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.email || m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="project-label">
                  Due date
                  <input
                    className="project-input"
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
                </label>
                <label className="project-label" style={{ gridColumn: '1 / -1' }}>
                  Description
                  <textarea
                    className="project-input"
                    rows={2}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                  />
                </label>
              </div>
              <button className="project-button" type="submit">
                Create
              </button>
            </form>
          ) : null}

          <div className="project-list">
            {tasks.length === 0 ? <div className="project-muted">No tasks yet</div> : null}
            {tasks.map((t) => {
              const canEdit =
                isLeader || (t.assignedTo?._id ? String(t.assignedTo._id) === String(user?._id) : false);

              return (
                <div
                  key={t._id}
                  className="project-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => openTaskModal(t._id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openTaskModal(t._id);
                  }}
                >
                  <div className="project-item-main">
                    <div className="project-item-title">{t.title}</div>
                    <div className="project-item-meta">
                      Assigned: {t.assignedTo?.email || t.assignedTo?.name} • Status: {t.status} • Completed:{' '}
                      {t.completed ? 'Yes' : 'No'}
                      {t.dueDate ? ` • Due: ${new Date(t.dueDate).toLocaleDateString()}` : ''}
                      {!t.completed && t.dueDate && new Date(t.dueDate).getTime() < Date.now() ? ' • Overdue' : ''}
                    </div>
                  </div>

                  <div className="project-item-actions">
                    {canEdit ? (
                      <label className="project-check">
                        <input
                          type="checkbox"
                          checked={Boolean(t.completed)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onToggleCompleted(t._id, e.target.checked)}
                        />
                        Done
                      </label>
                    ) : null}

                    {isLeader ? (
                      <button
                        className="project-button danger"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(t._id);
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeTab === 'members' ? (
        <div className="project-section">
          {isLeader ? (
            <form className="project-form" onSubmit={onInvite}>
              <div className="project-form-title">Invite member</div>
              <div className="project-form-grid">
                <label className="project-label" style={{ gridColumn: '1 / -1' }}>
                  Email
                  <input
                    className="project-input"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </label>
              </div>
              <button className="project-button" type="submit">
                Send invite
              </button>
            </form>
          ) : null}

          <div className="project-list">
            {project.members.map((m) => (
              <div key={m._id} className="project-item">
                <div className="project-item-main">
                  <div className="project-item-title">{m.name || m.email}</div>
                  <div className="project-item-meta">{m.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'chat' ? (
        <div className="project-section">
          <div className="project-chat">
            {messages.map((m) => (
              <div key={m._id} className="project-chat-row">
                <div className="project-chat-author">{m.sender?.email || m.sender?.name}</div>
                <div className="project-chat-msg">{m.message}</div>
                {Array.isArray(m.attachments) && m.attachments.length > 0 ? (
                  <div className="project-attach-list">
                    {m.attachments.map((a, idx) => {
                      const isImg = a.mimeType?.startsWith('image/');
                      return (
                        <a
                          key={`${a.url}-${idx}`}
                          className="project-attach"
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {isImg ? (
                            <img className="project-attach-img" src={a.url} alt={a.originalName} />
                          ) : (
                            <div className="project-attach-file">
                              <div className="project-attach-name">{a.originalName}</div>
                              <div className="project-attach-meta">{a.mimeType}</div>
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form className="project-chat-form" onSubmit={onSendMessage}>
            <div className="project-chat-compose">
              <input
                className="project-input"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Write a message..."
              />

              <div className="project-chat-tools">
                <label className="project-file-btn">
                  Attach
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setChatFiles(Array.from(e.target.files || []))}
                    style={{ display: 'none' }}
                  />
                </label>
                <button className="project-button" disabled={uploading} type="submit">
                  {uploading ? 'Sending...' : 'Send'}
                </button>
              </div>

              {chatFiles.length > 0 ? (
                <div className="project-file-list">
                  {chatFiles.map((f) => (
                    <div key={f.name} className="project-file-pill">
                      {f.name}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="project-link"
                    onClick={() => setChatFiles([])}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {taskModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            zIndex: 50,
          }}
          role="dialog"
          aria-modal="true"
          onClick={closeTaskModal}
        >
          <div
            style={{
              width: 'min(720px, 100%)',
              background: 'var(--ts-surface)',
              border: '1px solid var(--ts-border)',
              borderRadius: 12,
              padding: 14,
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Task report</div>
              <button className="project-button danger" type="button" onClick={closeTaskModal}>
                Close
              </button>
            </div>

            {selectedTask ? (
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{selectedTask.title}</div>
                  <div className="project-item-meta">{selectedTask.description || '—'}</div>
                </div>

                <div className="project-item-meta">
                  Assigned: {selectedTask.assignedTo?.email || selectedTask.assignedTo?.name || '—'}
                </div>

                <div className="project-item-meta">
                  Due: {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : '—'}
                </div>

                <div className="project-item-meta">
                  Created: {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString() : '—'}
                </div>

                <div className="project-item-meta">
                  Updated: {selectedTask.updatedAt ? new Date(selectedTask.updatedAt).toLocaleString() : '—'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <label className="project-check">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedTask.completed)}
                      disabled={
                        !(
                          isLeader ||
                          (selectedTask.assignedTo?._id
                            ? String(selectedTask.assignedTo._id) === String(user?._id)
                            : false)
                        )
                      }
                      onChange={async (e) => {
                        try {
                          await api.put(`/tasks/${selectedTaskId}`, { completed: e.target.checked });
                          await loadAll();
                          const { data } = await api.get(`/tasks/${selectedTaskId}`);
                          setSelectedTask(data);
                        } catch (e2) {
                          setError(e2?.response?.data?.message || 'Failed to update task');
                        }
                      }}
                    />
                    Done
                  </label>
                </div>

                {(() => {
                  const isAssignee = selectedTask.assignedTo?._id
                    ? String(selectedTask.assignedTo._id) === String(user?._id)
                    : false;
                  const overdue =
                    !selectedTask.completed &&
                    selectedTask.dueDate &&
                    new Date(selectedTask.dueDate).getTime() < Date.now();

                  if (!isAssignee || !overdue) return null;

                  return (
                    <form
                      className="project-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await api.post(`/tasks/${selectedTaskId}/report`, { text: taskReportText });
                          const { data } = await api.get(`/tasks/${selectedTaskId}`);
                          setSelectedTask(data);
                        } catch (e2) {
                          setError(e2?.response?.data?.message || 'Failed to submit report');
                        }
                      }}
                    >
                      <div className="project-form-title">Overdue report</div>
                      <label className="project-label" style={{ gridColumn: '1 / -1' }}>
                        Report
                        <textarea
                          className="project-input"
                          rows={3}
                          value={taskReportText}
                          onChange={(e) => setTaskReportText(e.target.value)}
                          placeholder="Explain why it is not completed and what you have done so far..."
                        />
                      </label>
                      <button className="project-button" type="submit">
                        Submit report
                      </button>
                      {selectedTask.report?.submittedAt ? (
                        <div className="project-item-meta">
                          Last submitted: {new Date(selectedTask.report.submittedAt).toLocaleString()}
                        </div>
                      ) : null}
                    </form>
                  );
                })()}
              </div>
            ) : (
              <div className="project-muted" style={{ marginTop: 12 }}>
                Loading...
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProjectPage;
