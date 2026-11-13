import React, { useEffect, useState } from "react";
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
  FaBriefcase,
  FaUserTie,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaTrophy,
  FaUserEdit,
  FaArrowRight,
  FaRegBell,
  FaRegCalendarAlt,
  FaRocket,
  FaChartLine,
} from "react-icons/fa";

import {
  FiArrowUpRight,
  FiCheck,
  FiChevronRight,
  FiUser,
} from "react-icons/fi";

import { MdOutlineMessage } from "react-icons/md";
import Api from "../components/Api";

const PRIMARY_COLOR = "#4eaa3c";
const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --------------------------------------------------
// DASHBOARD DATA HELPERS
// --------------------------------------------------

const getWeeklyApplicationsData = (jobs = []) => {
  const now = new Date();
  const startOfWeek = new Date(now);

  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const applicationsByDay = [0, 0, 0, 0, 0, 0, 0];

  jobs.forEach((job) => {
    if (!job.appliedDate) return;

    const appliedDate = new Date(job.appliedDate);

    if (appliedDate >= startOfWeek && appliedDate <= now) {
      applicationsByDay[appliedDate.getDay()]++;
    }
  });

  return WEEK_DAYS.map((day, index) => ({
    day,
    applications: applicationsByDay[index],
  }));
};

const calculateProfileCompletion = (user) => {
  const totalFields = 5;
  let completedFields = 0;

  if (user.phonenumber) completedFields++;
  if (user.jobEmail) completedFields++;
  if (user.cv) completedFields++;

  if (
    (user.preferredIndustries || []).length > 0 ||
    (user.preferredRoles || []).length > 0 ||
    (user.preferredLocations || []).length > 0
  ) {
    completedFields++;
  }

  if (user.lastname) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
};

const getStatusCounts = (jobs = []) => ({
  applied: jobs.filter((job) => job.status === "Applied").length,
  interviewing: jobs.filter((job) => job.status === "Interviewing").length,
  offerReceived: jobs.filter((job) => job.status === "Offer Received").length,
  hired: jobs.filter((job) => job.status === "Hired").length,
  rejected: jobs.filter((job) => job.status === "Rejected").length,
  pending: jobs.filter((job) => job.status === "Pending").length,
});

const getAssistantInitials = (assistant) => {
  if (!assistant) return "?";

  return `${assistant.firstname?.charAt(0) || ""}${assistant.lastname?.charAt(0) || ""}`.toUpperCase();
};

const formatDate = (date) => {
  if (!date) return "Recently";

  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// --------------------------------------------------
// STAT CARD
// --------------------------------------------------

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBg,
}) => (
  <div
    className="bg-white border border-gray-100 rounded-2xl p-5
    hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>

        <h3 className="text-3xl font-bold text-[#18251b] mt-3 tracking-tight">
          {value}
        </h3>
      </div>

      <div
        className={`w-11 h-11 rounded-xl flex items-center
        justify-center ${iconBg}`}
      >
        <Icon className={iconColor} size={19} />
      </div>
    </div>

    <p className="text-xs text-gray-400 mt-4">{description}</p>
  </div>
);

// --------------------------------------------------
// MAIN DASHBOARD
// --------------------------------------------------

