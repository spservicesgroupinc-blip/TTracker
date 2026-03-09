
import React, { useState, useMemo } from 'react';
import { UserProfile, TimeEntry, Coordinates, Job, Photo } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import ProfileSetup from './components/ProfileSetup';
import TimeLog from './components/TimeLog';
import JobManager from './components/JobManager';
import PremiumReport from './components/PremiumReport';
import PhotoUpload from './components/PhotoUpload';
import InstallPrompt from './components/InstallPrompt';
import { getCurrentPosition } from './services/locationService';
import { generatePayReport } from './services/pdfService';

// -- Inline Logo: RFE Foam Equipment --
const RFELogo: React.FC<{ size?: number }> = ({ size = 36 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size}>
        <rect width="512" height="512" rx="96" fill="#1A1A1A" />
        {/* Red accent bar on left */}
        <rect x="0" y="0" width="12" height="512" rx="6" fill="#CC0000" />
        {/* RFE letters */}
        <text x="256" y="240" textAnchor="middle" fill="#FFFFFF" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize="200" letterSpacing="-8">RFE</text>
        {/* FOAM EQUIPMENT subtitle */}
        <text x="256" y="340" textAnchor="middle" fill="#CC0000" fontFamily="Inter, Arial, sans-serif" fontWeight="700" fontSize="58" letterSpacing="12">FOAM</text>
        <text x="256" y="400" textAnchor="middle" fill="#999999" fontFamily="Inter, Arial, sans-serif" fontWeight="600" fontSize="42" letterSpacing="8">EQUIPMENT</text>
    </svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const SwitchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

const App: React.FC = () => {
    const [profile, setProfile] = useLocalStorage<UserProfile | null>('user-profile', null);
    const [timeEntries, setTimeEntries] = useLocalStorage<TimeEntry[]>('time-entries', []);
    const [projects, setProjects] = useLocalStorage<string[]>('projects', ['General']);
    const [jobs, setJobs] = useLocalStorage<Job[]>('jobs', []);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>(projects[0] || 'General');
    const [selectedJobId, setSelectedJobId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'clock' | 'jobs' | 'report'>('clock');
    const [clockNotes, setClockNotes] = useState('');
    const [clockPhotos, setClockPhotos] = useState<Photo[]>([]);
    const [showFabMenu, setShowFabMenu] = useState(false);

    const isClockedIn = useMemo(() => {
        const lastEntry = timeEntries.length > 0 ? timeEntries[timeEntries.length - 1] : null;
        return !!lastEntry && !lastEntry.clockOut;
    }, [timeEntries]);

    const currentClockedInProject = useMemo(() => {
        if (!isClockedIn) return null;
        const lastEntry = timeEntries[timeEntries.length - 1];
        return lastEntry.projectName || 'General';
    }, [isClockedIn, timeEntries]);

    const handleClockToggle = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const location: Coordinates = await getCurrentPosition();

            if (isClockedIn) {
                const lastEntry = timeEntries[timeEntries.length - 1];
                const updatedEntry: TimeEntry = {
                    ...lastEntry,
                    clockOut: new Date().toISOString(),
                    clockOutLocation: location,
                };
                setTimeEntries([
                    ...timeEntries.slice(0, timeEntries.length - 1),
                    updatedEntry
                ]);
            } else {
                const newEntry: TimeEntry = {
                    id: new Date().toISOString(),
                    projectName: selectedProject,
                    jobId: selectedJobId || undefined,
                    clockIn: new Date().toISOString(),
                    clockInLocation: location,
                    notes: clockNotes.trim() || undefined,
                    photos: clockPhotos.length > 0 ? [...clockPhotos] : undefined,
                };
                setTimeEntries([...timeEntries, newEntry]);
                setClockNotes('');
                setClockPhotos([]);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchJob = async () => {
        if (!isClockedIn || selectedProject === currentClockedInProject) return;

        if (!window.confirm(`Switch from "${currentClockedInProject}" to "${selectedProject}"? This will clock you out and back in immediately.`)) {
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const location: Coordinates = await getCurrentPosition();
            const now = new Date().toISOString();

            const lastEntry = timeEntries[timeEntries.length - 1];
            const closedEntry: TimeEntry = {
                ...lastEntry,
                clockOut: now,
                clockOutLocation: location,
            };

            const newEntry: TimeEntry = {
                id: now,
                projectName: selectedProject,
                jobId: selectedJobId || undefined,
                clockIn: now,
                clockInLocation: location,
            };

            setTimeEntries([
                ...timeEntries.slice(0, timeEntries.length - 1),
                closedEntry,
                newEntry
            ]);

        } catch (err: any) {
            setError(err.message || 'Failed to switch job.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResetProfile = () => {
        if(window.confirm("Are you sure you want to reset your profile? This will clear all your time entries.")) {
            setProfile(null);
            setTimeEntries([]);
        }
    }

    const handleAddProject = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newProjectName.trim();
        if (trimmed && !projects.includes(trimmed)) {
            setProjects([...projects, trimmed]);
            setNewProjectName('');
            if (projects.length === 0) setSelectedProject(trimmed);
        }
    };

    const handleDeleteProject = (proj: string) => {
        if (window.confirm(`Delete project "${proj}"? Past time entries will keep this name.`)) {
            const updated = projects.filter(p => p !== proj);
            setProjects(updated);
            if (selectedProject === proj && updated.length > 0) {
                setSelectedProject(updated[0]);
            } else if (selectedProject === proj) {
                setSelectedProject('General');
            }
        }
    };

    if (!profile) {
        return <ProfileSetup onProfileSave={setProfile} />;
    }
    
    return (
        <div className="min-h-screen text-fb-text bg-fb-bg font-fb pb-16 md:pb-0">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white shadow-fb">
                <div className="container flex items-center justify-between h-14 px-4 mx-auto max-w-6xl">
                    <div className="flex items-center gap-2.5">
                        <RFELogo size={36} />
                        <div className="flex flex-col">
                            <h1 className="text-lg font-extrabold leading-tight text-fb-text tracking-tight">RFE</h1>
                            <span className="text-[10px] font-medium text-fb-text-tertiary leading-none -mt-0.5 hidden sm:block">Foam Equipment</span>
                        </div>
                    </div>

                    {/* Desktop tab nav inside header */}
                    <nav className="hidden md:flex items-center h-full">
                        {([['clock', 'Time Clock', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'], ['jobs', 'Jobs', 'M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'], ['report', 'Reports', 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']] as const).map(([key, label, path]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key as any)}
                                className={`relative flex items-center gap-1.5 h-full px-4 text-sm font-semibold transition-colors ${
                                    activeTab === key
                                        ? 'text-fb-blue'
                                        : 'text-fb-text-secondary hover:bg-fb-bg'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === key ? 2.5 : 1.5} d={path} />
                                </svg>
                                {label}
                                {activeTab === key && (
                                    <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-fb-blue rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </nav>

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
            
            <main className="container px-3 sm:px-4 py-4 sm:py-6 mx-auto max-w-6xl">
                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-1">
                        
                        {activeTab === 'clock' && <>
                        {/* Time Clock Card */}
                        <div className="bg-fb-card rounded-lg shadow-fb overflow-hidden">
                            <div className="px-4 py-3 border-b border-fb-divider">
                                <h2 className="text-base font-bold text-fb-text">Time Clock</h2>
                            </div>
                            <div className="p-4">
                                {/* Project Selector */}
                                <div className="mb-3">
                                    <label className="block mb-1.5 text-xs font-semibold text-fb-text-secondary uppercase tracking-wide">
                                        {isClockedIn ? 'Switch Project' : 'Select Project'}
                                    </label>
                                    <select
                                        value={selectedProject}
                                        onChange={(e) => setSelectedProject(e.target.value)}
                                        className="block w-full px-3 py-2.5 text-sm text-fb-text bg-fb-bg border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue focus:border-fb-blue transition-colors"
                                    >
                                        {projects.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Link to Job */}
                                {jobs.length > 0 && (
                                    <div className="mb-3">
                                        <label className="block mb-1.5 text-xs font-semibold text-fb-text-secondary uppercase tracking-wide">Link to Job</label>
                                        <select
                                            value={selectedJobId}
                                            onChange={(e) => setSelectedJobId(e.target.value)}
                                            className="block w-full px-3 py-2.5 text-sm text-fb-text bg-fb-bg border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue focus:border-fb-blue transition-colors"
                                        >
                                            <option value="">No job (use default rate)</option>
                                            {jobs.map(j => (
                                                <option key={j.id} value={j.id}>{j.name}{j.client ? ` — ${j.client}` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Notes & Photos for clock-in */}
                                {!isClockedIn && (
                                    <div className="mb-4 space-y-2">
                                        <input
                                            type="text"
                                            value={clockNotes}
                                            onChange={(e) => setClockNotes(e.target.value)}
                                            placeholder="Add notes (optional)..."
                                            className="block w-full px-3 py-2 text-sm bg-fb-bg border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue transition-colors placeholder-fb-text-tertiary"
                                        />
                                        <PhotoUpload photos={clockPhotos} onPhotosChange={setClockPhotos} maxPhotos={5} />
                                    </div>
                                )}

                                <button
                                    onClick={handleClockToggle}
                                    disabled={isLoading}
                                    className={`flex items-center justify-center w-full px-6 py-3 text-base font-bold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-wait ${
                                        isClockedIn
                                            ? 'text-white bg-fb-red hover:brightness-95 active:scale-[0.98]'
                                            : 'text-white bg-fb-green hover:bg-fb-green-hover active:scale-[0.98]'
                                    }`}
                                >
                                    <ClockIcon/>
                                    {isLoading ? 'Getting Location...' : (isClockedIn ? 'Clock Out' : 'Clock In')}
                                </button>

                                {/* Switch Job Action */}
                                {isClockedIn && selectedProject !== currentClockedInProject && (
                                    <button
                                        onClick={handleSwitchJob}
                                        disabled={isLoading}
                                        className="flex items-center justify-center w-full mt-2 px-4 py-2.5 text-sm font-semibold text-fb-blue bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                    >
                                        <SwitchIcon />
                                        Switch to "{selectedProject}"
                                    </button>
                                )}

                                {isClockedIn && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                                        <p className="text-sm font-semibold text-fb-blue">Current Job: {currentClockedInProject}</p>
                                        <p className="text-xs text-fb-text-secondary mt-1">
                                            <span className="inline-block w-2 h-2 bg-fb-green rounded-full mr-1.5 animate-pulse"></span>
                                            Clocked in since {new Date(timeEntries[timeEntries.length-1].clockIn).toLocaleTimeString()}
                                        </p>
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                        <p className="text-sm text-fb-red">{error}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Project Management */}
                        <div className="bg-fb-card rounded-lg shadow-fb overflow-hidden">
                            <div className="px-4 py-3 border-b border-fb-divider">
                                <h2 className="text-base font-bold text-fb-text">Manage Projects</h2>
                            </div>
                            <div className="p-4">
                                <form onSubmit={handleAddProject} className="flex gap-2 mb-3">
                                    <input 
                                        type="text" 
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        placeholder="New project name..."
                                        className="flex-1 min-w-0 block w-full px-3 py-2 text-sm bg-fb-bg rounded-lg border border-fb-input-border focus:outline-none focus:ring-2 focus:ring-fb-blue focus:border-fb-blue placeholder-fb-text-tertiary transition-colors"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!newProjectName.trim()}
                                        className="inline-flex justify-center px-4 py-2 text-sm font-bold text-white bg-fb-blue rounded-lg hover:bg-fb-blue-hover transition-colors disabled:opacity-40"
                                    >
                                        Add
                                    </button>
                                </form>
                                <ul className="divide-y divide-fb-divider max-h-48 overflow-y-auto">
                                    {projects.map(proj => (
                                        <li key={proj} className="py-2 flex justify-between items-center group">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-fb-blue"></div>
                                                <span className="text-sm text-fb-text">{proj}</span>
                                            </div>
                                            {projects.length > 1 && (
                                                <button 
                                                    onClick={() => handleDeleteProject(proj)}
                                                    className="opacity-0 group-hover:opacity-100 text-fb-text-tertiary hover:text-fb-red p-1 rounded transition-all"
                                                    title="Delete Project"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Quick Report */}
                        <div className="bg-fb-card rounded-lg shadow-fb overflow-hidden">
                            <div className="px-4 py-3 border-b border-fb-divider">
                                <h2 className="text-base font-bold text-fb-text">Quick Report</h2>
                            </div>
                            <div className="p-4">
                                <button
                                    onClick={() => generatePayReport(profile, timeEntries)}
                                    disabled={timeEntries.length === 0}
                                    className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold text-white bg-fb-blue rounded-lg hover:bg-fb-blue-hover transition-colors disabled:bg-fb-divider disabled:text-fb-text-tertiary disabled:cursor-not-allowed"
                                >
                                    <DownloadIcon />
                                    Download Basic Report (PDF)
                                </button>
                            </div>
                        </div>
                        </>}

                        {activeTab === 'jobs' && (
                            <JobManager jobs={jobs} onJobsChange={setJobs} />
                        )}

                        {activeTab === 'report' && (
                            <PremiumReport profile={profile} timeEntries={timeEntries} jobs={jobs} />
                        )}
                    </div>
                    
                    <div className="lg:col-span-2">
                       <TimeLog timeEntries={timeEntries} profile={profile} jobs={jobs} />
                    </div>
                </div>
            </main>

            {/* FAB Plus Button */}
            <div className="fixed z-50 md:hidden" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 12px)', right: '16px' }}>
                {/* Menu items */}
                {showFabMenu && (
                    <div className="absolute bottom-16 right-0 flex flex-col gap-2 items-end animate-slide-up">
                        <button
                            onClick={() => { setActiveTab('clock'); setShowFabMenu(false); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-fb-xl text-sm font-semibold text-fb-text hover:bg-fb-bg transition-colors"
                        >
                            <span>Clock In / Out</span>
                            <div className="w-8 h-8 rounded-full bg-fb-green flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </button>
                        <button
                            onClick={() => { setActiveTab('jobs'); setShowFabMenu(false); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-fb-xl text-sm font-semibold text-fb-text hover:bg-fb-bg transition-colors"
                        >
                            <span>New Job</span>
                            <div className="w-8 h-8 rounded-full bg-fb-blue flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </button>
                        <button
                            onClick={() => { setActiveTab('report'); setShowFabMenu(false); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-fb-xl text-sm font-semibold text-fb-text hover:bg-fb-bg transition-colors"
                        >
                            <span>Reports</span>
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </button>
                    </div>
                )}
                {/* FAB button */}
                <button
                    onClick={() => setShowFabMenu(!showFabMenu)}
                    className={`flex items-center justify-center w-14 h-14 rounded-full shadow-fb-xl transition-all duration-200 ${
                        showFabMenu
                            ? 'bg-fb-text rotate-45'
                            : 'bg-fb-blue hover:bg-fb-blue-hover'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
            {/* FAB backdrop */}
            {showFabMenu && (
                <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setShowFabMenu(false)} />
            )}

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-fb-divider md:hidden safe-area-bottom">
                <div className="flex">
                    {([['clock', 'Clock', 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'], ['jobs', 'Jobs', 'M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'], ['report', 'Reports', 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']] as const).map(([key, label, path]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as any)}
                            className={`flex-1 flex flex-col items-center py-2 pt-2.5 transition-colors relative ${
                                activeTab === key ? 'text-fb-blue' : 'text-fb-text-tertiary'
                            }`}
                        >
                            {activeTab === key && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-fb-blue rounded-b-full" />
                            )}
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                                activeTab === key ? 'bg-red-50' : ''
                            }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill={activeTab === key ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === key ? 2 : 1.5} d={path} />
                                </svg>
                            </div>
                            <span className={`text-[10px] mt-0.5 ${
                                activeTab === key ? 'font-bold' : 'font-medium'
                            }`}>{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <InstallPrompt />
        </div>
    );
};

export default App;
