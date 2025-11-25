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

const TagInput = ({ label, tags, setTags, placeholder }: any) => {
  const [input, setInput] = useState("");

  const handleAdd = (e: any) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput("");
  };

  const handleRemove = (tag: string) =>
    setTags(tags.filter((t: string) => t !== tag));

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg p-2">
        {tags.map((tag: string) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{
              backgroundColor: `${PRIMARY_COLOR}1A`,
              color: PRIMARY_COLOR,
            }}
          >
            {tag}
            <FiX className="cursor-pointer" onClick={() => handleRemove(tag)} />
          </span>
        ))}
        <form onSubmit={handleAdd}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="outline-none text-sm bg-transparent p-1"
          />
        </form>
      </div>
    </div>
  );
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

  const [industries, setIndustries] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

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
      setIndustries(data.preferredIndustries);
      setRoles(data.preferredRoles);
      setLocations(data.preferredLocations);
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

      toast.success("Profile updated!");
      setUserData((prev) => (prev ? { ...prev, ...updates } : prev));
    } catch {
      toast.error("Failed to save changes.");
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
        "Up to 50+ job applications",
        "Status tracking",
        "Weekly summary",
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
        "Everything in Starter",
        "Up to 100+ applications",
        "Priority review",
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
        "Everything in Pro",
        "Unlimited applications",
        "Detailed reports",
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
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl text-gray-400">
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
                      field.setState ? (e) => field.setState!(e.target.value) : undefined
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
      </div>
    </div>
  );
};

export default Profile;
