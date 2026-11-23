import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import { toast, Toaster } from "react-hot-toast";
import {
  FaEnvelope,
  FaPhone,
  FaLink,
  FaSignOutAlt,
  FaCheck,
  FaBriefcase,
  FaMapMarkerAlt,
  FaBuilding,
  FaArrowRight,
  FaCheckCircle,
  FaUserEdit,
  FaRocket,
  FaCreditCard,
  FaExclamationCircle,
} from "react-icons/fa";
import { FiArrowUpRight } from "react-icons/fi";
import Api from "../components/Api";

const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;

interface PlanData {
  name?: string;
  status?: string;
  expiresAt?: string | null;
  expiryDate?: string | null;
  endDate?: string | null;
}

interface UserData {
  plan?: PlanData | null;
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber?: string;
  jobEmail?: string;
  jobPassword?: string;
  jobProvider?: string;
  cv?: string;
  preferredIndustries?: string | string[];
  preferredRoles?: string | string[];
  preferredLocations?: string | string[];
}

type PlanState = "active" | "expired" | "free";

const toArray = (v?: string | string[]): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const getInitials = (first: string, last: string) => {
  if (!first && !last) return "U";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
};

// ---------- PLAN STATE (matches Dashboard) ----------
const getPlanExpiry = (plan?: PlanData | null): string | undefined => {
  const raw = plan?.expiryDate || plan?.expiresAt || plan?.endDate;
  if (!raw) return undefined;
  return raw;
};

const getPlanState = (plan?: PlanData | null): PlanState => {
  if (!plan) return "free";

  const name = (plan.name || "").trim().toLowerCase();

  // Backend sends a free-tier placeholder, e.g. { name: "Free", expiresAt: null }
  if (name === "free" || name === "trial" || name === "basic") return "free";

  const expiryDate = getPlanExpiry(plan);

  // No usable plan fields at all => free
  const hasAnyField =
    Boolean(plan.name) || Boolean(plan.status) || Boolean(expiryDate);

  if (!hasAnyField) return "free";

  // Named paid plan with no expiry date => trust backend as active
  if (!expiryDate) return "active";

  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return "expired";

  return expiry.getTime() > Date.now() ? "active" : "expired";
};

// ---------- PROFILE COMPLETION (matches Dashboard) ----------
const getProfileChecks = (user: UserData): boolean[] => {
  const hasPreferences =
    (Array.isArray(user.preferredIndustries) &&
      user.preferredIndustries.length > 0) ||
    (Array.isArray(user.preferredRoles) && user.preferredRoles.length > 0) ||
    (Array.isArray(user.preferredLocations) &&
      user.preferredLocations.length > 0);

  return [
    Boolean(user.phonenumber?.trim()),
    Boolean(user.jobProvider?.trim()),
    Boolean(user.jobEmail?.trim()),
    Boolean(user.jobPassword?.trim()),
    typeof user.cv === "string" && user.cv.trim().length > 0, // cv is a string
    hasPreferences,
    Boolean(user.lastname?.trim()),
  ];
};

