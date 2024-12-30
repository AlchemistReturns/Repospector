"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { format, subDays } from "date-fns";
import toast from "react-hot-toast";
import { generateInspectionPDF } from "../utils/generatePDF";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    dateRange: "all",
    reportType: "all",
    sortBy: "newest",
  });

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const url = userId
        ? `/api/inspections?userId=${userId}`
        : "/api/inspections";
      const response = await fetch(url);

      if (response.status === 403) {
        // If unauthorized, redirect to dashboard
        router.push("/dashboard");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch inspections");
      }

      const data = await response.json();
      setInspections(data);
      applyFilters(data, activeFilters);
    } catch (error) {
      console.error("Error fetching inspections:", error);
      toast.error("Failed to fetch inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchInspections();
    } else {
      fetchInspections();
    }
  }, [userId]);

  useEffect(() => {
    applyFilters(inspections, activeFilters);
  }, [activeFilters, inspections]);

  const applyFilters = (data, filters) => {
    let filtered = [...data];

    // Date Range Filter
    if (filters.dateRange !== "all") {
      const today = new Date();
      const days = {
        "7days": 7,
        "30days": 30,
        "90days": 90,
      }[filters.dateRange];

      if (days) {
        const cutoffDate = subDays(today, days);
        filtered = filtered.filter(
          (inspection) => new Date(inspection.date) >= cutoffDate
        );
      }
    }

    // Report Type Filter
    if (filters.reportType !== "all") {
      console.log("Report Type Filter:", filters.reportType);
      console.log(
        "Inspections before filter:",
        filtered.map((i) => ({ id: i._id, reportType: i.reportType }))
      );
      filtered = filtered.filter((inspection) => {
        console.log(
          "Checking inspection:",
          inspection._id,
          "Report Type:",
          inspection.reportType
        );
        return inspection.reportType === filters.reportType;
      });
      console.log(
        "Inspections after filter:",
        filtered.map((i) => ({ id: i._id, reportType: i.reportType }))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return filters.sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredInspections(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = {
      ...activeFilters,
      [filterType]: value,
    };
    setActiveFilters(newFilters);
    setShowFilterDropdown(false);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleDelete = async () => {
    if (!inspectionToDelete) return;

    try {
      const response = await fetch(`/api/inspections/${inspectionToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete inspection");
      }

      toast.success("Inspection deleted successfully");
      // Refresh the inspections list without redirecting
      fetchInspections();
    } catch (error) {
      console.error("Error deleting inspection:", error);
      toast.error("Failed to delete inspection");
    } finally {
      setShowDeleteModal(false);
      setInspectionToDelete(null);
    }
  };

  const handleDownload = async (inspection) => {
    try {
      await generateInspectionPDF(inspection._id, inspection.projectName);
    } catch (error) {
      console.error("Error downloading inspection:", error);
      toast.error("Failed to download inspection");
    }
  };

  // Delete confirmation modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <h3 className="text-xl font-semibold mb-4">Delete Inspection</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this inspection? This action cannot
            be undone.
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setInspectionToDelete(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Filter Dropdown Component
  const FilterDropdown = () => {
    if (!showFilterDropdown) return null;

    return (
      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
        <div className="p-4">
          {/* Date Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={activeFilters.dateRange}
              onChange={(e) => handleFilterChange("dateRange", e.target.value)}
              className="w-full border rounded-md p-2 text-sm"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>

          {/* Report Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={activeFilters.reportType}
              onChange={(e) => {
                console.log("Selected Report Type:", e.target.value);
                handleFilterChange("reportType", e.target.value);
              }}
              className="w-full border rounded-md p-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="PROGRESS">Progress</option>
              <option value="FINAL">Final</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={activeFilters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="w-full border rounded-md p-2 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl w-[85%] mx-auto pt-8">
      <DeleteConfirmationModal />
      <div className="flex justify-between mb-8">
        <p className="text-xl text-[#888]">
          {format(new Date(), "dd MMM yyyy").toUpperCase()}
        </p>
        {!userId && (
          <div className="flex items-center gap-6">
            <Link href="/account" className="block text-xl text-[#888]">
              ACCOUNT
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center text-lg bg-[#834CFF] text-white px-3 py-1.5 rounded-md hover:bg-[#6617CB] transition-colors"
            >
              <span>LOGOUT</span>
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between mb-8">
        <p className="text-3xl font-[500]">
          {userId ? "User Inspections" : "My Inspections"}
        </p>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="text-[#888] px-4 py-2 rounded-sm font-[400] text-xl hover:text-[#666] transition-colors flex items-center gap-2"
            >
              Filter by
              <svg
                className={`w-5 h-5 transition-transform ${
                  showFilterDropdown ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <FilterDropdown />
          </div>
          {!userId && (
            <Link
              href="/create"
              className="bg-[#834CFF] px-4 py-2 rounded-sm text-white font-[400] text-xl hover:bg-[#6617CB] transition-colors"
            >
              RECORD NEW INSPECTION
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading inspections...</div>
      ) : filteredInspections.length === 0 ? (
        <div className="text-center text-gray-500">No inspections found</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredInspections.map((inspection) => (
            <div
              key={inspection._id}
              className="bg-[#F3F0FF] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[#FF7A00] mb-1 text-lg">
                    {inspection.date.split("T")[0]}
                  </p>
                  <h3 className="text-3xl font-medium mb-2">
                    {inspection.projectName}
                  </h3>
                  <p className="text-gray-600 text-xl">
                    {inspection.address ||
                      inspection.cityCounty ||
                      "No address provided"}
                  </p>
                </div>
                <div className="flex gap-2 bg-[#E6E0FF] p-3 rounded-xl">
                  <button
                    onClick={() => {
                      const url = `/inspection/${inspection._id}${
                        userId ? `?userId=${userId}` : ""
                      }`;
                      router.push(url);
                    }}
                    className="p-2 text-[#834CFF] hover:bg-white rounded-md transition-colors"
                    title="View"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const url = `/inspection/${inspection._id}/edit${
                        userId ? `?userId=${userId}` : ""
                      }`;
                      router.push(url);
                    }}
                    className="p-2 text-[#834CFF] hover:bg-white rounded-md transition-colors"
                    title="Edit"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDownload(inspection)}
                    className="p-2 text-[#834CFF] hover:bg-white rounded-md transition-colors"
                    title="Download"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setInspectionToDelete(inspection._id);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-red-500 hover:bg-white rounded-md transition-colors"
                    title="Delete"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Loading component
function LoadingDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">Loading dashboard...</div>
      </div>
    </div>
  );
}

// Main export
export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingDashboard />}>
      <DashboardContent />
    </Suspense>
  );
}
