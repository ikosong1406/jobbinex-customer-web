import React, { useState } from "react";
import { motion } from "framer-motion";

interface Job {
  id: number;
  title: string;
  company: string;
  dateApplied: string;
  status: "Applied" | "Interview" | "Rejected" | "Shortlisted";
  description: string;
  coverLetter: string;
}

const Jobs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"applications" | "shortlisted">(
    "applications"
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 1,
      title: "Frontend Developer",
      company: "Amazon",
      dateApplied: "Nov 2, 2025",
      status: "Interview",
      description:
        "As a Frontend Developer, you'll build scalable interfaces using React and Tailwind. Collaborate with design and backend teams.",
      coverLetter:
        "I am excited to apply for the Frontend Developer role at Amazon. My experience with React and clean UI design aligns well with your requirements...",
    },
    {
      id: 2,
      title: "UI/UX Designer",
      company: "Paystack",
      dateApplied: "Nov 4, 2025",
      status: "Applied",
      description:
        "Work with product teams to create seamless user experiences across Paystack products.",
      coverLetter:
        "Dear Hiring Manager, I am passionate about creating user-centric designs and would love to contribute my skills at Paystack...",
    },
    {
      id: 3,
      title: "Backend Engineer",
      company: "Flutterwave",
      dateApplied: "Nov 6, 2025",
      status: "Rejected",
      description:
        "Maintain and optimize APIs powering Flutterwave’s global payments infrastructure.",
      coverLetter:
        "With a background in Node.js and scalable backend systems, I’m confident I can help Flutterwave maintain its high uptime standards...",
    },
  ]);

  const [shortlistedJobs, setShortlistedJobs] = useState<Job[]>([
    {
      id: 101,
      title: "Product Manager",
      company: "Moniepoint",
      dateApplied: "Pending",
      status: "Shortlisted",
      description:
        "Oversee product strategy, user experience, and lifecycle management at Moniepoint.",
      coverLetter:
        "My experience managing SaaS product lifecycles and cross-functional teams makes me an ideal candidate for this PM role...",
    },
    {
      id: 102,
      title: "Data Analyst",
      company: "Kuda Bank",
      dateApplied: "Pending",
      status: "Shortlisted",
      description:
        "Analyze and visualize financial data trends to improve Kuda’s product insights.",
      coverLetter:
        "I enjoy transforming data into actionable insights, and Kuda’s mission aligns with my analytical background...",
    },
  ]);

  const [filters, setFilters] = useState({
    week: "All",
    company: "All",
    status: "All",
  });

  const handleApprove = (job: Job) => {
    setShortlistedJobs((prev) => prev.filter((j) => j.id !== job.id));
    setJobs((prev) => [
      ...prev,
      { ...job, status: "Applied", dateApplied: "Nov 7, 2025" },
    ]);
  };

  const handleReject = (jobId: number) => {
    setShortlistedJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const handleMarkResponded = (jobId: number) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: "Interview" } : j))
    );
  };

  const filteredJobs = jobs.filter((job) => {
    return (
      (filters.company === "All" || job.company === filters.company) &&
      (filters.status === "All" || job.status === filters.status)
    );
  });

  const uniqueCompanies = Array.from(new Set(jobs.map((j) => j.company)));

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6 max-w-7xl mx-auto">
      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        {[
          { key: "applications", label: "Applications" },
          { key: "shortlisted", label: "Shortlisted" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() =>
              setActiveTab(tab.key as "applications" | "shortlisted")
            }
            className={`pb-2 px-2 font-medium ${
              activeTab === tab.key
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab === "applications" && (
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filters.week}
            onChange={(e) => setFilters({ ...filters, week: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>This Week</option>
            <option>Last Week</option>
          </select>
          <select
            value={filters.company}
            onChange={(e) =>
              setFilters({ ...filters, company: e.target.value })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option>All</option>
            {uniqueCompanies.map((company) => (
              <option key={company}>{company}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>Applied</option>
            <option>Interview</option>
            <option>Rejected</option>
          </select>
        </div>
      )}

      {/* Applications Table or Cards */}
      {activeTab === "applications" && (
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
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {job.title}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{job.company}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {job.dateApplied}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          job.status === "Applied"
                            ? "bg-blue-100 text-blue-600"
                            : job.status === "Interview"
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-[var(--color-primary)] text-sm font-medium mr-3"
                      >
                        View Details
                      </button>
                      {job.status === "Applied" && (
                        <button
                          onClick={() => handleMarkResponded(job.id)}
                          className="text-green-600 text-sm font-medium"
                        >
                          Mark as Responded
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl shadow border border-gray-100 p-4"
              >
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <p className="text-sm text-gray-600 mb-1">{job.company}</p>
                <p className="text-xs text-gray-400 mb-2">
                  Applied on {job.dateApplied}
                </p>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    job.status === "Applied"
                      ? "bg-blue-100 text-blue-600"
                      : job.status === "Interview"
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {job.status}
                </span>
                <div className="mt-3 flex justify-between text-sm">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-[var(--color-primary)] font-medium"
                  >
                    View Details
                  </button>
                  {job.status === "Applied" && (
                    <button
                      onClick={() => handleMarkResponded(job.id)}
                      className="text-green-600 font-medium"
                    >
                      Mark as Responded
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Shortlisted Jobs */}
      {activeTab === "shortlisted" && (
        <div className="space-y-4">
          {shortlistedJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              No shortlisted jobs at the moment.
            </p>
          ) : (
            shortlistedJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow border border-gray-100 p-5"
              >
                <h3 className="font-semibold text-gray-900 text-lg">
                  {job.title}
                </h3>
                <p className="text-gray-600">{job.company}</p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => handleApprove(job)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleReject(job.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    ❌ Reject
                  </button>
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-[var(--color-primary)] text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg relative">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {selectedJob.title}
            </h2>
            <p className="text-sm text-gray-600 mb-2">{selectedJob.company}</p>
            <p className="text-gray-700 text-sm mb-4">
              {selectedJob.description}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                Cover Letter
              </p>
              <p className="text-sm text-gray-600">{selectedJob.coverLetter}</p>
            </div>
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
