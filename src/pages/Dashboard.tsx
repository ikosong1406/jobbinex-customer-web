
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";

import {
  FaUserTie,
  FaUserEdit,
  FaArrowRight,
  FaRegCalendarAlt,
  FaRocket,
  FaChartLine,
} from "react-icons/fa";

import { FiArrowUpRight } from "react-icons/fi";
import Api from "../components/Api";

const PRIMARY_COLOR = "#4eaa3c";
const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface InterviewDate {
  date?: string | Date;
}

interface Job {
  status?: string;
  appliedDate?: string | Date | null;
  interviewDates?: InterviewDate[];
}

interface Assistant {
  firstname?: string;
  lastname?: string;
  status?: string;
}

interface Plan {
  status?: string;
  expiryDate?: string;
  expiresAt?: string;
  endDate?: string;
}

interface UserData {
  firstname?: string;
  lastname?: string;
  phonenumber?: string;
  jobEmail?: string;
  cv?: string;
  preferredIndustries?: unknown[];
  preferredRoles?: unknown[];
  preferredLocations?: unknown[];
  jobs?: Job[];
  assistant?: Assistant | null;
  notifications?: unknown[];
  plan?: Plan | null;
}

interface WeeklyApplication {
  day: string;
  applications: number;
}

interface StatusCounts {
  applied: number;
  interviewing: number;
  offerReceived: number;
  hired: number;
  rejected: number;
  pending: number;
}

interface DashboardData {
  userName: string;
  jobs: Job[];
  totalApplications: number;
  upcomingInterviews: number;
  profileCompletion: number;
  weeklyApplications: WeeklyApplication[];
  assistant: Assistant | null;
  notifications: unknown[];
  statusCounts: StatusCounts;
  plan: Plan | null;
}

const isValidDate = (value: unknown): value is string | Date => {
  if (!(typeof value === "string" || value instanceof Date)) return false;
  return !Number.isNaN(new Date(value).getTime());
};

const getWeeklyApplicationsData = (jobs: Job[] = []): WeeklyApplication[] => {
  const now = new Date();
  const startOfWeek = new Date(now);

  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const applicationsByDay = Array<number>(7).fill(0);

  jobs.forEach((job) => {
    if (!isValidDate(job.appliedDate)) return;

    const appliedDate = new Date(job.appliedDate);

    if (appliedDate >= startOfWeek && appliedDate <= now) {
      applicationsByDay[appliedDate.getDay()] += 1;
    }
  });

  return WEEK_DAYS.map((day, index) => ({
    day,
    applications: applicationsByDay[index],
  }));
};

const calculateProfileCompletion = (user: UserData): number => {
  const totalFields = 5;
  let completedFields = 0;

  if (user.phonenumber) completedFields += 1;
  if (user.jobEmail) completedFields += 1;
  if (user.cv) completedFields += 1;

  const hasPreferences =
    (Array.isArray(user.preferredIndustries) && user.preferredIndustries.length > 0) ||
    (Array.isArray(user.preferredRoles) && user.preferredRoles.length > 0) ||
    (Array.isArray(user.preferredLocations) && user.preferredLocations.length > 0);

  if (hasPreferences) completedFields += 1;
  if (user.lastname) completedFields += 1;

  return Math.round((completedFields / totalFields) * 100);
};

const normalizeStatus = (status?: string): string =>
  (status || "").trim().toLowerCase().replace(/[_-]+/g, " ");

const getStatusCounts = (jobs: Job[] = []): StatusCounts => ({
  applied: jobs.filter((job) => normalizeStatus(job.status) === "applied").length,
  interviewing: jobs.filter((job) => normalizeStatus(job.status) === "interviewing").length,
  offerReceived: jobs.filter((job) => normalizeStatus(job.status) === "offer received").length,
  hired: jobs.filter((job) => normalizeStatus(job.status) === "hired").length,
  rejected: jobs.filter((job) => normalizeStatus(job.status) === "rejected").length,
  pending: jobs.filter((job) => normalizeStatus(job.status) === "pending").length,
});

