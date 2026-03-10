
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ProfileSetupProps {
  onProfileSave: (profile: UserProfile) => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onProfileSave }) => {
  const [name, setName] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wage = parseFloat(hourlyWage);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (isNaN(wage) || wage <= 0) {
      setError('Please enter a valid positive number for the hourly wage.');
      return;
    }
    setError('');
    onProfileSave({ name: name.trim(), hourlyWage: wage });
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:grid sm:place-items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fb-blue to-fb-green shadow-fb-lg">
            <span className="font-display text-2xl font-extrabold text-white tracking-tight">RFE</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-fb-text">Field OS</h1>
          <p className="mt-1 text-sm font-semibold text-fb-text-secondary">Set up once, then track work like a pro.</p>
        </div>

        <div className="rounded-3xl border border-fb-divider bg-fb-card p-6 shadow-fb-xl">
          <h2 className="font-display text-xl font-extrabold text-fb-text">Create Profile</h2>
          <p className="mb-5 mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-fb-text-tertiary">Local-only, private data</p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-bold uppercase tracking-wide text-fb-text-secondary">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="block w-full rounded-xl border border-fb-input-border bg-fb-bg px-4 py-3 text-base text-fb-text placeholder-fb-text-tertiary focus:border-fb-blue focus:outline-none focus:ring-2 focus:ring-fb-blue"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="hourly-wage" className="mb-1 block text-xs font-bold uppercase tracking-wide text-fb-text-secondary">Hourly Wage</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fb-text-tertiary text-base font-medium">$</span>
                <input
                  id="hourly-wage"
                  name="hourly-wage"
                  type="number"
                  required
                  className="block w-full rounded-xl border border-fb-input-border bg-fb-bg py-3 pl-8 pr-4 text-base text-fb-text placeholder-fb-text-tertiary focus:border-fb-blue focus:outline-none focus:ring-2 focus:ring-fb-blue"
                  placeholder="0.00"
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="text-sm text-fb-red">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-fb-blue to-fb-blue-dark px-4 py-3 text-base font-extrabold text-white shadow-fb transition hover:brightness-95 active:scale-[0.98]"
            >
              Get Started
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs font-semibold text-fb-text-tertiary">
          Your data is stored locally on this device.
        </p>
      </div>
    </div>
  );
};

export default ProfileSetup;
