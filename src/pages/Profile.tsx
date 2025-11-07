import { useState } from "react";
import {
  FaEnvelope,
  FaPhone,
  FaFileUpload,
  FaUser,
} from "react-icons/fa";
import { FiX } from "react-icons/fi";

// -------- Tag Input Component --------
const TagInput = ({ label, tags, setTags, placeholder }: any) => {
  const [input, setInput] = useState("");

  const handleAdd = (e: any) => {
    e.preventDefault();
    if (input.trim() && !tags.includes(input.trim())) {
      setTags([...tags, input.trim()]);
    }
    setInput("");
  };

  const handleRemove = (tag: string) => {
    setTags(tags.filter((t: string) => t !== tag));
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2 border border-gray-200 bg-gray-50 rounded-lg p-2 hover:border-[var(--color-primary)] transition">
        {tags.map((tag: string) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-1 rounded-full text-xs"
          >
            {tag}
            <FiX
              className="cursor-pointer"
              onClick={() => handleRemove(tag)}
            />
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

// -------- Main Profile Page --------
const Profile = () => {
  const [firstName, setFirstName] = useState("Alexander");
  const [lastName, setLastName] = useState("Ikosong");
  const [email, setEmail] = useState("alexander@example.com");
  const [phone, setPhone] = useState("+234 800 000 0000");
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Preferences
  const [industries, setIndustries] = useState<string[]>(["Tech", "Finance"]);
  const [roles, setRoles] = useState<string[]>(["Product Manager"]);
  const [locations, setLocations] = useState<string[]>(["Remote", "Lagos"]);

  const [profilePercent] = useState(80);

  const plans = [
    {
      name: "Starter",
      price: "$0 / week",
      features: ["2 job apps/week", "Basic support"],
    },
    {
      name: "Pro",
      price: "$29 / week",
      features: ["10 job apps/week", "1:1 Review", "Priority Assistant"],
    },
    {
      name: "Elite",
      price: "$79 / week",
      features: ["Unlimited jobs", "Dedicated Manager", "24/7 Fast Support"],
    },
  ];

  const handleStripeCheckout = (plan: string) => {
    alert(`Redirecting to Stripe checkout for ${plan}...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ---- Header ---- */}
        <div className="bg-white rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">
              <FaUser />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {firstName} {lastName}
              </h1>
            </div>
          </div>
          {/* Profile completion */}
          <div className="w-full md:w-1/3 mt-4 md:mt-0">
            <p className="text-xs text-gray-500 mb-1">
              Profile Completion: {profilePercent}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-[var(--color-primary)] transition-all"
                style={{ width: `${profilePercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* ---- Personal Info ---- */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2">
                <FaEnvelope className="text-gray-400 mr-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2">
                <FaPhone className="text-gray-400 mr-2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- CV + Preferences ---- */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              CV & Job Preferences
            </h2>
            <div className="border-dashed border-2 border-gray-200 rounded-xl p-6 bg-gray-50 text-center">
              {cvFile ? (
                <div className="text-sm text-gray-700">
                  Uploaded:{" "}
                  <span className="font-medium text-[var(--color-primary)]">
                    {cvFile.name}
                  </span>
                </div>
              ) : (
                <>
                  <FaFileUpload className="mx-auto text-3xl text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Drop your CV or click below to upload
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    id="cv-upload"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files && setCvFile(e.target.files[0])
                    }
                  />
                  <label
                    htmlFor="cv-upload"
                    className="inline-block mt-3 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm cursor-pointer"
                  >
                    Upload CV
                  </label>
                </>
              )}
            </div>
          </div>

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
        </div>

        {/* ---- Subscription Plans ---- */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Available Weekly Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{plan.price}</p>
                  <ul className="text-sm text-gray-700 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => handleStripeCheckout(plan.name)}
                  className="mt-5 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary)]/90"
                >
                  Subscribe
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
