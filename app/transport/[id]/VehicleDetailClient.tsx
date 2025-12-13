"use client";

import { useEffect, useState } from "react";
import VehicleDetailHeader from "../../components/VehicleDetail/VehicleDetailHeader";
import VehicleDetailSidebar from "../../components/VehicleDetail/VehicleDetailSidebar";
import VehicleDetailContent from "../../components/VehicleDetail/VehicleDetailContent";
import { vehiclesApi } from "../../lib/apiClient";
import type { Vehicle } from "../../lib/types";

interface VehicleDetailClientProps {
  id: string;
}

export default function VehicleDetailClient({ id }: VehicleDetailClientProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await vehiclesApi.getVehicle(Number(id));
        if (!cancelled) {
          setVehicle(res.vehicle);
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const msg =
            e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : "Failed to load vehicle.";
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="max-w-full mx-auto min-h-full">
      <VehicleDetailHeader
        vehicleId={id}
        vehicle={vehicle}
        saving={saving}
        onSave={() => setSaveVersion((v) => v + 1)}
      />
      <div className="flex gap-6 mt-4">
        <VehicleDetailSidebar vehicle={vehicle} />
        <div className="flex-1">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          {loading && !vehicle ? (
            <div className="text-sm text-gray-500">Loading vehicle...</div>
          ) : (
            <VehicleDetailContent
              vehicleId={id}
              vehicle={vehicle}
              onVehicleChange={setVehicle}
              saveSignal={saveVersion}
              onSavingChange={setSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

