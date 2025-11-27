import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";
import { FaUserPlus } from "react-icons/fa";
import Api from "../components/Api";

// --- Type Definitions (Updated based on API Response & Requirements) ---

interface PlanData {
  name: string;
  expiresAt: string;
}

// Interface for interview dates from the Job schema
interface InterviewDate {
  date: string;
  type: "Screening" | "Technical" | "Behavioral" | "On-site";
  notes: string;
}

// Interface for a Job from the UserData
interface JobData {
  _id: string;
  title: string;
  status:
    | "Pending"
    | "Applied"
    | "Interviewing"
    | "Offer Received"
    | "Rejected"
    | "Hired"
    | "Archived";
  appliedDate: string | null;
  interviewDates: InterviewDate[];
  company: string;
  location: string;
  jobType: string;
  // Add other job fields as necessary
}

interface UserData {
  plan?: PlanData;
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  jobs: JobData[];
  assistant: any;
  notifications: any[];
  jobEmail?: string | null;
  cv?: string | null;
  preferredIndustries: string[];
  preferredRoles: string[];
  preferredLocations: string[];
}

// Data point for the weekly applications chart
interface WeeklyApplicationData {
  day: string;
  applications: number;
}

// Data required for the dashboard view
interface DashboardState {
  userName: string;
  totalApplications: number;
  upcomingInterviews: number;
  profileCompletion: number;
  weeklyApplications: WeeklyApplicationData[];
  assistant: any;
  notifications: any[];
  statusCounts: {
    applied: number;
    interviewing: number;
    offerReceived: number;
    hired: number;
    rejected: number;
    pending: number;
  };
}

const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const PRIMARY_COLOR = "#4eaa3c";
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Helper: Weekly Application Data Logic (Updated to include all jobs with appliedDate) ---

/**
 * Calculates the count of applications for each day of the current week.
 * Now includes all jobs with appliedDate regardless of status
 */
const getWeeklyApplicationsData = (
  jobs: JobData[]
): WeeklyApplicationData[] => {
  const now = new Date();
  // Get the start of the current week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Initialize data for the week
  const applicationsByDay: { [key: number]: number } = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };

  // Filter jobs that have an appliedDate (regardless of status)
  jobs
    .filter((job) => job.appliedDate)
    .forEach((job) => {
      const appliedDate = new Date(job.appliedDate!);

      // Check if the applied date is from the current week (on or after startOfWeek)
      if (appliedDate >= startOfWeek && appliedDate <= now) {
        const dayOfWeek = appliedDate.getDay();
        applicationsByDay[dayOfWeek]++;
      }
    });

  // Convert the map to the required array format
  return WEEK_DAYS.map((dayName, index) => ({
    day: dayName,
    applications: applicationsByDay[index],
  }));
};

// --- Profile Completion Logic ---
const calculateProfileCompletion = (user: UserData): number => {
  const totalFields = 5;
  let completedFields = 0;

  if (user.phonenumber) completedFields++;
  if (user.jobEmail) completedFields++;
  if (user.cv) completedFields++;
  if (
    user.preferredIndustries.length > 0 ||
    user.preferredRoles.length > 0 ||
    user.preferredLocations.length > 0
  ) {
    completedFields++;
  }
  if (user.lastname) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
};

// --- Helper: Get Assistant Initials ---
const getAssistantInitials = (assistant: any): string => {
  if (!assistant) return "?";

  const { firstname, lastname } = assistant;
  const firstInitial = firstname ? firstname.charAt(0).toUpperCase() : "";
  const lastInitial = lastname ? lastname.charAt(0).toUpperCase() : "";

  return firstInitial + lastInitial;
};

// --- Helper: Get Status Counts ---
const getStatusCounts = (jobs: JobData[]) => {
  return {
    applied: jobs.filter((job) => job.status === "Applied").length,
    interviewing: jobs.filter((job) => job.status === "Interviewing").length,
    offerReceived: jobs.filter((job) => job.status === "Offer Received").length,
    hired: jobs.filter((job) => job.status === "Hired").length,
    rejected: jobs.filter((job) => job.status === "Rejected").length,
    pending: jobs.filter((job) => job.status === "Pending").length,
  };
};

