
import React from 'react';
import { TimeEntry, UserProfile } from '../types';

interface TimeLogProps {
  timeEntries: TimeEntry[];
  profile: UserProfile;
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

const TimeLog: React.FC<TimeLogProps> = ({ timeEntries, profile }) => {
    const calculateDuration = (clockIn: string, clockOut?: string): number => {
        if (!clockOut) return 0;
        const start = new Date(clockIn).getTime();
        const end = new Date(clockOut).getTime();
        return (end - start) / (1000 * 60 * 60);
    };

    const sortedEntries = [...timeEntries].sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

    return (
        <div className="bg-fb-card rounded-lg shadow-fb overflow-hidden">
            <div className="px-4 py-3 border-b border-fb-divider flex items-center justify-between">
                <h3 className="text-base font-bold text-fb-text">Time Log</h3>
                {sortedEntries.length > 0 && (
                    <span className="text-xs font-semibold text-fb-text-tertiary bg-fb-bg px-2.5 py-1 rounded-full">
                        {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
                    </span>
                )}
            </div>
            <div className="divide-y divide-fb-divider">
                {sortedEntries.length > 0 ? (
                    sortedEntries.map((entry) => {
                        const duration = calculateDuration(entry.clockIn, entry.clockOut);
                        const pay = duration * profile.hourlyWage;
                        const isActive = !entry.clockOut;
                        return (
                            <div key={entry.id} className={`px-4 py-3 hover:bg-fb-hover-bg transition-colors ${isActive ? 'bg-blue-50/50' : ''}`}>
                                <div className="flex flex-col justify-between sm:flex-row sm:items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-fb-text">{new Date(entry.clockIn).toDateString()}</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-fb-blue/10 text-fb-blue">
                                                {entry.projectName || 'General'}
                                            </span>
                                            {isActive && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-fb-green/10 text-fb-green">
                                                    <span className="w-1.5 h-1.5 bg-fb-green rounded-full animate-pulse"></span>
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3 text-xs text-fb-text-secondary">
                                            <span>
                                                <span className="font-semibold">In:</span> {new Date(entry.clockIn).toLocaleTimeString()}
                                            </span>
                                            <LocationLink location={entry.clockInLocation} />
                                            <span className="text-fb-divider">|</span>
                                            <span>
                                                <span className="font-semibold">Out:</span> {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : '—'}
                                            </span>
                                            {entry.clockOut && <LocationLink location={entry.clockOutLocation} />}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 sm:text-right shrink-0">
                                        <div className={`px-3 py-1.5 rounded-lg ${isActive ? 'bg-fb-green/10' : 'bg-fb-bg'}`}>
                                            <p className="text-sm font-bold text-fb-text">
                                                {duration > 0 ? `${duration.toFixed(2)} hrs` : 'In Progress'}
                                            </p>
                                            {pay > 0 && (
                                                <p className="text-xs font-semibold text-fb-green">${pay.toFixed(2)}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-fb-bg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-fb-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-fb-text-secondary">No time entries yet</p>
                        <p className="text-xs text-fb-text-tertiary mt-1">Clock in to start tracking your time.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimeLog;
