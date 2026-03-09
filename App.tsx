
import React, { useState, useMemo } from 'react';
import { UserProfile, TimeEntry, Coordinates } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import ProfileSetup from './components/ProfileSetup';
import TimeLog from './components/TimeLog';
import { getCurrentPosition } from './services/locationService';
import { generatePayReport } from './services/pdfService';

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
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>(projects[0] || 'General');

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
                    clockIn: new Date().toISOString(),
                    clockInLocation: location,
                };
                setTimeEntries([...timeEntries, newEntry]);
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
        <div className="min-h-screen text-fb-text bg-fb-bg font-fb">
            {/* Facebook-style top header bar */}
            <header className="sticky top-0 z-50 bg-white shadow-fb">
                <div className="container flex items-center justify-between h-14 px-4 mx-auto">
                    <div className="flex items-center gap-2">
                        {/* Facebook-style logo circle */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-fb-blue">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-fb-blue">GeoTime</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fb-bg">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-fb-blue text-white text-xs font-bold">
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
            
            <main className="container px-4 py-6 mx-auto max-w-6xl">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-1">
                        
                        {/* Time Clock Card */}
                        <div className="bg-fb-card rounded-lg shadow-fb overflow-hidden">
                            <div className="px-4 py-3 border-b border-fb-divider">
                                <h2 className="text-base font-bold text-fb-text">Time Clock</h2>
                            </div>
                            <div className="p-4">
                                {/* Project Selector */}
                                <div className="mb-4">
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
                                        className="flex items-center justify-center w-full mt-2 px-4 py-2.5 text-sm font-semibold text-fb-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        <SwitchIcon />
                                        Switch to "{selectedProject}"
                                    </button>
                                )}

                                {isClockedIn && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
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

                        {/* Reports */}
                        <div className="bg-fb-card rounded-lg shadow-fb overflow-hidden">
                            <div className="px-4 py-3 border-b border-fb-divider">
                                <h2 className="text-base font-bold text-fb-text">Reports</h2>
                            </div>
                            <div className="p-4">
                                <button
                                    onClick={() => generatePayReport(profile, timeEntries)}
                                    disabled={timeEntries.length === 0}
                                    className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold text-white bg-fb-blue rounded-lg hover:bg-fb-blue-hover transition-colors disabled:bg-fb-divider disabled:text-fb-text-tertiary disabled:cursor-not-allowed"
                                >
                                    <DownloadIcon />
                                    Download Pay Report (PDF)
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-2">
                       <TimeLog timeEntries={timeEntries} profile={profile} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
