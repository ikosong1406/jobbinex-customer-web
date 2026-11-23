import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";
import {
  FaArrowRight,
  FaBriefcase,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaExternalLinkAlt,
  FaFilter,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaRedo,
  FaSearch,
  FaTimes,
  FaFileAlt,
  FaRegCalendarCheck,
  FaChartLine,
} from "react-icons/fa";
import { FiArrowUpRight } from "react-icons/fi";
import Api from "../components/Api";

const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const JOB_UPDATE_ENDPOINT = `${Api}/customer/update`;

const USER_FACING_STATUSES = [
  "Applied",
  "Interviewing",
  "Offer Received",
  "Rejected",
  "Hired",
  "Archived",
] as const;

type JobStatus = (typeof USER_FACING_STATUSES)[number] | "Pending";

const JOB_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  onsite: "On-site",
  hybrid: "Hybrid",
  contract: "Contract",
  internship: "Internship",
};

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  Applied: "bg-blue-50 text-blue-700 border-blue-100",
  Interviewing: "bg-violet-50 text-violet-700 border-violet-100",
  "Offer Received": "bg-emerald-50 text-emerald-700 border-emerald-100",
  Rejected: "bg-rose-50 text-rose-700 border-rose-100",
  Hired: "bg-green-50 text-green-700 border-green-100",
  Archived: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  Pending: "Preparing application",
};

interface SalaryRange {
  min: number;
  max: number;
  currency?: string;
}

interface InterviewDate {
  type?: string;
  date?: string;
  notes?: string;
}

interface Job {
  _id: string;
  title?: string;
  company?: string;
  location?: string;
  jobType?: string;
  jobSource?: string;
  status: JobStatus;
  salaryRange?: SalaryRange;
  appliedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  requiredSkills?: string[];
  description?: string;
  coverLetter?: string;
  notes?: string;
  interviewDates?: InterviewDate[];
  jobUrl?: string;
  resumeLink?: string;
}

interface Filters {
  week: string;
  status: string;
}

const formatSalary = (salary?: SalaryRange): string => {
  if (!salary || salary.min == null || salary.max == null) {
    return "Salary not specified";
  }
  return `${salary.currency || ""} ${Number(salary.min).toLocaleString()} – ${Number(
    salary.max,
  ).toLocaleString()}`;
};

