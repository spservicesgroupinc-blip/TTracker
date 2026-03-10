import React, { useEffect, useMemo, useState } from 'react';
import { Coordinates, Job, Task, TimeEntry, UserProfile } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import ProfileSetup from './components/ProfileSetup';
import JobManager from './components/JobManager';
import PremiumReport from './components/PremiumReport';
import InstallPrompt from './components/InstallPrompt';
import { getCurrentPosition } from './services/locationService';

const JOB_COLORS = ['#CC0000', '#42B72A', '#F7B928', '#FA3E3C', '#A855F7', '#EC4899', '#14B8A6', '#F97316'];

const RFELogo: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size}>
    <rect width="512" height="512" rx="96" fill="#1A1A1A" />
    <rect x="0" y="0" width="12" height="512" rx="6" fill="#CC0000" />
    <text x="256" y="240" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize="200" letterSpacing="-8">RFE</text>
    <text x="256" y="340" textAnchor="middle" fill="#CC0000" fontFamily="Inter, Arial, sans-serif" fontWeight="700" fontSize="58" letterSpacing="12">FOAM</text>
    <text x="256" y="400" textAnchor="middle" fill="#999999" fontFamily="Inter, Arial, sans-serif" fontWeight="600" fontSize="42" letterSpacing="8">EQUIPMENT</text>
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
    <div className="min-h-screen text-fb-text bg-fb-bg font-fb pb-24 md:pb-0">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm shadow-fb">
        <div className="container flex items-center justify-between h-14 px-4 mx-auto max-w-6xl">
          <div className="flex items-center gap-2.5">
            <RFELogo size={36} />
            <div className="flex flex-col">
              <h1 className="text-lg font-extrabold leading-tight text-fb-text tracking-tight">RFE</h1>
              <span className="text-[10px] font-medium text-fb-text-tertiary leading-none -mt-0.5 hidden sm:block">Foam Equipment</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fb-bg">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-fb-blue to-fb-blue-dark text-white text-xs font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-fb-text hidden sm:inline">{profile.name}</span>
            </div>
            <button
              onClick={handleResetProfile}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-fb-active-bg hover:bg-fb-divider transition-colors"
              title="Switch Profile"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-fb-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-3 sm:py-6 mx-auto max-w-6xl">
        {activeTab === 'clock' && (
          <section className="mx-auto max-w-md space-y-3 sm:space-y-4">
            <div className="bg-fb-card rounded-xl shadow-fb overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-fb-divider space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-fb-text-secondary">Active Job</p>
                    <p className="text-sm text-fb-text-tertiary">Pick the job you are working on before clocking in.</p>
                  </div>
                  {selectedJob && (
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="text-xs font-semibold text-fb-blue hover:text-fb-blue-hover"
                    >
                      Manage
                    </button>
                  )}
                </div>

                <select
                  value={selectedJobId}
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    setShowCompletedTasks(false);
                  }}
                  className="w-full px-3 py-3 text-sm font-medium text-fb-text bg-fb-bg border border-fb-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fb-blue"
                >
                  <option value="general">General Work</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}
                    </option>
                  ))}
                </select>

                {selectedJob ? (
                  <div className="rounded-xl bg-fb-bg border border-fb-divider p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedJob.color }} />
                          <p className="text-sm font-bold text-fb-text truncate">{selectedJob.name}</p>
                        </div>
                        <p className="mt-1 text-xs text-fb-text-tertiary truncate">
                          {selectedJob.address || 'No address added yet'}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-white text-xs font-semibold text-fb-text-secondary">
                        {selectedJob.tasks.length} {selectedJob.tasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-fb-text-secondary">
                        <span>Checklist progress</span>
                        <span>{completedTaskCount}/{selectedJob.tasks.length || 0} done</span>
                      </div>
                      <div className="h-2 rounded-full bg-white overflow-hidden">
                        <div className="h-full rounded-full bg-fb-blue transition-all" style={{ width: `${selectedJobProgress}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white px-2 py-2">
                        <p className="text-lg font-bold text-fb-text">{pendingTasks.filter((task) => task.status === 'pending').length}</p>
                        <p className="text-[11px] font-medium text-fb-text-tertiary">To do</p>
                      </div>
                      <div className="rounded-lg bg-white px-2 py-2">
                        <p className="text-lg font-bold text-amber-600">{pendingTasks.filter((task) => task.status === 'in-progress').length}</p>
                        <p className="text-[11px] font-medium text-fb-text-tertiary">Active</p>
                      </div>
                      <div className="rounded-lg bg-white px-2 py-2">
                        <p className="text-lg font-bold text-green-600">{completedTaskCount}</p>
                        <p className="text-[11px] font-medium text-fb-text-tertiary">Done</p>
                      </div>
                    </div>
                  </div>
                ) : jobs.length === 0 ? (
                  <button
                    onClick={() => openComposer('job')}
                    className="w-full rounded-xl border border-dashed border-fb-input-border bg-fb-bg px-4 py-4 text-left hover:border-fb-blue transition-colors"
                  >
                    <span className="block text-sm font-semibold text-fb-text">Create your first job</span>
                    <span className="block text-xs text-fb-text-tertiary mt-1">Jobs keep tasks grouped and make clock-ins easier to track.</span>
                  </button>
                ) : null}
              </div>

              <div className="px-4 py-6 sm:px-6 sm:py-8 text-center space-y-4 min-h-[42vh] flex flex-col justify-center">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${isClockedIn ? 'bg-green-500/10 text-green-600' : 'bg-fb-bg text-fb-text-tertiary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-fb-text-tertiary'}`} />
                  {isClockedIn ? 'On The Clock' : 'Ready To Clock In'}
                </div>

                <div className="font-mono text-5xl sm:text-7xl font-bold text-fb-text tracking-tight leading-none">
                  {formatElapsed(activeElapsedMs)}
                </div>

                <div>
                  <p className="text-3xl sm:text-4xl font-bold text-green-600 tracking-tight">${activeEarnings.toFixed(2)}</p>
                  <p className="text-xs sm:text-sm text-fb-text-tertiary mt-1">Today: ${todayTotal.toFixed(2)}</p>
                </div>

                <button
                  onClick={handleClockToggle}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-4 text-base font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-wait ${
                    isClockedIn ? 'text-white bg-fb-red hover:brightness-95 active:scale-[0.98]' : 'text-white bg-fb-green hover:bg-fb-green-hover active:scale-[0.98]'
                  }`}
                >
                  <ClockIcon />
                  {isLoading ? 'Getting Location...' : isClockedIn ? 'Clock Out' : 'Clock In'}
                </button>

                {isClockedIn && activeEntry && (
                  <p className="text-xs text-fb-text-secondary">
                    Started {new Date(activeEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {selectedJob && <span className="font-semibold text-fb-text"> for {selectedJob.name}</span>}
                  </p>
                )}

                {error && <p className="text-sm text-fb-red bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
              </div>
            </div>

            <div className="bg-fb-card rounded-xl shadow-fb overflow-hidden">
              <div className="px-4 py-4 border-b border-fb-divider flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-fb-text">Task Checklist</h2>
                  <p className="text-xs text-fb-text-tertiary mt-0.5">
                    {selectedJob ? `Focused on ${selectedJob.name}` : 'Select a job to work through tasks here'}
                  </p>
                </div>
                {selectedJob && completedTaskCount > 0 && (
                  <button
                    onClick={() => setShowCompletedTasks((current) => !current)}
                    className="shrink-0 px-3 py-2 rounded-lg bg-fb-bg text-xs font-semibold text-fb-text-secondary hover:bg-fb-active-bg transition-colors"
                  >
                    {showCompletedTasks ? 'Hide Done' : `Show Done (${completedTaskCount})`}
                  </button>
                )}
              </div>

              <div className="p-3 space-y-3">
                {!selectedJob && (
                  <div className="rounded-xl bg-fb-bg px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-fb-text">Pick a job to see its checklist</p>
                    <p className="mt-1 text-xs text-fb-text-tertiary">Use the job picker above, or create one from the + button.</p>
                  </div>
                )}

                {selectedJob && visibleTasks.length === 0 && (
                  <div className="rounded-xl bg-fb-bg px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-fb-text">
                      {completedTaskCount > 0 && !showCompletedTasks ? 'All open tasks are finished' : 'No tasks yet'}
                    </p>
                    <p className="mt-1 text-xs text-fb-text-tertiary">
                      {completedTaskCount > 0 && !showCompletedTasks
                        ? 'Show completed items or add another task from the + button.'
                        : 'Add a task from the + button to build this checklist.'}
                    </p>
                  </div>
                )}

                {selectedJob &&
                  visibleTasks.map((task) => {
                    const statusMeta = getTaskStatusMeta(task.status);
                    return (
                      <div key={task.id} className="rounded-xl border border-fb-divider bg-white p-3 shadow-fb">
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
                              <span className="text-[11px] text-fb-text-tertiary">
                                Added {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleSetTaskStatus(selectedJob.id, task.id, statusMeta.nextStatus)}
                            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${statusMeta.buttonClassName}`}
                          >
                            {statusMeta.buttonLabel}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedJobId(selectedJob.id);
                              setActiveTab('jobs');
                            }}
                            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-fb-text-secondary bg-fb-bg hover:bg-fb-active-bg transition-colors"
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
          <button
            aria-label="Close quick actions"
            onClick={() => setShowQuickActions(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="absolute inset-x-0 bottom-24 px-4">
            <div className="mx-auto max-w-md rounded-2xl bg-white shadow-fb-xl border border-fb-divider p-3 animate-slide-up">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-fb-text-tertiary">Quick Add</p>
              <div className="space-y-2">
                <button
                  onClick={() => openComposer('job')}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-4 text-left bg-fb-bg hover:bg-fb-active-bg transition-colors"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-50 text-fb-blue">
                    <BriefcaseIcon />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-fb-text">Add Job</p>
                    <p className="text-xs text-fb-text-tertiary">Create a new site or work order.</p>
                  </div>
                </button>
                <button
                  onClick={() => openComposer('task')}
                  disabled={jobs.length === 0}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-4 text-left bg-fb-bg hover:bg-fb-active-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-fb-blue">
                    <ChecklistIcon />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-fb-text">Add Task</p>
                    <p className="text-xs text-fb-text-tertiary">
                      {jobs.length === 0 ? 'Create a job first to start a checklist.' : 'Add work items to the selected job.'}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeComposer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4">
          <button
            aria-label="Close composer"
            onClick={resetComposer}
            className="absolute inset-0 bg-black/35"
          />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-fb-xl border border-fb-divider animate-slide-up">
            <div className="flex items-center justify-between px-4 py-4 border-b border-fb-divider">
              <div>
                <h2 className="text-base font-bold text-fb-text">{activeComposer === 'job' ? 'Add Job' : 'Add Task'}</h2>
                <p className="text-xs text-fb-text-tertiary mt-0.5">
                  {activeComposer === 'job' ? 'Keep new work organized before you start tracking time.' : 'Capture the next thing that needs to get done.'}
                </p>
              </div>
              <button
                onClick={resetComposer}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-fb-bg text-fb-text-secondary hover:bg-fb-active-bg transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {activeComposer === 'job' ? (
              <form onSubmit={handleCreateJob} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Job Name</label>
                  <input
                    type="text"
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    placeholder="Kitchen retrofit"
                    className="block w-full px-3 py-3 text-sm bg-fb-bg border border-fb-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fb-blue"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Address</label>
                  <input
                    type="text"
                    value={newJobAddress}
                    onChange={(e) => setNewJobAddress(e.target.value)}
                    placeholder="123 Main St"
                    className="block w-full px-3 py-3 text-sm bg-fb-bg border border-fb-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fb-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Notes</label>
                  <textarea
                    value={newJobDescription}
                    onChange={(e) => setNewJobDescription(e.target.value)}
                    placeholder="Anything the crew should know"
                    rows={3}
                    className="block w-full px-3 py-3 text-sm bg-fb-bg border border-fb-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fb-blue resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="flex-1 px-4 py-3 rounded-xl bg-fb-bg text-sm font-semibold text-fb-text-secondary hover:bg-fb-active-bg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newJobName.trim()}
                    className="flex-1 px-4 py-3 rounded-xl bg-fb-blue text-sm font-bold text-white hover:bg-fb-blue-hover transition-colors disabled:opacity-40"
                  >
                    Save Job
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateTask} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Job</label>
                  <select
                    value={newTaskJobId}
                    onChange={(e) => setNewTaskJobId(e.target.value)}
                    className="block w-full px-3 py-3 text-sm bg-fb-bg border border-fb-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fb-blue"
                    autoFocus
                    required
                  >
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fb-text-secondary mb-1">Task Name</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Unload foam rig"
                    className="block w-full px-3 py-3 text-sm bg-fb-bg border border-fb-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-fb-blue"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="flex-1 px-4 py-3 rounded-xl bg-fb-bg text-sm font-semibold text-fb-text-secondary hover:bg-fb-active-bg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim() || !newTaskJobId}
                    className="flex-1 px-4 py-3 rounded-xl bg-fb-blue text-sm font-bold text-white hover:bg-fb-blue-hover transition-colors disabled:opacity-40"
                  >
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
          if (activeComposer) {
            resetComposer();
          }
        }}
        className={`fixed bottom-[4.75rem] left-1/2 z-50 -translate-x-1/2 md:hidden flex items-center justify-center w-16 h-16 rounded-full shadow-fb-xl border-4 border-fb-bg transition-all ${
          showQuickActions ? 'bg-fb-text text-white rotate-45' : 'bg-fb-blue text-white hover:bg-fb-blue-hover'
        }`}
        aria-label="Open quick add menu"
      >
        <PlusIcon className="w-7 h-7" />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-fb-divider md:hidden safe-area-bottom">
        <div className="grid grid-cols-3">
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
              className={`flex flex-col items-center py-2 pt-2.5 transition-colors relative ${activeTab === key ? 'text-fb-blue' : 'text-fb-text-tertiary'}`}
            >
              {activeTab === key && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-fb-blue rounded-b-full" />}
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${activeTab === key ? 'bg-red-50' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill={activeTab === key ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === key ? 2 : 1.5} d={path} />
                </svg>
              </div>
              <span className={`text-[10px] mt-0.5 ${activeTab === key ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <InstallPrompt />
    </div>
  );
};

export default App;