const Dashboard = () => {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // FETCH USER DATA
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true;

    const fetchUserData = async () => {
      try {
        setLoading(true);

        const token = await localforage.getItem("authToken");

        if (!token) {
          navigate("/", { replace: true });
          return;
        }

        const response = await axios.get(USER_DATA_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!mounted) return;

        const user = response.data;
        const jobs = Array.isArray(user.jobs) ? user.jobs : [];

        const totalApplications = jobs.filter((job) => job.appliedDate).length;

        const upcomingInterviews = jobs.reduce((count, job) => {
          if (
            job.status === "Interviewing" &&
            Array.isArray(job.interviewDates)
          ) {
            const hasUpcoming = job.interviewDates.some(
              (interview) => new Date(interview.date) > new Date(),
            );

            return count + (hasUpcoming ? 1 : 0);
          }

          return count;
        }, 0);

        setDashboardData({
          userName: user.firstname || "User",
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
      } catch (error) {
        console.error("Dashboard data fetch failed:", error);

        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error("Your session has expired. Please log in again.");

          await localforage.removeItem("authToken");

          if (mounted) {
            navigate("/", { replace: true });
          }
        } else {
          toast.error("Failed to load dashboard data.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUserData();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  const handleCompleteProfile = () => {
    navigate("/setup");
  };

  const handleSubscribe = () => {
    navigate("/checkout");
  };

  // --------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div
          className="w-12 h-12 border-4 border-gray-200
          border-t-[#4eaa3c] rounded-full animate-spin"
        />

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
    0,
  );

  const firstName = data.userName;

  const stats = [
    {
      title: "Total Applications",
      value: data.totalApplications,
      description: "All submitted applications",
      icon: FaBriefcase,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      title: "Applied",
      value: data.statusCounts.applied,
      description: "Applications submitted",
      icon: FaRocket,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
    },
    {
      title: "Interviewing",
      value: data.statusCounts.interviewing,
      description: `${data.upcomingInterviews} upcoming interviews`,
      icon: FaRegCalendarAlt,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    },
    {
      title: "Offers Received",
      value: data.statusCounts.offerReceived,
      description: "Potential opportunities",
      icon: FaTrophy,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
    },
    {
      title: "Hired",
      value: data.statusCounts.hired,
      description: "Successful placements",
      icon: FaCheckCircle,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      title: "Pending",
      value: data.statusCounts.pending,
      description: "Awaiting review",
      icon: FaClock,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
    },
  ];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 p-2">
      {/* ==========================================
          WELCOME HEADER
      ========================================== */}

      <section
        className="flex flex-row
        sm:items-center justify-between gap-4"
      >
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold
            text-[#17231a] tracking-tight mt-2"
          >
            Welcome, {firstName}!
          </h1>
        </div>

        <div
          className="flex items-center gap-2 text-xs
          text-gray-500 bg-white border border-gray-100
          rounded-xl px-4 py-3 shadow-sm w-fit"
        >
          <FaRegCalendarAlt className="text-[#4eaa3c]" />

          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </section>

      {/* ==========================================
          PRIORITY ACTIONS
          PROFILE + SUBSCRIPTION
      ========================================== */}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-5 bg-[#4eaa3c] rounded-full" />

          <h2 className="font-bold text-gray-900 text-lg">Your next steps</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* PROFILE COMPLETION CARD */}

          <div
            className="relative overflow-hidden bg-white
            border border-gray-200 rounded-2xl p-6
            shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div
              className="absolute top-0 right-0 w-36 h-36
              bg-emerald-50 rounded-full blur-3xl opacity-70
              pointer-events-none"
            />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl
                    bg-emerald-50 text-[#4eaa3c]
                    flex items-center justify-center"
                  >
                    <FaUserEdit size={21} />
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900">Profile setup</h3>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1.5
                  rounded-full ${
                    data.profileCompletion === 100
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
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

                    <h2
                      className="text-3xl font-extrabold
                      text-[#17231a] mt-1"
                    >
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

              <div
                className="mt-6 flex flex-col sm:flex-row
                sm:items-center justify-between gap-4"
              >
                <p className="text-xs text-gray-500">
                  {data.profileCompletion === 100
                    ? "Your profile is fully set up."
                    : "Complete your details to improve your application experience."}
                </p>

                <button
                  onClick={handleCompleteProfile}
                  className="inline-flex items-center justify-center
                    gap-2 bg-[#17231a] hover:bg-[#263d2a]
                    text-white px-5 py-3 rounded-xl text-sm
                    font-semibold transition-all duration-300
                    whitespace-nowrap"
                >
                  {data.profileCompletion === 100
                    ? "View Profile"
                    : "Complete Profile"}

                  <FiArrowUpRight size={17} />
                </button>
              </div>
            </div>
          </div>

          {/* SUBSCRIPTION / ASSISTANT ACTIVATION CARD */}

          <div
            className="relative overflow-hidden bg-[#14251a]
            rounded-2xl p-6 text-white shadow-lg
            shadow-green-950/10"
          >
            {/* Decorative background */}
            <div
              className="absolute -right-12 -top-16
              w-64 h-64 rounded-full bg-[#4eaa3c]/20
              blur-3xl pointer-events-none"
            />

            <div
              className="absolute right-0 bottom-0
              opacity-[0.07] pointer-events-none"
            >
              <FaUserTie size={180} />
            </div>

            <div className="relative z-10">
              {data.assistant ? (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl
                        bg-white/10 flex items-center
                        justify-center text-[#8cdb78]"
                      >
                        <FaUserTie size={22} />
                      </div>

                      <div>
                        <h3 className="font-bold text-white">
                          Your Job Assistant
                        </h3>
                      </div>
                    </div>

                    <span
                      className="bg-emerald-400/10
                      text-emerald-300 text-xs font-bold
                      px-3 py-1.5 rounded-full"
                    >
                      Active
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-7">
                    <div
                      className="w-12 h-12 rounded-full
                      bg-[#4eaa3c] flex items-center
                      justify-center text-white font-bold"
                    >
                      {getAssistantInitials(data.assistant)}
                    </div>

                    <div>
                      <h4 className="font-semibold">
                        {data.assistant.firstname} {data.assistant.lastname}
                      </h4>

                      <p className="text-xs text-gray-400 mt-1">
                        {data.assistant.status === "online"
                          ? "Available now"
                          : "Currently unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => navigate("/jobs")}
                      className="inline-flex items-center gap-2
                        bg-[#4eaa3c] hover:bg-[#60bb4d]
                        text-white px-5 py-3 rounded-xl
                        text-sm font-semibold transition"
                    >
                      View Job Applications
                      <FaArrowRight size={13} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl
                        bg-[#4eaa3c]/20 flex items-center
                        justify-center text-[#8cdb78]"
                      >
                        <FaRocket size={22} />
                      </div>

                      <div>
                        <h3 className="font-bold text-white">
                          Activate Your Job Assistant
                        </h3>
                      </div>
                    </div>

                    <span
                      className="bg-amber-400/10
                      text-amber-300 text-xs font-bold
                      px-3 py-1.5 rounded-full whitespace-nowrap"
                    >
                      Not activated
                    </span>
                  </div>

                  <h2
                    className="text-xl sm:text-2xl font-bold
                    mt-6 leading-snug max-w-md"
                  >
                    Let your next career opportunity find you.
                  </h2>

                  <p
                    className="text-sm text-gray-400 mt-2
                    leading-relaxed max-w-md"
                  >
                    Unlock your personal job assistant to help manage
                    applications, track opportunities and stay on top of
                    interviews.
                  </p>

                  <button
                    onClick={handleSubscribe}
                    className="mt-6 inline-flex items-center
                      justify-center gap-3 bg-[#4eaa3c]
                      hover:bg-[#60bb4d] text-white
                      px-6 py-3.5 rounded-xl text-sm
                      font-bold shadow-lg shadow-black/20
                      transition-all duration-300 group"
                  >
                    Explore Subscription Plans
                    <FiArrowUpRight
                      size={18}
                      className="group-hover:translate-x-1
                        group-hover:-translate-y-1 transition"
                    />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          ACTIVITY + ASSISTANT / STATUS
      ========================================== */}

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* WEEKLY APPLICATION CHART */}

        <div
          className="xl:col-span-2 bg-white border
          border-gray-100 rounded-2xl p-5 sm:p-7
          shadow-sm"
        >
          <div
            className="flex flex-col sm:flex-row
            sm:items-center justify-between gap-3 mb-7"
          >
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-lg bg-emerald-50
                  text-[#4eaa3c] flex items-center justify-center"
                >
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

            <div
              className="bg-emerald-50 rounded-xl
              px-4 py-2 w-fit"
            >
              <p className="text-[10px] text-gray-500">
                This week's applications
              </p>

              <p className="text-xl font-bold text-[#347c28]">{weeklyTotal}</p>
            </div>
          </div>

          {weeklyTotal > 0 ? (
            <ResponsiveContainer width="100%" height={270}>
              <BarChart
                data={data.weeklyApplications}
                margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f2f0"
                />

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
            <div
              className="h-[270px] flex flex-col
              items-center justify-center text-center"
            >
              <div
                className="w-14 h-14 rounded-full
                bg-gray-50 flex items-center justify-center
                text-gray-300 mb-4"
              >
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

        <div
          className="bg-white border border-gray-100
          rounded-2xl p-6 shadow-sm"
        >
          <h2 className="font-bold text-gray-900">Application Status</h2>

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
              <div
                className="flex justify-between
                items-center text-xs mb-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />

                  <span className="text-gray-600 font-medium">
                    {item.label}
                  </span>
                </div>

                <span className="font-bold text-gray-900">{item.value}</span>
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
