import React, { useState, useEffect } from "react";
import {
  FaEnvelope,
  FaPhone,
  FaLink,
  FaUser,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { FiX } from "react-icons/fi";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Api from "../components/Api";

// --- Stripe Integration ---
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

const STRIPE_PUBLIC_KEY =
  "pk_live_51Ryz2U6I86bdfIJm2BRzR0By7Sk7jcKlORcI1b517I8sRyFke6z5Y09Kry629ofHULdSTeh8oWWVDmWcaSpAqUfa00avd0Wekm"; // your Stripe key
let stripePromise: Promise<Stripe | null>;
const getStripe = () => {
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PUBLIC_KEY);
  return stripePromise;
};

// --- Endpoints ---
const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const USER_UPDATE_ENDPOINT = `${Api}/customer/profile`;
const CHECKOUT_ENDPOINT = `${Api}/customer/checkout`;
const SUBSCRIPTION_ENDPOINT = `${Api}/customer/subscribe`;
const PRIMARY_COLOR = "#4eaa3c";

// --- Types ---
interface PlanData {
  name: string;
  expiresAt: string;
}
interface UserData {
  plan?: PlanData;
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  jobEmail?: string;
  jobPassword?: string;
  cv?: string;
  preferredIndustries: string[];
  preferredRoles: string[];
  preferredLocations: string[];
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

// --- Profile Completion ---
const calculateProfileCompletion = (user: UserData): number => {
  const totalFields = 6;
  let completedFields = 0;
  if (user.phonenumber) completedFields++;
  if (user.jobEmail) completedFields++;
  if (user.jobPassword) completedFields++;
  if (user.cv) completedFields++;
  if (
    user.preferredIndustries.length > 0 ||
    user.preferredRoles.length > 0 ||
    user.preferredLocations.length > 0
  )
    completedFields++;
  if (user.lastname) completedFields++;
  return Math.round((completedFields / totalFields) * 100);
};

// --- TagInput ---
const TagInput = ({ label, tags, setTags, placeholder }: any) => {
  const [input, setInput] = useState("");
  const handleAdd = (e: any) => {
    e.preventDefault();
    if (input.trim() && !tags.includes(input.trim()))
      setTags([...tags, input.trim()]);
    setInput("");
  };
  const handleRemove = (tag: string) =>
    setTags(tags.filter((t: string) => t !== tag));
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg p-2 hover:border-blue-500 transition">
        {tags.map((tag: string) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{
              backgroundColor: `${PRIMARY_COLOR}1A`,
              color: PRIMARY_COLOR,
            }}
          >
            {tag}{" "}
            <FiX className="cursor-pointer" onClick={() => handleRemove(tag)} />
          </span>
        ))}
        <form onSubmit={handleAdd}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="outline-none text-sm bg-transparent p-1 flex-1"
          />
        </form>
      </div>
    </div>
  );
};