// --- Component Start ---
const Home: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardState | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Function to process fetched user data into dashboard state
  const processDataForDashboard = (user: UserData): DashboardState => {
    // 1. Total Applications (all jobs with appliedDate)
    const totalApplications = user.jobs.filter((job) => job.appliedDate).length;

    // 2. Upcoming Interviews
    const upcomingInterviews = user.jobs.reduce((count, job) => {
      if (
        job.status === "Interviewing" &&
        job.interviewDates &&
        job.interviewDates.length > 0
      ) {
        const now = new Date();
        const nextInterview = job.interviewDates
          .map((i) => new Date(i.date))
          .sort((a, b) => a.getTime() - b.getTime())
          .find((date) => date > now);

        if (nextInterview) {
          return count + 1;
        }
      }
      return count;
    }, 0);

    // 3. Profile Completion
    const profileCompletion = calculateProfileCompletion(user);

    // 4. Weekly Applications Data (includes all jobs with appliedDate)
    const weeklyApplications = getWeeklyApplicationsData(user.jobs);

    // 5. Status Counts
    const statusCounts = getStatusCounts(user.jobs);

    return {
      userName: user.firstname,
      totalApplications: totalApplications,
      upcomingInterviews: upcomingInterviews,
      profileCompletion: profileCompletion,
      weeklyApplications: weeklyApplications,
      assistant: user.assistant,
      notifications: user.notifications,
      statusCounts: statusCounts,
    };
  };

  // --- Data Fetching Logic ---
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = await localforage.getItem("authToken");

        if (!token) {
          navigate("/", { replace: true });
          return;
        }

        const response = await axios.get<UserData>(USER_DATA_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const processedData = processDataForDashboard(response.data);
        setDashboardData(processedData);
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error("Dashboard data fetch failed:", axiosError);

        if (
          axiosError.response?.status === 401 ||
          axiosError.response?.status === 403
        ) {
          toast.error("Your session has expired. Please log in again.");
          await localforage.removeItem("authToken");
          navigate("/", { replace: true });
        } else {
          toast.error("Failed to load dashboard data.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]);

  // Handle Profile Completion Redirect
  const handleCompleteProfile = () => {
    navigate("/customer/profile");
  };

  // Handle Assistant Subscription Redirect
  const handleSubscribe = () => {
    navigate("/customer/plan");
  };

  // --- Loading State Render ---
  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading dashboard statistics...</p>
      </div>
    );
  }

  // Use the processed data
  const data = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Welcome back,{" "}
          <span style={{ color: PRIMARY_COLOR }}>{data.userName}</span>
        </h1>

        {/* Profile Completion Banner */}
        {data.profileCompletion < 100 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-8 flex flex-col sm:flex-row justify-between items-center">
            <div>
              <p className="font-semibold">
                Profile {data.profileCompletion}% complete
              </p>
              <p className="text-sm text-yellow-700">
                Complete your profile to help your assistant apply more
                effectively.
              </p>
            </div>
            <button
              onClick={handleCompleteProfile}
              className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg mt-3 sm:mt-0"
            >
              Complete Profile
            </button>
          </div>
        )}

        {/* Snapshot Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {/* Total Applications Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center hover:shadow-lg transition">
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Applications</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {data.totalApplications}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                All jobs with applied dates
              </p>
            </div>
          </div>

          {/* Applied Status Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center hover:shadow-lg transition">
            <div className="ml-4">
              <p className="text-sm text-gray-500">Applied</p>
              <h3 className="text-2xl font-bold text-blue-600">
                {data.statusCounts.applied}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Active applications</p>
            </div>
          </div>

          {/* Interviewing Status Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center hover:shadow-lg transition">
            <div className="ml-4">
              <p className="text-sm text-gray-500">Interviewing</p>
              <h3 className="text-2xl font-bold text-yellow-600">
                {data.statusCounts.interviewing}
              </h3>
              <p className="text-xs text-gray-400 mt-1">In interview process</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center hover:shadow-lg transition">
            <div className="ml-4">
              <p className="text-sm text-gray-500">Hired</p>
              <h3 className="text-2xl font-bold text-purple-600">
                {data.statusCounts.hired}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Successful placements
              </p>
            </div>
          </div>

          {/* Rejected Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center hover:shadow-lg transition">
            <div className="ml-4">
              <p className="text-sm text-gray-500">Rejected</p>
              <h3 className="text-2xl font-bold text-red-600">
                {data.statusCounts.rejected}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Applications declined
              </p>
            </div>
          </div>

          {/* Pending Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center hover:shadow-lg transition">
            <div className="ml-4">
              <p className="text-sm text-gray-500">Pending</p>
              <h3 className="text-2xl font-bold text-gray-600">
                {data.statusCounts.pending}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
            </div>
          </div>
        </div>

        {/* Chart + Assistant Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Weekly Applications Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Applications Sent (This Week)
            </h2>
            {data.weeklyApplications.reduce(
              (sum, item) => sum + item.applications,
              0
            ) > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.weeklyApplications}>
                    <XAxis dataKey="day" stroke="#888" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="applications"
                      fill={PRIMARY_COLOR}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-gray-500">
                    Total:{" "}
                    {data.weeklyApplications.reduce(
                      (sum, item) => sum + item.applications,
                      0
                    )}{" "}
                    jobs this week
                  </span>
                </div>
              </>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 italic">
                No applications recorded for this week.
              </div>
            )}
          </div>

          {/* Assistant Card / Subscription CTA */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col justify-center">
            {data.assistant ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  {/* Assistant Profile Picture with Initials */}
                  <div
                    className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    {getAssistantInitials(data.assistant)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {data.assistant.firstname} {data.assistant.lastname}
                    </h2>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        data.assistant.status === "online"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {data.assistant.status}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm text-center mb-4">
                  Your assistant helps apply for jobs, schedules interviews, and
                  keeps you updated in real-time.
                </p>

                <div className="text-center">
                  <button
                    onClick={() => navigate("/customer/jobs")}
                    className="px-6 py-2 text-white font-semibold rounded-lg transition hover:opacity-90"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    View Job Applications
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center p-8 text-center">
                <FaUserPlus size={40} className="text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Activate Your Job Assistant
                </h3>
                <p className="text-gray-600 mb-4">
                  Subscribe to a plan to unlock your assistant and automate
                  your job applications.
                </p>
                <button
                  onClick={handleSubscribe}
                  className="w-full sm:w-auto px-6 py-2 text-white font-semibold rounded-lg transition hover:opacity-90"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  View Subscription Plans
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Notifications & Updates
          </h2>
          {data.notifications.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {data.notifications.map((note: any) => (
                <li
                  key={note._id || Math.random()}
                  className="py-3 flex justify-between items-center"
                >
                  <p className="text-gray-800">{note.message}</p>
                  <span className="text-xs text-gray-500">
                    {note.createdAt
                      ? new Date(note.createdAt).toLocaleTimeString()
                      : "N/A"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6 text-gray-500 italic">
              No new notifications at this time.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
