import React, { useState, useMemo } from 'react';
import { UserProfile, TimeEntry, Job } from '../types';
import { generatePremiumPayReport } from '../services/pdfService';

interface PremiumReportProps {
  profile: UserProfile;
  timeEntries: TimeEntry[];
  jobs: Job[];
}

const PremiumReport: React.FC<PremiumReportProps> = ({ profile, timeEntries, jobs }) => {
  const [periodType, setPeriodType] = useState<'weekly' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const { computedStart, computedEnd } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (periodType) {
      case 'weekly': {
        const day = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'biweekly': {
        const day = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - day - 7);
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'monthly': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case 'custom': {
        start = startDate ? new Date(startDate + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
        end = endDate ? new Date(endDate + 'T23:59:59') : end;
        break;
      }
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { computedStart: start, computedEnd: end };
  }, [periodType, startDate, endDate]);

  const filteredEntries = useMemo(() => {
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.clockIn);
      const inRange = entryDate >= computedStart && entryDate <= computedEnd;
      const matchesJob = selectedJobIds.length === 0 || (entry.jobId && selectedJobIds.includes(entry.jobId));
      return inRange && matchesJob;
    });
  }, [timeEntries, computedStart, computedEnd, selectedJobIds]);

  const summary = useMemo(() => {
    let totalHours = 0;
    let totalPay = 0;
    const byProject: Record<string, { hours: number; pay: number; entries: number }> = {};

    filteredEntries.forEach(entry => {
      if (!entry.clockOut) return;
      const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60);
      const job = entry.jobId ? jobs.find(j => j.id === entry.jobId) : null;
      const rate = job?.hourlyRate || profile.hourlyWage;
      const pay = hours * rate;
      totalHours += hours;
      totalPay += pay;

      const name = entry.projectName || 'General';
      if (!byProject[name]) byProject[name] = { hours: 0, pay: 0, entries: 0 };
      byProject[name].hours += hours;
      byProject[name].pay += pay;
      byProject[name].entries += 1;
    });

    return { totalHours, totalPay, byProject };
  }, [filteredEntries, jobs, profile]);

  const toggleJobFilter = (jobId: string) => {
    setSelectedJobIds(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generatePremiumPayReport({
        profile,
        timeEntries: filteredEntries,
        jobs,
        periodStart: computedStart,
        periodEnd: computedEnd,
        includePhotos,
        includeTasks,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 border-b border-fb-divider bg-gradient-to-r from-fb-blue to-fb-blue-dark px-4 py-4 text-white sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-extrabold">Premium Pay Report</h2>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">Pro</span>
        </div>
        <p className="mt-1 text-xs font-medium text-white/85">Generate polished PDF payroll reports with optional task and photo evidence.</p>
      </div>

      <div className="space-y-5 py-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-fb-text-secondary">Report Period</label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-fb-bg p-1 sm:grid-cols-4">
            {(['weekly', 'biweekly', 'monthly', 'custom'] as const).map(type => (
              <button
                key={type}
                onClick={() => setPeriodType(type)}
                className={`rounded-lg py-2 text-[11px] font-bold transition sm:text-xs ${
                  periodType === type ? 'bg-white text-fb-blue shadow-fb' : 'text-fb-text-secondary hover:text-fb-text'
                }`}
              >
                {type === 'biweekly' ? 'Bi-Weekly' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {periodType === 'custom' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-fb-text-secondary">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="block w-full rounded-xl border border-fb-input-border bg-fb-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-fb-text-secondary">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="block w-full rounded-xl border border-fb-input-border bg-fb-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fb-blue"
              />
            </div>
          </div>
        )}

        {/* Job Filter */}
        {jobs.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-fb-text-secondary">Filter by Job</label>
            <div className="flex flex-wrap gap-2">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => toggleJobFilter(job.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    selectedJobIds.includes(job.id)
                      ? 'border-transparent text-white'
                      : 'border-fb-divider text-fb-text-secondary bg-white hover:bg-fb-bg'
                  }`}
                  style={selectedJobIds.includes(job.id) ? { backgroundColor: job.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: job.color }} />
                  {job.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTasks}
              onChange={e => setIncludeTasks(e.target.checked)}
              className="w-4 h-4 rounded border-fb-divider text-fb-blue focus:ring-fb-blue"
            />
            <span className="text-xs font-bold text-fb-text-secondary">Include Tasks</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={e => setIncludePhotos(e.target.checked)}
              className="w-4 h-4 rounded border-fb-divider text-fb-blue focus:ring-fb-blue"
            />
            <span className="text-xs font-bold text-fb-text-secondary">Include Photos</span>
          </label>
        </div>

        <div className="rounded-2xl border border-fb-divider bg-gradient-to-br from-fb-bg to-sky-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-fb-text-secondary">
              {computedStart.toLocaleDateString()} — {computedEnd.toLocaleDateString()}
            </p>
            <span className="text-xs font-bold text-fb-text-tertiary">
              {filteredEntries.length} entries
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-fb-text-tertiary">Total Hours</p>
              <p className="text-2xl font-extrabold text-fb-text">{summary.totalHours.toFixed(1)}</p>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-fb-text-tertiary">Total Pay</p>
              <p className="text-2xl font-extrabold text-fb-green">${summary.totalPay.toFixed(2)}</p>
            </div>
          </div>

          {Object.keys(summary.byProject).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {Object.entries(summary.byProject).map(([name, data]: [string, { hours: number; pay: number; entries: number }]) => (
                <div key={name} className="flex items-center justify-between rounded-lg bg-white p-2 text-xs">
                  <span className="font-bold text-fb-text">{name}</span>
                  <div className="flex gap-3">
                    <span className="text-fb-text-secondary">{data.hours.toFixed(1)} hrs</span>
                    <span className="font-bold text-fb-green">${data.pay.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={filteredEntries.length === 0 || isGenerating}
          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-fb-blue to-fb-blue-dark px-4 py-3 text-sm font-extrabold text-white shadow-fb transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isGenerating ? 'Generating...' : 'Generate Premium Report (PDF)'}
        </button>
      </div>
    </div>
  );
};

export default PremiumReport;
