import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Type Definitions
interface RevenueData {
  day: string;
  applications: number;
}

interface Assistant {
  name: string;
  status: "Online" | "Offline";
  image: string;
  totalApplied: number;
  interviewsSecured: number;
  joinedDate: string;
}

interface Notification {
  id: number;
  message: string;
  time: string;
}

interface DashboardData {
  userName: string;
  totalApplications: number;
  upcomingInterviews: number;
  planUsed: number;
  planLimit: number;
  profileCompletion: number;
  weeklyApplications: RevenueData[];
  assistant: Assistant;
  notifications: Notification[];
}

const Home: React.FC = () => {
  const [dashboardData] = useState<DashboardData>({
    userName: "Alexander",
    totalApplications: 27,
    upcomingInterviews: 3,
    planUsed: 7,
    planLimit: 10,
    profileCompletion: 76,
    assistant: {
      name: "Jeffery",
      status: "Online",
      image: "https://i.pravatar.cc/80?img=11",
      totalApplied: 132,
      interviewsSecured: 15,
      joinedDate: "Jan 2025",
    },
    weeklyApplications: [
      { day: "Mon", applications: 3 },
      { day: "Tue", applications: 4 },
      { day: "Wed", applications: 2 },
      { day: "Thu", applications: 5 },
      { day: "Fri", applications: 1 },
      { day: "Sat", applications: 6 },
      { day: "Sun", applications: 6 },
    ],
    notifications: [
      {
        id: 1,
        message: "Your assistant applied to 2 new jobs today.",
        time: "2 hrs ago",
      },
      {
        id: 2,
        message: "Upcoming interview with Amazon - Tomorrow, 10 AM.",
        time: "5 hrs ago",
      },
      {
        id: 3,
        message: "You’ve reached 70% of your weekly application limit.",
        time: "1 day ago",
      },
    ],
  });

  const planUsagePercent = Math.round(
    (dashboardData.planUsed / dashboardData.planLimit) * 100
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Welcome back,{" "}
          <span className="text-[var(--color-primary)]">
            {dashboardData.userName}
          </span>
        </h1>

        {/* Profile Completion Banner */}
        {dashboardData.profileCompletion < 100 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-8 flex justify-between items-center">
            <div>
              <p className="font-semibold">
                Profile {dashboardData.profileCompletion}% complete
              </p>
              <p className="text-sm text-yellow-700">
                Complete your profile to help your assistant apply more
                effectively.
              </p>
            </div>
            <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg">
              Complete Profile
            </button>
          </div>
        )}

        {/* Snapshot Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {[
            {
              title: "Total Applications This Week",
              value: dashboardData.totalApplications,
            },
            {
              title: "Upcoming Interviews",
              value: dashboardData.upcomingInterviews,
            },
            {
              title: "Plan Usage",
              value: `${dashboardData.planUsed}/${dashboardData.planLimit} (${planUsagePercent}%)`,
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center hover:shadow-lg transition"
            >
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* Chart + Assistant Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Weekly Applications Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Applications Sent (This Week)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.weeklyApplications}>
                <XAxis dataKey="day" stroke="#888" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="applications" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-gray-500">
                Total: {dashboardData.totalApplications} jobs
              </span>
              <span className="text-green-600 font-semibold">
                +8% vs last week
              </span>
            </div>
          </div>

          {/* Assistant Card */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <img
                src={dashboardData.assistant.image}
                alt={dashboardData.assistant.name}
                className="h-16 w-16 rounded-full object-cover"
              />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {dashboardData.assistant.name}
                </h2>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    dashboardData.assistant.status === "Online"
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {dashboardData.assistant.status}
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  Assistant since {dashboardData.assistant.joinedDate}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Total Applied</p>
                <h3 className="text-xl font-bold text-gray-900">
                  {dashboardData.assistant.totalApplied}
                </h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Interviews Secured</p>
                <h3 className="text-xl font-bold text-gray-900">
                  {dashboardData.assistant.interviewsSecured}
                </h3>
              </div>
            </div>

            <p className="text-gray-600 text-sm text-center">
              Your assistant helps apply for jobs, schedules interviews, and
              keeps you updated in real-time.
            </p>
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Notifications & Updates
          </h2>
          <ul className="divide-y divide-gray-100">
            {dashboardData.notifications.map((note) => (
              <li
                key={note.id}
                className="py-3 flex justify-between items-center"
              >
                <p className="text-gray-800">{note.message}</p>
                <span className="text-xs text-gray-500">{note.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Home;
