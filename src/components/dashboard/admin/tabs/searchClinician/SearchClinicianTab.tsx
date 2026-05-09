"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Input from "@/components/atom/Input/Input";
import ClinicianCard from "./ClinicianCard";
import ClinicianProfileModal from "./ClinicianProfileModal";
import Loader from "@/components/atom/Loader/Loader";
import { authFetch } from "@/lib/authFetch";

const SearchClinicianTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Pagination States
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  // Added a trigger state to force refresh the list manually
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchClinicians = useCallback(async () => {
    // Logic to prevent searching on very short strings,
    // but allow fetching the default list if search is empty
    if (search.length > 0 && search.length < 3) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.length >= 4) {
        params.append("q", search);
      }
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());

      const res = await authFetch(`/api/practitioner?${params.toString()}`, {
        credentials: "include",
      });


      if (!res.ok) throw new Error("Failed to fetch clinicians");

      const data = await res.json();
      console.log("Admin Clinician Search Response:", data);
      
      // For Admin API, data is in 'practitioners', for Guest API it is in 'data'
      const results = data.practitioners || data.data || [];
      setClinicians(results);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [search, limit, offset]);

  useEffect(() => {
    fetchClinicians();
  }, [fetchClinicians, refreshTrigger]);

  // Reset offset when search or limit changes to avoid being stuck on an empty page
  useEffect(() => {
    setOffset(0);
  }, [search, limit]);

  type Clinician = {
    id: string;
    name: string;
    specialty: string;
    registration: string;
    qualifications: string;
    intro: string;
    email: string;
    bank: {
      bankName: string;
      accountName: string;
      branch: string;
      accountNumber: string;
    };
    fees: any[];
    ratings: {
      overall: number;
      advice: number;
      punctuality: number;
    };
    tags: string[];
    experience_years: number;
    gender: string;
    contact_number: string;
    languages: string[];
  };

  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(
    null
  );
  const [openProfile, setOpenProfile] = useState(false);

  const handleViewProfile = async (id: string) => {
    try {
      const res = await authFetch(`/api/practitioners/${id}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch practitioner");

      const data = await res.json();
      const p = data.practitioner || {};
      const bank = data.bank_details?.[0] || {};

      setSelectedClinician({
        id: p.id,
        name: p.full_name ?? "",
        registration: p.license_number ?? "",
        specialty: p.specialization?.[0] ?? "",
        qualifications: p.qualifications ?? "",
        intro: p.profile_bio ?? "",
        email: p.contact_email ?? "",
        bank: {
          bankName: bank.bank_name ?? "",
          accountName: bank.account_holder_name ?? "",
          branch: bank.branch_name ?? "",
          accountNumber: bank.account_number ?? "",
        },
        fees: p.appointment_types?.map((a: any) => ({
          label: a.name,
          amount: a.fee,
        })) || [],
        ratings: { overall: 0, advice: 0, punctuality: 0 },
        tags: p.specialization ?? [],
        experience_years: p.experience_years ?? 0,
        gender: p.gender ?? "",
        contact_number: p.contact_number ?? "",
        languages: p.languages ?? [],
      });

      setOpenProfile(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Called when a clinician is successfully deactivated/deleted.
   * Closes the modal and increments refreshTrigger to re-run useEffect.
   */
  const handleRefreshList = () => {
    setOpenProfile(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Search Clinicians
              </div>
              <div className="text-xs text-slate-500">
                Find clinicians and view quick details. Click name to open
                profile.
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Show:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-xs border border-slate-200 rounded p-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[10, 20, 50, 100].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          <Input
            placeholder="Search by name, specialty, or registration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {openProfile && (
            <ClinicianProfileModal
              open={openProfile}
              onClose={handleRefreshList} // Changed to handleRefreshList to trigger data update
              clinician={selectedClinician}
            />
          )}

          <div className="space-y-3 min-h-[100px] relative">

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader />
              </div>
            ) : (
              <>
                {console.log("clinician data", clinicians)}

                {clinicians.length > 0 ? (
                  <>
                    {clinicians.map((c) => (
                      <ClinicianCard
                        key={c.id}
                        clinician={{
                          id: c.id,
                          name: c.full_name,
                          specialty: c.qualification,
                          registration: c.license_number,
                          tags: c.specialization ?? [],
                          experience: c.experience_years,
                          fees: c.fees ?? [],
                          email: c.contact_email,
                          phone: c.contact_number,
                          gender: c.gender,
                          rating: c.avg_rating,
                          totalReviews: c.total_reviews,
                          languages: c.languages ?? [],
                        }}
                        onViewProfile={handleViewProfile}
                      />
                    ))}

                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <button
                        disabled={offset === 0 || loading}
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-500">
                        Page {offset / limit + 1}
                      </span>
                      <button
                        disabled={clinicians.length < limit || loading}
                        onClick={() => setOffset(offset + limit)}
                        className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-500 py-10 text-center">
                    No clinicians found.
                  </div>
                )}
              </>
            )}

            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SearchClinicianTab;
