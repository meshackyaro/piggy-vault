/**
 * Groups Page
 * Main page for group savings functionality - create, join, and manage groups
 */

'use client';

import { useState } from 'react';
import CreateGroupForm from '@/components/create-group-form';
import JoinGroupForm from '@/components/join-group-form';
import GroupDashboard from '@/components/group-dashboard';

type TabType = 'dashboard' | 'create' | 'join';

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabType, name: 'My Groups', icon: '👥' },
    { id: 'create' as TabType, name: 'Create Group', icon: '➕' },
    { id: 'join' as TabType, name: 'Join Group', icon: '🔗' },
  ];

  const handleGroupCreated = () => {
    // Switch to dashboard after creating a group
    setActiveTab('dashboard');
  };

  const handleGroupJoined = () => {
    // Switch to dashboard after joining a group
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Group Savings</h1>
          <p className="mt-2 text-gray-600">
            Create or join savings groups to reach your financial goals together
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'dashboard' && (
            <GroupDashboard />
          )}
          
          {activeTab === 'create' && (
            <CreateGroupForm onGroupCreated={handleGroupCreated} />
          )}
          
          {activeTab === 'join' && (
            <JoinGroupForm onGroupJoined={handleGroupJoined} />
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">How Group Savings Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-blue-800">
              <div>
                <h3 className="font-medium mb-2">1. Create or Join</h3>
                <p>Start a new savings group or join an existing one. Set member limits and lock durations.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">2. Deposit Together</h3>
                <p>Once the group starts, all members can deposit STX into the shared vault.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">3. Withdraw When Ready</h3>
                <p>After the lock period expires, each member can withdraw their individual contributions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}