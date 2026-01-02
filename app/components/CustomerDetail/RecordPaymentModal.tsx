"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, CreditCard, Calendar, FileText, AlertCircle } from "lucide-react";
import { customerPaymentsApi, accountsApi, ApiError } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Customer, Account } from "../../lib/types";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  outstandingInvoices?: Array<{
    invoice_id: number;
    invoice_number: string;
    amount: number;
    due_amount: number;
    invoice_date: string;
  }>;
  customerAdvanceBalance?: number; // Customer's available advance balance
  onPaymentRecorded?: () => void;
}

type PaymentType = 'invoice_payment' | 'advance_payment' | 'refund';
type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';

export default function RecordPaymentModal({
  isOpen,
  onClose,
  customer,
  outstandingInvoices = [],
  customerAdvanceBalance = 0,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const { addToast } = useToast();
  
  // Form state
  const [paymentType, setPaymentType] = useState<PaymentType>('invoice_payment');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);
  const [useCustomerAdvance, setUseCustomerAdvance] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  
  // Payment response state (for showing advance payment summary)
  const [paymentResponse, setPaymentResponse] = useState<{
    auto_applied_payments?: Array<{
      id: number;
      invoice_id: number;
      invoice_number: string;
      amount_applied: number;
      invoice_status_after: 'paid' | 'partially_paid';
      remaining_invoice_balance: number;
    }>;
    advance_summary?: {
      total_advance_received: number;
      amount_applied_to_invoices: number;
      remaining_advance_balance: number;
      customer_new_advance_balance: number;
    };
  } | null>(null);
  
  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch payment accounts
  useEffect(() => {
    const fetchPaymentAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const response = await accountsApi.getAccounts({
          company_id: 1,
          root_type: 'asset',
          is_group: false,
          per_page: 1000,
        });
        
        // Filter for cash and bank accounts
        const relevantAccounts = response.data.filter(acc => {
          const nameLower = acc.name.toLowerCase();
          return nameLower.includes('cash') || nameLower.includes('bank');
        });
        
        setPaymentAccounts(relevantAccounts);
        
        // Auto-select first account
        if (relevantAccounts.length > 0 && !paymentAccountId) {
          setPaymentAccountId(relevantAccounts[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch payment accounts:", error);
        addToast("Failed to load payment accounts", "error");
      } finally {
        setLoadingAccounts(false);
      }
    };

    if (isOpen) {
      fetchPaymentAccounts();
    }
  }, [isOpen, paymentAccountId, addToast]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentType('invoice_payment');
      setSelectedInvoiceId(null);
      setAmount("");
      setPaymentMethod('cash');
      setUseCustomerAdvance(false);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber("");
      setNotes("");
      setErrors({});
      setPaymentResponse(null);
    } else {
      // Auto-select first outstanding invoice if available
      if (outstandingInvoices.length > 0) {
        setSelectedInvoiceId(outstandingInvoices[0].invoice_id);
        setAmount(outstandingInvoices[0].due_amount.toString());
      }
    }
  }, [isOpen, outstandingInvoices]);

  // Update amount when invoice selection changes
  useEffect(() => {
    if (paymentType === 'invoice_payment' && selectedInvoiceId) {
      const invoice = outstandingInvoices.find(inv => inv.invoice_id === selectedInvoiceId);
      if (invoice) {
        setAmount(invoice.due_amount.toString());
      }
    }
  }, [selectedInvoiceId, paymentType, outstandingInvoices]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (paymentType === 'invoice_payment' && !selectedInvoiceId) {
      newErrors.invoice = "Please select an invoice";
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    // Validate advance balance if using customer advance
    if (paymentType === 'invoice_payment' && useCustomerAdvance) {
      const paymentAmount = parseFloat(amount) || 0;
      if (paymentAmount > customerAdvanceBalance) {
        newErrors.advance = `Insufficient advance balance. Available: PKR ${customerAdvanceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      }
    }

    // Payment account is required only if not using customer advance
    if (!useCustomerAdvance && !paymentAccountId) {
      newErrors.account = "Please select a payment account";
    }

    if (!paymentDate) {
      newErrors.date = "Payment date is required";
    }

    if (paymentMethod === 'cheque' && !referenceNumber) {
      newErrors.reference = "Cheque number is required for cheque payments";
    }

    if (paymentMethod === 'bank_transfer' && !referenceNumber) {
      newErrors.reference = "Transaction reference is recommended for bank transfers";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: customer.id,
        payment_type: paymentType,
        ...(paymentType === 'invoice_payment' && { invoice_id: selectedInvoiceId! }),
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        ...(useCustomerAdvance ? { use_advance: true } : { payment_account_id: paymentAccountId! }),
        payment_date: paymentDate,
        ...(referenceNumber && { reference_number: referenceNumber }),
        ...(notes && { notes }),
      };

      console.log("[RecordPayment] Submitting payment:", payload);

      const response = await customerPaymentsApi.createCustomerPayment(payload);

      console.log("[RecordPayment] Payment recorded:", response);

      // Success!
      const paymentTypeLabel = 
        paymentType === 'invoice_payment' ? 'Invoice payment' :
        paymentType === 'advance_payment' ? 'Advance payment' : 'Refund';
      
      // Handle advance payment with auto-applied invoices - show detailed summary
      if (paymentType === 'advance_payment' && (response.auto_applied_payments || response.advance_summary)) {
        // Store response to show detailed summary
        setPaymentResponse({
          auto_applied_payments: response.auto_applied_payments,
          advance_summary: response.advance_summary,
        });
        
        // Show brief success message
        if (response.auto_applied_payments && response.auto_applied_payments.length > 0) {
          const summary = response.advance_summary;
          const invoicesCount = response.auto_applied_payments.length;
          const appliedAmount = summary?.amount_applied_to_invoices || 0;
          const remainingBalance = summary?.remaining_advance_balance || 0;
          
          addToast(
            `Advance payment recorded! Applied PKR ${appliedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} to ${invoicesCount} invoice(s). Remaining balance: PKR ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            "success"
          );
        } else if (response.advance_summary) {
          // Advance payment with no invoices to pay
          const remainingBalance = response.advance_summary.remaining_advance_balance || 0;
          addToast(
            `Advance payment recorded! Added PKR ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} to advance balance.`,
            "success"
          );
        }
        
        // Don't close modal yet - show summary first
        // User will close it after viewing summary
      } else {
        // Regular payment - close immediately
        addToast(`${paymentTypeLabel} recorded successfully!`, "success");
        
        // Callback to refresh data
        if (onPaymentRecorded) {
          onPaymentRecorded();
        }
        
        onClose();
      }
    } catch (error) {
      console.error("Failed to record payment:", error);
      
      if (error instanceof ApiError) {
        if (error.status === 422 || error.status === 400) {
          const errorData = error.data as { message?: string; errors?: Record<string, string[]> };
          
          if (errorData.errors) {
            const errorMessages = Object.values(errorData.errors).flat();
            addToast(errorMessages[0], "error");
          } else {
            addToast(errorData.message || "Failed to record payment", "error");
          }
        } else if (error.status === 404) {
          addToast("Customer payments API endpoint not found. Please ensure the backend is properly configured.", "error");
        } else if (error.status === 500) {
          addToast("Server error while recording payment. Please check the backend logs or contact support.", "error");
        } else {
          addToast(error.message || "Failed to record payment", "error");
        }
      } else {
        addToast("Failed to record payment. Please try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedInvoice = outstandingInvoices.find(inv => inv.invoice_id === selectedInvoiceId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-500">
                Customer: {customer.name} ({customer.serial_number})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form (hidden when showing advance payment summary) */}
        {!paymentResponse && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Payment Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('invoice_payment')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  paymentType === 'invoice_payment'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4 mx-auto mb-1" />
                Invoice Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('advance_payment')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  paymentType === 'advance_payment'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CreditCard className="w-4 h-4 mx-auto mb-1" />
                Advance Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('refund')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  paymentType === 'refund'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <DollarSign className="w-4 h-4 mx-auto mb-1" />
                Refund
              </button>
            </div>
          </div>

          {/* Invoice Selection (only for invoice_payment) */}
          {paymentType === 'invoice_payment' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Invoice <span className="text-red-500">*</span>
              </label>
              {outstandingInvoices.length > 0 ? (
                <select
                  value={selectedInvoiceId || ""}
                  onChange={(e) => setSelectedInvoiceId(Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.invoice ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select an invoice</option>
                  {outstandingInvoices.map((invoice) => (
                    <option key={invoice.invoice_id} value={invoice.invoice_id}>
                      {invoice.invoice_number} - PKR {invoice.due_amount.toLocaleString()} due
                      ({new Date(invoice.invoice_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">No Outstanding Invoices</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        This customer has no unpaid invoices. Consider recording an advance payment instead.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {errors.invoice && (
                <p className="text-xs text-red-500 mt-1">{errors.invoice}</p>
              )}
              {selectedInvoice && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-900">
                    <span className="font-medium">Invoice Amount:</span> PKR {selectedInvoice.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-900">
                    <span className="font-medium">Amount Due:</span> PKR {selectedInvoice.due_amount.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Use Customer Advance Option */}
              {customerAdvanceBalance > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomerAdvance}
                      onChange={(e) => {
                        setUseCustomerAdvance(e.target.checked);
                        if (e.target.checked) {
                          setPaymentAccountId(null);
                        }
                      }}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-900">Use Customer Advance</span>
                        <span className="text-sm font-semibold text-green-700">
                          Available: PKR {customerAdvanceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Pay this invoice using the customer&apos;s advance balance. No payment account required.
                      </p>
                      {useCustomerAdvance && selectedInvoice && parseFloat(amount) > customerAdvanceBalance && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Payment amount exceeds available advance balance
                        </p>
                      )}
                    </div>
                  </label>
                  {errors.advance && (
                    <p className="text-xs text-red-500 mt-2">{errors.advance}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment Type Info */}
          {paymentType === 'advance_payment' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">Advance Payment</p>
                  <p className="text-xs text-green-700 mt-1">
                    This amount will be added to the customer&apos;s advance balance and can be used for future purchases.
                  </p>
                </div>
              </div>
            </div>
          )}

          {paymentType === 'refund' && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Refund Payment</p>
                  <p className="text-xs text-purple-700 mt-1">
                    Recording a refund will deduct money from the selected account and update customer records.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (PKR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">PKR</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-14 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Payment Account (only if not using customer advance) */}
          {!(paymentType === 'invoice_payment' && useCustomerAdvance) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Account <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentAccountId || ""}
                onChange={(e) => setPaymentAccountId(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.account ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loadingAccounts}
              >
                <option value="">Select payment account</option>
                {paymentAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.number ? `${account.number} - ` : ""}{account.name}
                  </option>
                ))}
              </select>
              {errors.account && (
                <p className="text-xs text-red-500 mt-1">{errors.account}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                The account where this payment will be deposited
              </p>
            </div>
          )}

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.date && (
              <p className="text-xs text-red-500 mt-1">{errors.date}</p>
            )}
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Number
              {(paymentMethod === 'cheque' || paymentMethod === 'bank_transfer') && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.reference ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={
                paymentMethod === 'cheque' ? 'Cheque number' :
                paymentMethod === 'bank_transfer' ? 'Transaction ID' :
                'Reference number (optional)'
              }
            />
            {errors.reference && (
              <p className="text-xs text-red-500 mt-1">{errors.reference}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any additional notes about this payment..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingAccounts}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
        )}

        {/* Advance Payment Summary (shown after successful advance payment) */}
        {paymentResponse && (paymentResponse.auto_applied_payments || paymentResponse.advance_summary) && (
          <div className="p-6 border-t border-gray-200 bg-green-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Advance Payment Summary</h3>
              </div>
              <button
                onClick={() => {
                  setPaymentResponse(null);
                  if (onPaymentRecorded) {
                    onPaymentRecorded();
                  }
                  onClose();
                }}
                className="p-1 hover:bg-green-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {paymentResponse.advance_summary && (
              <div className="space-y-3 mb-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Advance Received</p>
                      <p className="text-sm font-semibold text-gray-900">
                        PKR {paymentResponse.advance_summary.total_advance_received.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Applied to Invoices</p>
                      <p className="text-sm font-semibold text-blue-600">
                        PKR {paymentResponse.advance_summary.amount_applied_to_invoices.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Remaining Advance</p>
                      <p className="text-sm font-semibold text-green-600">
                        PKR {paymentResponse.advance_summary.remaining_advance_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">New Advance Balance</p>
                      <p className="text-sm font-semibold text-gray-900">
                        PKR {paymentResponse.advance_summary.customer_new_advance_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentResponse.auto_applied_payments && paymentResponse.auto_applied_payments.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Invoices Paid</h4>
                <div className="space-y-2">
                  {paymentResponse.auto_applied_payments.map((payment, index) => (
                    <div key={payment.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {payment.invoice_number}
                        </p>
                        <p className="text-xs text-gray-600">
                          Status: {payment.invoice_status_after === 'paid' ? 'Fully Paid' : 'Partially Paid'}
                          {payment.remaining_invoice_balance > 0 && (
                            <span className="ml-2">(Remaining: PKR {payment.remaining_invoice_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-blue-600">
                        PKR {payment.amount_applied.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setPaymentResponse(null);
                  if (onPaymentRecorded) {
                    onPaymentRecorded();
                  }
                  onClose();
                }}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
