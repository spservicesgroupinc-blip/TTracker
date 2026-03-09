
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
                // Clocking out
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
                // Clocking in
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

            // 1. Clock out of current
            const lastEntry = timeEntries[timeEntries.length - 1];
            const closedEntry: TimeEntry = {
                ...lastEntry,
                clockOut: now,
                clockOutLocation: location,
            };

            // 2. Clock in to new
            const newEntry: TimeEntry = {
                id: now, // using timestamp as ID
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
            // If it's the only project, select it
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

    const clockInButtonClasses = "w-full text-white bg-green-600 hover:bg-green-700 focus:ring-green-500";
    const clockOutButtonClasses = "w-full text-white bg-red-600 hover:bg-red-700 focus:ring-red-500";
    const switchJobButtonClasses = "w-full mt-2 text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200";
    
    return (
        <div className="min-h-screen text-gray-800 bg-slate-100">
            <header className="p-4 text-white bg-slate-800 shadow-md">
                <div className="container flex items-center justify-between mx-auto">
                    <h1 className="text-2xl font-bold">GeoTime Tracker</h1>
                    <div className="text-right">
                        <p className="font-semibold">{profile.name}</p>
                        <button onClick={handleResetProfile} className="text-xs text-slate-300 hover:underline">
                            Switch Profile
                        </button>
                    </div>
                </div>
            </header>
            
            <main className="container p-4 mx-auto md:p-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-1">
                        
                        {/* Time Clock Card */}
                        <div className="p-6 bg-white rounded-lg shadow-md">
                            <h2 className="mb-4 text-xl font-bold text-gray-800">Time Clock</h2>
                            
                            {/* Project Selector */}
                            <div className="mb-4">
                                <label className="block mb-1 text-sm font-medium text-gray-700">
                                    {isClockedIn ? 'Switch Project' : 'Select Project'}
                                </label>
                                <select
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    className="block w-full px-3 py-2 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border"
                                >
                                    {projects.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleClockToggle}
                                disabled={isLoading}
                                className={`flex items-center justify-center px-6 py-3 text-lg font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-wait ${
                                    isClockedIn ? clockOutButtonClasses : clockInButtonClasses
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
                                    className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${switchJobButtonClasses}`}
                                >
                                    Switch to "{selectedProject}"
                                </button>
                            )}

                            {isClockedIn && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                                    <p className="text-sm font-medium text-blue-800">Current Job: {currentClockedInProject}</p>
                                    <p className="text-xs text-blue-600 animate-pulse mt-1">
                                        Clocked in since {new Date(timeEntries[timeEntries.length-1].clockIn).toLocaleTimeString()}
                                    </p>
                                </div>
                            )}
                            
                            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                        </div>

                        {/* Project Management */}
                        <div className="p-6 bg-white rounded-lg shadow-md">
                            <h2 className="mb-4 text-xl font-bold text-gray-800">Manage Projects</h2>
                            <form onSubmit={handleAddProject} className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="New Project Name"
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newProjectName.trim()}
                                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </form>
                            <ul className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                                {projects.map(proj => (
                                    <li key={proj} className="py-2 flex justify-between items-center">
                                        <span className="text-sm text-gray-700">{proj}</span>
                                        {projects.length > 1 && (
                                            <button 
                                                onClick={() => handleDeleteProject(proj)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="Delete Project"
                                            >
                                                <TrashIcon />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Reports */}
                        <div className="p-6 bg-white rounded-lg shadow-md">
                            <h2 className="mb-4 text-xl font-bold text-gray-800">Reports</h2>
                            <button
                                onClick={() => generatePayReport(profile, timeEntries)}
                                disabled={timeEntries.length === 0}
                                className="w-full px-4 py-2 font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Download Pay Report (PDF)
                            </button>
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
