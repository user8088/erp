"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { rentalApi, customersApi, type CreateRentalAgreementPayload } from "../../../lib/apiClient";
import { useToast } from "../../../components/ui/ToastProvider";
import { invalidateRentalAgreementsCache } from "../../../components/Rentals/RentalAgreements/useRentalAgreementsList";
import { useRentalAccountMappings } from "../../../components/Rentals/Shared/useRentalAccountMappings";
import RentalAccountingStatusBanner from "../../../components/Rentals/Shared/RentalAccountingStatusBanner";
import type { Customer, RentalItem } from "../../../lib/types";

export default function NewRentalAgreementPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableItems, setAvailableItems] = useState<RentalItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  const [formData, setFormData] = useState({
    customer_id: "",
    rental_item_id: "",
    quantity_rented: "",
    rental_start_date: new Date().toISOString().split('T')[0],
    rental_end_date: "",
    rental_period_type: "monthly" as "daily" | "weekly" | "monthly" | "custom",
    rental_period_length: "1",
    total_rent_amount: "",
    rent_per_period: "",
    security_deposit_amount: "",
  });

  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [collectSecurityDeposit, setCollectSecurityDeposit] = useState(false);
  const [securityDepositPaymentAccountId, setSecurityDepositPaymentAccountId] = useState<number | null>(null);
  
  const { mappings, getPaymentAccounts, isConfigured } = useRentalAccountMappings();
  const paymentAccounts = getPaymentAccounts();

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const data = await customersApi.getCustomers({ per_page: 100, search: customerSearch || undefined });
        setCustomers(data.data);
      } catch (e) {
        console.error("Failed to load customers:", e);
      } finally {
        setLoadingCustomers(false);
      }
    };
    void loadCustomers();
  }, [customerSearch]);

  // Load available rental items
  useEffect(() => {
    const loadItems = async () => {
      setLoadingItems(true);
      try {
        const data = await rentalApi.getItems({ 
          per_page: 100, 
          status: "available",
          search: itemSearch || undefined,
        });
        setAvailableItems(data.data.filter(item => item.quantity_available > 0));
      } catch (e) {
        console.error("Failed to load rental items:", e);
      } finally {
        setLoadingItems(false);
      }
    };
    void loadItems();
  }, [itemSearch]);

  // Update selected item when rental_item_id changes
  useEffect(() => {
    if (formData.rental_item_id) {
      const item = availableItems.find(i => i.id === Number(formData.rental_item_id));
      setSelectedItem(item || null);
      if (item) {
        // Auto-calculate amounts
        const quantity = parseFloat(formData.quantity_rented || "0");
        const rentPerPeriod = item.rent_per_period * quantity;
        const totalRent = rentPerPeriod * parseInt(formData.rental_period_length || "1");

        setFormData(prev => ({
          ...prev,
          rent_per_period: rentPerPeriod.toFixed(2),
          total_rent_amount: totalRent.toFixed(2),
        }));
      }
    }
  }, [formData.rental_item_id, formData.quantity_rented, formData.rental_period_length, availableItems]);

  // Calculate end date based on start date and period
  useEffect(() => {
    if (formData.rental_start_date && formData.rental_period_length && formData.rental_period_type) {
      const startDate = new Date(formData.rental_start_date);
      const periodLength = parseInt(formData.rental_period_length);
      
      const endDate = new Date(startDate);
      if (formData.rental_period_type === "daily") {
        endDate.setDate(endDate.getDate() + periodLength - 1);
      } else if (formData.rental_period_type === "weekly") {
        endDate.setDate(endDate.getDate() + (periodLength * 7) - 1);
      } else if (formData.rental_period_type === "monthly") {
        endDate.setMonth(endDate.getMonth() + periodLength);
        endDate.setDate(endDate.getDate() - 1);
      } else {
        endDate.setDate(endDate.getDate() + periodLength - 1);
      }

      setFormData(prev => ({
        ...prev,
        rental_end_date: endDate.toISOString().split('T')[0],
      }));
    }
  }, [formData.rental_start_date, formData.rental_period_length, formData.rental_period_type]);

  // Set default payment account when available
  useEffect(() => {
    if (mappings.cashAccount && !securityDepositPaymentAccountId) {
      setSecurityDepositPaymentAccountId(mappings.cashAccount.id);
    } else if (mappings.bankAccount && !securityDepositPaymentAccountId) {
      setSecurityDepositPaymentAccountId(mappings.bankAccount.id);
    }
  }, [mappings, securityDepositPaymentAccountId]);

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (stepNum === 1 && !formData.customer_id) {
      newErrors.customer_id = "Please select a customer.";
    }
    if (stepNum === 2 && !formData.rental_item_id) {
      newErrors.rental_item_id = "Please select a rental item.";
    }
    if (stepNum === 2 && (!formData.quantity_rented || parseFloat(formData.quantity_rented) <= 0)) {
      newErrors.quantity_rented = "Quantity must be greater than 0.";
    }
    if (stepNum === 2 && selectedItem && parseFloat(formData.quantity_rented) > selectedItem.quantity_available) {
      newErrors.quantity_rented = `Quantity cannot exceed available quantity (${selectedItem.quantity_available}).`;
    }
    if (stepNum === 3 && !formData.rental_start_date) {
      newErrors.rental_start_date = "Start date is required.";
    }
    if (stepNum === 4 && collectSecurityDeposit && !securityDepositPaymentAccountId) {
      newErrors.security_deposit_account = "Please select a payment account for security deposit.";
    }
    if (stepNum === 4 && formData.security_deposit_amount && !isConfigured.securityDeposits) {
      newErrors.security_deposit_config = "Security deposits account is not configured. Please configure in Rental Settings.";
    }
    if (stepNum === 4 && !isConfigured.ar) {
      newErrors.ar_config = "Accounts Receivable account is not configured. Please configure in Rental Settings.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setSubmitting(true);
    try {
      const payload: CreateRentalAgreementPayload = {
        customer_id: Number(formData.customer_id),
        rental_item_id: Number(formData.rental_item_id),
        quantity_rented: parseFloat(formData.quantity_rented),
        rental_start_date: formData.rental_start_date,
        rental_end_date: formData.rental_end_date || undefined,
        rental_period_type: formData.rental_period_type,
        rental_period_length: parseInt(formData.rental_period_length),
        total_rent_amount: parseFloat(formData.total_rent_amount),
        rent_per_period: parseFloat(formData.rent_per_period),
        security_deposit_amount: formData.security_deposit_amount ? parseFloat(formData.security_deposit_amount) : undefined,
        collect_security_deposit: collectSecurityDeposit,
        security_deposit_payment_account_id: collectSecurityDeposit && securityDepositPaymentAccountId ? securityDepositPaymentAccountId : undefined,
      };

      await rentalApi.createAgreement(payload);
      addToast("Rental agreement created successfully.", "success");
      
      invalidateRentalAgreementsCache();
      
      router.push(`/rental/agreements`);
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object") {
          if ("message" in errorData && typeof errorData.message === "string") {
            const message = errorData.message.toLowerCase();
            if (message.includes("account") || message.includes("mapping") || message.includes("receivable")) {
              addToast(
                `${errorData.message} Please configure accounts in Rental Settings.`,
                "error"
              );
              return;
            }
            addToast(errorData.message, "error");
            return;
          }
          if ("errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
              if (firstError.toLowerCase().includes("account") || firstError.toLowerCase().includes("mapping")) {
                addToast(
                  `${firstError} Please configure accounts in Rental Settings.`,
                  "error"
                );
              } else {
            addToast(firstError, "error");
              }
            return;
            }
          }
        }
      }
      
      addToast("Failed to create rental agreement. Please check that all required account mappings are configured in Rental Settings.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="max-w-3xl mx-auto min-h-full py-8">
      <RentalAccountingStatusBanner />
      
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Create New Rental Agreement</h1>
        <div className="mt-4 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                s === step ? "bg-black text-white" : s < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
              }`}>
                {s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Step 1: Select Customer */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select Customer</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customer
              </label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name, email, phone..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.customer_id ? "border-red-500" : "border-gray-300"
                }`}
                disabled={loadingCustomers}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Item & Quantity */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Select Rental Item & Quantity</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Rental Item
              </label>
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search by name or SKU..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rental Item <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.rental_item_id}
                onChange={(e) => setFormData({ ...formData, rental_item_id: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.rental_item_id ? "border-red-500" : "border-gray-300"
                }`}
                disabled={loadingItems}
              >
                <option value="">Select a rental item</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) - Available: {item.quantity_available}
                  </option>
                ))}
              </select>
              {errors.rental_item_id && (
                <p className="mt-1 text-sm text-red-600">{errors.rental_item_id}</p>
              )}
            </div>
            {selectedItem && (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Rental Price per Period:</strong> {formatCurrency(selectedItem.rent_per_period)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Available Quantity:</strong> {selectedItem.quantity_available}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                max={selectedItem?.quantity_available || undefined}
                value={formData.quantity_rented}
                onChange={(e) => setFormData({ ...formData, quantity_rented: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.quantity_rented ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.quantity_rented && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity_rented}</p>
              )}
              {selectedItem && (
                <p className="mt-1 text-xs text-gray-500">
                  Maximum available: {selectedItem.quantity_available}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Rental Period */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Rental Period</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.rental_start_date}
                onChange={(e) => setFormData({ ...formData, rental_start_date: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.rental_start_date ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.rental_start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.rental_start_date}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.rental_period_type}
                  onChange={(e) => setFormData({ ...formData, rental_period_type: e.target.value as "daily" | "weekly" | "monthly" | "custom" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Length <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.rental_period_length}
                  onChange={(e) => setFormData({ ...formData, rental_period_length: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Auto-calculated)
              </label>
              <input
                type="date"
                value={formData.rental_end_date}
                onChange={(e) => setFormData({ ...formData, rental_end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Deposit Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.security_deposit_amount}
                onChange={(e) => setFormData({ ...formData, security_deposit_amount: e.target.value })}

                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.security_deposit_amount ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="0.00"
              />
              {errors.security_deposit_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.security_deposit_amount}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter the total security deposit amount for this rental agreement (optional)
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 4: Review & Confirm</h2>
            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Customer</p>
                  <p className="text-sm text-gray-900">{customers.find(c => c.id === Number(formData.customer_id))?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Rental Item</p>
                  <p className="text-sm text-gray-900">{selectedItem?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Quantity</p>
                  <p className="text-sm text-gray-900">{formData.quantity_rented}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Period</p>
                  <p className="text-sm text-gray-900">{formData.rental_period_length} {formData.rental_period_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Date</p>
                  <p className="text-sm text-gray-900">{formData.rental_start_date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">End Date</p>
                  <p className="text-sm text-gray-900">{formData.rental_end_date}</p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Rent Per Period</span>
                  <span className="text-sm text-gray-900">{formatCurrency(parseFloat(formData.rent_per_period || "0"))}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Total Rent Amount</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(parseFloat(formData.total_rent_amount || "0"))}</span>
                </div>
                {formData.security_deposit_amount && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Security Deposit</span>
                    <span className="text-sm text-gray-900">{formatCurrency(parseFloat(formData.security_deposit_amount))}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Security Deposit Collection */}
            {formData.security_deposit_amount && parseFloat(formData.security_deposit_amount) > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Security Deposit Collection</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="collect-security-deposit"
                      checked={collectSecurityDeposit}
                      onChange={(e) => setCollectSecurityDeposit(e.target.checked)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="collect-security-deposit" className="ml-2 text-sm font-medium text-gray-700">
                      Collect security deposit now
                    </label>
                  </div>
                  
                  {collectSecurityDeposit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Account <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={securityDepositPaymentAccountId || ""}
                        onChange={(e) => setSecurityDepositPaymentAccountId(Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          errors.security_deposit_account ? "border-red-500" : "border-gray-300"
                        }`}
                      >
                        <option value="">Select payment account</option>
                        {paymentAccounts.length === 0 ? (
                          <option value="" disabled>
                            No payment accounts configured. Please configure in Rental Settings.
                          </option>
                        ) : (
                          paymentAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.number ? `${account.number} - ` : ""}{account.name}
                            </option>
                          ))
                        )}
                      </select>
                      {errors.security_deposit_account && (
                        <p className="mt-1 text-sm text-red-600">{errors.security_deposit_account}</p>
                      )}
                      {paymentAccounts.length === 0 && (
                        <p className="mt-1 text-xs text-orange-600">
                          <a href="/rental/settings" className="underline hover:text-orange-700">
                            Configure payment accounts in Rental Settings
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                  
                  {errors.security_deposit_config && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{errors.security_deposit_config}</p>
                      <a href="/rental/settings" className="text-sm text-red-600 underline mt-1 inline-block">
                        Go to Rental Settings
                      </a>
                    </div>
                  )}
                  
                  {errors.ar_config && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{errors.ar_config}</p>
                      <a href="/rental/settings" className="text-sm text-red-600 underline mt-1 inline-block">
                        Go to Rental Settings
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Rental Agreement"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

