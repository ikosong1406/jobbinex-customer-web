// pages/Checkout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import localforage from "localforage";
import { toast, Toaster } from "react-hot-toast";
import {
  FaArrowLeft,
  FaCheck,
  FaCheckCircle,
  FaExclamationCircle,
  FaLock,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";
import Api from "../components/Api";
import SubscriptionPlans from "../components/SubscriptionPlans";

const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const SUBSCRIPTION_ENDPOINT = `${Api}/customer/subscribe`;

interface PlanData {
  name: string;
  expiresAt: string;
}

interface UserData {
  plan?: PlanData;
  firstname?: string;
  lastname?: string;
  email?: string;
  phonenumber?: string;
  preferredIndustries?: string | string[];
  preferredRoles?: string | string[];
  preferredLocations?: string | string[];
}

interface Plan {
  name: string;
  price: number;
  oldPrice: number | null;
  duration: string;
  description: string;
  features: string[];
  discount: number;
  highlight: boolean;
}

const toArray = (v?: string | string[]): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

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
    } catch {
      toast.error("Failed to load account.");
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Handle Stripe redirect back: /checkout?success=true&plan=Professional
  useEffect(() => {
    const success = searchParams.get("success");
    const planName = searchParams.get("plan");
    const canceled = searchParams.get("canceled");

    const activate = async () => {
      if (!planName) return;
      const token = await localforage.getItem("authToken");
      if (!token) return;
      try {
        await axios.post(
          SUBSCRIPTION_ENDPOINT,
          { planName },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Subscription activated");
        navigate("/profile?subscribed=true", { replace: true });
      } catch {
        toast.error(
          "Payment succeeded, but activation failed. Contact support.",
        );
      }
    };

    if (success === "true") activate();
    if (canceled === "true") {
      toast.error("Payment cancelled");
      navigate("/checkout", { replace: true });
    }
  }, [searchParams, navigate]);

  const plans: Plan[] = [
    {
      name: "Starter",
      price: 49.99,
      oldPrice: null,
      duration: "/Monthly",
      description: "For individuals just starting.",
      features: [
        "Up to 40 job applications",
        "Application status tracking",
        "Weekly performance summary",
        "Professionally written CV & cover letter",
        "Human-written, no AI",
        "ATS optimization on all documents",
      ],
      discount: 0,
      highlight: false,
    },
    {
      name: "Professional",
      price: 99.99,
      oldPrice: 124.99,
      duration: "/Monthly",
      description: "For steady, serious job seekers.",
      features: [
        "Everything in Starter",
        "Up to 100 job applications",
        "Priority application review",
        "Custom CV & cover-letter tuning",
        "Weekly insights and optimization",
        "LinkedIn profile refinement",
        "Targeted job research",
        "Assisted application submissions",
      ],
      discount: 20,
      highlight: true,
    },
    {
      name: "Elite",
      price: 249.99,
      oldPrice: 499.99,
      duration: "/Monthly",
      description: "For executives and power users.",
      features: [
        "Everything in Professional",
        "Unlimited applications",
        "Detailed progress reports",
        "Dedicated career strategist",
        "Full application management",
        "Priority turnaround",
        "One-to-one interview coaching",
        "Personal brand strategy",
      ],
      discount: 50,
      highlight: false,
    },
  ];

  // A plan is only "active" when it exists AND hasn't expired.
  const hasActivePlan =
    !!userData?.plan?.name &&
    !!userData.plan.expiresAt &&
    new Date(userData.plan.expiresAt) > new Date();

  // "Expired" means a plan existed but is past its date.
  // If there's no plan at all, this is false (fresh subscriber).
  const planExpired =
    !!userData?.plan?.name &&
    !!userData.plan.expiresAt &&
    new Date(userData.plan.expiresAt) <= new Date();

  const currentPlanName = userData?.plan?.name;

  // Readiness gate — warn if the profile is incomplete before they pay.
  const profileReady = useMemo(() => {
    if (!userData) return false;
    const prefs =
      toArray(userData.preferredRoles).length > 0 ||
      toArray(userData.preferredIndustries).length > 0;
    return !!(userData.phonenumber && prefs);
  }, [userData]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#4eaa3c] rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-4">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 px-4 sm:px-6 py-6">
      <Toaster position="top-center" />

      {/* Header */}
      <section className="flex items-center gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"
          aria-label="Back to profile"
        >
          <FaArrowLeft className="text-sm" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17231a] tracking-tight">
            {hasActivePlan
              ? "Manage your plan"
              : planExpired
                ? "Renew your plan"
                : "Choose your plan"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {hasActivePlan
              ? `You're currently on ${currentPlanName}`
              : planExpired
                ? "Your saved preferences and history are intact."
                : "Cancel anytime. Every plan includes the profile work we handle for you."}
          </p>
        </div>
      </section>

      {/* Active plan banner — only for truly active plans */}
      {hasActivePlan && (
        <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <FaCheckCircle className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {currentPlanName} active
            </p>
            <p className="text-xs text-emerald-800/80 mt-0.5">
              Renews on{" "}
              {new Date(userData!.plan!.expiresAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Pick a new plan below to change tiers at your next billing
              cycle.
            </p>
          </div>
        </section>
      )}

      {/* Expired plan banner — replaces active messaging for expired users */}
      {planExpired && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <FaExclamationCircle className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Your {currentPlanName} plan expired
            </p>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Pick a plan below to resume applications. Your profile, saved
              jobs, and history are all preserved.
            </p>
          </div>
        </section>
      )}

      {/* Readiness warning — soft nudge, not a blocker */}
      {!profileReady && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <FaExclamationCircle className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Finish your profile first
            </p>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Add your phone number and at least one target role or industry so
              we can start matching you to opportunities.
            </p>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="text-xs font-semibold text-amber-900 underline-offset-2 hover:underline whitespace-nowrap"
          >
            Finish setup
          </button>
        </section>
      )}

      {/* Plans grid */}
      <section>
        <SubscriptionPlans
          plans={plans}
          currentPlanName={hasActivePlan ? currentPlanName : undefined}
          userDetails={userData || undefined}
          onSubscriptionSuccess={fetchUserData}
        />
      </section>

      <p className="text-center text-xs text-gray-400 pt-2">
        By subscribing you agree to our terms of service and cancellation
        policy.
      </p>
    </div>
  );
};

export default Checkout;
