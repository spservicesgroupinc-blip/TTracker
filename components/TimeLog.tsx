
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, UserProfile, Job } from '../types';

interface TimeLogProps {
  timeEntries: TimeEntry[];
  profile: UserProfile;
  jobs?: Job[];
}

const MapPinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const LocationLink: React.FC<{ location?: { latitude: number; longitude: number; } }> = ({ location }) => {
    if (!location) {
        return <span className="text-fb-text-tertiary text-xs">N/A</span>;
    }
    const { latitude, longitude } = location;
    return (
        <a
            href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-fb-blue hover:underline"
        >
            <MapPinIcon />
            Map
        </a>
    );
};

function formatElapsed(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const TimeLog: React.FC<TimeLogProps> = ({ timeEntries, profile, jobs = [] }) => {
    const [now, setNow] = useState(Date.now());
    const [showAllEntries, setShowAllEntries] = useState(false);

    const activeEntry = useMemo(() => {
        return timeEntries.find(e => !e.clockOut) || null;
    }, [timeEntries]);

    useEffect(() => {
        if (!activeEntry) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [activeEntry]);

    const activeJob = activeEntry?.jobId ? jobs.find(j => j.id === activeEntry.jobId) : null;
    const activeRate = activeJob?.hourlyRate || profile.hourlyWage;
    const activeElapsedMs = activeEntry ? now - new Date(activeEntry.clockIn).getTime() : 0;
    const activeElapsedHrs = activeElapsedMs / (1000 * 60 * 60);
    const activeEarnings = activeElapsedHrs * activeRate;

    const calculateDuration = (clockIn: string, clockOut?: string): number => {
        if (!clockOut) return 0;
        const start = new Date(clockIn).getTime();
        const end = new Date(clockOut).getTime();
        return (end - start) / (1000 * 60 * 60);
    };

    const sortedEntries = [...timeEntries]
        .filter(e => !!e.clockOut)
        .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEarnings = useMemo(() => {
        let total = 0;
        for (const entry of timeEntries) {
            if (new Date(entry.clockIn).getTime() < todayStart.getTime()) continue;
            const job = entry.jobId ? jobs.find(j => j.id === entry.jobId) : null;
            const rate = job?.hourlyRate || profile.hourlyWage;
            if (entry.clockOut) {
                total += calculateDuration(entry.clockIn, entry.clockOut) * rate;
            } else {
                total += activeElapsedHrs * rate;
            }
        }
        return total;
    }, [timeEntries, jobs, profile, activeElapsedHrs]);

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* Running Clock Hero */}
            <div className="bg-fb-card rounded-xl shadow-fb overflow-hidden">
                {activeEntry ? (
                    <div className="px-4 py-5 sm:px-6 sm:py-8 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] sm:text-xs font-semibold tracking-wide uppercase mb-3 sm:mb-4">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                            On the clock
                        </div>
                        <div className="font-mono text-4xl sm:text-7xl font-bold text-fb-text tracking-tight leading-none">
                            {formatElapsed(activeElapsedMs)}
                        </div>
                        <div className="mt-2 sm:mt-4 text-2xl sm:text-4xl font-bold text-green-600 tracking-tight">
                            ${activeEarnings.toFixed(2)}
                        </div>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-fb-text-tertiary">
                            ${activeRate.toFixed(2)}/hr
                        </p>
                        <div className="mt-2 sm:mt-4 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-fb-text-secondary flex-wrap">
                            <span>{activeEntry.projectName || 'General'}</span>
                            {activeJob && (
                                <>
                                    <span className="text-fb-divider">·</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeJob.color }} />
                                        {activeJob.name}
                                    </span>
                                </>
                            )}
                            <span className="text-fb-divider">·</span>
                            <span>{new Date(activeEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ) : (
                    <div className="px-4 py-5 sm:px-6 sm:py-8 text-center">
                        <div className="font-mono text-4xl sm:text-7xl font-bold text-fb-text-tertiary/40 tracking-tight leading-none">
                            00:00:00
                        </div>
                        <div className="mt-2 sm:mt-4 text-2xl sm:text-4xl font-bold text-fb-text-tertiary/40 tracking-tight">
                            $0.00
                        </div>
                        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-fb-text-tertiary">Clock in to start tracking</p>
                    </div>
                )}

                {/* Today's Summary Bar */}
                <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-fb-bg/60 border-t border-fb-divider flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-fb-text-secondary uppercase tracking-wide">Today</span>
                    <span className="text-sm font-bold text-fb-text">${todayEarnings.toFixed(2)}</span>
                </div>
            </div>

            {/* Entry History */}
            <div className="bg-fb-card rounded-xl shadow-fb overflow-hidden">
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-fb-divider flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-semibold text-fb-text uppercase tracking-wide">History</h3>
                    {sortedEntries.length > 0 && (
                        <span className="text-[10px] sm:text-xs font-medium text-fb-text-tertiary">
                            {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
                        </span>
                    )}
                </div>
                <div className="divide-y divide-fb-divider">
                    {sortedEntries.length > 0 ? (
                        <>
                        {(showAllEntries ? sortedEntries : sortedEntries.slice(0, 5)).map((entry) => {
                            const duration = calculateDuration(entry.clockIn, entry.clockOut);
                            const job = entry.jobId ? jobs.find(j => j.id === entry.jobId) : null;
                            const rate = job?.hourlyRate || profile.hourlyWage;
                            const pay = duration * rate;
                            return (
                                <div key={entry.id} className="px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-fb-hover-bg transition-colors">
                                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                <p className="text-xs sm:text-sm font-semibold text-fb-text">{new Date(entry.clockIn).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                <span className="text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded bg-fb-bg text-fb-text-secondary">
                                                    {entry.projectName || 'General'}
                                                </span>
                                                {job && (
                                                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium" style={{ color: job.color }}>
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: job.color }} />
                                                        {job.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-fb-text-tertiary">
                                                <span>{new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>→</span>
                                                <span>{entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                <span className="hidden sm:inline"><LocationLink location={entry.clockInLocation} /></span>
                                                {entry.clockOut && <span className="hidden sm:inline"><LocationLink location={entry.clockOutLocation} /></span>}
                                            </div>
                                            {entry.notes && (
                                                <p className="hidden sm:block mt-1 text-xs text-fb-text-tertiary truncate">{entry.notes}</p>
                                            )}
                                            {entry.photos && entry.photos.length > 0 && (
                                                <div className="hidden sm:flex mt-1.5 gap-1 flex-wrap">
                                                    {entry.photos.map(photo => (
                                                        <img key={photo.id} src={photo.dataUrl} alt={photo.caption} className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover border border-fb-divider" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs sm:text-sm font-bold text-fb-text tabular-nums">{duration.toFixed(1)}h</p>
                                            <p className="text-xs sm:text-sm font-semibold text-green-600 tabular-nums">${pay.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {sortedEntries.length > 5 && (
                            <button
                                onClick={() => setShowAllEntries(!showAllEntries)}
                                className="w-full py-2.5 text-xs sm:text-sm font-semibold text-fb-blue hover:bg-fb-hover-bg transition-colors"
                            >
                                {showAllEntries ? 'Show less' : `Show all ${sortedEntries.length} entries`}
                            </button>
                        )}
                        </>
                    ) : (
                        <div className="py-8 sm:py-12 text-center">
                            <p className="text-xs sm:text-sm text-fb-text-tertiary">No completed entries yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimeLog;
