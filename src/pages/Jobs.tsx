import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";
import Api from "../components/Api"; // Assuming Api is the base URL for your API

// --- Type Definitions (Based on Job Schema from the previous context) ---

type JobStatus =
  | "Pending"
  | "Applied"
  | "Interviewing"
  | "Offer Received"
  | "Rejected"
  | "Hired"
  | "Archived";

// Interface for interview dates
interface InterviewDate {
  date: string;
  type: string; // "Screening" | "Technical" | "Behavioral" | "On-site"
  notes: string;
}

// Interface for a Job
interface JobData {
  _id: string; // The ID from MongoDB
  title: string;
  company: string;
  location: string;
  description: string;
  jobUrl: string;
  jobSource: string;
  appliedDate: string | null; // Date the job was applied (use for "dateApplied")
  status: JobStatus;
  interviewDates: InterviewDate[];
  coverLetter: string | null;
  resumeLink: string | null;
  notes: string | null;
  createdAt: string; // Job tracking creation date
  // Add other fields as necessary
}

// UserData interface needed to fetch jobs
interface UserData {
  jobs: JobData[];
}

// Status options for the dropdown update
const STATUS_OPTIONS: JobStatus[] = [
  "Pending",
  "Applied",
  "Interviewing",
  "Offer Received",
  "Rejected",
  "Hired",
  "Archived",
];

const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const JOB_UPDATE_ENDPOINT = `${Api}/customer/update`; // Hypothetical update endpoint
const PRIMARY_COLOR = "var(--color-primary)"; // Assuming this variable is defined globally or via CSS

// --- Components ---