const getAssistantInitials = (assistant: Assistant | null): string => {
  if (!assistant) return "?";

  return `${assistant.firstname?.charAt(0) || ""}${assistant.lastname?.charAt(0) || ""}`.toUpperCase() || "?";
};

// SUBSCRIPTION VALIDATION
const hasActiveSubscription = (plan: Plan | null): boolean => {
  if (!plan) return false;

  const status = normalizeStatus(plan.status);

  if (status !== "active") return false;

  const expiryDate =
    plan.expiryDate ||
    plan.expiresAt ||
    plan.endDate;

  // If no expiry date exists, rely on the backend active status.
  if (!expiryDate) return true;

  const expiry = new Date(expiryDate);

  if (Number.isNaN(expiry.getTime())) return false;

  return expiry.getTime() > Date.now();
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const fetchUserData = async (): Promise<void> => {
      try {
        setLoading(true);

        const token = await localforage.getItem<string>("authToken");

        if (!token) {
          if (mounted) navigate("/", { replace: true });
          return;
        }

        const response = await axios.get<
          UserData | { user?: UserData; data?: UserData }
        >(USER_DATA_ENDPOINT, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!mounted) return;

        const payload = response.data;

        const user: UserData =
          ("user" in payload && payload.user) ||
          ("data" in payload && payload.data) ||
          (payload as UserData);

        const jobs = Array.isArray(user.jobs) ? user.jobs : [];

        const totalApplications = jobs.filter(
          (job) => isValidDate(job.appliedDate)
        ).length;

        const now = new Date();

        const upcomingInterviews = jobs.reduce((count, job) => {
          if (
            normalizeStatus(job.status) !== "interviewing" ||
            !Array.isArray(job.interviewDates)
          ) {
            return count;
          }

          const upcomingCount = job.interviewDates.filter(
            (interview) =>
              isValidDate(interview?.date) &&
              new Date(interview.date) > now
          ).length;

          return count + upcomingCount;
        }, 0);

        setDashboardData({
          userName: user.firstname?.trim() || "User",
          jobs,
          totalApplications,
          upcomingInterviews,
          profileCompletion: calculateProfileCompletion(user),
          weeklyApplications: getWeeklyApplicationsData(jobs),
          assistant: user.assistant || null,
          notifications: Array.isArray(user.notifications)
            ? user.notifications
            : [],
          statusCounts: getStatusCounts(jobs),
          plan: user.plan || null,
        });
      } catch (error: unknown) {
        console.error("Dashboard data fetch failed:", error);

        if (!mounted) return;

        if (
          axios.isAxiosError(error) &&
          [401, 403].includes(error.response?.status || 0)
        ) {
          toast.error("Your session has expired. Please log in again.");

          await localforage.removeItem("authToken");

          if (mounted) navigate("/", { replace: true });
        } else {
          toast.error("Failed to load dashboard data.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchUserData();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleCompleteProfile = (): void => {
    navigate("/setup");
  };

  const handleSubscribe = (): void => {
    navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#4eaa3c] rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-4">
          Preparing your dashboard...
        </p>
      </div>
    );
  }

  if (!dashboardData) return null;

  const data = dashboardData;

  const weeklyTotal = data.weeklyApplications.reduce(
    (sum, item) => sum + item.applications,
    0
  );

  const firstName = data.userName;
  const subscriptionActive = hasActiveSubscription(data.plan);
  const hasAssistant = Boolean(data.assistant);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 p-2">

      {/* WELCOME HEADER */}

      <section className="flex flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17231a] tracking-tight mt-2">
            Welcome, {firstName}!
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm w-fit">
          <FaRegCalendarAlt className="text-[#4eaa3c]" />

          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </section>

      {/* PRIORITY ACTIONS */}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-5 bg-[#4eaa3c] rounded-full" />
          <h2 className="font-bold text-gray-900 text-lg">Your next steps</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* PROFILE COMPLETION CARD */}

          <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-50 rounded-full blur-3xl opacity-70 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#4eaa3c] flex items-center justify-center">
                    <FaUserEdit size={21} />
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900">Profile setup</h3>
                  </div>
                </div>

                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  data.profileCompletion === 100
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}>
                  {data.profileCompletion === 100
                    ? "Completed"
                    : "Action needed"}
                </span>
              </div>

              <div className="mt-7">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">
                      Profile completion
                    </p>

                    <h2 className="text-3xl font-extrabold text-[#17231a] mt-1">
                      {data.profileCompletion}
                      <span className="text-lg text-gray-400">%</span>
                    </h2>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${data.profileCompletion}%`,
                      backgroundColor: PRIMARY_COLOR,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-gray-500">
                  {data.profileCompletion === 100
                    ? "Your profile is fully set up."
                    : "Complete your details to improve your application experience."}
                </p>

                <button
                  onClick={handleCompleteProfile}
                  className="inline-flex items-center justify-center gap-2 bg-[#17231a] hover:bg-[#263d2a] text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap"
                >
                  {data.profileCompletion === 100
                    ? "View Profile"
                    : "Complete Profile"}

                  <FiArrowUpRight size={17} />
                </button>
              </div>
            </div>
          </div>

          {/* SUBSCRIPTION / ASSISTANT CARD */}

          <div className="relative overflow-hidden bg-[#14251a] rounded-2xl p-6 text-white shadow-lg shadow-green-950/10">

            <div className="absolute -right-12 -top-16 w-64 h-64 rounded-full bg-[#4eaa3c]/20 blur-3xl pointer-events-none" />

            <div className="absolute right-0 bottom-0 opacity-[0.07] pointer-events-none">
              <FaUserTie size={180} />
            </div>

            <div className="relative z-10">

              {/* ASSISTANT + ACTIVE SUBSCRIPTION */}

              {hasAssistant && subscriptionActive ? (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[#8cdb78]">
                        <FaUserTie size={22} />
                      </div>

                      <div>
                        <h3 className="font-bold text-white">
                          Your Job Assistant
                        </h3>
                      </div>
                    </div>

                    <span className="bg-emerald-400/10 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-7">
                    <div className="w-12 h-12 rounded-full bg-[#4eaa3c] flex items-center justify-center text-white font-bold">
                      {getAssistantInitials(data.assistant)}
                    </div>

                    <div>
                      <h4 className="font-semibold">
                        {data.assistant?.firstname} {data.assistant?.lastname}
                      </h4>

                      <p className="text-xs text-gray-400 mt-1">
                        {data.assistant?.status === "online"
                          ? "Available now"
                          : "Currently unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => navigate("/jobs")}
                      className="inline-flex items-center gap-2 bg-[#4eaa3c] hover:bg-[#60bb4d] text-white px-5 py-3 rounded-xl text-sm font-semibold transition"
                    >
                      View Job Applications
                      <FaArrowRight size={13} />
                    </button>
                  </div>
                </>
              ) : hasAssistant && !subscriptionActive ? (

                /* ASSISTANT EXISTS BUT NO ACTIVE SUBSCRIPTION */

                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-300">
                        <FaUserTie size={22} />
                      </div>

                      <div>
                        <h3 className="font-bold text-white">
                          Subscription Required
                        </h3>

                        <p className="text-xs text-gray-400 mt-1">
                          Your assistant is assigned to you.
                        </p>
                      </div>
                    </div>

                    <span className="bg-amber-400/10 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                      Inactive
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold mt-6 leading-snug max-w-md">
                    {data.plan
                      ? "Your subscription has expired."
                      : "Activate your subscription."}
                  </h2>

                  <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-md">
                    Your job assistant is assigned, but you need an active
                    subscription to continue using our job application
                    services. Subscribe or renew your plan to reactivate
                    your service.
                  </p>

                  <button
                    onClick={handleSubscribe}
                    className="mt-6 inline-flex items-center justify-center gap-3 bg-[#4eaa3c] hover:bg-[#60bb4d] text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-black/20 transition-all duration-300 group"
                  >
                    {data.plan ? "Renew Subscription" : "Subscribe Now"}

                    <FiArrowUpRight
                      size={18}
                      className="group-hover:translate-x-1 group-hover:-translate-y-1 transition"
                    />
                  </button>
                </>

              ) : (

                /* NO ASSISTANT */

                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#4eaa3c]/20 flex items-center justify-center text-[#8cdb78]">
                        <FaRocket size={22} />
                      </div>

                      <div>
                        <h3 className="font-bold text-white">
                          Activate Your Job Assistant
                        </h3>
                      </div>
                    </div>

                    <span className="bg-amber-400/10 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                      Not activated
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold mt-6 leading-snug max-w-md">
                    Let your next career opportunity find you.
                  </h2>

                  <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-md">
                    Unlock your personal job assistant to help manage
                    applications, track opportunities and stay on top of
                    interviews.
                  </p>

                  <button
                    onClick={handleSubscribe}
                    className="mt-6 inline-flex items-center justify-center gap-3 bg-[#4eaa3c] hover:bg-[#60bb4d] text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-black/20 transition-all duration-300 group"
                  >
                    Explore Subscription Plans

                    <FiArrowUpRight
                      size={18}
                      className="group-hover:translate-x-1 group-hover:-translate-y-1 transition"
                    />
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* ACTIVITY + APPLICATION STATUS */}

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* WEEKLY APPLICATION CHART */}

        <div className="xl:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#4eaa3c] flex items-center justify-center">
                  <FaChartLine />
                </div>

                <h2 className="font-bold text-gray-900">
                  Application Activity
                </h2>
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Your applications throughout this week
              </p>
            </div>

            <div className="bg-emerald-50 rounded-xl px-4 py-2 w-fit">
              <p className="text-[10px] text-gray-500">
                This week's applications
              </p>

              <p className="text-xl font-bold text-[#347c28]">
                {weeklyTotal}
              </p>
            </div>
          </div>

          {weeklyTotal > 0 ? (
            <ResponsiveContainer width="100%" height={270}>
              <BarChart
                data={data.weeklyApplications}
                margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f0" />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  dy={10}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                />

                <Tooltip
                  cursor={{ fill: "#f5f9f4" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #edf0ed",
                    boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
                    fontSize: "12px",
                  }}
                />

                <Bar
                  dataKey="applications"
                  name="Applications"
                  fill={PRIMARY_COLOR}
                  radius={[7, 7, 0, 0]}
                  barSize={35}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[270px] flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                <FaChartLine size={23} />
              </div>

              <p className="font-semibold text-gray-700 text-sm">
                No activity recorded yet
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Your application activity will appear here.
              </p>
            </div>
          )}
        </div>

        {/* APPLICATION STATUS SUMMARY */}

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900">
            Application Status
          </h2>

          <p className="text-xs text-gray-400 mt-1 mb-7">
            Breakdown of your applications
          </p>

          {[
            {
              label: "Applied",
              value: data.statusCounts.applied,
              color: "#3b82f6",
            },
            {
              label: "Interviewing",
              value: data.statusCounts.interviewing,
              color: "#eab308",
            },
            {
              label: "Offers received",
              value: data.statusCounts.offerReceived,
              color: "#8b5cf6",
            },
            {
              label: "Hired",
              value: data.statusCounts.hired,
              color: "#4eaa3c",
            },
            {
              label: "Rejected",
              value: data.statusCounts.rejected,
              color: "#ef4444",
            },
            {
              label: "Pending",
              value: data.statusCounts.pending,
              color: "#9ca3af",
            },
          ].map((item) => (
            <div key={item.label} className="mb-5 last:mb-0">
              <div className="flex justify-between items-center text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />

                  <span className="text-gray-600 font-medium">
                    {item.label}
                  </span>
                </div>

                <span className="font-bold text-gray-900">
                  {item.value}
                </span>
              </div>

              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${
                      data.jobs.length
                        ? (item.value / data.jobs.length) * 100
                        : 0
                    }%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
