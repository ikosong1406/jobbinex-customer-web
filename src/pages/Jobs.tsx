import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";
import Api from "../components/Api";

// --- Type Definitions ---

type JobStatus =
  | "Pending"
  | "Applied"
  | "Interviewing"
  | "Offer Received"
  | "Rejected"
  | "Hired"
  | "Archived";

type JobType = "remote" | "onsite" | "hybrid" | "contract" | "internship";

interface SalaryRange {
  min: number;
  max: number;
  currency: string;
}

interface InterviewDate {
  date: string;
  type: string;
  notes: string;
}

interface JobData {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  jobUrl: string;
  jobSource: string;
  jobType: JobType;
  salaryRange: SalaryRange;
  requiredSkills: string[];
  appliedDate: string | null;
  status: JobStatus;
  interviewDates: InterviewDate[];
  coverLetter: string | null;
  resumeLink: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  jobs: JobData[];
  assistant?: {
    _id: string;
    firstname: string;
    lastname: string;
    status: string;
  };
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

const JOB_TYPE_LABELS: Record<JobType, string> = {
  remote: "Remote",
  onsite: "On-site",
  hybrid: "Hybrid",
  contract: "Contract",
  internship: "Internship",
};

const USER_DATA_ENDPOINT = `${Api}/customer/userdata`;
const JOB_UPDATE_ENDPOINT = `${Api}/customer/update`;
const PRIMARY_COLOR = "var(--color-primary)";

// --- Components ---

interface JobDetailsModalProps {
  job: JobData;
  onClose: () => void;
  onUpdateStatus: (jobId: string, newStatus: JobStatus) => Promise<void>;
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

  const formatSalary = (salary: SalaryRange) => {
    return `${
      salary.currency
    } ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-lg relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {job.title} at {job.company}
        </h2>

        {/* Job Meta Information */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {JOB_TYPE_LABELS[job.jobType] || job.jobType}
          </div>
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            {formatSalary(job.salaryRange)}
          </div>
          <div className="bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
            📍 {job.location}
          </div>
        </div>

        <section className="space-y-6 mb-6">
          {/* Status Update Section */}
          <div className="flex items-center space-x-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <label className="text-sm font-medium text-blue-700">
              Update Status:
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as JobStatus)}
              className="border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white flex-1"
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
              className="text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:bg-gray-400 transition whitespace-nowrap"
            >
              {isUpdating ? "Updating..." : "Save Status"}
            </button>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-2">
                Job Information
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium text-gray-600">Company:</span>{" "}
                  {job.company}
                </p>
                <p>
                  <span className="font-medium text-gray-600">Location:</span>{" "}
                  {job.location}
                </p>
                <p>
                  <span className="font-medium text-gray-600">Job Type:</span>{" "}
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-gray-600">
                    Salary Range:
                  </span>{" "}
                  <span className="text-green-600 font-medium">
                    {formatSalary(job.salaryRange)}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-gray-600">Source:</span>{" "}
                  {job.jobSource}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-2">
                Application Details
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium text-gray-600">
                    Applied Date:
                  </span>{" "}
                  {job.appliedDate
                    ? formatDate(job.appliedDate)
                    : "Not Applied"}
                </p>
                <p>
                  <span className="font-medium text-gray-600">
                    Current Status:
                  </span>{" "}
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      job.status === "Applied"
                        ? "bg-blue-100 text-blue-700"
                        : job.status === "Interviewing"
                        ? "bg-yellow-100 text-yellow-700"
                        : job.status === "Offer Received"
                        ? "bg-green-100 text-green-700"
                        : job.status === "Rejected"
                        ? "bg-red-100 text-red-700"
                        : job.status === "Hired"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {job.status}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-gray-600">Created:</span>{" "}
                  {formatDate(job.createdAt)}
                </p>
                <p>
                  <span className="font-medium text-gray-600">
                    Last Updated:
                  </span>{" "}
                  {formatDate(job.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Required Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-2">
                Required Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Job Description */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-3">
              Job Description
            </h3>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {job.description || "No description provided."}
            </p>
          </div>

          {/* Cover Letter & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.coverLetter && (
              <div className="bg-blue-50 p-4 rounded-xl">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Cover Letter
                </h3>
                <p className="text-blue-700 text-sm whitespace-pre-line">
                  {job.coverLetter}
                </p>
              </div>
            )}

            {job.notes && (
              <div className="bg-yellow-50 p-4 rounded-xl">
                <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
                <p className="text-yellow-700 text-sm whitespace-pre-line">
                  {job.notes}
                </p>
              </div>
            )}
          </div>

          {/* External Links */}
          <div className="flex flex-wrap gap-4">
            {job.jobUrl && (
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-700 font-medium"
              >
                🔗 View Original Job Posting
              </a>
            )}
            {job.resumeLink && (
              <a
                href={job.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-500 hover:text-green-700 font-medium"
              >
                📄 View Resume Used
              </a>
            )}
          </div>

          {/* Interview Dates */}
          {job.interviewDates && job.interviewDates.length > 0 && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <h3 className="font-semibold text-purple-800 mb-3">
                Interview Schedule
              </h3>
              <div className="space-y-3">
                {job.interviewDates.map((interview, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded-lg border border-purple-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded text-sm">
                        {interview.type}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(interview.date).toLocaleString()}
                      </span>
                    </div>
                    {interview.notes && (
                      <p className="text-sm text-gray-700 mt-2">
                        📝 {interview.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
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
    jobType: "All",
  });

  // --- Data Fetching ---
  const fetchJobsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await localforage.getItem("authToken");

      if (!token) {
        setError("User not authenticated.");
        return;
      }

      const response = await axios.get<UserData>(USER_DATA_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  // --- Job Update Handler ---
  const handleUpdateStatus = async (
    jobId: string,
    newStatus: JobStatus
  ): Promise<void> => {
    try {
      const token = await localforage.getItem("authToken");
      if (!token) {
        toast.error("Session expired. Please log in.");
        return;
      }

      const updateData: any = { status: newStatus };
      if (newStatus === "Applied" && activeTab === "shortlisted") {
        updateData.appliedDate = new Date().toISOString();
      }

      await axios.put(`${JOB_UPDATE_ENDPOINT}/${jobId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`Job status updated to ${newStatus} successfully!`);

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

  const uniqueJobTypes = useMemo(
    () => Array.from(new Set(applicationsJobs.map((j) => j.jobType))),
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

    // Job Type Filter
    if (filters.jobType !== "All") {
      filtered = filtered.filter((job) => job.jobType === filters.jobType);
    }

    // Week Filter
    if (filters.week !== "All") {
      const now = new Date();
      let startDate: Date;

      if (filters.week === "This Week") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
      } else if (filters.week === "Last Week") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() - 7);
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

      filtered = filtered.filter((job) => {
        if (!job.appliedDate) return false;
        const jobDate = new Date(job.appliedDate);
        return jobDate >= startDate;
      });
    }