interface JobDetailsModalProps {
  job: JobData;
  onClose: () => void;
  onUpdateStatus: (jobId: string, newStatus: JobStatus) => void;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  onClose,
  onUpdateStatus,
}) => {
  const [newStatus, setNewStatus] = useState<JobStatus>(job.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    await onUpdateStatus(job._id, newStatus);
    setIsUpdating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {job.title} at {job.company}
        </h2>
        <p className="text-sm text-gray-600 mb-4">{job.location}</p>

        <section className="space-y-4 mb-6">
          {/* Status Update Dropdown */}
          <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
            <label className="text-sm font-medium text-blue-700">
              Update Status:
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as JobStatus)}
              className="border border-blue-300 rounded-lg px-2 py-1 text-sm bg-white"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || newStatus === job.status}
              style={{ backgroundColor: PRIMARY_COLOR }}
              className="text-white px-3 py-1 rounded-lg text-sm font-semibold disabled:bg-gray-400 transition"
            >
              {isUpdating ? "Updating..." : "Save Status"}
            </button>
          </div>

          {/* Job Details */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">
              Description
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {job.description}
            </p>
          </div>

          {/* Cover Letter */}
          {(job.coverLetter || job.notes) && (
            <div className="bg-gray-50 p-3 rounded-xl">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                Cover Letter
              </p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {job.coverLetter || "N/A"}
              </p>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p>
              <span className="font-medium text-gray-600">Applied Date:</span>{" "}
              {job.appliedDate
                ? new Date(job.appliedDate).toLocaleDateString()
                : "N/A"}
            </p>
            <p>
              <span className="font-medium text-gray-600">Source:</span>{" "}
              {job.jobSource}
            </p>
            {job.jobUrl && (
              <p className="col-span-2">
                <span className="font-medium text-gray-600">Link:</span>{" "}
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View Job Posting
                </a>
              </p>
            )}
          </div>

          {/* Interview Dates */}
          {job.interviewDates && job.interviewDates.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-800 mt-2 mb-1">
                Interviews
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {job.interviewDates.map((interview, index) => (
                  <li key={index}>
                    **{interview.type}** on{" "}
                    {new Date(interview.date).toLocaleString()}
                    {interview.notes && ` - (${interview.notes})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-semibold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// --- Main Component ---

const Jobs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"applications" | "shortlisted">(
    "applications"
  );
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [filters, setFilters] = useState({
    week: "All",
    company: "All",
    status: "All",
  });

  // --- Data Fetching ---
  const fetchJobsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await localforage.getItem("authToken");

      if (!token) {
        // Handle unauthenticated state if necessary (e.g., redirect to login)
        setError("User not authenticated.");
        return;
      }

      const response = await axios.get<UserData>(USER_DATA_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Assuming the jobs array comes directly under the user data
      setJobs(response.data.jobs || []);
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error("Job data fetch failed:", axiosError);
      toast.error("Failed to load job data.");
      setError(
        "Could not load jobs. Please check your connection or log in again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsData();
  }, []);

  // --- Job Update Handler (Shortlisted/Applications) ---
  const handleUpdateStatus = async (
    jobId: string,
    newStatus: JobStatus,
    isShortlistedAction = false // true for Approve/Reject from Shortlisted tab
  ) => {
    try {
      const token = await localforage.getItem("authToken");
      if (!token) return toast.error("Session expired. Please log in.");

      // For Shortlisted "Approve", we set dateApplied and status
      const updateData: any = { status: newStatus };
      if (newStatus === "Applied" && isShortlistedAction) {
        updateData.appliedDate = new Date().toISOString();
      }

      await axios.put(
        `${JOB_UPDATE_ENDPOINT}/${jobId}`, // Use the job ID in the URL
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(
        `Job status for ${jobId} updated to ${newStatus} successfully!`
      );

      // Refresh the job list after a successful update
      fetchJobsData();
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error("Status update failed:", axiosError.response?.data);
      toast.error(
        `Failed to update status: ${
          (axiosError.response?.data as any)?.message || axiosError.message
        }`
      );
    }
  };

  // --- Memoized Job Lists for Tabs ---

  const applicationsJobs = useMemo(
    () => jobs.filter((job) => job.status !== "Pending"),
    [jobs]
  );

  const shortlistedJobs = useMemo(
    () => jobs.filter((job) => job.status === "Pending"),
    [jobs]
  );

  // --- Filtering Logic for Applications Tab ---

  const uniqueCompanies = useMemo(
    () => Array.from(new Set(applicationsJobs.map((j) => j.company))),
    [applicationsJobs]
  );

  const filteredApplications = useMemo(() => {
    let filtered = applicationsJobs;

    // Company Filter
    if (filters.company !== "All") {
      filtered = filtered.filter((job) => job.company === filters.company);
    }

    // Status Filter
    if (filters.status !== "All") {
      filtered = filtered.filter((job) => job.status === filters.status);
    }

    // Week Filter (Basic implementation based on `appliedDate`)
    if (filters.week !== "All") {
      const now = new Date();
      let startDate: Date;

      if (filters.week === "This Week") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of Sunday
        startDate.setHours(0, 0, 0, 0);
      } else if (filters.week === "Last Week") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() - 7); // Previous Sunday
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(0, 0, 0, 0);

        return filtered.filter((job) => {
          if (!job.appliedDate) return false;
          const jobDate = new Date(job.appliedDate);
          return jobDate >= startDate && jobDate < endDate;
        });
      }

      // Default filter for "This Week" and general date range (up to now)
      filtered = filtered.filter((job) => {
        if (!job.appliedDate) return false;
        const jobDate = new Date(job.appliedDate);
        return jobDate >= startDate;
      });
    }

    return filtered;
  }, [applicationsJobs, filters]);

  // --- Helper Functions for Shortlisted Actions (Mapping to UpdateStatus) ---

  const handleApprove = (job: JobData) => {
    // Approve means setting status to "Applied" and setting the appliedDate
    handleUpdateStatus(job._id, "Applied", true);
  };

  const handleReject = (jobId: string) => {
    // Reject means setting status to "Rejected" (or "Archived" if preferred, using Rejected here for simplicity)
    handleUpdateStatus(jobId, "Rejected");
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading job applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 text-red-700 p-6 rounded-lg">
        <p>Error: {error}</p>
      </div>
    );
  }

  // Helper for Status Badge styling
  const getStatusBadge = (status: JobStatus) => {
    let colorClass = "bg-gray-100 text-gray-600";
    if (status === "Applied") colorClass = "bg-blue-100 text-blue-600";
    if (status === "Interviewing" || status === "Offer Received")
      colorClass = "bg-green-100 text-green-600";
    if (status === "Rejected") colorClass = "bg-red-100 text-red-600";
    if (status === "Hired") colorClass = "bg-purple-100 text-purple-600";

    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full ${colorClass}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Job Tracker</h1>
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        {[
          { key: "applications", label: "Applications" },
          {
            key: "shortlisted",
            label: `Shortlisted (${shortlistedJobs.length})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() =>
              setActiveTab(tab.key as "applications" | "shortlisted")
            }
            className={`pb-2 px-2 font-medium transition duration-200 ${
              activeTab === tab.key
                ? `text-[${PRIMARY_COLOR}] border-b-2 border-[${PRIMARY_COLOR}]`
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab === "applications" && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <select
            value={filters.week}
            onChange={(e) => setFilters({ ...filters, week: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All Time</option>
            <option value="This Week">This Week</option>
            <option value="Last Week">Last Week</option>
          </select>
          <select
            value={filters.company}
            onChange={(e) =>
              setFilters({ ...filters, company: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All Companies</option>
            {uniqueCompanies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.filter((s) => s !== "Pending").map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Applications View */}
      {activeTab === "applications" && (
        <ApplicationListView
          jobs={filteredApplications}
          getStatusBadge={getStatusBadge}
          setSelectedJob={setSelectedJob}
          handleUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Shortlisted View */}
      {activeTab === "shortlisted" && (
        <ShortlistedListView
          jobs={shortlistedJobs}
          handleApprove={handleApprove}
          handleReject={handleReject}
          setSelectedJob={setSelectedJob}
        />
      )}

      {/* Job Details Modal */}
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

// --- Sub Components for Cleaner Rendering ---

const ApplicationListView: React.FC<{
  jobs: JobData[];
  getStatusBadge: (status: JobStatus) => JSX.Element;
  setSelectedJob: (job: JobData) => void;
  handleUpdateStatus: (jobId: string, newStatus: JobStatus) => Promise<void>;
}> = ({ jobs, getStatusBadge, setSelectedJob, handleUpdateStatus }) => {
  return (
    <>
      {jobs.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white rounded-xl shadow border border-gray-100">
          No matching applications found.
        </p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Job Title
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Date Applied
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job._id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {job.title}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{job.company}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {job.appliedDate
                        ? new Date(job.appliedDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className={`text-[${PRIMARY_COLOR}] text-sm font-medium hover:underline`}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="bg-white rounded-2xl shadow border border-gray-100 p-4"
              >
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <p className="text-sm text-gray-600 mb-1">{job.company}</p>
                <p className="text-xs text-gray-400 mb-2">
                  Applied on{" "}
                  {job.appliedDate
                    ? new Date(job.appliedDate).toLocaleDateString()
                    : "N/A"}
                </p>
                <div className="mb-3">{getStatusBadge(job.status)}</div>
                <div className="flex justify-between text-sm">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className={`text-[${PRIMARY_COLOR}] font-medium`}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

const ShortlistedListView: React.FC<{
  jobs: JobData[];
  handleApprove: (job: JobData) => void;
  handleReject: (jobId: string) => void;
  setSelectedJob: (job: JobData) => void;
}> = ({ jobs, handleApprove, handleReject, setSelectedJob }) => {
  return (
    <div className="space-y-4">
      {jobs.length === 0 ? (
        <p className="text-gray-500 text-center py-10 bg-white rounded-xl shadow border border-gray-100">
          No jobs are currently pending/shortlisted by the assistant.
        </p>
      ) : (
        jobs.map((job) => (
          <motion.div
            key={job._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow border border-gray-100 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center"
          >
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {job.title}
              </h3>
              <p className="text-gray-600 mb-2">{job.company}</p>
            </div>
            <div className="mt-3 sm:mt-0 flex gap-3 flex-wrap">
              <button
                onClick={() => handleApprove(job)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                ✅ Approve & Apply
              </button>
              <button
                onClick={() => handleReject(job._id)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                ❌ Reject
              </button>
              <button
                onClick={() => setSelectedJob(job)}
                className={`text-[${PRIMARY_COLOR}] text-sm font-medium border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition`}
              >
                View Details
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default Jobs;
