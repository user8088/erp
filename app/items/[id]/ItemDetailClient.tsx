"use client";

import { useEffect, useState } from "react";
import ItemDetailHeader from "../../components/ItemDetail/ItemDetailHeader";
import ItemDetailSidebar from "../../components/ItemDetail/ItemDetailSidebar";
import ItemDetailContent from "../../components/ItemDetail/ItemDetailContent";
import { itemsApi } from "../../lib/apiClient";
import type { Item } from "../../lib/types";

interface ItemDetailClientProps {
  id: string;
}

export default function ItemDetailClient({ id }: ItemDetailClientProps) {
  const [item, setItem] = useState<Item | null>(null);
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
        const res = await itemsApi.getItem(Number(id));
        console.log("[ItemDetailClient] Full API Response:", res);
        console.log("[ItemDetailClient] Item object keys:", Object.keys(res.item));
        console.log("[ItemDetailClient] Item object:", JSON.stringify(res.item, null, 2));
        console.log("[ItemDetailClient] Unit fields specifically:", {
          primary_unit: res.item.primary_unit,
          secondary_unit: res.item.secondary_unit,
          conversion_rate: res.item.conversion_rate,
        });
        if (!cancelled) {
          setItem(res.item);
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const msg =
            e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : "Failed to load item.";
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

  const handlePictureChange = (imageUrl: string) => {
    if (item) {
      setItem({ ...item, picture_url: imageUrl });
    }
  };

  return (
    <div className="max-w-full mx-auto min-h-full">
      <ItemDetailHeader
        itemId={id}
        item={item}
        saving={saving}
        onSave={() => setSaveVersion((v) => v + 1)}
      />
      <div className="flex gap-6 mt-4">
        <ItemDetailSidebar 
          item={item}
          onPictureChange={handlePictureChange}
        />
        <div className="flex-1">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          {loading && !item ? (
            <div className="text-sm text-gray-500">Loading item...</div>
          ) : (
            <ItemDetailContent
              itemId={id}
              item={item}
              onItemChange={setItem}
              saveSignal={saveVersion}
              onSavingChange={setSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
