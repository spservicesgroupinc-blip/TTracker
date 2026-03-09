
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-extrabold text-center text-gray-900">
            Welcome to GeoTime Tracker
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            Let's set up your profile to get started.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="name" className="sr-only">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="hourly-wage" className="sr-only">Hourly Wage ($)</label>
              <input
                id="hourly-wage"
                name="hourly-wage"
                type="number"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Hourly Wage ($)"
                value={hourlyWage}
                onChange={(e) => setHourlyWage(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md group hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
