import React, { useEffect, useMemo, useState } from 'react';
import { Coordinates, Job, Task, TimeEntry, UserProfile } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import ProfileSetup from './components/ProfileSetup';
import JobManager from './components/JobManager';
import PremiumReport from './components/PremiumReport';
import InstallPrompt from './components/InstallPrompt';
import { getCurrentPosition } from './services/locationService';

const JOB_COLORS = ['#0E5FD8', '#0EA567', '#D97E00', '#0B7A75', '#C73B2F', '#7A4DE6', '#0087A8', '#304A7A'];

const RFELogo: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size}>
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0E5FD8" />
        <stop offset="100%" stopColor="#0EA567" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="96" fill="#101B2D" />
    <rect x="0" y="0" width="12" height="512" rx="6" fill="url(#g)" />
    <text x="256" y="245" textAnchor="middle" fill="#FFFFFF" fontFamily="Sora, Arial, sans-serif" fontWeight="800" fontSize="198" letterSpacing="-8">RFE</text>
    <text x="256" y="342" textAnchor="middle" fill="#76E5B3" fontFamily="Manrope, Arial, sans-serif" fontWeight="700" fontSize="54" letterSpacing="10">FIELD</text>
    <text x="256" y="398" textAnchor="middle" fill="#A3B4CF" fontFamily="Manrope, Arial, sans-serif" fontWeight="700" fontSize="38" letterSpacing="7">OPERATIONS</text>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V8a2 2 0 00-2-2h-3V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v1H6a2 2 0 00-2 2v5m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4.586a1 1 0 00-.707.293l-.414.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-.414-.414A1 1 0 009.586 13H5" />
  </svg>
);

const ChecklistIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h10M9 12h10M9 19h10M5 5l.01 0M5 12l.01 0M5 19l.01 0" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getTaskStatusMeta(status: Task['status']) {
  switch (status) {
    case 'completed':
      return {
        label: 'Done',
        badgeClassName: 'bg-emerald-100 text-emerald-700',
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

type ComposerType = 'job' | 'task' | null;

const App: React.FC = () => {
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('user-profile', null);
  const [timeEntries, setTimeEntries] = useLocalStorage<TimeEntry[]>('time-entries', []);
  const [jobs, setJobs] = useLocalStorage<Job[]>('jobs', []);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('general');
  const [activeTab, setActiveTab] = useState<'clock' | 'jobs' | 'report'>('clock');
  const [now, setNow] = useState(Date.now());
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [activeComposer, setActiveComposer] = useState<ComposerType>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskJobId, setNewTaskJobId] = useState('');
  const [newJobName, setNewJobName] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [newJobAddress, setNewJobAddress] = useState('');

  const activeEntry = useMemo(() => {
    const openEntries = timeEntries.filter((entry) => !entry.clockOut);
    return openEntries.length > 0 ? openEntries[openEntries.length - 1] : null;
  }, [timeEntries]);

  const isClockedIn = !!activeEntry;

  useEffect(() => {
    if (!isClockedIn) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isClockedIn]);

  useEffect(() => {
    if (selectedJobId !== 'general' && !jobs.find((job) => job.id === selectedJobId)) {
      setSelectedJobId('general');
      return;
    }

    if (activeEntry?.jobId) {
      setSelectedJobId(activeEntry.jobId);
    }
  }, [jobs, selectedJobId, activeEntry]);

  const selectedJob = useMemo(() => {
    if (selectedJobId !== 'general') {
      return jobs.find((job) => job.id === selectedJobId) || null;
    }
    return null;
  }, [jobs, selectedJobId]);

  const tasksForMainScreen = useMemo(() => {
    if (!selectedJob) return [];
    return [...selectedJob.tasks].sort((a, b) => {
      const order = { pending: 0, 'in-progress': 1, completed: 2 };
      const statusDiff = order[a.status] - order[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [selectedJob]);

  const pendingTasks = tasksForMainScreen.filter((task) => task.status !== 'completed');
  const completedTasks = tasksForMainScreen.filter((task) => task.status === 'completed');
  const visibleTasks = showCompletedTasks ? tasksForMainScreen : pendingTasks;
  const completedTaskCount = completedTasks.length;

  const activeRate = useMemo(() => {
    if (!profile) return 0;
    const activeJob = activeEntry?.jobId ? jobs.find((job) => job.id === activeEntry.jobId) : null;
    return activeJob?.hourlyRate || profile.hourlyWage;
  }, [profile, activeEntry, jobs]);

  const activeElapsedMs = activeEntry ? now - new Date(activeEntry.clockIn).getTime() : 0;
  const activeEarnings = (activeElapsedMs / (1000 * 60 * 60)) * activeRate;

  const todayTotal = useMemo(() => {
    if (!profile) return 0;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dayStart = start.getTime();

    return timeEntries.reduce((sum, entry) => {
      if (new Date(entry.clockIn).getTime() < dayStart) return sum;
      const entryJob = entry.jobId ? jobs.find((job) => job.id === entry.jobId) : null;
      const rate = entryJob?.hourlyRate || profile.hourlyWage;
      if (!entry.clockOut) {
        return sum + ((Date.now() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)) * rate;
      }
      return sum + ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)) * rate;
    }, 0);
  }, [jobs, profile, timeEntries]);

  const selectedJobProgress = selectedJob && selectedJob.tasks.length > 0 ? (completedTaskCount / selectedJob.tasks.length) * 100 : 0;

  const resetComposer = () => {
    setActiveComposer(null);
    setNewTaskTitle('');
    setNewTaskJobId(selectedJob?.id || jobs[0]?.id || '');
    setNewJobName('');
    setNewJobDescription('');
    setNewJobAddress('');
  };

  const openComposer = (composer: Exclude<ComposerType, null>) => {
    setShowQuickActions(false);
    if (composer === 'task') {
      const fallbackJobId = selectedJob?.id || jobs[0]?.id || '';
      setNewTaskJobId(fallbackJobId);
    }
    setActiveComposer(composer);
  };

  const handleClockToggle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const location: Coordinates = await getCurrentPosition();
      if (isClockedIn && activeEntry) {
        const updatedEntry: TimeEntry = {
          ...activeEntry,
          clockOut: new Date().toISOString(),
          clockOutLocation: location,
        };
        setTimeEntries(timeEntries.map((entry) => (entry.id === activeEntry.id ? updatedEntry : entry)));
      } else {
        const newEntry: TimeEntry = {
          id: new Date().toISOString(),
          projectName: selectedJob?.name || 'General',
          jobId: selectedJobId !== 'general' ? selectedJobId : undefined,
          clockIn: new Date().toISOString(),
          clockInLocation: location,
        };
        setTimeEntries([...timeEntries, newEntry]);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to get your location.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetProfile = () => {
    if (window.confirm('Are you sure you want to reset your profile? This will clear all your time entries.')) {
      setProfile(null);
      setTimeEntries([]);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskJobId || !newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      jobId: newTaskJobId,
      title: newTaskTitle.trim(),
      description: '',
      status: 'pending',
      photos: [],
      createdAt: new Date().toISOString(),
    };

    setJobs(jobs.map((job) => (job.id === newTaskJobId ? { ...job, tasks: [newTask, ...job.tasks] } : job)));
    setSelectedJobId(newTaskJobId);
    setShowCompletedTasks(false);
    resetComposer();
    setActiveTab('clock');
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobName.trim()) return;

    const newJob: Job = {
      id: `job-${Date.now()}`,
      name: newJobName.trim(),
      client: '',
      description: newJobDescription.trim(),
      address: newJobAddress.trim(),
      hourlyRate: 0,
      tasks: [],
      photos: [],
      createdAt: new Date().toISOString(),
      color: JOB_COLORS[Math.floor(Math.random() * JOB_COLORS.length)],
    };

    setJobs([newJob, ...jobs]);
    setSelectedJobId(newJob.id);
    resetComposer();
    setActiveTab('clock');
  };

  const handleSetTaskStatus = (jobId: string, taskId: string, status: Task['status']) => {
    setJobs(
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

    if (status !== 'completed') {
      setShowCompletedTasks(false);
    }
  };

  if (!profile) {
    return <ProfileSetup onProfileSave={setProfile} />;
  }

  return (
    <div className="min-h-screen text-fb-text font-fb pb-24 md:pb-8">
      <header className="sticky top-0 z-40 border-b border-fb-divider bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <RFELogo size={34} />
            <div>
              <p className="font-display text-base font-extrabold tracking-tight text-fb-text">RFE Field OS</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fb-text-tertiary">Precision Work Tracking</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-2xl border border-fb-divider bg-fb-bg/70 p-1">
            {([
              ['clock', 'Clock'],
              ['jobs', 'Jobs'],
              ['report', 'Reports'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setShowQuickActions(false);
                  setActiveTab(key);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  activeTab === key ? 'bg-white text-fb-blue shadow-fb' : 'text-fb-text-secondary hover:text-fb-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-fb-divider bg-white px-3 py-1.5 shadow-fb">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-fb-blue to-fb-green text-xs font-extrabold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-bold text-fb-text sm:inline">{profile.name}</span>
            </div>
            <button
              onClick={handleResetProfile}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-fb-divider bg-white text-fb-text-secondary hover:bg-fb-hover-bg"
              title="Switch Profile"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 animate-fade-rise">
        {activeTab === 'clock' && (
          <section className="grid gap-4 lg:grid-cols-[1.25fr,0.95fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-fb-divider bg-white shadow-fb-lg">
                <div className="p-4 sm:p-6">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-fb-bg px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fb-text-secondary">
                    <span className={`h-2 w-2 rounded-full ${isClockedIn ? 'animate-pulse bg-fb-green' : 'bg-fb-text-tertiary'}`} />
                    {isClockedIn ? 'Live Session' : 'Awaiting Start'}
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-5xl font-bold leading-none tracking-tight text-fb-text sm:text-6xl">
                        {formatElapsed(activeElapsedMs)}
                      </p>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-fb-green sm:text-4xl">${activeEarnings.toFixed(2)}</p>
                      <p className="mt-1 text-sm font-semibold text-fb-text-tertiary">Today's total: ${todayTotal.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={handleClockToggle}
                      disabled={isLoading}
                      className={`shrink-0 rounded-2xl px-5 py-4 text-sm font-extrabold text-white shadow-fb-lg transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 sm:px-6 sm:text-base ${
                        isClockedIn ? 'bg-fb-red hover:brightness-95' : 'bg-gradient-to-r from-fb-green to-emerald-500 hover:brightness-95'
                      }`}
                    >
                      <span className="inline-flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                        <ClockIcon />
                        <span>{isLoading ? 'Locating…' : isClockedIn ? 'Clock Out' : 'Clock In'}</span>
                      </span>
                    </button>
                  </div>
                </div>
                {error && <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-fb-red">{error}</p>}
              </div>

              <div className="rounded-3xl border border-fb-divider bg-white shadow-fb p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-fb-text-tertiary">Active Job</p>
                    <p className="text-sm font-semibold text-fb-text-secondary">Set the workstream before clocking in.</p>
                  </div>
                  <button onClick={() => setActiveTab('jobs')} className="text-xs font-bold text-fb-blue hover:text-fb-blue-hover">Manage</button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedJobId}
                    onChange={(e) => {
                      setSelectedJobId(e.target.value);
                      setShowCompletedTasks(false);
                    }}
                    className="flex-1 rounded-xl border border-fb-input-border bg-fb-bg px-3 py-3 text-sm font-semibold text-fb-text focus:outline-none focus:ring-2 focus:ring-fb-blue"
                  >
                    <option value="general">General Work</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => openComposer('job')}
                    className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-fb-input-border bg-white text-fb-blue shadow-fb hover:bg-fb-active-bg active:scale-95 transition-all"
                    title="Add new job"
                    aria-label="Add new job"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>

                {selectedJob ? (
                  <div className="mt-4 space-y-3 rounded-2xl border border-fb-divider bg-fb-hover-bg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedJob.color }} />
                          <p className="text-base font-extrabold text-fb-text">{selectedJob.name}</p>
                        </div>
                        <p className="mt-1 text-xs font-medium text-fb-text-tertiary">{selectedJob.address || 'No address added yet'}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-fb-text-secondary">
                        {selectedJob.tasks.length} {selectedJob.tasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between text-xs font-semibold text-fb-text-secondary">
                        <span>Checklist progress</span>
                        <span>{completedTaskCount}/{selectedJob.tasks.length || 0}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-gradient-to-r from-fb-blue to-sky-400" style={{ width: `${selectedJobProgress}%` }} />
                      </div>
                    </div>
                  </div>
                ) : jobs.length === 0 ? (
                  <button
                    onClick={() => openComposer('job')}
                    className="mt-4 w-full rounded-2xl border border-dashed border-fb-input-border bg-fb-bg px-4 py-4 text-left hover:border-fb-blue"
                  >
                    <span className="block text-sm font-extrabold text-fb-text">Create your first job</span>
                    <span className="block text-xs font-medium text-fb-text-tertiary">Jobs keep time entries and task progress organized.</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-fb-divider bg-white shadow-fb overflow-hidden">
              <div className="flex items-center justify-between border-b border-fb-divider px-4 py-4 sm:px-5">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-fb-text">Task Checklist</h2>
                  <p className="text-xs font-medium text-fb-text-tertiary">
                    {selectedJob ? `${selectedJob.name}` : 'Select a job to view tasks'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedJob && completedTaskCount > 0 && (
                    <button
                      onClick={() => setShowCompletedTasks((current) => !current)}
                      className="rounded-lg bg-fb-bg px-3 py-2 text-xs font-bold text-fb-text-secondary hover:bg-fb-active-bg"
                    >
                      {showCompletedTasks ? 'Hide Done' : `Done (${completedTaskCount})`}
                    </button>
                  )}
                  {selectedJob && (
                    <button
                      onClick={() => openComposer('task')}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-fb-blue text-white shadow-fb hover:bg-fb-blue-hover active:scale-95 transition-all"
                      aria-label="Add task"
                      title="Add task"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                {!selectedJob && (
                  <div className="rounded-2xl border border-fb-divider bg-fb-bg px-4 py-6 text-center">
                    <p className="text-sm font-bold text-fb-text">Pick a job to unlock the checklist</p>
                    <p className="mt-1 text-xs font-medium text-fb-text-tertiary">Use the selector above, or tap + to add a new job.</p>
                  </div>
                )}

                {selectedJob && visibleTasks.length === 0 && (
                  <button
                    onClick={() => openComposer('task')}
                    className="w-full rounded-2xl border border-dashed border-fb-input-border bg-fb-bg px-4 py-6 text-center hover:border-fb-blue hover:bg-fb-hover-bg transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-fb text-fb-blue">
                        <PlusIcon className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-fb-text">
                        {completedTaskCount > 0 && !showCompletedTasks ? 'All open tasks done!' : 'Add your first task'}
                      </p>
                      <p className="text-xs font-medium text-fb-text-tertiary">
                        {completedTaskCount > 0 && !showCompletedTasks
                          ? 'Tap to add more, or show completed.'
                          : 'Tap to add a task to this job.'}
                      </p>
                    </div>
                  </button>
                )}

                {selectedJob &&
                  visibleTasks.map((task) => {
                    const statusMeta = getTaskStatusMeta(task.status);
                    return (
                      <div key={task.id} className="rounded-2xl border border-fb-divider bg-white p-3 shadow-fb">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-bold ${task.status === 'completed' ? 'text-fb-text-tertiary line-through' : 'text-fb-text'}`}>{task.title}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusMeta.badgeClassName}`}>{statusMeta.label}</span>
                              {task.photos.length > 0 && (
                                <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold text-fb-blue">{task.photos.length} photo{task.photos.length === 1 ? '' : 's'}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleSetTaskStatus(selectedJob.id, task.id, statusMeta.nextStatus)}
                            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition active:scale-[0.97] ${statusMeta.buttonClassName}`}
                          >
                            {statusMeta.buttonLabel}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedJobId(selectedJob.id);
                              setActiveTab('jobs');
                            }}
                            className="rounded-lg bg-fb-bg px-3 py-2.5 text-sm font-bold text-fb-text-secondary hover:bg-fb-active-bg"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'jobs' && (
          <JobManager
            jobs={jobs}
            onJobsChange={setJobs}
            selectedJobId={selectedJob?.id}
            onSelectJob={(jobId) => {
              setSelectedJobId(jobId);
              setActiveTab('clock');
              setShowCompletedTasks(false);
            }}
          />
        )}

        {activeTab === 'report' && <PremiumReport profile={profile} timeEntries={timeEntries} jobs={jobs} />}
      </main>

      {showQuickActions && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Close quick actions" onClick={() => setShowQuickActions(false)} className="absolute inset-0 bg-black/30" />
          <div className="absolute right-4 bottom-[5.5rem] w-64">
            <div className="rounded-2xl border border-fb-divider bg-white p-2.5 shadow-fb-xl animate-slide-up">
              <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fb-text-tertiary">Quick Add</p>
              <div className="space-y-1.5">
                <button onClick={() => openComposer('job')} className="w-full rounded-xl bg-fb-bg px-3 py-3 text-left hover:bg-fb-active-bg active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-fb-blue">
                      <BriefcaseIcon />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-fb-text">Add Job</p>
                      <p className="text-xs font-medium text-fb-text-tertiary">New project or site scope</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => openComposer('task')}
                  disabled={jobs.length === 0}
                  className="w-full rounded-xl bg-fb-bg px-3 py-3 text-left hover:bg-fb-active-bg active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-fb-green">
                      <ChecklistIcon />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-fb-text">Add Task</p>
                      <p className="text-xs font-medium text-fb-text-tertiary">
                        {jobs.length === 0 ? 'Create a job first' : 'Add to existing job'}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeComposer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4">
          <button aria-label="Close composer" onClick={resetComposer} className="absolute inset-0 bg-black/35" />
          <div className="relative w-full max-w-md rounded-t-3xl border border-fb-divider bg-white shadow-fb-xl sm:rounded-3xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-fb-divider px-4 py-4">
              <div>
                <h2 className="font-display text-base font-extrabold text-fb-text">{activeComposer === 'job' ? 'Create Job' : 'Create Task'}</h2>
                <p className="mt-0.5 text-xs font-medium text-fb-text-tertiary">
                  {activeComposer === 'job' ? 'Set up a new project stream.' : 'Capture the next field action.'}
                </p>
              </div>
              <button onClick={resetComposer} className="flex h-10 w-10 items-center justify-center rounded-full bg-fb-bg text-fb-text-secondary hover:bg-fb-active-bg">
                <CloseIcon />
              </button>
            </div>

            {activeComposer === 'job' ? (
              <form onSubmit={handleCreateJob} className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-fb-text-secondary">Job Name *</label>
                  <input
                    type="text"
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    placeholder="e.g., Kitchen Renovation"
                    className="block w-full rounded-xl border border-fb-input-border bg-fb-bg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-fb-text-secondary">Address</label>
                  <input
                    type="text"
                    value={newJobAddress}
                    onChange={(e) => setNewJobAddress(e.target.value)}
                    placeholder="e.g., 123 Main St, City, ST"
                    className="block w-full rounded-xl border border-fb-input-border bg-fb-bg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-fb-text-secondary">Notes</label>
                  <textarea
                    value={newJobDescription}
                    onChange={(e) => setNewJobDescription(e.target.value)}
                    placeholder="Job details, scope, special instructions…"
                    rows={3}
                    className="block w-full resize-none rounded-xl border border-fb-input-border bg-fb-bg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={resetComposer} className="flex-1 rounded-xl bg-fb-bg px-4 py-3 text-sm font-bold text-fb-text-secondary hover:bg-fb-active-bg">
                    Cancel
                  </button>
                  <button type="submit" disabled={!newJobName.trim()} className="flex-1 rounded-xl bg-fb-blue px-4 py-3 text-sm font-extrabold text-white hover:bg-fb-blue-hover disabled:opacity-40">
                    Save Job
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateTask} className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-fb-text-secondary">Job *</label>
                  <select
                    value={newTaskJobId}
                    onChange={(e) => setNewTaskJobId(e.target.value)}
                    className="block w-full rounded-xl border border-fb-input-border bg-fb-bg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
                    required
                  >
                    <option value="" disabled>Select a job…</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-fb-text-secondary">Task Name *</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g., Inspect electrical panel"
                    className="block w-full rounded-xl border border-fb-input-border bg-fb-bg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={resetComposer} className="flex-1 rounded-xl bg-fb-bg px-4 py-3 text-sm font-bold text-fb-text-secondary hover:bg-fb-active-bg">
                    Cancel
                  </button>
                  <button type="submit" disabled={!newTaskTitle.trim() || !newTaskJobId} className="flex-1 rounded-xl bg-fb-blue px-4 py-3 text-sm font-extrabold text-white hover:bg-fb-blue-hover disabled:opacity-40">
                    Save Task
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setShowQuickActions((current) => !current);
          if (activeComposer) resetComposer();
        }}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-fb-xl transition-all active:scale-95 md:hidden ${
          showQuickActions ? 'rotate-45 bg-fb-text text-white' : 'bg-gradient-to-br from-fb-blue to-fb-green text-white'
        }`}
        aria-label="Open quick add menu"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-fb-divider bg-white/95 backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-3 pr-16">
          {([
            ['clock', 'Clock', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
            ['jobs', 'Jobs', 'M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
            ['report', 'Reports', 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'],
          ] as const).map(([key, label, path]) => (
            <button
              key={key}
              onClick={() => {
                setShowQuickActions(false);
                setActiveTab(key);
              }}
              className={`relative flex flex-col items-center py-3 pt-3 transition-colors ${activeTab === key ? 'text-fb-blue' : 'text-fb-text-tertiary'}`}
            >
              {activeTab === key && <span className="absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-fb-blue" />}
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${activeTab === key ? 'bg-sky-50' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={activeTab === key ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === key ? 2 : 1.5} d={path} />
                </svg>
              </div>
              <span className={`mt-0.5 text-[10px] font-semibold tracking-wide ${activeTab === key ? 'font-bold text-fb-blue' : ''}`}>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <InstallPrompt />
    </div>
  );
};

export default App;