const calculateProfileCompletion = (user: UserData): number => {
  const checks = getProfileChecks(user);
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const isProfileFullyCompleted = (user: UserData): boolean =>
  getProfileChecks(user).every(Boolean);

const SectionHeader: React.FC<{ title: string; description?: string }> = ({
  title,
  description,
}) => (
  <div className="mb-4">
    <div className="flex items-center gap-2">
      <span className="w-1 h-5 bg-[#4eaa3c] rounded-full" />
      <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
    </div>
    {description && (
      <p className="text-xs text-gray-400 mt-1 pl-3">{description}</p>
    )}
  </div>
);

// One-line summary row used inside the "details" card
const SummaryRow = ({
  icon,
  label,
  value,
  complete,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  complete: boolean;
}) => (
  <div className="flex items-start gap-3 py-3">
    <div
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs ${
        complete ? "bg-emerald-50 text-[#4eaa3c]" : "bg-gray-100 text-gray-400"
      }`}
    >
      {complete ? <FaCheck className="text-[10px]" /> : icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p
        className={`mt-0.5 truncate text-sm ${
          complete ? "text-gray-800" : "text-gray-400"
        }`}
      >
        {value || "Not set"}
      </p>
    </div>
  </div>
);

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  const handleLogout = async () => {
    await localforage.removeItem("authToken");
    toast.success("Logged out");
    navigate("/", { replace: true });
  };

  const handleSubscribe = (): void => {
    navigate("/checkout");
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await localforage.getItem("authToken");
      if (!token) {
        navigate("/", { replace: true });
        return;
      }
      const { data } = await axios.get<UserData>(USER_DATA_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserData(data);
    } catch (error) {
      const err = error as AxiosError;
      toast.error("Failed to load profile.");
      if (err.response?.status === 401) navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Return from checkout
  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      toast.success("Subscription activated");
      fetchUserData();
      navigate("/profile", { replace: true });
    }
  }, [searchParams]);

  // Return from setup wizard — refresh silently
  useEffect(() => {
    if (searchParams.get("updated") === "true") {
      fetchUserData();
      navigate("/profile", { replace: true });
    }
  }, [searchParams]);

  // ---------- PLAN STATE ----------
  const planState: PlanState = getPlanState(userData?.plan);
  const currentPlanName = userData?.plan?.name;

  // Free / expired / null plan => show a literal "Subscribe" button.
  // Active paid plan => never show it (only "Manage plan").
  const showSubscribeCTA = planState === "free" || planState === "expired";

  // ---------- COMPLETION (matches Dashboard) ----------
  // `checklist` is only used to render labels + their tick states.
  // The *percentage* and the *complete flag* come from the shared helpers
  // above so they match the Dashboard exactly (7 checks, cv-as-string).
  const checklist = useMemo(() => {
    if (!userData) return [];
    return [
      { label: "Phone number", done: Boolean(userData.phonenumber?.trim()) },
      {
        label: "Job-hunting provider",
        done: Boolean(userData.jobProvider?.trim()),
      },
      { label: "Job-hunting email", done: Boolean(userData.jobEmail?.trim()) },
      {
        label: "Job-hunting password",
        done: Boolean(userData.jobPassword?.trim()),
      },
      {
        label: "CV link",
        done: typeof userData.cv === "string" && userData.cv.trim().length > 0,
      },
      {
        label: "Target roles or industries",
        done:
          toArray(userData.preferredRoles).length > 0 ||
          toArray(userData.preferredIndustries).length > 0,
      },
    ];
  }, [userData]);

  const completionPct = userData ? calculateProfileCompletion(userData) : 0;
  const isComplete = userData ? isProfileFullyCompleted(userData) : false;
  const completedCount = checklist.filter((c) => c.done).length;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#4eaa3c] rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-4">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 px-2 py-4">
      <Toaster position="top-center" />

      {/* Header */}
      <section className="flex flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-md"
            style={{ backgroundColor: "#17231a" }}
          >
            {getInitials(userData?.firstname || "", userData?.lastname || "")}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#17231a] tracking-tight">
              {userData?.firstname} {userData?.lastname}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {planState === "active" ? (
                <>
                  <span className="text-[#4eaa3c] font-semibold">
                    {currentPlanName || "Active plan"}
                  </span>
                  {getPlanExpiry(userData?.plan) && (
                    <>
                      {" · renews "}
                      {new Date(
                        getPlanExpiry(userData?.plan)!,
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </>
                  )}
                </>
              ) : planState === "expired" ? (
                <span className="text-amber-600 font-medium">Plan expired</span>
              ) : (
                "No subscription"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <FaSignOutAlt className="text-[11px]" />
            Log out
          </button>
        </div>
      </section>

      {/* Next steps */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1 h-5 bg-[#4eaa3c] rounded-full" />
          <h2 className="font-bold text-gray-900 text-lg">Your next steps</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Profile completion — links to wizard */}
          <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-50 rounded-full blur-3xl opacity-70 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#4eaa3c] flex items-center justify-center">
                    <FaUserEdit size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Profile setup
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {completedCount} of {checklist.length} complete
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                    isComplete
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isComplete ? "Completed" : "Action needed"}
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between mb-2">
                  <p className="text-xs text-gray-400 font-medium">
                    Profile completion
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-extrabold text-[#17231a]">
                    {completionPct}
                    <span className="text-lg text-gray-400">%</span>
                  </h2>
                </div>
                <div className="mt-2 h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${completionPct}%`,
                      backgroundColor: "#4eaa3c",
                    }}
                  />
                </div>
              </div>

              <ul className="mt-5 space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        c.done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {c.done ? (
                        <FaCheck className="text-[8px]" />
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <span
                      className={
                        c.done ? "text-gray-400 line-through" : "text-gray-600"
                      }
                    >
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-gray-500">
                  {isComplete
                    ? "You're ready to be matched."
                    : "Open the guided setup to finish these."}
                </p>
                <button
                  onClick={() => navigate("/setup")}
                  className="inline-flex items-center justify-center gap-2 bg-[#17231a] hover:bg-[#263d2a] text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
                >
                  {isComplete ? "Review setup" : "Finish setup"}
                  <FiArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Plan status card */}
          <div className="relative overflow-hidden bg-[#14251a] rounded-2xl p-6 text-white shadow-lg shadow-green-950/10">
            <div className="absolute -right-12 -top-16 w-64 h-64 rounded-full bg-[#4eaa3c]/20 blur-3xl pointer-events-none" />
            <div className="absolute right-0 bottom-0 opacity-[0.07] pointer-events-none">
              <FaCreditCard size={180} />
            </div>

            <div className="relative z-10">
              {/* ---------- ACTIVE PAID PLAN — NO subscribe button ---------- */}
              {planState === "active" && (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[#8cdb78]">
                        <FaCheckCircle size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Active plan</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {currentPlanName || "Paid plan"}
                        </p>
                      </div>
                    </div>
                    <span className="bg-emerald-400/10 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full">
                      Active
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-bold mt-6 leading-snug max-w-md">
                    {getPlanExpiry(userData?.plan) ? (
                      <>
                        Renews on{" "}
                        {new Date(
                          getPlanExpiry(userData?.plan)!,
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        .
                      </>
                    ) : (
                      "Your plan is active."
                    )}
                  </h2>

                  <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-md">
                    Your career team is actively applying on your behalf.
                    Nothing to do — we'll notify you when something needs your
                    attention.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate("/jobs")}
                      className="inline-flex items-center justify-center gap-2 bg-[#4eaa3c] hover:bg-[#60bb4d] text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-black/20 transition-all group"
                    >
                      View job pipeline
                      <FaArrowRight
                        className="group-hover:translate-x-1 transition"
                        size={12}
                      />
                    </button>
                    <button
                      onClick={() => navigate("/checkout")}
                      className="inline-flex items-center justify-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-xl text-sm font-semibold transition"
                    >
                      Manage plan
                      <FiArrowUpRight size={14} />
                    </button>
                  </div>
                </>
              )}

              {/* ---------- EXPIRED PLAN — subscribe to renew ---------- */}
              {planState === "expired" && (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-300">
                        <FaExclamationCircle size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          Subscription expired
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {currentPlanName || "Previous plan"}
                        </p>
                      </div>
                    </div>
                    <span className="bg-amber-400/10 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                      Expired
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-bold mt-6 leading-snug max-w-md">
                    Subscribe to keep your applications running.
                  </h2>

                  <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-md">
                    Your saved preferences and history are preserved. Renew your
                    subscription to resume your pipeline immediately.
                  </p>

                  {showSubscribeCTA && (
                    <button
                      onClick={handleSubscribe}
                      className="mt-6 inline-flex items-center justify-center gap-3 bg-[#4eaa3c] hover:bg-[#60bb4d] text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-black/20 transition-all group"
                    >
                      Subscribe to renew
                      <FiArrowUpRight
                        size={16}
                        className="group-hover:translate-x-1 group-hover:-translate-y-1 transition"
                      />
                    </button>
                  )}
                </>
              )}

              {/* ---------- FREE / NULL PLAN — subscribe directly ---------- */}
              {planState === "free" && (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#4eaa3c]/20 flex items-center justify-center text-[#8cdb78]">
                        <FaRocket size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          Subscribe to get started
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          No active subscription
                        </p>
                      </div>
                    </div>
                    <span className="bg-emerald-400/10 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                      Free
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-bold mt-6 leading-snug max-w-md">
                    Subscribe and let your next opportunity find you.
                  </h2>

                  <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-md">
                    Subscribe and we&apos;ll start applying on your behalf
                    within 24 hours. You focus on interviews — we handle the
                    busywork.
                  </p>

                  {showSubscribeCTA && (
                    <button
                      onClick={handleSubscribe}
                      className="mt-6 inline-flex items-center justify-center gap-3 bg-[#4eaa3c] hover:bg-[#60bb4d] text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-black/20 transition-all group"
                    >
                      Subscribe
                      <FiArrowUpRight
                        size={16}
                        className="group-hover:translate-x-1 group-hover:-translate-y-1 transition"
                      />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Personal summary — read-only view */}
      <section>
        <SectionHeader
          title="Account details"
          description="Read-only summary. Edit these in the guided setup."
        />
        <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-7 shadow-sm">
          <div className="divide-y divide-gray-100">
            <SummaryRow
              icon={<FaEnvelope className="text-[11px]" />}
              label="Primary email"
              value={userData?.email}
              complete
            />
            <SummaryRow
              icon={<FaPhone className="text-[11px]" />}
              label="Phone number"
              value={userData?.phonenumber}
              complete={Boolean(userData?.phonenumber?.trim())}
            />
            <SummaryRow
              icon={<FaEnvelope className="text-[11px]" />}
              label="Job-hunting email"
              value={userData?.jobEmail}
              complete={Boolean(userData?.jobEmail?.trim())}
            />
            <SummaryRow
              icon={<FaLink className="text-[11px]" />}
              label="CV link"
              value={userData?.cv}
              complete={
                typeof userData?.cv === "string" &&
                userData.cv.trim().length > 0
              }
            />
            <SummaryRow
              icon={<FaBriefcase className="text-[11px]" />}
              label="Target roles"
              value={toArray(userData?.preferredRoles).join(", ") || undefined}
              complete={toArray(userData?.preferredRoles).length > 0}
            />
            <SummaryRow
              icon={<FaBuilding className="text-[11px]" />}
              label="Industries"
              value={
                toArray(userData?.preferredIndustries).join(", ") || undefined
              }
              complete={toArray(userData?.preferredIndustries).length > 0}
            />
            <SummaryRow
              icon={<FaMapMarkerAlt className="text-[11px]" />}
              label="Locations"
              value={
                toArray(userData?.preferredLocations).join(", ") || undefined
              }
              complete={toArray(userData?.preferredLocations).length > 0}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => navigate("/setup")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4eaa3c] hover:bg-[#60bb4d] text-white px-5 py-2.5 text-sm font-bold shadow-md shadow-green-900/15 transition"
            >
              Edit in guided setup
              <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
