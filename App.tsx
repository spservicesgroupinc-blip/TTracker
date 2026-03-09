import React, { useEffect, useMemo, useState } from 'react';
import { Coordinates, Job, Task, TimeEntry, UserProfile } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import ProfileSetup from './components/ProfileSetup';
import JobManager from './components/JobManager';
import PremiumReport from './components/PremiumReport';
import InstallPrompt from './components/InstallPrompt';
import { getCurrentPosition } from './services/locationService';

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

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const App: React.FC = () => {
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('user-profile', null);
  const [timeEntries, setTimeEntries] = useLocalStorage<TimeEntry[]>('time-entries', []);
  const [projects] = useLocalStorage<string[]>('projects', ['General']);
  const [jobs, setJobs] = useLocalStorage<Job[]>('jobs', []);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('General');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'clock' | 'jobs' | 'report'>('clock');
  const [now, setNow] = useState(Date.now());
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const activeEntry = useMemo(() => {
    const openEntries = timeEntries.filter((e) => !e.clockOut);
    return openEntries.length > 0 ? openEntries[openEntries.length - 1] : null;
  }, [timeEntries]);

  const isClockedIn = !!activeEntry;

  useEffect(() => {
    if (!isClockedIn) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isClockedIn]);

  useEffect(() => {
    if (!selectedProject) {
      setSelectedProject(projects[0] || 'General');
    }
  }, [projects, selectedProject]);

  useEffect(() => {
    if (selectedJobId && !jobs.find((j) => j.id === selectedJobId)) {
      setSelectedJobId('');
      return;
    }

    if (activeEntry?.jobId) {
      setSelectedJobId(activeEntry.jobId);
      return;
    }
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId, activeEntry]);

  const selectedJob = useMemo(() => {
    if (selectedJobId) {
      const exactJob = jobs.find((j) => j.id === selectedJobId);
      if (exactJob) return exactJob;
    }
    return null;
  }, [jobs, selectedJobId]);

  const activeRate = useMemo(() => {
    if (!profile) return 0;
    const activeJob = activeEntry?.jobId ? jobs.find((j) => j.id === activeEntry.jobId) : null;
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
      const entryJob = entry.jobId ? jobs.find((j) => j.id === entry.jobId) : null;
      const rate = entryJob?.hourlyRate || profile.hourlyWage;
      if (!entry.clockOut) {
        return sum + ((Date.now() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)) * rate;
      }
      return sum + ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)) * rate;
    }, 0);
  }, [jobs, profile, timeEntries]);

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
          projectName: selectedProject,
          jobId: selectedJobId || undefined,
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      jobId: selectedJob.id,
      title: newTaskTitle.trim(),
      description: '',
      status: 'pending',
      photos: [],
      createdAt: new Date().toISOString(),
    };

    setJobs(jobs.map((job) => (job.id === selectedJob.id ? { ...job, tasks: [...job.tasks, newTask] } : job)));
    setNewTaskTitle('');
    setShowTaskComposer(false);
  };

  const handleToggleTaskDone = (jobId: string, taskId: string) => {
    setJobs(
      jobs.map((job) => {
        if (job.id !== jobId) return job;
        return {
          ...job,
          tasks: job.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
            return {
              ...task,
              status: nextStatus,
              completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
            };
          }),
        };
      })
    );
  };

  if (!profile) {
    return <ProfileSetup onProfileSave={setProfile} />;
  }

  const tasksForMainScreen = useMemo(() => {
    if (!selectedJob) return [];
    return [...selectedJob.tasks].sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [selectedJob]);

  return (
    <div className="min-h-screen text-fb-text bg-fb-bg font-fb pb-16 md:pb-0">
      <header className="sticky top-0 z-50 bg-white shadow-fb">
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
              <div className="p-3 sm:p-4 border-b border-fb-divider flex gap-2">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-2 text-sm text-fb-text bg-fb-bg border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue"
                >
                  {projects.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-2 text-sm text-fb-text bg-fb-bg border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue"
                >
                  <option value="">No Job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-4 py-6 sm:px-6 sm:py-8 text-center space-y-4 min-h-[52vh] flex flex-col justify-center">
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
                  </p>
                )}

                {error && <p className="text-sm text-fb-red bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
              </div>
            </div>

            <div className="bg-fb-card rounded-xl shadow-fb overflow-hidden">
              <div className="px-3 sm:px-4 py-3 border-b border-fb-divider flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-fb-text">Task Checklist</h2>
                  <p className="text-xs text-fb-text-tertiary mt-0.5">
                    {selectedJob ? `For ${selectedJob.name}` : 'Pick a job to manage tasks'}
                  </p>
                </div>
                <button
                  onClick={() => setShowTaskComposer((prev) => !prev)}
                  disabled={!selectedJob}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-fb-blue rounded-lg hover:bg-fb-blue-hover transition-colors disabled:opacity-40"
                >
                  <PlusIcon /> Add
                </button>
              </div>

              {showTaskComposer && selectedJob && (
                <form onSubmit={handleAddTask} className="p-3 sm:p-4 border-b border-fb-divider bg-fb-bg/60 flex items-center gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="New task..."
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="px-3 py-2 text-xs font-bold text-white bg-fb-blue rounded-lg disabled:opacity-40"
                  >
                    Save
                  </button>
                </form>
              )}

              <div className="divide-y divide-fb-divider">
                {!selectedJob && <p className="px-4 py-6 text-sm text-fb-text-tertiary">Select a job to show and check off tasks.</p>}

                {selectedJob && tasksForMainScreen.length === 0 && (
                  <p className="px-4 py-6 text-sm text-fb-text-tertiary">No tasks yet. Tap + to create your first task.</p>
                )}

                {selectedJob &&
                  tasksForMainScreen.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <label key={task.id} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-fb-hover-bg transition-colors">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => handleToggleTaskDone(selectedJob.id, task.id)}
                          className="w-5 h-5 rounded border-fb-input-border text-fb-blue focus:ring-fb-blue"
                        />
                        <span className={`text-sm ${isDone ? 'line-through text-fb-text-tertiary' : 'text-fb-text'}`}>{task.title}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'jobs' && <JobManager jobs={jobs} onJobsChange={setJobs} />}

        {activeTab === 'report' && <PremiumReport profile={profile} timeEntries={timeEntries} jobs={jobs} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-fb-divider md:hidden safe-area-bottom">
        <div className="flex">
          {([
            ['clock', 'Clock', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'],
            ['jobs', 'Jobs', 'M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
            ['report', 'Reports', 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'],
          ] as const).map(([key, label, path]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center py-2 pt-2.5 transition-colors relative ${activeTab === key ? 'text-fb-blue' : 'text-fb-text-tertiary'}`}
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