
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
        <div className="space-y-4">
            {/* Running Clock Hero */}
            <div className="bg-fb-card rounded-xl shadow-fb overflow-hidden">
                {activeEntry ? (
                    <div className="px-6 py-8 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold tracking-wide uppercase mb-4">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            On the clock
                        </div>
                        <div className="font-mono text-6xl sm:text-7xl font-bold text-fb-text tracking-tight leading-none">
                            {formatElapsed(activeElapsedMs)}
                        </div>
                        <div className="mt-4 text-3xl sm:text-4xl font-bold text-green-600 tracking-tight">
                            ${activeEarnings.toFixed(2)}
                        </div>
                        <p className="mt-1 text-sm text-fb-text-tertiary">
                            earned at ${activeRate.toFixed(2)}/hr
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-fb-text-secondary">
                            <span>{activeEntry.projectName || 'General'}</span>
                            {activeJob && (
                                <>
                                    <span className="text-fb-divider">·</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeJob.color }} />
                                        {activeJob.name}
                                    </span>
                                </>
                            )}
                            <span className="text-fb-divider">·</span>
                            <span>Started {new Date(activeEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                ) : (
                    <div className="px-6 py-8 text-center">
                        <div className="font-mono text-6xl sm:text-7xl font-bold text-fb-text-tertiary/40 tracking-tight leading-none">
                            00:00:00
                        </div>
                        <div className="mt-4 text-3xl sm:text-4xl font-bold text-fb-text-tertiary/40 tracking-tight">
                            $0.00
                        </div>
                        <p className="mt-3 text-sm text-fb-text-tertiary">Clock in to start tracking</p>
                    </div>
                )}

                {/* Today's Summary Bar */}
                <div className="px-6 py-3 bg-fb-bg/60 border-t border-fb-divider flex items-center justify-between">
                    <span className="text-xs font-semibold text-fb-text-secondary uppercase tracking-wide">Today's Total</span>
                    <span className="text-sm font-bold text-fb-text">${todayEarnings.toFixed(2)}</span>
                </div>
            </div>

            {/* Entry History */}
            <div className="bg-fb-card rounded-xl shadow-fb overflow-hidden">
                <div className="px-4 py-3 border-b border-fb-divider flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fb-text uppercase tracking-wide">History</h3>
                    {sortedEntries.length > 0 && (
                        <span className="text-xs font-medium text-fb-text-tertiary">
                            {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
                        </span>
                    )}
                </div>
                <div className="divide-y divide-fb-divider">
                    {sortedEntries.length > 0 ? (
                        sortedEntries.map((entry) => {
                            const duration = calculateDuration(entry.clockIn, entry.clockOut);
                            const job = entry.jobId ? jobs.find(j => j.id === entry.jobId) : null;
                            const rate = job?.hourlyRate || profile.hourlyWage;
                            const pay = duration * rate;
                            return (
                                <div key={entry.id} className="px-4 py-3 hover:bg-fb-hover-bg transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-fb-text">{new Date(entry.clockIn).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-fb-bg text-fb-text-secondary">
                                                    {entry.projectName || 'General'}
                                                </span>
                                                {job && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: job.color }}>
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: job.color }} />
                                                        {job.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-fb-text-tertiary">
                                                <span>{new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>→</span>
                                                <span>{entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                <LocationLink location={entry.clockInLocation} />
                                                {entry.clockOut && <LocationLink location={entry.clockOutLocation} />}
                                            </div>
                                            {entry.notes && (
                                                <p className="mt-1 text-xs text-fb-text-tertiary">{entry.notes}</p>
                                            )}
                                            {entry.photos && entry.photos.length > 0 && (
                                                <div className="mt-1.5 flex gap-1 flex-wrap">
                                                    {entry.photos.map(photo => (
                                                        <img key={photo.id} src={photo.dataUrl} alt={photo.caption} className="w-10 h-10 rounded object-cover border border-fb-divider" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-fb-text tabular-nums">{duration.toFixed(2)}h</p>
                                            <p className="text-sm font-semibold text-green-600 tabular-nums">${pay.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-sm text-fb-text-tertiary">No completed entries yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimeLog;
