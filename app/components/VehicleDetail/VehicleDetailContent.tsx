"use client";

import { useState } from "react";
import VehicleDetailTabs from "./VehicleDetailTabs";
import VehicleDetailsForm from "./VehicleDetailsForm";
import VehicleMaintenance from "./VehicleMaintenance";
import VehicleDeliveryOrders from "./VehicleDeliveryOrders";
import VehicleProfitability from "./VehicleProfitability";
import VehicleSettings from "./VehicleSettings";
import type { Vehicle } from "../../lib/types";

interface VehicleDetailContentProps {
  vehicleId: string;
  vehicle: Vehicle | null;
  onVehicleChange: (vehicle: Vehicle) => void;
  saveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function VehicleDetailContent({
  vehicleId,
  vehicle,
  onVehicleChange,
  saveSignal,
  onSavingChange,
}: VehicleDetailContentProps) {
  const [activeTab, setActiveTab] = useState("vehicle-details");

  return (
    <div className="flex-1">
      <VehicleDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {activeTab === "vehicle-details" && (
          <VehicleDetailsForm
            vehicleId={vehicleId}
            vehicle={vehicle}
            onVehicleUpdated={onVehicleChange}
            externalSaveSignal={saveSignal}
            onSavingChange={onSavingChange}
          />
        )}
        {activeTab === "maintenance" && (
          <VehicleMaintenance vehicleId={vehicleId} vehicle={vehicle} />
        )}
        {activeTab === "delivery-orders" && (
          <VehicleDeliveryOrders vehicleId={vehicleId} vehicle={vehicle} />
        )}
        {activeTab === "profitability" && (
          <VehicleProfitability vehicleId={vehicleId} vehicle={vehicle} />
        )}
        {activeTab === "settings" && (
          <VehicleSettings
            vehicleId={vehicleId}
            status={vehicle?.status}
            onStatusChange={(status) => {
              if (vehicle) onVehicleChange({ ...vehicle, status });
            }}
            onVehicleDeleted={() => {
              // Handle vehicle deletion - could navigate back to list
              window.location.href = "/transport";
            }}
          />
        )}
      </div>
    </div>
  );
}