// --- Main Profile ---
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showJobPassword, setShowJobPassword] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobEmail, setJobEmail] = useState("");
  const [jobPassword, setJobPassword] = useState("");
  const [cvLink, setCvLink] = useState("");

  const [industries, setIndustries] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // --- Fetch User Data ---
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
      setFirstName(data.firstname || "");
      setLastName(data.lastname || "");
      setEmail(data.email || "");
      setPhone(data.phonenumber || "");
      setJobEmail(data.jobEmail || "");
      setJobPassword(data.jobPassword || "");
      setCvLink(data.cv || "");
      setIndustries(data.preferredIndustries || []);
      setRoles(data.preferredRoles || []);
      setLocations(data.preferredLocations || []);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Profile data fetch failed:", axiosError);
      toast.error("Failed to load profile data.");
      if (axiosError.response?.status === 401) navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUserData();
  }, [navigate]);

  // --- Save Profile ---
  const handleSaveProfile = async () => {
    setIsSaving(true);
    const token = await localforage.getItem("authToken");
    if (!token) return;
    const updates = {
      jobEmail,
      jobPassword,
      cv: cvLink,
      preferredIndustries: industries,
      preferredRoles: roles,
      preferredLocations: locations,
    };
    try {
      await axios.patch(USER_UPDATE_ENDPOINT, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Profile updated successfully!");
      setUserData((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error("Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Stripe Checkout ---
  const handleStripeCheckout = async (planName: string) => {
    const token = await localforage.getItem("authToken");
    if (!token) {
      toast.error("Authentication failed.");
      return;
    }
    try {
      toast.loading("Redirecting to checkout...");
      const { data } = await axios.post(
        CHECKOUT_ENDPOINT,
        { planName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!data.redirectUrl) throw new Error("No checkout URL returned.");
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      toast.dismiss();
      console.error("Checkout error:", error);
      toast.error(error.message || "Something went wrong during checkout.");
    }
  };

  // --- Activate subscription after payment ---
  useEffect(() => {
    const success = searchParams.get("success");
    const planName = searchParams.get("plan");
    const canceled = searchParams.get("canceled");

    const activateSubscription = async () => {
      if (!planName) return;
      const token = await localforage.getItem("authToken");
      if (!token) return;
      try {
        await axios.post(
          SUBSCRIPTION_ENDPOINT,
          { planName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Subscription activated successfully!");
        fetchUserData();
      } catch (error) {
        console.error("Failed to activate subscription:", error);
        toast.error(
          "Payment successful but failed to activate subscription. Contact support."
        );
      } finally {
        navigate("/profile", { replace: true });
      }
    };

    if (success === "true") {
      toast.success("Payment successful! Activating your subscription...");
      activateSubscription();
    }

    if (canceled === "true") {
      toast.error("Payment was canceled. Please try again.");
      navigate("/profile", { replace: true });
    }
  }, [searchParams, navigate]);

  // --- Plans ---
  const plans: Plan[] = [
    {
      name: "Starter",
      price: 49.99,
      oldPrice: null,
      duration: "/Monthly",
      description:
        "Perfect for individuals just starting out or applying to a few jobs per week.",
      features: [
        "Up to 50+ job applications",
        "Application status tracking",
        "Weekly performance summary",
      ],
      discount: 0,
      highlight: false,
    },
    {
      name: "Professional",
      price: 99.99,
      oldPrice: 124.99,
      duration: "/Monthly",
      description: "Ideal for busy professionals who want consistent support.",
      features: [
        "Everything in Starter, plus:",
        "Up to 100+ job applications",
        "Priority application review",
      ],
      discount: 20,
      highlight: true,
    },
    {
      name: "Elite",
      price: 249.99,
      oldPrice: 499.99,
      duration: "/Monthly",
      description: "For executives or power users who want full coverage.",
      features: [
        "Everything in Professional, plus:",
        "Unlimited job applications",
        "Detailed progress reports",
      ],
      discount: 50,
      highlight: false,
    },
  ];

  const profilePercent = userData ? calculateProfileCompletion(userData) : 0;
  const hasActivePlan = !!userData?.plan?.name;
  const currentPlanName = userData?.plan?.name;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">
              <FaUser />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {firstName} {lastName}
              </h1>
              <p className="text-sm text-gray-500">
                {hasActivePlan
                  ? `Active Plan: ${currentPlanName}`
                  : "No Active Subscription"}
              </p>
            </div>
          </div>
          <div className="w-full md:w-1/3 mt-4 md:mt-0">
            <p className="text-xs text-gray-500 mb-1">
              Profile Completion: {profilePercent}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${profilePercent}%`,
                  backgroundColor: PRIMARY_COLOR,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { label: "First Name", value: firstName },
              { label: "Last Name", value: lastName },
              { label: "Primary Email", value: email, icon: FaEnvelope },
              {
                label: "Job Hunting Email",
                value: jobEmail,
                icon: FaEnvelope,
                setState: setJobEmail,
              },
              {
                label: "Job Password",
                value: jobPassword,
                icon: FaEnvelope,
                setState: setJobPassword,
                type: "password",
                showPassword: showJobPassword,
                setShowPassword: setShowJobPassword,
              },
              { label: "Phone", value: phone, icon: FaPhone },
              {
                label: "CV Link",
                value: cvLink,
                icon: FaLink,
                setState: setCvLink,
                placeholder: "https://drive.google.com/your-cv-link",
              },
            ].map((field, index) => (
              <div key={index}>
                <label className="block text-sm text-gray-600 mb-1">
                  {field.label}
                </label>
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2">
                  {field.icon && <field.icon className="text-gray-400 mr-2" />}
                  <input
                    type={
                      field.type === "password" && field.showPassword
                        ? "text"
                        : field.type || "text"
                    }
                    value={field.value}
                    onChange={
                      field.setState
                        ? (e) => field.setState(e.target.value)
                        : undefined
                    }
                    readOnly={!field.setState}
                    className={`flex-1 outline-none text-sm ${
                      field.setState ? "bg-white" : "bg-gray-50 text-gray-600"
                    }`}
                    placeholder={field.placeholder || ""}
                  />
                  {field.type === "password" && field.setState && (
                    <button
                      type="button"
                      onClick={() => field.setShowPassword(!field.showPassword)}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      {field.showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  )}
                </div>
                {field.label === "CV Link" && field.value && (
                  <a
                    href={field.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 block"
                  >
                    View CV
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Job Preferences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TagInput
              label="Preferred Industries"
              tags={industries}
              setTags={setIndustries}
              placeholder="Add industry..."
            />
            <TagInput
              label="Preferred Roles"
              tags={roles}
              setTags={setRoles}
              placeholder="Add role..."
            />
            <TagInput
              label="Preferred Locations"
              tags={locations}
              setTags={setLocations}
              placeholder="Add location..."
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-6 py-2 text-white font-semibold rounded-lg transition disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isSaving ? "Saving..." : "Save Profile & Preferences"}
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {hasActivePlan
              ? `Your Active Plan: ${currentPlanName}`
              : "Available Monthly Plans"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isActivePlan = currentPlanName === plan.name;
              return (
                <div
                  key={plan.name}
                  className={`border rounded-2xl p-5 hover:shadow-lg transition flex flex-col justify-between ${
                    plan.highlight
                      ? "border-4 border-yellow-500 shadow-xl"
                      : "border-gray-200"
                  } ${
                    isActivePlan
                      ? "bg-green-50/50 border-green-500"
                      : "bg-white"
                  }`}
                >
                  <div>
                    {plan.highlight && (
                      <span className="text-xs font-bold text-white bg-yellow-500 px-3 py-1 rounded-full absolute -mt-8 -ml-5">
                        MOST POPULAR
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900 text-2xl">
                      {plan.name}
                    </h3>
                    <div className="my-2">
                      <span className="text-3xl font-extrabold text-gray-900 mr-1">
                        £{plan.price}
                      </span>
                      {plan.oldPrice && (
                        <span className="text-sm text-gray-500 line-through mr-2">
                          £{plan.oldPrice}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {plan.duration}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {plan.description}
                    </p>
                    <ul className="text-sm text-gray-700 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start">
                          <FaCheckCircle
                            className="text-green-500 mt-1 mr-2 flex-shrink-0"
                            size={14}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isActivePlan ? (
                    <button
                      disabled
                      className="mt-5 px-4 py-2 bg-green-500 text-white rounded-lg text-sm disabled:opacity-80 flex items-center justify-center"
                    >
                      <FaCheckCircle className="mr-2" /> Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStripeCheckout(plan.name)}
                      className="mt-5 px-4 py-2 text-white rounded-lg text-sm hover:opacity-90 transition"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                      Subscribe Now
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