    return filtered;
  }, [applicationsJobs, filters]);

  // --- Helper Functions for Shortlisted Actions ---
  const handleApprove = (job: JobData) => {
    handleUpdateStatus(job._id, "Applied");
  };

  const handleReject = (jobId: string) => {
    handleUpdateStatus(jobId, "Rejected");
  };

  // --- Helper Functions ---
  const getStatusBadge = (status: JobStatus) => {
    let colorClass = "bg-gray-100 text-gray-600";
    if (status === "Applied") colorClass = "bg-blue-100 text-blue-600";
    if (status === "Interviewing") colorClass = "bg-yellow-100 text-yellow-600";
    if (status === "Offer Received") colorClass = "bg-green-100 text-green-600";
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

  const formatSalary = (salary: SalaryRange) => {
    return `${
      salary.currency
    } ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}`;
  };

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
          <select
            value={filters.jobType}
            onChange={(e) =>
              setFilters({ ...filters, jobType: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All Job Types</option>
            {uniqueJobTypes.map((type) => (
              <option key={type} value={type}>
                {JOB_TYPE_LABELS[type] || type}
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
          formatSalary={formatSalary}
          setSelectedJob={setSelectedJob}
        />
      )}

      {/* Shortlisted View */}
      {activeTab === "shortlisted" && (
        <ShortlistedListView
          jobs={shortlistedJobs}
          handleApprove={handleApprove}
          handleReject={handleReject}
          formatSalary={formatSalary}
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

// --- Sub Components ---

const ApplicationListView: React.FC<{
  jobs: JobData[];
  getStatusBadge: (status: JobStatus) => React.ReactElement;
  formatSalary: (salary: SalaryRange) => string;
  setSelectedJob: (job: JobData) => void;
}> = ({ jobs, getStatusBadge, formatSalary, setSelectedJob }) => {
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
                    Location
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Salary
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
                  <tr key={job._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {job.title}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{job.company}</td>
                    <td className="px-4 py-3 text-gray-700">{job.location}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                        {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-green-600 font-medium">
                      {formatSalary(job.salaryRange)}
                    </td>
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
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {job.title}
                  </h3>
                  {getStatusBadge(job.status)}
                </div>
                <p className="text-sm text-gray-600 mb-1">{job.company}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                  </span>
                  <span className="text-xs text-gray-500">{job.location}</span>
                </div>
                <p className="text-green-600 font-medium text-sm mb-2">
                  {formatSalary(job.salaryRange)}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  Applied on{" "}
                  {job.appliedDate
                    ? new Date(job.appliedDate).toLocaleDateString()
                    : "N/A"}
                </p>
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
  formatSalary: (salary: SalaryRange) => string;
  setSelectedJob: (job: JobData) => void;
}> = ({ jobs, handleApprove, handleReject, formatSalary, setSelectedJob }) => {
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
            className="bg-white rounded-2xl shadow border border-gray-100 p-5"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-1">
                  {job.title}
                </h3>
                <p className="text-gray-600 mb-2">{job.company}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                  </span>
                  <span className="text-xs text-gray-500">{job.location}</span>
                  <span className="text-green-600 font-medium text-xs">
                    {formatSalary(job.salaryRange)}
                  </span>
                </div>
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.requiredSkills.slice(0, 3).map((skill, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.requiredSkills.length > 3 && (
                      <span className="text-gray-400 text-xs">
                        +{job.requiredSkills.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleApprove(job)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition whitespace-nowrap"
                >
                  ✅ Approve & Apply
                </button>
                <button
                  onClick={() => handleReject(job._id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition whitespace-nowrap"
                >
                  ❌ Reject
                </button>
                <button
                  onClick={() => setSelectedJob(job)}
                  className={`text-[${PRIMARY_COLOR}] text-sm font-medium border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition whitespace-nowrap`}
                >
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default Jobs;
