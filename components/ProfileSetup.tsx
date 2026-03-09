
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
    <div className="flex items-start sm:items-center justify-center min-h-screen bg-fb-bg font-fb px-4 py-6 sm:py-0">
      <div className="w-full max-w-sm">
        {/* Logo + Title */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-2xl bg-[#1A1A1A] mb-3">
            <span className="text-2xl font-extrabold text-white tracking-tight">RFE</span>
          </div>
          <h1 className="text-2xl font-bold text-fb-blue">RFE Foam Equipment</h1>
          <p className="mt-1 text-sm text-fb-text-secondary">
            Track your time, anywhere.
          </p>
        </div>

        {/* Card */}
        <div className="p-5 bg-fb-card rounded-lg shadow-fb-xl">
          <h2 className="text-lg font-bold text-center text-fb-text mb-1">
            Create Your Profile
          </h2>
          <p className="text-xs text-center text-fb-text-secondary mb-5">
            Set up your details to get started.
          </p>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-fb-text-secondary mb-1">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="block w-full px-4 py-3 text-base text-fb-text bg-fb-bg placeholder-fb-text-tertiary border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue focus:border-fb-blue transition-colors"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="hourly-wage" className="block text-xs font-semibold text-fb-text-secondary mb-1">Hourly Wage</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fb-text-tertiary text-base font-medium">$</span>
                <input
                  id="hourly-wage"
                  name="hourly-wage"
                  type="number"
                  required
                  className="block w-full pl-8 pr-4 py-3 text-base text-fb-text bg-fb-bg placeholder-fb-text-tertiary border border-fb-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fb-blue focus:border-fb-blue transition-colors"
                  placeholder="0.00"
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-fb-red">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-3 text-base font-bold text-white bg-fb-blue rounded-lg hover:bg-fb-blue-hover active:scale-[0.98] transition-all"
            >
              Get Started
            </button>
          </form>
        </div>

        <p className="mt-5 text-xs text-center text-fb-text-tertiary">
          Your data is stored locally on this device.
        </p>
      </div>
    </div>
  );
};

export default ProfileSetup;
