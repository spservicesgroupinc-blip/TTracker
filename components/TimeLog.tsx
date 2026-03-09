
import React from 'react';
import { TimeEntry, UserProfile } from '../types';

interface TimeLogProps {
  timeEntries: TimeEntry[];
  profile: UserProfile;
}

const LocationLink: React.FC<{ location?: { latitude: number; longitude: number; } }> = ({ location }) => {
    if (!location) {
        return <span className="text-gray-400">N/A</span>;
    }
    const { latitude, longitude } = location;
    return (
        <a
            href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 hover:underline"
        >
            View on Map
        </a>
    );
};

const TimeLog: React.FC<TimeLogProps> = ({ timeEntries, profile }) => {
    const calculateDuration = (clockIn: string, clockOut?: string): number => {
        if (!clockOut) return 0;
        const start = new Date(clockIn).getTime();
        const end = new Date(clockOut).getTime();
        return (end - start) / (1000 * 60 * 60); // duration in hours
    };

    const sortedEntries = [...timeEntries].sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

    return (
        <div className="p-4 bg-white rounded-lg shadow-md sm:p-6">
            <h3 className="text-xl font-bold text-gray-800">Time Log</h3>
            <div className="mt-4 overflow-x-auto">
                <div className="min-w-full align-middle">
                    {sortedEntries.length > 0 ? (
                        <div className="space-y-4">
                            {sortedEntries.map((entry) => {
                                const duration = calculateDuration(entry.clockIn, entry.clockOut);
                                const pay = duration * profile.hourlyWage;
                                return (
                                    <div key={entry.id} className="p-4 border border-gray-200 rounded-lg">
                                        <div className="flex flex-col justify-between sm:flex-row">
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-semibold text-gray-800">{new Date(entry.clockIn).toDateString()}</p>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {entry.projectName || 'General'}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm text-gray-500">
                                                  <span className="font-medium">In:</span> {new Date(entry.clockIn).toLocaleTimeString()} - <LocationLink location={entry.clockInLocation} />
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                  <span className="font-medium">Out:</span> {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : '...'} - <LocationLink location={entry.clockOutLocation} />
                                                </p>
                                            </div>
                                            <div className="mt-2 text-left sm:text-right sm:mt-0">
                                                <p className="font-semibold text-gray-800">{duration > 0 ? `${duration.toFixed(2)} hrs` : 'In Progress'}</p>
                                                <p className="text-sm text-green-600">{pay > 0 ? `$${pay.toFixed(2)}` : ''}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <p className="text-gray-500">No time entries yet. Clock in to get started!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimeLog;
