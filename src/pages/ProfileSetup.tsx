import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import { toast, Toaster } from "react-hot-toast";
import {
  FaEnvelope,
  FaPhone,
  FaLink,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaTimes,
  FaGoogle,
  FaYahoo,
  FaMicrosoft,
  FaLock,
  FaBriefcase,
  FaMapMarkerAlt,
  FaBuilding,
  FaArrowRight,
  FaArrowLeft,
  FaPlus,
  FaExternalLinkAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import { SiZoho } from "react-icons/si";
import Api from "../components/Api";

const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const USER_UPDATE_ENDPOINT = `${Api}/customer/profile`;

// --------------------------------------------------
// Types
// --------------------------------------------------

interface UserData {
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

const MAIL_PROVIDERS = [
  { id: "gmail", name: "Gmail", domain: "@gmail.com", Icon: FaGoogle, signupUrl: "https://accounts.google.com/signup" },
  { id: "zoho", name: "Zoho", domain: "@zohomail.com", Icon: SiZoho, signupUrl: "https://www.zoho.com/mail/signup.html" },
  { id: "yahoo", name: "Yahoo", domain: "@yahoo.com", Icon: FaYahoo, signupUrl: "https://login.yahoo.com/account/create" },
  { id: "outlook", name: "Outlook", domain: "@outlook.com", Icon: FaMicrosoft, signupUrl: "https://signup.live.com" },
] as const;

type ProviderId = (typeof MAIL_PROVIDERS)[number]["id"];

const toArray = (v?: string | string[]): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
};

// --------------------------------------------------
// Cities / roles / industries
// --------------------------------------------------

const UK_CITIES = ["London","Manchester","Birmingham","Leeds","Glasgow","Liverpool","Edinburgh","Bristol","Sheffield","Newcastle","Nottingham","Leicester","Coventry","Belfast","Cardiff","Southampton","Reading","Milton Keynes"];
const EUROPE_CITIES = ["Dublin","Berlin","Munich","Amsterdam","Rotterdam","Brussels","Paris","Lyon","Madrid","Barcelona","Lisbon","Porto","Milan","Rome","Zurich","Geneva","Vienna","Stockholm","Copenhagen","Oslo","Helsinki","Warsaw","Prague","Budapest","Athens"];
const NORTH_AMERICA_CITIES = ["New York","Toronto","Vancouver","Montreal","Boston","Chicago","San Francisco","Seattle","Los Angeles","Houston","Miami","Atlanta","Washington DC","Dallas","Calgary","Edmonton"];
const ALL_CITIES = [...UK_CITIES, ...EUROPE_CITIES, ...NORTH_AMERICA_CITIES];

const FORMAL_ROLES = ["Software Engineer","Product Manager","Data Analyst","UX/UI Designer","Marketing Manager","Accountant","Financial Analyst","Project Manager","Business Analyst","Nurse","Teacher","Civil Engineer","Mechanical Engineer","Architect","HR Manager","Operations Manager","Sales Executive","Customer Success Manager","Recruiter","Consultant"];
const INFORMAL_ROLES = ["Care Assistant","Care Worker","Nursing Assistant","Support Worker","Cleaner","Domestic Cleaner","Warehouse Operative","Picker / Packer","Delivery Driver","Van Driver","HGV Driver","Courier","Kitchen Assistant","Chef","Waitress / Waiter","Barista","Hotel Housekeeper","Security Officer","Construction Worker","Labourer","Electrician","Plumber","Painter & Decorator","Handyman","Farm Worker","Factory Worker","Packaging Operator","Food Production Operative","Retail Assistant","Shop Assistant","Cashier","Stockroom Assistant","Receptionist","Administrative Assistant","Teaching Assistant","School Support Staff","Hairdresser / Barber","Beautician"];
const INDUSTRIES = ["Healthcare & Social Care","Hospitality & Food Service","Retail","Logistics & Warehousing","Construction & Trades","Manufacturing","Education","Information Technology","Finance & Banking","Marketing & Advertising","Professional Services","Cleaning & Facilities","Transport & Delivery","Security","Agriculture","Public Sector"];

// --------------------------------------------------
// Shared UI
// --------------------------------------------------

const baseInputClasses =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#4eaa3c] focus:ring-4 focus:ring-green-50";

const Field: React.FC<{
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ label, hint, icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
      {icon && <span className="text-gray-400">{icon}</span>}
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
  </div>
);

// Tiny inline note — one line, not a paragraph
const Note: React.FC<{
  variant?: "info" | "warn";
  children: React.ReactNode;
}> = ({ variant = "info", children }) => {
  const styles =
    variant === "warn"
      ? "border-amber-200 bg-amber-50/60 text-amber-900"
      : "border-emerald-100 bg-emerald-50/50 text-emerald-900";
  const Icon = variant === "warn" ? FaExclamationTriangle : FaCheck;
  return (
    <div className={`flex items-start gap-2 rounded-lg border ${styles} px-3 py-2`}>
      <Icon className={`mt-0.5 shrink-0 text-[10px] ${variant === "warn" ? "text-amber-600" : "text-[#4eaa3c]"}`} />
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
};

// Chip input
const ChipInput: React.FC<{
  label: string;
  icon: React.ReactNode;
  values: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  placeholder: string;
}> = ({ label, icon, values, onChange, suggestions, placeholder }) => {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (value: string) => {
    const v = value.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
    setOpen(false);
    inputRef.current?.focus();
  };
  const remove = (value: string) => onChange(values.filter((v) => v !== value));
  const available = suggestions.filter(
    (s) => !values.includes(s) && s.toLowerCase().includes(draft.toLowerCase())
  );

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
        <span className="text-gray-400">{icon}</span>
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 transition focus-within:border-[#4eaa3c] focus-within:ring-4 focus-within:ring-green-50"
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-[#347c28]"
          >
            {v}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(v); }}
              className="text-[#4eaa3c]/70 hover:text-[#347c28]"
              aria-label={`Remove ${v}`}
            >
              <FaTimes className="text-[9px]" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[130px]">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); add(draft); }
              if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={values.length === 0 ? placeholder : ""}
            className="w-full border-0 bg-transparent py-1 text-sm outline-none placeholder:text-gray-400"
          />
          {open && available.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              {available.slice(0, 10).map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-emerald-50/60"
                >
                  <FaPlus className="text-[10px] text-[#4eaa3c]" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------
// Steps (4 total)
// --------------------------------------------------

type StepKey = "contact" | "inbox" | "cv" | "preferences";

const STEPS: { key: StepKey; title: string }[] = [
  { key: "contact", title: "Contact" },
  { key: "inbox", title: "Job inbox" },
  { key: "cv", title: "CV" },
  { key: "preferences", title: "Preferences" },
];

// --------------------------------------------------
// Main
// --------------------------------------------------

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepKey>("contact");
  const [userData, setUserData] = useState<UserData | null>(null);

  const [phone, setPhone] = useState("");
  const [jobProvider, setJobProvider] = useState<ProviderId | "">("");
  const [jobEmail, setJobEmail] = useState("");
  const [jobPassword, setJobPassword] = useState("");
  const [cvLink, setCvLink] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const provider = MAIL_PROVIDERS.find((p) => p.id === jobProvider);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await localforage.getItem("authToken");
      if (!token) { navigate("/", { replace: true }); return; }
      const { data } = await axios.get<UserData>(USER_DATA_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserData(data);
      setPhone(data.phonenumber || "");
      setJobEmail(data.jobEmail || "");
      setJobPassword(data.jobPassword || "");
      setJobProvider((data.jobProvider as ProviderId) || "");
      setCvLink(data.cv || "");
      setIndustries(toArray(data.preferredIndustries));
      setRoles(toArray(data.preferredRoles));
      setLocations(toArray(data.preferredLocations));

      // Land on first incomplete step
      const firstIncomplete = STEPS.find((s) => !isStepComplete(s.key, data));
      if (firstIncomplete) setCurrentStep(firstIncomplete.key);
    } catch (error) {
      const err = error as AxiosError;
      toast.error("Failed to load profile.");
      if (err.response?.status === 401) navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUserData(); }, []);

  const isStepComplete = (key: StepKey, data: UserData | null): boolean => {
    if (!data) return false;
    switch (key) {
      case "contact": return !!data.phonenumber;
      case "inbox": return !!data.jobEmail && !!data.jobPassword;
      case "cv": return !!data.cv;
      case "preferences":
        return toArray(data.preferredRoles).length > 0 || toArray(data.preferredIndustries).length > 0;
    }
  };

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === STEPS.length - 1;

  const goNext = () => { if (!isLastStep) setCurrentStep(STEPS[currentIndex + 1].key); };
  const goBack = () => { if (!isFirstStep) setCurrentStep(STEPS[currentIndex - 1].key); };

  const validateCurrentStep = (): string | null => {
    if (currentStep === "contact" && !phone.trim()) {
      return "Please enter your phone number.";
    }
    if (currentStep === "inbox") {
      if (!jobProvider) return "Pick an email provider first.";
      if (!jobEmail.trim()) return "Please enter your inbox email.";
      if (provider && !jobEmail.endsWith(provider.domain))
        return `That doesn't look like a ${provider.name} address (${provider.domain}).`;
      if (!jobPassword.trim()) return "Please enter the inbox password.";
    }
    if (currentStep === "cv") {
      if (!cvLink.trim()) return "Please add a link to your CV.";
      if (!/^https?:\/\//i.test(cvLink.trim()))
        return "The link must start with http:// or https://.";
    }
    if (currentStep === "preferences" && roles.length === 0) {
      return "Add at least one role so we know what to look for.";
    }
    return null;
  };

  const saveCurrentStep = async () => {
    const error = validateCurrentStep();
    if (error) { toast.error(error); return false; }

    setIsSaving(true);
    const token = await localforage.getItem("authToken");
    if (!token) { setIsSaving(false); return false; }

    const updates: Record<string, unknown> = {};
    if (currentStep === "contact") updates.phonenumber = phone;
    if (currentStep === "inbox") {
      updates.jobEmail = jobEmail;
      updates.jobProvider = jobProvider;
      updates.jobPassword = jobPassword;
    }
    if (currentStep === "cv") updates.cv = cvLink;
    if (currentStep === "preferences") {
      updates.preferredIndustries = industries;
      updates.preferredRoles = roles;
      updates.preferredLocations = locations;
    }

    try {
      await axios.patch(USER_UPDATE_ENDPOINT, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchUserData();
      toast.success("Saved");
      return true;
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to save.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    const ok = await saveCurrentStep();
    if (!ok) return;
    if (isLastStep) {
      toast.success("Setup complete");
      navigate("/profile?updated=true", { replace: true });
    } else {
      goNext();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#4eaa3c] rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-4">Loading setup…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-2 py-4">
      <Toaster position="top-center" />

      {/* Header */}
      <section className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition shrink-0"
          aria-label="Back to profile"
        >
          <FaArrowLeft className="text-sm" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#17231a] tracking-tight">
            Finish your profile
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Step {currentIndex + 1} of {STEPS.length}
          </p>
        </div>
      </section>

      {/* Horizontal stepper */}
      <section className="mb-6">
        <div className="flex items-center gap-1.5">
          {STEPS.map((step, idx) => {
            const done = isStepComplete(step.key, userData);
            const current = currentStep === step.key;
            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    current
                      ? "bg-[#17231a] text-white"
                      : done
                      ? "bg-emerald-50 text-[#347c28]"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {done && !current ? (
                    <FaCheck className="text-[9px]" />
                  ) : (
                    <span className="text-[10px]">{idx + 1}</span>
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="h-px flex-1 bg-gray-200" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* Step body */}
      <section className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-7 shadow-sm">

        {currentStep === "contact" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#17231a]">
                Your phone number
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Recruiters call this number for interviews. Use one you check regularly.
              </p>
            </div>
            <Field
              label="Phone number"
              icon={<FaPhone className="text-xs" />}
              hint="Include your country code if you're outside the UK."
            >
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 7700 900000"
                className={baseInputClasses}
              />
            </Field>
          </div>
        )}

        {currentStep === "inbox" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#17231a]">
                Set up your job inbox
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                A dedicated email we use to apply on your behalf. Keep it separate from your personal inbox.
              </p>
            </div>

            <Note variant="warn">
              Create a <strong>new</strong> account and <strong>turn off 2FA</strong> — otherwise we can't log in.
            </Note>

            {/* Provider grid */}
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Provider
              </label>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MAIL_PROVIDERS.map(({ id, name, Icon }) => {
                  const active = jobProvider === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setJobProvider(id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                        active
                          ? "border-[#4eaa3c] bg-emerald-50 text-[#347c28] ring-2 ring-emerald-100"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="text-sm shrink-0" />
                      <span className="truncate">{name}</span>
                      {active && <FaCheck className="ml-auto text-[9px] text-[#4eaa3c]" />}
                    </button>
                  );
                })}
              </div>
              {jobProvider && (
                <a
                  href={provider?.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#4eaa3c] hover:underline"
                >
                  Don't have a {provider?.name} account yet? Create one
                  <FaExternalLinkAlt className="text-[8px]" />
                </a>
              )}
            </div>

            {jobProvider && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Email address"
                  icon={<FaEnvelope className="text-xs" />}
                  hint={`Must end in ${provider?.domain}`}
                >
                  <input
                    type="email"
                    value={jobEmail}
                    onChange={(e) => setJobEmail(e.target.value)}
                    placeholder={`yourname${provider?.domain}`}
                    className={baseInputClasses}
                  />
                </Field>
                <Field
                  label="Password"
                  icon={<FaLock className="text-xs" />}
                  hint="Stored encrypted. Used only for this inbox."
                >
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={jobPassword}
                      onChange={(e) => setJobPassword(e.target.value)}
                      placeholder="Account password"
                      className={`${baseInputClasses} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                    </button>
                  </div>
                </Field>
              </div>
            )}
          </div>
        )}

        {currentStep === "cv" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#17231a]">
                Link your CV
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                We attach this to every application. Host it on Drive, Dropbox, or similar.
              </p>
            </div>

            <Note variant="warn">
              Set sharing to <strong>"Anyone with the link can view"</strong> — otherwise recruiters can't open it.
            </Note>

            <Field
              label="CV link"
              icon={<FaLink className="text-xs" />}
              hint="Must start with https://"
            >
              <input
                type="url"
                value={cvLink}
                onChange={(e) => setCvLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/…/view"
                className={baseInputClasses}
              />
            </Field>

            {cvLink && /^https?:\/\//i.test(cvLink) && (
              <a
                href={cvLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#347c28] hover:underline"
              >
                Open link <FaExternalLinkAlt className="text-[9px]" />
              </a>
            )}
          </div>
        )}

        {currentStep === "preferences" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#17231a]">
                What kind of work do you want?
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Add as many as you like — formal and informal roles both welcome.
              </p>
            </div>

            <ChipInput
              label="Roles"
              icon={<FaBriefcase className="text-xs" />}
              values={roles}
              onChange={setRoles}
              suggestions={[...FORMAL_ROLES, ...INFORMAL_ROLES]}
              placeholder="Type or pick a role…"
            />
            <ChipInput
              label="Industries"
              icon={<FaBuilding className="text-xs" />}
              values={industries}
              onChange={setIndustries}
              suggestions={INDUSTRIES}
              placeholder="Type or pick an industry…"
            />
            <ChipInput
              label="Locations"
              icon={<FaMapMarkerAlt className="text-xs" />}
              values={locations}
              onChange={setLocations}
              suggestions={ALL_CITIES}
              placeholder="Type or pick a city…"
            />
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-gray-100">
          <button
            onClick={isFirstStep ? () => navigate("/profile") : goBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <FaArrowLeft className="text-xs" />
            {isFirstStep ? "Cancel" : "Back"}
          </button>

          <button
            onClick={handleContinue}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4eaa3c] hover:bg-[#60bb4d] text-white px-6 py-2.5 text-sm font-bold shadow-md shadow-green-900/15 transition disabled:opacity-50"
          >
            {isSaving ? "Saving…" : isLastStep ? "Finish" : "Continue"}
            {!isSaving && <FaArrowRight className="text-xs" />}
          </button>
        </div>
      </section>

      {/* Skip link — only for non-essential steps */}
      {currentStep !== "preferences" && (
        <button
          onClick={isLastStep ? handleContinue : goNext}
          className="mt-4 w-full text-center text-xs font-semibold text-gray-400 hover:text-gray-600 transition"
        >
          {isLastStep ? "Skip and finish" : "Skip for now"}
        </button>
      )}
    </div>
  );
};

export default ProfileSetup;