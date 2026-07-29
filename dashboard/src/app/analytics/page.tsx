'use client';

import { useState } from 'react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  const mockData = {
    totalCalls: 156,
    totalChats: 342,
    avgResponseTime: '1.2s',
    satisfactionRate: '94%',
    peakHours: ['10:00 AM', '2:00 PM', '7:00 PM'],
    topChannels: [
      { name: 'WhatsApp', count: 180, percentage: 37 },
      { name: 'Phone', count: 156, percentage: 32 },
      { name: 'Web Chat', count: 162, percentage: 33 },
    ],
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-600 mt-1 text-sm">Track your AI agent performance</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Total Calls</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{mockData.totalCalls}</p>
          <p className="text-sm text-green-600 mt-2">↑ 12% from last week</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Total Chats</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{mockData.totalChats}</p>
          <p className="text-sm text-green-600 mt-2">↑ 8% from last week</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Avg Response Time</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{mockData.avgResponseTime}</p>
          <p className="text-sm text-green-600 mt-2">↓ 0.3s faster</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500">Satisfaction Rate</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{mockData.satisfactionRate}</p>
          <p className="text-sm text-green-600 mt-2">↑ 2% improvement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Channel Distribution</h2>
          <div className="space-y-4">
            {mockData.topChannels.map((channel) => (
              <div key={channel.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{channel.name}</span>
                  <span className="text-sm text-gray-500">{channel.count} ({channel.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${channel.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Peak Hours</h2>
          <div className="space-y-3">
            {mockData.peakHours.map((hour, index) => (
              <div key={hour} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                <div>
                  <p className="font-medium text-gray-800">{hour}</p>
                  <p className="text-sm text-gray-500">Highest activity</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">89%</p>
              <p className="text-sm text-gray-600 mt-1">Resolution Rate</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">92%</p>
              <p className="text-sm text-gray-600 mt-1">First Contact Resolution</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">4.8/5</p>
              <p className="text-sm text-gray-600 mt-1">Customer Rating</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">15%</p>
              <p className="text-sm text-gray-600 mt-1">Escalation Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
