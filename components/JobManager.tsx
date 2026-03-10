import React, { useState } from 'react';
import { Job, Photo, Task } from '../types';
import PhotoUpload from './PhotoUpload';

interface JobManagerProps {
  jobs: Job[];
  onJobsChange: (jobs: Job[]) => void;
  selectedJobId?: string | null;
  onSelectJob?: (jobId: string) => void;
}

const JOB_COLORS = ['#0E5FD8', '#0EA567', '#D97E00', '#0B7A75', '#C73B2F', '#7A4DE6', '#0087A8', '#304A7A'];

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CameraSmallIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function getTaskStatusMeta(status: Task['status']) {
  switch (status) {
    case 'completed':
      return {
        label: 'Done',
        badgeClassName: 'bg-green-100 text-green-700',
        buttonClassName: 'bg-fb-active-bg text-fb-text-secondary hover:bg-fb-divider',
        buttonLabel: 'Reopen',
        nextStatus: 'pending' as Task['status'],
      };
    case 'in-progress':
      return {
        label: 'In Progress',
        badgeClassName: 'bg-amber-100 text-amber-700',
        buttonClassName: 'bg-fb-green text-white hover:bg-fb-green-hover',
        buttonLabel: 'Mark Done',
        nextStatus: 'completed' as Task['status'],
      };
    default:
      return {
        label: 'To Do',
        badgeClassName: 'bg-fb-bg text-fb-text-secondary',
        buttonClassName: 'bg-fb-blue text-white hover:bg-fb-blue-hover',
        buttonLabel: 'Start Task',
        nextStatus: 'in-progress' as Task['status'],
      };
  }
}

