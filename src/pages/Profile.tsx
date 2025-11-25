import React, { useState, useEffect } from "react";
import {
  FaEnvelope,
  FaPhone,
  FaLink,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaSignOutAlt,
} from "react-icons/fa";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import Api from "../components/Api";

const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const USER_UPDATE_ENDPOINT = `${Api}/customer/profile`;
const CHECKOUT_ENDPOINT = `${Api}/customer/checkout`;
const SUBSCRIPTION_ENDPOINT = `${Api}/customer/subscribe`;
const PRIMARY_COLOR = "#4eaa3c";

// ------------------ FIX: TYPE FOR PROFILE FIELDS ------------------
interface ProfileField {
  label: string;
  value: string;
  icon?: React.ComponentType<any>;
  type?: string;
  placeholder?: string;
  setState?: (value: string) => void;
  showPassword?: boolean;
  setShowPassword?: (value: boolean) => void;
}

// ------------------

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
  preferredIndustries: string;
  preferredRoles: string;
  preferredLocations: string;
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

const calculateProfileCompletion = (user: UserData): number => {
  const totalFields = 6;
  let completedFields = 0;
  if (user.phonenumber) completedFields++;
  if (user.jobEmail) completedFields++;
  if (user.jobPassword) completedFields++;
  if (user.cv) completedFields++;
  if (
    user.preferredIndustries ||
    user.preferredRoles ||
    user.preferredLocations
  )
    completedFields++;
  if (user.lastname) completedFields++;
  return Math.round((completedFields / totalFields) * 100);
};

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

  const [industry, setIndustry] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");

  // Get user initials for profile picture
  const getUserInitials = () => {
    if (!firstName && !lastName) return "U";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await localforage.removeItem("authToken");
      toast.success("Logged out successfully");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Error during logout");
    }
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
      setFirstName(data.firstname);
      setLastName(data.lastname);
      setEmail(data.email);
      setPhone(data.phonenumber);
      setJobEmail(data.jobEmail || "");
      setJobPassword(data.jobPassword || "");
      setCvLink(data.cv || "");

      // Set string values instead of arrays
      setIndustry(data.preferredIndustries || "");
      setRole(data.preferredRoles || "");
      setLocation(data.preferredLocations || "");
    } catch (error) {
      const err = error as AxiosError;
      toast.error("Failed to load profile data.");
      if (err.response?.status === 401) navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const token = await localforage.getItem("authToken");
    if (!token) return;

    // Use the NEW field names that match your schema
    const updates = {
      jobEmail,
      jobPassword,
      cv: cvLink,
      preferredIndustries: industry, // Map to schema field name
      preferredRoles: role, // Map to schema field name
      preferredLocations: location, // Map to schema field name
      phonenumber: phone,
    };

    try {
      const response = await axios.patch(USER_UPDATE_ENDPOINT, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Profile updated!");

      // Update local state with the response data
      if (response.data.user) {
        setUserData(response.data.user);
      }
    } catch (error: any) {
      console.error("Update error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

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

      if (!data.redirectUrl) throw new Error("Missing redirect URL.");

      window.location.href = data.redirectUrl;
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Checkout error.");
    }
  };

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
        toast.success("Subscription activated!");
        fetchUserData();
      } catch {
        toast.error("Payment successful, but activation failed.");
      } finally {
        navigate("/profile", { replace: true });
      }
    };

    if (success === "true") {
      toast.success("Payment successful!");
      activateSubscription();
    }

    if (canceled === "true") {
      toast.error("Payment canceled.");
      navigate("/profile", { replace: true });
    }
  }, [searchParams]);

  const plans: Plan[] = [
    {
      name: "Starter",
      price: 49.99,
      oldPrice: null,
      duration: "/Monthly",
      description: "Perfect for individuals just starting.",
      features: [
        "Up to 40+ job applications",
        "Application status tracking",
        "Weekly performance summary",
        // Added features from the message
        "Professionally Written CV & Cover Letter", // Core document creation
        "Human-Written Guarantee (No AI)", // Quality assurance
        "ATS Optimization for all documents",
      ],
      discount: 0,
      highlight: false,
    },
    {
      name: "Professional",
      price: 99.99,
      oldPrice: 124.99,
      duration: "/Monthly",
      description: "Ideal for steady job seekers.",
      features: [
        "Everything in Starter, plus:",
        "Up to 100+ job applications",
        "Priority application review",
        "Custom CV & cover letter optimization",
        "Weekly insights and optimization tips",
        // Added features from the message
        "LinkedIn Profile Refinement & Optimization", // Hands-on service
        "Targeted Job Research Assistance", // Hands-on service
        "Assisted Application Submissions", // Hands-on service
      ],
      discount: 20,
      highlight: true,
    },
    {
      name: "Elite",
      price: 249.99,
      oldPrice: 499.99,
      duration: "/Monthly",
      description: "For executives & power users.",
      features: [
        "Everything in Professional, plus:",
        "Unlimited job applications",
        "Detailed progress reports",
        "Dedicated career strategist session",
        "Full application management",
        // Added features from the message
        "Priority Service & Faster Turnaround", // Priority service
        "One-to-One Interview Coaching Session", // High-level support
        "Personal Brand Strategy & Crafting", // High-level support
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );

  // -------------------------------------------
  // PERSONAL INFORMATION FIXED SECTION
  // -------------------------------------------

  const personalFields: ProfileField[] = [
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
      type: "password",
      icon: FaEnvelope,
      setState: setJobPassword,
      showPassword: showJobPassword,
      setShowPassword: setShowJobPassword,
    },
    { label: "Phone", value: phone, icon: FaPhone },
    {
      label: "CV Link",
      value: cvLink,
      icon: FaLink,
      setState: setCvLink,
      placeholder: "https://drive.google.com/your-cv",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-10 px-4">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold text-white"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {getUserInitials()}
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
                className="h-2 rounded-full"
                style={{
                  width: `${profilePercent}%`,
                  backgroundColor: PRIMARY_COLOR,
                }}
              />
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">Personal Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {personalFields.map((field, idx) => (
              <div key={idx}>
                <label className="text-sm text-gray-600 mb-1 block">
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
                    readOnly={!field.setState}
                    onChange={
                      field.setState
                        ? (e) => field.setState!(e.target.value)
                        : undefined
                    }
                    placeholder={field.placeholder}
                    className={`flex-1 outline-none text-sm ${
                      field.setState ? "" : "bg-gray-50 text-gray-500"
                    }`}
                  />

                  {field.type === "password" && field.setShowPassword && (
                    <button
                      type="button"
                      className="text-gray-400 ml-2"
                      onClick={() =>
                        field.setShowPassword!(!field.showPassword)
                      }
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

        {/* Job Preferences */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold">Job Preferences</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Preferred Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Technology, Healthcare, Finance"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Preferred Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Software Engineer, Product Manager"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Preferred Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., London, Remote, New York"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-6 py-2 text-white font-semibold rounded-lg disabled:opacity-50"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isSaving ? "Saving..." : "Save Profile & Preferences"}
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">
            {hasActivePlan
              ? `Your Active Plan: ${currentPlanName}`
              : "Available Monthly Plans"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isActivePlan = plan.name === currentPlanName;

              return (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-5 border flex flex-col justify-between ${
                    plan.highlight
                      ? "border-4 border-yellow-500 shadow-lg"
                      : "border-gray-300"
                  } ${
                    isActivePlan ? "bg-green-50 border-green-500" : "bg-white"
                  }`}
                >
                  <div>
                    {plan.highlight && (
                      <span className="text-xs font-bold text-white bg-yellow-500 px-3 py-1 rounded-full absolute -mt-8 -ml-5">
                        MOST POPULAR
                      </span>
                    )}

                    <h3 className="font-semibold text-2xl">{plan.name}</h3>

                    <div className="my-2">
                      <span className="text-3xl font-extrabold mr-1">
                        £{plan.price}
                      </span>
                      {plan.oldPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          £{plan.oldPrice}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {plan.duration}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {plan.description}
                    </p>

                    <ul className="text-sm text-gray-700 space-y-1">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start">
                          <FaCheckCircle className="text-green-500 mt-1 mr-2" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isActivePlan ? (
                    <button
                      disabled
                      className="mt-5 px-4 py-2 bg-green-500 text-white rounded-lg"
                    >
                      <FaCheckCircle className="inline mr-2" />
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStripeCheckout(plan.name)}
                      className="mt-5 px-4 py-2 text-white rounded-lg hover:opacity-90"
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

        {/* Mobile Logout Button - Bottom of Screen */}
        <div className="md:hidden p-6">
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full text-white py-2 rounded-lg transition"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <FaSignOutAlt className="mr-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
