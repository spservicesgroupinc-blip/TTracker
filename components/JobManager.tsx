import React, { useState } from 'react';
import { Job, Task, Photo } from '../types';
import PhotoUpload from './PhotoUpload';

interface JobManagerProps {
  jobs: Job[];
  onJobsChange: (jobs: Job[]) => void;
}

const JOB_COLORS = ['#CC0000', '#42B72A', '#F7B928', '#FA3E3C', '#A855F7', '#EC4899', '#14B8A6', '#F97316'];

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

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const JobManager: React.FC<JobManagerProps> = ({ jobs, onJobsChange }) => {
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);

  // Job form
  const [jobName, setJobName] = useState('');
  const [jobClient, setJobClient] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobRate, setJobRate] = useState('');
  const [jobColor, setJobColor] = useState(JOB_COLORS[0]);

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const resetJobForm = () => {
    setJobName('');
    setJobClient('');
    setJobDescription('');
    setJobRate('');
    setJobColor(JOB_COLORS[0]);
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobName.trim()) return;

    const newJob: Job = {
      id: `job-${Date.now()}`,
      name: jobName.trim(),
      client: jobClient.trim(),
      description: jobDescription.trim(),
      hourlyRate: parseFloat(jobRate) || 0,
      tasks: [],
      photos: [],
      createdAt: new Date().toISOString(),
      color: jobColor,
    };

    onJobsChange([...jobs, newJob]);
    resetJobForm();
    setShowCreateJob(false);
    setExpandedJobId(newJob.id);
  };

  const handleDeleteJob = (jobId: string) => {
    if (window.confirm('Delete this job and all its tasks?')) {
      onJobsChange(jobs.filter(j => j.id !== jobId));
    }
  };

  const handleAddTask = (jobId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      jobId,
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      status: 'pending',
      photos: [],
      createdAt: new Date().toISOString(),
    };

    onJobsChange(jobs.map(j =>
      j.id === jobId ? { ...j, tasks: [...j.tasks, newTask] } : j
    ));
    setTaskTitle('');
    setTaskDescription('');
    setShowAddTask(null);
  };

  const handleToggleTaskStatus = (jobId: string, taskId: string) => {
    onJobsChange(jobs.map(j => {
      if (j.id !== jobId) return j;
      return {
        ...j,
        tasks: j.tasks.map(t => {
          if (t.id !== taskId) return t;
          const nextStatus = t.status === 'completed' ? 'pending' : t.status === 'pending' ? 'in-progress' : 'completed';
          return {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
          };
        }),
      };
    }));
  };

  const handleDeleteTask = (jobId: string, taskId: string) => {
    onJobsChange(jobs.map(j => {
      if (j.id !== jobId) return j;
      return { ...j, tasks: j.tasks.filter(t => t.id !== taskId) };
    }));
  };

  const handleTaskPhotosChange = (jobId: string, taskId: string, photos: Photo[]) => {
    onJobsChange(jobs.map(j => {
      if (j.id !== jobId) return j;
      return {
        ...j,
        tasks: j.tasks.map(t => t.id === taskId ? { ...t, photos } : t),
      };
    }));
  };

  const handleJobPhotosChange = (jobId: string, photos: Photo[]) => {
    onJobsChange(jobs.map(j =>
      j.id === jobId ? { ...j, photos } : j
    ));
  };

  const statusBadge = (status: Task['status']) => {
    const styles = {
      'pending': 'bg-gray-100 text-gray-600',
      'in-progress': 'bg-red-50 text-fb-blue',
      'completed': 'bg-green-50 text-fb-green',
    };
    const labels = { 'pending': 'Pending', 'in-progress': 'In Progress', 'completed': 'Done' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="bg-fb-card rounded-lg shadow-fb overflow-hidden">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-fb-divider flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-fb-text">Jobs & Tasks</h2>
        <button
          onClick={() => setShowCreateJob(!showCreateJob)}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-fb-blue rounded-lg hover:bg-fb-blue-hover transition-colors"
        >
          <PlusIcon /> New Job
        </button>
      </div>

      {/* Create Job Form */}
      {showCreateJob && (
        <div className="p-3 sm:p-4 border-b border-fb-divider bg-fb-bg">
          <form onSubmit={handleCreateJob} className="space-y-2.5 sm:space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Job Name *</label>
                <input
                  type="text"
                  value={jobName}
                  onChange={e => setJobName(e.target.value)}
                  placeholder="e.g., Kitchen Renovation"
                  className="block w-full px-3 py-2 text-sm bg-white border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Client</label>
                <input
                  type="text"
                  value={jobClient}
                  onChange={e => setJobClient(e.target.value)}
                  placeholder="e.g., John Smith"
                  className="block w-full px-3 py-2 text-sm bg-white border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Description</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Job details..."
                rows={2}
                className="block w-full px-3 py-2 text-sm bg-white border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Hourly Rate ($)</label>
                <input
                  type="number"
                  value={jobRate}
                  onChange={e => setJobRate(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="block w-full px-3 py-2 text-sm bg-white border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Color</label>
                <div className="flex gap-1.5 flex-wrap">
                  {JOB_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setJobColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${jobColor === c ? 'border-fb-text scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowCreateJob(false); resetJobForm(); }}
                className="px-4 py-2 text-sm font-semibold text-fb-text-secondary bg-fb-active-bg rounded-lg hover:bg-fb-divider transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!jobName.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-fb-blue rounded-lg hover:bg-fb-blue-hover transition-colors disabled:opacity-40"
              >
                Create Job
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Job List */}
      <div className="divide-y divide-fb-divider">
        {jobs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-fb-bg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-fb-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-fb-text-secondary">No jobs yet</p>
            <p className="text-xs text-fb-text-tertiary mt-1">Create your first job to get started.</p>
          </div>
        ) : (
          jobs.map(job => {
            const isExpanded = expandedJobId === job.id;
            const completedTasks = job.tasks.filter(t => t.status === 'completed').length;
            return (
              <div key={job.id}>
                <div
                  className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 cursor-pointer hover:bg-fb-hover-bg transition-colors"
                  onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: job.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-fb-text truncate">{job.name}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                      {job.client && <span className="text-[10px] sm:text-xs text-fb-text-secondary truncate max-w-[80px] sm:max-w-none">{job.client}</span>}
                      {job.hourlyRate > 0 && (
                        <span className="text-[10px] sm:text-xs font-semibold text-fb-green">${job.hourlyRate.toFixed(2)}/hr</span>
                      )}
                      <span className="text-[10px] sm:text-xs text-fb-text-tertiary">
                        {completedTasks}/{job.tasks.length} tasks
                      </span>
                    </div>
                  </div>
                  <ChevronIcon open={isExpanded} />
                </div>

                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-fb-bg/50">
                    {job.description && (
                      <p className="text-xs text-fb-text-secondary mb-3 px-1">{job.description}</p>
                    )}

                    {/* Job Photos */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-fb-text-secondary mb-1.5 uppercase tracking-wide">Job Photos</p>
                      <PhotoUpload
                        photos={job.photos}
                        onPhotosChange={(photos) => handleJobPhotosChange(job.id, photos)}
                      />
                    </div>

                    {/* Tasks */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-fb-text-secondary uppercase tracking-wide">Tasks</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAddTask(showAddTask === job.id ? null : job.id); }}
                          className="text-xs font-semibold text-fb-blue hover:underline"
                        >
                          + Add Task
                        </button>
                      </div>

                      {showAddTask === job.id && (
                        <form onSubmit={(e) => handleAddTask(job.id, e)} className="mb-3 p-3 bg-white rounded-lg border border-fb-divider space-y-2">
                          <input
                            type="text"
                            value={taskTitle}
                            onChange={e => setTaskTitle(e.target.value)}
                            placeholder="Task title..."
                            className="block w-full px-3 py-2 text-sm bg-fb-bg border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue transition-colors"
                            required
                            autoFocus
                          />
                          <textarea
                            value={taskDescription}
                            onChange={e => setTaskDescription(e.target.value)}
                            placeholder="Description (optional)..."
                            rows={2}
                            className="block w-full px-3 py-2 text-sm bg-fb-bg border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue transition-colors resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => { setShowAddTask(null); setTaskTitle(''); setTaskDescription(''); }} className="px-3 py-1.5 text-xs font-semibold text-fb-text-secondary bg-fb-active-bg rounded-lg">Cancel</button>
                            <button type="submit" disabled={!taskTitle.trim()} className="px-3 py-1.5 text-xs font-bold text-white bg-fb-blue rounded-lg disabled:opacity-40">Add</button>
                          </div>
                        </form>
                      )}

                      {job.tasks.length === 0 ? (
                        <p className="text-xs text-fb-text-tertiary text-center py-4">No tasks yet</p>
                      ) : (
                        <div className="space-y-2">
                          {job.tasks.map(task => (
                            <div key={task.id} className="p-3 bg-white rounded-lg border border-fb-divider">
                              <div className="flex items-start gap-2">
                                <button
                                  onClick={() => handleToggleTaskStatus(job.id, task.id)}
                                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    task.status === 'completed'
                                      ? 'bg-fb-green border-fb-green text-white'
                                      : task.status === 'in-progress'
                                      ? 'bg-red-50 border-fb-blue text-fb-blue'
                                      : 'border-fb-divider hover:border-fb-blue'
                                  }`}
                                >
                                  {task.status === 'completed' && <CheckIcon />}
                                  {task.status === 'in-progress' && <span className="w-2 h-2 rounded-full bg-fb-blue" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-fb-text-tertiary' : 'text-fb-text'}`}>
                                      {task.title}
                                    </p>
                                    {statusBadge(task.status)}
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-fb-text-secondary mt-1">{task.description}</p>
                                  )}
                                  <div className="mt-2">
                                    <PhotoUpload
                                      photos={task.photos}
                                      onPhotosChange={(photos) => handleTaskPhotosChange(job.id, task.id, photos)}
                                      maxPhotos={5}
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteTask(job.id, task.id)}
                                  className="text-fb-text-tertiary hover:text-fb-red p-1 rounded transition-colors shrink-0"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
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
          })
        )}
      </div>
    </div>
  );
};

export default JobManager;