const JobManager: React.FC<JobManagerProps> = ({ jobs, onJobsChange, selectedJobId, onSelectJob }) => {
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(selectedJobId || null);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [expandedTaskPhotos, setExpandedTaskPhotos] = useState<string | null>(null);

  const resetJobForm = () => {
    setJobName('');
    setJobDescription('');
    setJobAddress('');
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobName.trim()) return;

    const newJob: Job = {
      id: `job-${Date.now()}`,
      name: jobName.trim(),
      client: '',
      description: jobDescription.trim(),
      address: jobAddress.trim(),
      hourlyRate: 0,
      tasks: [],
      photos: [],
      createdAt: new Date().toISOString(),
      color: JOB_COLORS[Math.floor(Math.random() * JOB_COLORS.length)],
    };

    onJobsChange([newJob, ...jobs]);
    resetJobForm();
    setShowCreateJob(false);
    setExpandedJobId(newJob.id);
  };

  const handleDeleteJob = (jobId: string) => {
    if (window.confirm('Delete this job and all its tasks?')) {
      onJobsChange(jobs.filter((job) => job.id !== jobId));
      if (expandedJobId === jobId) {
        setExpandedJobId(null);
      }
    }
  };

  const handleAddTask = (jobId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      jobId,
      title: taskTitle.trim(),
      description: '',
      status: 'pending',
      photos: [],
      createdAt: new Date().toISOString(),
    };

    onJobsChange(jobs.map((job) => (job.id === jobId ? { ...job, tasks: [newTask, ...job.tasks] } : job)));
    setTaskTitle('');
    setShowAddTask(null);
  };

  const handleSetTaskStatus = (jobId: string, taskId: string, status: Task['status']) => {
    onJobsChange(
      jobs.map((job) => {
        if (job.id !== jobId) return job;
        return {
          ...job,
          tasks: job.tasks.map((task) => {
            if (task.id !== taskId) return task;
            return {
              ...task,
              status,
              completedAt: status === 'completed' ? new Date().toISOString() : undefined,
            };
          }),
        };
      })
    );
  };

  const handleDeleteTask = (jobId: string, taskId: string) => {
    onJobsChange(
      jobs.map((job) => {
        if (job.id !== jobId) return job;
        return { ...job, tasks: job.tasks.filter((task) => task.id !== taskId) };
      })
    );
  };

  const handleTaskPhotosChange = (jobId: string, taskId: string, photos: Photo[]) => {
    onJobsChange(
      jobs.map((job) => {
        if (job.id !== jobId) return job;
        return {
          ...job,
          tasks: job.tasks.map((task) => (task.id === taskId ? { ...task, photos } : task)),
        };
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-fb-divider bg-fb-card shadow-fb-lg">
        <div className="flex items-start justify-between gap-3 border-b border-fb-divider px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-display text-lg font-extrabold text-fb-text">Jobs & Tasks</h2>
            <p className="mt-0.5 text-xs font-medium text-fb-text-tertiary">Open a job to manage scope, checklist states, and photo evidence.</p>
          </div>
          <button
            onClick={() => setShowCreateJob((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fb-blue to-fb-blue-dark px-3 py-2 text-xs font-extrabold text-white hover:brightness-95"
          >
            <PlusIcon /> New Job
          </button>
        </div>

        {showCreateJob && (
          <div className="border-b border-fb-divider bg-fb-bg p-4">
            <form onSubmit={handleCreateJob} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Job Name *</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g., Kitchen Renovation"
                  className="block w-full rounded-xl border border-fb-input-border bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Job details..."
                  rows={3}
                  className="block w-full resize-none rounded-xl border border-fb-input-border bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Address</label>
                <input
                  type="text"
                  value={jobAddress}
                  onChange={(e) => setJobAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, City, ST"
                  className="block w-full rounded-xl border border-fb-input-border bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateJob(false);
                    resetJobForm();
                  }}
                  className="px-4 py-3 text-sm font-semibold text-fb-text-secondary bg-white border border-fb-divider rounded-xl hover:bg-fb-active-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!jobName.trim()}
                  className="rounded-xl bg-fb-blue px-4 py-3 text-sm font-extrabold text-white hover:bg-fb-blue-hover disabled:opacity-40"
                >
                  Create Job
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-3xl border border-fb-divider bg-fb-card px-6 py-12 text-center shadow-fb">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-fb-bg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-fb-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-fb-text-secondary">No jobs yet</p>
          <p className="text-xs text-fb-text-tertiary mt-1">Create your first job to start building checklists.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const activeTaskCount = job.tasks.filter((task) => task.status !== 'completed').length;
            const completedTaskCount = job.tasks.filter((task) => task.status === 'completed').length;
            const progress = job.tasks.length > 0 ? (completedTaskCount / job.tasks.length) * 100 : 0;
            const sortedTasks = [...job.tasks].sort((a, b) => {
              const order = { pending: 0, 'in-progress': 1, completed: 2 };
              const statusDiff = order[a.status] - order[b.status];
              if (statusDiff !== 0) return statusDiff;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            return (
              <div key={job.id} className={`overflow-hidden rounded-2xl border bg-fb-card shadow-fb ${selectedJobId === job.id ? 'border-sky-200' : 'border-fb-divider'}`}>
                <button
                  onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                  className="w-full p-4 text-left hover:bg-fb-hover-bg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 mt-1 rounded-full shrink-0" style={{ backgroundColor: job.color }} />
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-fb-text truncate">{job.name}</p>
                            {selectedJobId === job.id && (
                              <span className="px-2 py-1 rounded-full bg-red-50 text-[11px] font-semibold text-fb-blue">Selected</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-fb-text-tertiary truncate">{job.address || 'No address added yet'}</p>
                        </div>
                        <ChevronIcon open={isExpanded} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium text-fb-text-secondary">
                          <span>{activeTaskCount} open</span>
                          <span>{completedTaskCount}/{job.tasks.length} done</span>
                        </div>
                        <div className="h-2 rounded-full bg-fb-bg overflow-hidden">
                          <div className="h-full rounded-full bg-fb-blue transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-1 rounded-full bg-fb-bg text-fb-text-secondary font-semibold">{job.tasks.length} tasks</span>
                        {job.description && <span className="px-2 py-1 rounded-full bg-fb-bg text-fb-text-secondary font-semibold">Has notes</span>}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-fb-bg/50 border-t border-fb-divider space-y-4">
                    <div className="pt-4 flex flex-wrap gap-2">
                      {onSelectJob && (
                        <button
                          onClick={() => onSelectJob(job.id)}
                          className="px-3 py-2 rounded-lg bg-fb-blue text-sm font-semibold text-white hover:bg-fb-blue-hover transition-colors"
                        >
                          Use On Clock Screen
                        </button>
                      )}
                      <button
                        onClick={() => setShowAddTask(showAddTask === job.id ? null : job.id)}
                        className="px-3 py-2 rounded-lg bg-white border border-fb-divider text-sm font-semibold text-fb-text-secondary hover:bg-fb-active-bg transition-colors"
                      >
                        Add Task
                      </button>
                    </div>

                    {job.description && <p className="text-sm text-fb-text-secondary">{job.description}</p>}

                    {showAddTask === job.id && (
                      <form onSubmit={(e) => handleAddTask(job.id, e)} className="p-3 bg-white rounded-xl border border-fb-divider space-y-2">
                        <input
                          type="text"
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="Task name..."
                          className="block w-full px-3 py-3 text-sm bg-fb-bg border border-fb-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fb-blue transition-colors"
                          required
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddTask(null);
                              setTaskTitle('');
                            }}
                            className="px-3 py-2.5 text-xs font-semibold text-fb-text-secondary bg-fb-active-bg rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={!taskTitle.trim()}
                            className="px-3 py-2.5 text-xs font-bold text-white bg-fb-blue rounded-lg disabled:opacity-40"
                          >
                            Save Task
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-2">
                      {sortedTasks.length === 0 ? (
                        <div className="rounded-xl bg-white border border-dashed border-fb-divider px-4 py-5 text-center text-sm text-fb-text-tertiary">
                          No tasks yet. Add one to start the checklist.
                        </div>
                      ) : (
                        sortedTasks.map((task) => {
                          const statusMeta = getTaskStatusMeta(task.status);
                          const showPhotos = expandedTaskPhotos === task.id;

                          return (
                            <div key={task.id} className="bg-white rounded-xl border border-fb-divider overflow-hidden">
                              <div className="p-3 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-fb-text-tertiary' : 'text-fb-text'}`}>
                                      {task.title}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${statusMeta.badgeClassName}`}>
                                        {statusMeta.label}
                                      </span>
                                      {task.photos.length > 0 && (
                                        <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-fb-blue">
                                          {task.photos.length} {task.photos.length === 1 ? 'photo' : 'photos'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteTask(job.id, task.id)}
                                    className="text-fb-text-tertiary hover:text-fb-red p-2 rounded-lg transition-colors shrink-0"
                                    aria-label="Delete task"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSetTaskStatus(job.id, task.id, statusMeta.nextStatus)}
                                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${statusMeta.buttonClassName}`}
                                  >
                                    {statusMeta.buttonLabel}
                                  </button>
                                  <button
                                    onClick={() => setExpandedTaskPhotos(showPhotos ? null : task.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                                      showPhotos || task.photos.length > 0
                                        ? 'text-fb-blue bg-blue-50'
                                        : 'text-fb-text-secondary bg-fb-bg hover:bg-fb-active-bg'
                                    }`}
                                  >
                                    <CameraSmallIcon />
                                    Photos
                                  </button>
                                </div>
                              </div>

                              {showPhotos && (
                                <div className="px-3 pb-3 border-t border-fb-divider pt-3">
                                  <PhotoUpload
                                    photos={task.photos}
                                    onPhotosChange={(photos) => handleTaskPhotosChange(job.id, task.id, photos)}
                                    maxPhotos={10}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-xs font-semibold text-fb-red hover:underline"
                      >
                        Delete Job
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobManager;
