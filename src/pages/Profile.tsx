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
  FaCopy,
  FaShareAlt,
  FaWallet,
  FaGift,
  FaStar,
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
  referralCode?: string;
  balance?: number;
}

type PlanState = "active" | "expired" | "free";

// ---------- PLANS (targets for referral motivation) ----------
interface PlanTarget {
  id: "starter" | "professional";
  name: string;
  price: number;
  tagline: string;
}

const PLAN_TARGETS: PlanTarget[] = [
  {
    id: "starter",
    name: "Starter",
    price: 59.99,
    tagline: "Get your pipeline moving",
  },
  {
    id: "professional",
    name: "Professional",
    price: 129.99,
    tagline: "Full career team on your side",
  },
];

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

  if (name === "free" || name === "trial" || name === "basic") return "free";

  const expiryDate = getPlanExpiry(plan);

  const hasAnyField =
    Boolean(plan.name) || Boolean(plan.status) || Boolean(expiryDate);

  if (!hasAnyField) return "free";

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
    typeof user.cv === "string" && user.cv.trim().length > 0,
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

const currency = (n: number) =>
  `£${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      toast.success("Subscription activated");
      fetchUserData();
      navigate("/profile", { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("updated") === "true") {
      fetchUserData();
      navigate("/profile", { replace: true });
    }
  }, [searchParams]);

  // ---------- PLAN STATE ----------
  const planState: PlanState = getPlanState(userData?.plan);
  const currentPlanName = userData?.plan?.name;
  const showSubscribeCTA = planState === "free" || planState === "expired";

  // ---------- REFERRAL ----------
  const referralCode = userData?.referralCode || "";
  const referralBalance = Number(userData?.balance ?? 0);

  const handleCopyCode = async () => {
    if (!referralCode) {
      toast.error("No referral code available yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(referralCode);
      toast.success("Referral code copied!");
    } catch {
      toast.error("Could not copy. Please copy manually.");
    }
  };

  const handleShare = async () => {
    const shareText = `Join me on this job platform! Use my referral code ${referralCode} when you sign up.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join with my referral code",
          text: shareText,
          url: window.location.origin,
        });
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(
        `${shareText} ${window.location.origin}`,
      );
      toast.success("Referral link copied!");
    } catch {
      toast.error("Could not share. Please copy manually.");
    }
  };

  // ---------- COMPLETION ----------
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
              {userData?.firstname}
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
                    <h3 className="font-bold text-gray-900">Profile setup</h3>
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

                  <div className="mt-4 flex flex-wrap gap-3">
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

              {planState === "expired" && (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-300">
                        <FaExclamationCircle size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          Action Required
                        </h3>
                      </div>
                    </div>
                    <span className="bg-amber-400/10 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                      Expired
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-bold mt-6 leading-snug max-w-md">
                    Your subscription has expired.
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

      {/* ===== REFERRAL SECTION ===== */}
      <section>
        <SectionHeader
          title="Refer & earn"
          description="Share your code. Earn balance. Put it toward your plan."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Referral code + share */}
          <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-6 shadow-sm lg:col-span-1">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-50 rounded-full blur-2xl opacity-80 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#4eaa3c] flex items-center justify-center">
                  <FaGift size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Your referral code
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Share it with friends
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 truncate rounded-xl border border-dashed border-[#4eaa3c]/40 bg-emerald-50/50 px-4 py-3 font-mono text-sm font-bold tracking-wider text-[#17231a]">
                  {referralCode || "—"}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyCode}
                  disabled={!referralCode}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4eaa3c] hover:bg-[#60bb4d] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 text-xs font-bold transition"
                >
                  <FaCopy size={12} />
                  Copy
                </button>
                <button
                  onClick={handleShare}
                  disabled={!referralCode}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-4 py-2.5 text-xs font-bold transition"
                >
                  <FaShareAlt size={12} />
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Balance + targets */}
          <div className="relative overflow-hidden bg-[#14251a] rounded-2xl p-6 text-white shadow-lg shadow-green-950/10 lg:col-span-2">
            <div className="absolute -right-12 -top-16 w-64 h-64 rounded-full bg-[#4eaa3c]/20 blur-3xl pointer-events-none" />
            <div className="absolute right-0 bottom-0 opacity-[0.06] pointer-events-none">
              <FaWallet size={180} />
            </div>

            <div className="relative z-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-[#8cdb78] flex items-center justify-center">
                    <FaWallet size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Referral balance
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Usable toward any plan
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none">
                    {currency(referralBalance)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">available</p>
                </div>
              </div>

              {/* Plan targets */}
              <div className="mt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PLAN_TARGETS.map((plan) => {
                    const remaining = Math.max(plan.price - referralBalance, 0);
                    const pct = Math.min(
                      100,
                      Math.round((referralBalance / plan.price) * 100),
                    );
                    const unlocked = remaining <= 0;

                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl border p-4 transition ${
                          unlocked
                            ? "border-[#4eaa3c]/40 bg-[#4eaa3c]/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-1.5">
                              {plan.name}
                              {unlocked && (
                                <FaStar className="text-[#8cdb78] text-[10px]" />
                              )}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-white whitespace-nowrap">
                            {currency(plan.price)}
                          </p>
                        </div>

                        <div className="mt-3">
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: unlocked
                                  ? "#8cdb78"
                                  : "#4eaa3c",
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[10px] text-gray-400">
                              {currency(Math.min(referralBalance, plan.price))}{" "}
                              / {currency(plan.price)}
                            </p>
                            <p
                              className={`text-[10px] font-semibold ${
                                unlocked ? "text-[#8cdb78]" : "text-gray-400"
                              }`}
                            >
                              {unlocked
                                ? "Unlocked"
                                : `${currency(remaining)} to go`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            navigate(
                              `/checkout?plan=${plan.id}&useBalance=true`,
                            )
                          }
                          disabled={!unlocked && referralBalance <= 0}
                          className={`mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                            unlocked
                              ? "bg-[#4eaa3c] hover:bg-[#60bb4d] text-white"
                              : referralBalance > 0
                                ? "bg-white/10 hover:bg-white/20 text-white"
                                : "bg-white/5 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {unlocked ? "Redeem now" : "Use balance"}
                          <FiArrowUpRight size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
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
              Edit Profile
              <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
