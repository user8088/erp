"use client";

import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import type { PurchaseOrderItem } from "../../lib/types";

interface ReceiveItemRowProps {
  item: PurchaseOrderItem;
  isChecked: boolean;
  onCheckChange: (checked: boolean) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  finalPrice: number;
  onFinalPriceChange: (price: number) => void;
}

export default function ReceiveItemRow({
  item,
  isChecked,
  onCheckChange,
  quantity,
  onQuantityChange,
  finalPrice,
  onFinalPriceChange,
}: ReceiveItemRowProps) {
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [localPrice, setLocalPrice] = useState(finalPrice);

  useEffect(() => {
    setLocalQuantity(quantity);
  }, [quantity]);

  useEffect(() => {
    setLocalPrice(finalPrice);
  }, [finalPrice]);

  const quantityOrdered = Number(item.quantity_ordered) || 0;
  const quantityReceived = Number(item.quantity_received) || 0;
  const maxQuantity = quantityOrdered - quantityReceived;
  const itemTotal = (Number(localQuantity) || 0) * (Number(localPrice) || 0);

  const handleQuantityChange = (value: string) => {
    const numValue = Number(value);
    if (numValue < 0) {
      setLocalQuantity(0);
      onQuantityChange(0);
    } else if (numValue > maxQuantity) {
      setLocalQuantity(maxQuantity);
      onQuantityChange(maxQuantity);
    } else {
      setLocalQuantity(numValue);
      onQuantityChange(numValue);
    }
  };

  const handlePriceChange = (value: string) => {
    const numValue = Number(value);
    if (numValue < 0) {
      setLocalPrice(0);
      onFinalPriceChange(0);
    } else {
      setLocalPrice(numValue);
      onFinalPriceChange(numValue);
    }
  };

  return (
    <tr className={`border-b border-gray-200 ${isChecked ? 'bg-blue-50' : 'bg-white'}`}>
      <td className="px-4 py-3 w-12">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onCheckChange(e.target.checked)}
          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {item.item?.picture_url ? (
            <img
              src={item.item.picture_url}
              alt={item.item.name}
              className="w-10 h-10 rounded object-cover border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">{item.item?.name || `Item #${item.item_id}`}</p>
            <p className="text-xs text-gray-500">{item.item?.serial_number}</p>
            {item.item?.secondary_unit && item.item?.conversion_rate && (
              <p className="text-xs text-blue-600 mt-0.5">
                1 {item.item?.primary_unit} = {item.item?.conversion_rate} {item.item?.secondary_unit}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
        {Math.floor(quantityOrdered).toLocaleString()} {item.item?.primary_unit || 'units'}
      </td>
      {isChecked ? (
        <>
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-2">
              <input
                type="number"
                min="0"
                max={maxQuantity}
                step="0.01"
                value={localQuantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-600 font-medium min-w-fit">
                {item.item?.primary_unit || 'units'}
              </span>
            </div>
            {item.item?.secondary_unit && item.item?.conversion_rate && (
              <div className="text-xs text-gray-500 mt-1 text-right">
                ({(localQuantity * item.item.conversion_rate).toFixed(2)} {item.item.secondary_unit})
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1 text-right">
              Max: {Math.floor(maxQuantity).toLocaleString()} {item.item?.primary_unit || 'units'}
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col items-end gap-1">
              <div className="text-xs text-gray-500 mb-1">Initial: PKR {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={localPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-32 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-xs text-gray-500">per {item.item?.primary_unit || 'unit'}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
            PKR {itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-3 text-sm text-gray-400 text-center">—</td>
          <td className="px-4 py-3 text-sm text-gray-400 text-center">—</td>
          <td className="px-4 py-3 text-sm text-gray-400 text-center">—</td>
        </>
      )}
    </tr>
  );
}

