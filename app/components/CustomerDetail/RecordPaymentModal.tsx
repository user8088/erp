"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, DollarSign, CreditCard, Calendar, FileText, AlertCircle, Plus } from "lucide-react";
import { customerPaymentsApi, accountsApi, ApiError, CreateCustomerPaymentPayload } from "../../lib/apiClient";
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
    status: string;
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
  const [selectedRefundInvoiceId, setSelectedRefundInvoiceId] = useState<number | null>(null);
  const [refundLines, setRefundLines] = useState<Array<{
    amount: string;
    payment_account_id: number | null;
    payment_method: PaymentMethod;
  }>>([{ amount: "", payment_account_id: null, payment_method: 'cash' }]);
  const [restockItems, setRestockItems] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);
  const [useCustomerAdvance, setUseCustomerAdvance] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [lossAccounts, setLossAccounts] = useState<Account[]>([]);
  const [lossAccountId, setLossAccountId] = useState<number | null>(null);

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

    const fetchLossAccounts = async () => {
      try {
        // Fetch expense and income accounts for loss/return mapping
        // We fetch all and filter client side or make two requests
        // For simplicity, let's fetch all non-assets if possible, or just expense/income
        // The API supports filtering by root_type, but only one at a time usually unless array supported
        // Let's make two parallel requests for expense and income
        const [expenseRes, incomeRes] = await Promise.all([
          accountsApi.getAccounts({ company_id: 1, root_type: 'expense', is_group: false, per_page: 1000 }),
          accountsApi.getAccounts({ company_id: 1, root_type: 'income', is_group: false, per_page: 1000 })
        ]);

        const combined = [...expenseRes.data, ...incomeRes.data];
        setLossAccounts(combined);
      } catch (error) {
        console.error("Failed to fetch loss accounts:", error);
      }
    };

    if (isOpen) {
      fetchPaymentAccounts();
      fetchLossAccounts();
    }
  }, [isOpen, paymentAccountId, addToast]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentType('invoice_payment');
      setSelectedInvoiceId(null);
      setSelectedRefundInvoiceId(null);
      setAmount("");
      setPaymentMethod('cash');
      setUseCustomerAdvance(false);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber("");
      setChequeNumber("");
      setChequeDate("");
      setBankName("");
      setNotes("");
      setErrors({});
      setPaymentResponse(null);
      setRefundLines([{ amount: "", payment_account_id: null, payment_method: 'cash' }]);
      setRestockItems(false);
      setLossAccountId(null);
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
    } else if (paymentType === 'refund' && selectedRefundInvoiceId) {
      const invoice = outstandingInvoices.find(inv => inv.invoice_id === selectedRefundInvoiceId);
      if (invoice) {
        // For single line refund, set the amount. For split, we'll handle it in the UI.
        if (refundLines.length === 1 && !refundLines[0].amount) {
          const newLines = [...refundLines];
          newLines[0].amount = invoice.amount.toString();
          setRefundLines(newLines);
        }
        setAmount(invoice.amount.toString());
      }
    }
  }, [selectedInvoiceId, selectedRefundInvoiceId, paymentType, outstandingInvoices]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (paymentType === 'invoice_payment' && !selectedInvoiceId) {
      newErrors.invoice = "Please select an invoice";
    }

    if (paymentType === 'refund' && !selectedRefundInvoiceId) {
      newErrors.refundInvoice = "Please select an invoice to refund against";
    }

    if (paymentType === 'refund') {
      let totalRefund = 0;
      refundLines.forEach((line, index) => {
        const lineAmount = parseFloat(line.amount) || 0;
        if (lineAmount <= 0) {
          newErrors[`refund_amount_${index}`] = "Amount must be greater than 0";
        }
        if (!line.payment_account_id) {
          newErrors[`refund_account_${index}`] = "Please select a payment account";
        }
        totalRefund += lineAmount;
      });

      if (selectedRefundInvoiceId) {
        const invoice = outstandingInvoices.find(inv => inv.invoice_id === selectedRefundInvoiceId);
        if (invoice && totalRefund > invoice.amount) {
          newErrors.refundTotal = `Total refund (PKR ${totalRefund.toLocaleString()}) cannot exceed invoice amount (PKR ${invoice.amount.toLocaleString()})`;
        }
      }
    } else {
      if (!amount || parseFloat(amount) <= 0) {
        newErrors.amount = "Amount must be greater than 0";
      }
    }

    // Validate advance balance if using customer advance
    if (paymentType === 'invoice_payment' && useCustomerAdvance) {
      const paymentAmount = parseFloat(amount) || 0;
      if (paymentAmount > customerAdvanceBalance) {
        newErrors.advance = `Insufficient advance balance. Available: PKR ${customerAdvanceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      }
    }

    // Payment account is required only if not using customer advance and not cheque (and not for refunds)
    if (paymentType !== 'refund' && !useCustomerAdvance && paymentMethod !== 'cheque' && !paymentAccountId) {
      newErrors.account = "Please select a payment account";
    }

    if (!paymentDate) {
      newErrors.date = "Payment date is required";
    }

    if (paymentMethod === 'cheque') {
      if (!chequeNumber) newErrors.chequeNumber = "Cheque number is required";
      if (!chequeDate) newErrors.chequeDate = "Cheque date is required";
      if (!bankName) newErrors.bankName = "Bank name is required";
    }

    if (paymentMethod === 'bank_transfer' && !referenceNumber) {
      newErrors.reference = "Transaction reference is recommended for bank transfers";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const calculatedAmount = paymentType === 'refund'
        ? refundLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0)
        : parseFloat(amount);

      const payload: CreateCustomerPaymentPayload = {
        customer_id: customer.id,
        payment_type: paymentType,
        amount: calculatedAmount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        ...(paymentType === 'invoice_payment' && { invoice_id: selectedInvoiceId! }),
        ...(paymentType === 'refund' && {
          invoice_id: selectedRefundInvoiceId!,
          payments: refundLines.map(line => ({
            amount: parseFloat(line.amount),
            payment_account_id: line.payment_account_id!,
            payment_method: line.payment_method,
          })),
          restock_items: restockItems,
          ...(lossAccountId && { loss_account_id: lossAccountId }),
        }),
        ...(useCustomerAdvance ? { use_advance: true } : {
          ...(paymentType !== 'refund' && { payment_account_id: paymentAccountId! })
        }),
        ...(referenceNumber && { reference_number: referenceNumber }),
        ...(paymentMethod === 'cheque' && paymentType !== 'refund' && {
          cheque_number: chequeNumber,
          cheque_date: chequeDate,
          bank_name: bankName
        }),
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
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${paymentType === 'invoice_payment'
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
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${paymentType === 'advance_payment'
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
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${paymentType === 'refund'
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
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.invoice ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select an invoice</option>
                    {outstandingInvoices
                      .filter(inv => {
                        // For payments: show only unpaid/partial invoices, hide refunded/cancelled
                        // Also ensure due amount is positive
                        return inv.due_amount > 0 && 
                               inv.status !== 'refunded' && 
                               inv.status !== 'cancelled' &&
                               inv.status !== 'paid';
                      })
                      .map((invoice) => (
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
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">Refund Payment</p>
                      <p className="text-xs text-purple-700 mt-1">
                        Recording a refund will deduct money from the selected account and update customer records.
                        Refunds should be recorded against a specific invoice.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Invoice to Refund <span className="text-red-500">*</span>
                  </label>
                  {outstandingInvoices.length > 0 ? (
                    <select
                      value={selectedRefundInvoiceId || ""}
                      onChange={(e) => setSelectedRefundInvoiceId(Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.refundInvoice ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Select an invoice</option>
                      {outstandingInvoices
                        .filter(inv => {
                          // For refunds: show only paid/partial invoices
                          // Hide unpaid invoices (where due_amount equals total amount)
                          // Also hide cancelled/refunded ones if they are already fully refunded
                          const isFullyUnpaid = inv.due_amount === inv.amount;
                          return !isFullyUnpaid && 
                                 inv.status !== 'cancelled' && 
                                 inv.status !== 'refunded';
                        })
                        .map((invoice) => (
                        <option key={invoice.invoice_id} value={invoice.invoice_id}>
                          {invoice.invoice_number} - PKR {invoice.amount.toLocaleString()}
                          ({new Date(invoice.invoice_date).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700">
                        No invoices found for this customer.
                      </p>
                    </div>
                  )}
                  {errors.refundInvoice && (
                    <p className="text-xs text-red-500 mt-1">{errors.refundInvoice}</p>
                  )}
                </div>

                {/* Loss/Return Account Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loss/Return Account <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={lossAccountId || ""}
                    onChange={(e) => setLossAccountId(Number(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Default (Sales Return)</option>
                    {lossAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.number ? `${account.number} - ` : ""}{account.name} ({account.root_type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the account to debit (e.g., Sales Return or Bad Debt). If left blank, the default Sales Return account will be used.
                  </p>
                </div>

                {/* Refund Lines (Split Refund) */}
                {selectedRefundInvoiceId && (
                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Refund Breakdown</h3>
                      <button
                        type="button"
                        onClick={() => setRefundLines([...refundLines, { amount: "", payment_account_id: paymentAccountId || (paymentAccounts[0]?.id || null), payment_method: 'cash' }])}
                        className="text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Refund Line
                      </button>
                    </div>

                    {refundLines.map((line, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3 relative">
                        {refundLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRefundLines(refundLines.filter((_, i) => i !== index))}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          {/* Amount */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (PKR)</label>
                            <input
                              type="number"
                              value={line.amount}
                              onChange={(e) => {
                                const newLines = [...refundLines];
                                newLines[index].amount = e.target.value;
                                setRefundLines(newLines);
                              }}
                              className={`w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-purple-500 ${errors[`refund_amount_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="0.00"
                            />
                            {errors[`refund_amount_${index}`] && (
                              <p className="text-[10px] text-red-500 mt-0.5">{errors[`refund_amount_${index}`]}</p>
                            )}
                          </div>

                          {/* Method */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                            <select
                              value={line.payment_method}
                              onChange={(e) => {
                                const newLines = [...refundLines];
                                newLines[index].payment_method = e.target.value as PaymentMethod;
                                setRefundLines(newLines);
                              }}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="cash">Cash</option>
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="cheque">Cheque</option>
                              <option value="card">Card</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>

                        {/* Account */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Refund From Account</label>
                          <select
                            value={line.payment_account_id || ""}
                            onChange={(e) => {
                              const newLines = [...refundLines];
                              newLines[index].payment_account_id = Number(e.target.value);
                              setRefundLines(newLines);
                            }}
                            className={`w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-purple-500 ${errors[`refund_account_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                          >
                            <option value="">Select account</option>
                            {paymentAccounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                          </select>
                          {errors[`refund_account_${index}`] && (
                            <p className="text-[10px] text-red-500 mt-0.5">{errors[`refund_account_${index}`]}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {errors.refundTotal && (
                      <p className="text-xs text-red-500 font-medium">{errors.refundTotal}</p>
                    )}

                    {/* Restock Items Checkbox */}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="restockItems"
                        checked={restockItems}
                        onChange={(e) => setRestockItems(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="restockItems" className="text-sm text-gray-700 cursor-pointer">
                        Restock items from this invoice (Inventory Reversal)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Amount (Hidden for refunds as it's handled in breakdown) */}
            {paymentType !== 'refund' && (
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
                    className={`w-full pl-14 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                )}
              </div>
            )}

            {/* Payment Method (Hidden for refunds as it's handled in breakdown) */}
            {paymentType !== 'refund' && (
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
            )}

            {/* Payment Account (Hidden for refunds as it's handled in breakdown) */}
            {paymentType !== 'refund' && !(paymentType === 'invoice_payment' && useCustomerAdvance) && paymentMethod !== 'cheque' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentAccountId || ""}
                  onChange={(e) => setPaymentAccountId(Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.account ? 'border-red-500' : 'border-gray-300'
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

            {/* Cheque Details */}
            {paymentMethod === 'cheque' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Cheque Details</h3>

                {/* Cheque Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cheque Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.chequeNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="e.g. 12345678"
                  />
                  {errors.chequeNumber && (
                    <p className="text-xs text-red-500 mt-1">{errors.chequeNumber}</p>
                  )}
                </div>

                {/* Cheque Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cheque Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.chequeDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.chequeDate && (
                    <p className="text-xs text-red-500 mt-1">{errors.chequeDate}</p>
                  )}
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issuing Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.bankName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="e.g. Meezan Bank"
                  />
                  {errors.bankName && (
                    <p className="text-xs text-red-500 mt-1">{errors.bankName}</p>
                  )}
                </div>
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
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>
              {errors.date && (
                <p className="text-xs text-red-500 mt-1">{errors.date}</p>
              )}
            </div>

            {/* Reference Number */}
            {paymentMethod !== 'cheque' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                  {(paymentMethod === 'bank_transfer') && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.reference ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder={
                    paymentMethod === 'bank_transfer' ? 'Transaction ID' :
                      'Reference number (optional)'
                  }
                />
                {errors.reference && (
                  <p className="text-xs text-red-500 mt-1">{errors.reference}</p>
                )}
              </div>
            )}

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