const formatDate = (date?: string): string => {
  if (!date) return "Not available";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDisplayStatus = (status: JobStatus): string =>
  STATUS_LABELS[status] || status || "Unknown";

const StatusBadge = ({ status }: { status: JobStatus }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
      STATUS_STYLES[status] || STATUS_STYLES.Archived
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        status === "Pending"
          ? "bg-amber-500 animate-pulse"
          : status === "Applied"
            ? "bg-blue-500"
            : status === "Interviewing"
              ? "bg-violet-500"
              : status === "Offer Received" || status === "Hired"
                ? "bg-emerald-500"
                : status === "Rejected"
                  ? "bg-rose-500"
                  : "bg-gray-400"
      }`}
    />
    {getDisplayStatus(status)}
  </span>
);

// --------------------------------------------------
// Section header — matches Dashboard/Profile
// --------------------------------------------------

const SectionHeader = ({
  title,
  description,
}: {
  title: string;
  description?: string;
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

// --------------------------------------------------
// Job Details Modal
// --------------------------------------------------

interface JobDetailsModalProps {
  job: Job;
  onClose: () => void;
  onUpdateStatus: (jobId: string, newStatus: string) => Promise<boolean>;
}

const JobDetailsModal = ({
  job,
  onClose,
  onUpdateStatus,
}: JobDetailsModalProps) => {
  const [newStatus, setNewStatus] = useState<string>(job.status || "Applied");
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    if (newStatus === job.status) return;
    setUpdating(true);
    const success = await onUpdateStatus(job._id, newStatus);
    setUpdating(false);
    if (success) onClose();
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10251a]/65 p-3 backdrop-blur-sm sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        >
          {/* Modal header — clean, no heavy green slab */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={job.status} />
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {JOB_TYPE_LABELS[job.jobType || ""] || job.jobType || "Job"}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold tracking-tight text-[#17231a] sm:text-xl">
                {job.title}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <FaBuilding className="text-xs text-gray-400" />
                  {job.company || "Company not specified"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-xs text-gray-400" />
                  {job.location || "Location not specified"}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
              aria-label="Close job details"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-7">
            {/* Quick facts */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoTile
                icon={<FaMoneyBillWave />}
                label="Salary range"
                value={formatSalary(job.salaryRange)}
              />
              <InfoTile
                icon={<FaCalendarAlt />}
                label="Date applied"
                value={formatDate(job.appliedDate)}
              />
              <InfoTile
                icon={<FaClock />}
                label="Last activity"
                value={formatDate(job.updatedAt)}
              />
            </div>

            {/* Progress / status update */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4eaa3c] shadow-sm">
                    <FaCheckCircle />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#4eaa3c]">
                      Application progress
                    </p>
                    <h3 className="mt-1 text-base font-bold text-[#17231a]">
                      {getDisplayStatus(job.status)}
                    </h3>
                    <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
                      We handle the paperwork. Update the status if something
                      has moved on your side.
                    </p>
                  </div>
                </div>

                <div className="w-full sm:max-w-[210px]">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Update status
                  </label>
                  <div className="relative">
                    <select
                      value={newStatus}
                      onChange={(event) => setNewStatus(event.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-gray-700 outline-none transition focus:border-[#4eaa3c] focus:ring-4 focus:ring-green-50"
                    >
                      {USER_FACING_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {getDisplayStatus(status)}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpdate}
                disabled={updating || newStatus === job.status}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#4eaa3c] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-900/15 transition hover:bg-[#3f9330] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {updating ? "Saving…" : "Save status"}
                <FaArrowRight className="text-xs" />
              </button>
            </div>

            {/* Detail sections */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailSection title="Opportunity details">
                <DetailRow label="Company" value={job.company} />
                <DetailRow label="Location" value={job.location} />
                <DetailRow
                  label="Job type"
                  value={JOB_TYPE_LABELS[job.jobType || ""] || job.jobType}
                />
                <DetailRow label="Source" value={job.jobSource} />
                <DetailRow
                  label="Salary"
                  value={formatSalary(job.salaryRange)}
                />
              </DetailSection>

              <DetailSection title="Application timeline">
                <DetailRow
                  label="Applied"
                  value={formatDate(job.appliedDate)}
                />
                <DetailRow label="Created" value={formatDate(job.createdAt)} />
                <DetailRow
                  label="Last activity"
                  value={formatDate(job.updatedAt)}
                />
              </DetailSection>
            </div>

            {/* Skills */}
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="mb-3 text-sm font-bold text-gray-800">
                  Required skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                <FaFileAlt className="text-[#4eaa3c]" />
                Role description
              </h3>
              <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                {job.description || "No description provided."}
              </p>
            </div>

            {/* Cover letter / notes */}
            {(job.coverLetter || job.notes) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {job.coverLetter && (
                  <DetailSection title="Cover letter">
                    <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
                      {job.coverLetter}
                    </p>
                  </DetailSection>
                )}
                {job.notes && (
                  <DetailSection title="Notes">
                    <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
                      {job.notes}
                    </p>
                  </DetailSection>
                )}
              </div>
            )}

            {/* Interviews */}
            {job.interviewDates && job.interviewDates.length > 0 && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-violet-900">
                  <FaRegCalendarCheck />
                  Interview schedule
                </h3>
                <div className="space-y-3">
                  {job.interviewDates.map((interview, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-violet-100 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                          {interview.type || "Interview"}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          {interview.date
                            ? new Date(interview.date).toLocaleString()
                            : "Date not set"}
                        </span>
                      </div>
                      {interview.notes && (
                        <p className="mt-3 text-sm leading-6 text-gray-600">
                          {interview.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(job.jobUrl || job.resumeLink) && (
              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                {job.jobUrl && (
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#17231a] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#263d2a]"
                  >
                    Original job posting
                    <FaExternalLinkAlt className="text-[10px]" />
                  </a>
                )}
                {job.resumeLink && (
                  <a
                    href={job.resumeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                  >
                    Resume used
                    <FaExternalLinkAlt className="text-[10px]" />
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const InfoTile = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm text-[#4eaa3c]">
      {icon}
    </div>
    <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-bold text-gray-800">
      {value || "Not available"}
    </p>
  </div>
);

const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-gray-100 bg-white p-5">
    <h3 className="mb-4 text-sm font-bold text-gray-800">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="shrink-0 text-gray-400">{label}</span>
    <span className="text-right font-semibold text-gray-700">
      {value || "Not specified"}
    </span>
  </div>
);

// --------------------------------------------------
// Job Card — flatter, matches Dashboard/Profile cards
// --------------------------------------------------

const JobCard = ({ job, onView }: { job: Job; onView: (job: Job) => void }) => (
  <motion.article
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:p-6"
  >
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-[#4eaa3c]">
          {(job.company || "J").charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[#17231a] transition group-hover:text-[#4eaa3c] sm:text-lg">
                {job.title || "Untitled position"}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <FaBuilding className="text-xs text-gray-400" />
                {job.company || "Company not specified"}
              </p>
            </div>
            <StatusBadge status={job.status} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-3 border-y border-gray-100 py-4">
        <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <FaMapMarkerAlt className="text-[#4eaa3c]" />
          {job.location || "Location not specified"}
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <FaBriefcase className="text-[#4eaa3c]" />
          {JOB_TYPE_LABELS[job.jobType || ""] || job.jobType || "Job"}
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <FaClock className="text-[#4eaa3c]" />
          {job.updatedAt
            ? `Updated ${formatDate(job.updatedAt)}`
            : job.appliedDate
              ? `Applied ${formatDate(job.appliedDate)}`
              : "Awaiting first update"}
        </span>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Salary range
          </p>
          <p className="mt-1 text-sm font-bold text-[#4eaa3c]">
            {formatSalary(job.salaryRange)}
          </p>
        </div>

        <button
          onClick={() => onView(job)}
          className="group/button inline-flex items-center justify-center gap-2 rounded-xl bg-[#17231a] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#263d2a]"
        >
          View details
          <FiArrowUpRight
            size={14}
            className="transition-transform group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5"
          />
        </button>
      </div>
    </div>
  </motion.article>
);

// --------------------------------------------------
// Main Jobs Page
// --------------------------------------------------

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState<Filters>({
    week: "All",
    status: "All",
  });

  const fetchJobsData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await localforage.getItem<string>("authToken");
      if (!token) {
        setError("Your session has expired. Please log in again.");
        return;
      }
      const response = await axios.get(USER_DATA_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobs(response.data.jobs || []);
    } catch (err) {
      console.error("Job data fetch failed:", err);
      if (axios.isAxiosError(err) && [401, 403].includes(err.response?.status || 0)) {
        await localforage.removeItem("authToken");
        setError("Your session has expired. Please log in again.");
      } else {
        setError("We couldn't load your applications. Please try again.");
        toast.error("Failed to load applications.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobsData();
  }, [fetchJobsData]);

  const handleUpdateStatus = async (
    jobId: string,
    newStatus: string,
  ): Promise<boolean> => {
    try {
      const token = await localforage.getItem<string>("authToken");
      if (!token) {
        toast.error("Your session has expired. Please log in again.");
        return false;
      }
      await axios.put(
        `${JOB_UPDATE_ENDPOINT}/${jobId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Status updated.");
      await fetchJobsData();
      return true;
    } catch (err) {
      console.error(
        "Status update failed:",
        axios.isAxiosError(err) ? err.response?.data : err,
      );
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : undefined;
      toast.error(message || "Failed to update status.");
      return false;
    }
  };

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((job) =>
        [job.title, job.company, job.location, job.jobSource]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      );
    }

    if (filters.status !== "All") {
      result = result.filter((job) => job.status === filters.status);
    }

    if (filters.week !== "All") {
      const now = new Date();
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - now.getDay());
      startOfThisWeek.setHours(0, 0, 0, 0);
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

      result = result.filter((job) => {
        if (!job.appliedDate) return false;
        const appliedDate = new Date(job.appliedDate);
        if (filters.week === "This Week") {
          return appliedDate >= startOfThisWeek && appliedDate <= now;
        }
        return appliedDate >= startOfLastWeek && appliedDate < startOfThisWeek;
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime(),
    );
  }, [jobs, search, filters]);

  const stats = useMemo(
    () => ({
      total: jobs.length,
      submitted: jobs.filter((job) =>
        [
          "Applied",
          "Interviewing",
          "Offer Received",
          "Rejected",
          "Hired",
        ].includes(job.status),
      ).length,
      interviews: jobs.filter((job) => job.status === "Interviewing").length,
      offers: jobs.filter((job) => job.status === "Offer Received").length,
    }),
    [jobs],
  );

  const resetFilters = () => {
    setSearch("");
    setFilters({ week: "All", status: "All" });
  };

  const hasActiveFilters =
    search || filters.week !== "All" || filters.status !== "All";

  if (loading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-2xl bg-gray-200" />
          <div className="h-16 rounded-2xl bg-gray-200" />
          <div className="h-16 rounded-2xl bg-gray-200" />
          <div className="h-40 rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-5">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
          <FaBriefcase />
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900">
          We couldn't load your dashboard
        </h2>
        <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
          {error}
        </p>
        <button
          onClick={fetchJobsData}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#17231a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263d2a]"
        >
          <FaRedo className="text-xs" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 px-2 sm:px-4 py-6">
      {/* ── Header — matches Dashboard/Profile identity row ── */}
      <section className="flex flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17231a] tracking-tight">
            Your job pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            We apply on your behalf. You track the progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobsData}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <FaRedo className="text-[11px]" />
            Refresh
          </button>
        </div>
      </section>

      {/* ── Stats row — compact, matches dashboard stat aesthetic ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label="Opportunities"
          value={stats.total}
          icon={<FaBriefcase />}
        />
        <StatTile
          label="Applications sent"
          value={stats.submitted}
          icon={<FaChartLine />}
        />
        <StatTile
          label="Interviews"
          value={stats.interviews}
          icon={<FaCalendarAlt />}
        />
        <StatTile
          label="Offers"
          value={stats.offers}
          icon={<FaCheckCircle />}
        />
      </section>

      {/* ── Search & filters ── */}
      <section>
        <SectionHeader
          title="Opportunities"
          description={`${filteredJobs.length} ${
            filteredJobs.length === 1 ? "opportunity" : "opportunities"
          } in view`}
        />

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, company, or location…"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#4eaa3c] focus:ring-4 focus:ring-green-50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <FaFilter className="text-[#4eaa3c] text-[11px]" />
              </span>

              <FilterSelect
                value={filters.status}
                onChange={(value) =>
                  setFilters((previous) => ({ ...previous, status: value }))
                }
                options={[
                  { value: "All", label: "All statuses" },
                  ...USER_FACING_STATUSES.map((status) => ({
                    value: status,
                    label: getDisplayStatus(status),
                  })),
                ]}
              />

              <FilterSelect
                value={filters.week}
                onChange={(value) =>
                  setFilters((previous) => ({ ...previous, week: value }))
                }
                options={[
                  { value: "All", label: "Any date" },
                  { value: "This Week", label: "This week" },
                  { value: "Last Week", label: "Last week" },
                ]}
              />

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                >
                  <FaTimes className="text-[10px]" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Job list ── */}
      <section>
        {filteredJobs.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredJobs.map((job) => (
                <JobCard key={job._id} job={job} onView={setSelectedJob} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-[#4eaa3c]">
              <FaBriefcase />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#17231a]">
              {jobs.length === 0
                ? "Your pipeline is being built"
                : "No matching opportunities"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-400">
              {jobs.length === 0
                ? "Our team is preparing opportunities for you. They'll appear here as soon as they're in motion."
                : "Try adjusting your search or filters to see more of your pipeline."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#17231a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263d2a]"
              >
                Clear filters
                <FaArrowRight className="text-xs" />
              </button>
            )}
          </div>
        )}
      </section>

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
};

// --------------------------------------------------
// Reusable UI
// --------------------------------------------------

const StatTile = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm text-[#4eaa3c]">
        {icon}
      </div>
    </div>
    <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[#17231a]">
      {value}
    </p>
    <p className="mt-0.5 text-[11px] font-semibold text-gray-400">{label}</p>
  </div>
);

const FilterSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-[130px] appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-600 outline-none transition hover:border-emerald-200 focus:border-[#4eaa3c] focus:ring-4 focus:ring-green-50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400" />
  </div>
);

export default Jobs;