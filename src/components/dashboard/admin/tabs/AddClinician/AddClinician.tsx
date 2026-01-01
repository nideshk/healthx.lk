"use client";

import React, { useState } from "react";
import ApplicationList from "./ApplicationList";
import ApplicationDetails from "./ApplicationDetails";
import AddClinicianForm from "./AddClinicianForm";

export type ViewState = "LIST" | "DETAILS" | "MANUAL_ADD";

const AddClinicianTab: React.FC = () => {
  const [view, setView] = useState<ViewState>("LIST");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const handleViewDetails = (id: string) => {
    setSelectedAppId(id);
    setView("DETAILS");
  };

  return (
    <div className="space-y-6">
      {view === "LIST" && (
        <ApplicationList 
          onViewDetails={handleViewDetails} 
          onAddNew={() => setView("MANUAL_ADD")} 
        />
      )}

      {view === "DETAILS" && selectedAppId && (
        <ApplicationDetails 
          applicationId={selectedAppId} 
          onBack={() => setView("LIST")} 
        />
      )}

      {view === "MANUAL_ADD" && (
        <AddClinicianForm onBack={() => setView("LIST")} />
      )}
    </div>
  );
};

export default AddClinicianTab;