import { useState, useEffect } from "react";
import { accountMappingsApi, accountsApi } from "../../../lib/apiClient";
import type { Account, AccountMapping } from "../../../lib/types";

interface RentalAccountMappings {
  cashAccount: Account | null;
  bankAccount: Account | null;
  arAccount: Account | null;
  assetsAccount: Account | null;
  securityDepositsAccount: Account | null;
  incomeAccount: Account | null;
  damageIncomeAccount: Account | null;
  lossAccount: Account | null;
}

interface UseRentalAccountMappingsResult {
  mappings: RentalAccountMappings;
  loading: boolean;
  error: string | null;
  isConfigured: {
    cash: boolean;
    bank: boolean;
    ar: boolean;
    assets: boolean;
    securityDeposits: boolean;
    income: boolean;
    damageIncome: boolean;
    loss: boolean;
  };
  hasRequiredMappings: boolean;
  getPaymentAccounts: () => Account[];
  getRefundAccounts: () => Account[];
}

export function useRentalAccountMappings(): UseRentalAccountMappingsResult {
  const [mappings, setMappings] = useState<RentalAccountMappings>({
    cashAccount: null,
    bankAccount: null,
    arAccount: null,
    assetsAccount: null,
    securityDepositsAccount: null,
    incomeAccount: null,
    damageIncomeAccount: null,
    lossAccount: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMappings = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load account mappings
        const mappingsResponse = await accountMappingsApi.getAccountMappings();
        const rentalMappings = mappingsResponse.data.filter(
          (m: AccountMapping) => m.mapping_type.startsWith('rental_')
        );

        // Load all accounts
        const accountsResponse = await accountsApi.getAccounts({
          company_id: 1,
          per_page: 1000,
          is_group: false,
        });

        const accountsMap = new Map(accountsResponse.data.map((acc: Account) => [acc.id, acc]));

        // Map accounts
        const mappedAccounts: RentalAccountMappings = {
          cashAccount: null,
          bankAccount: null,
          arAccount: null,
          assetsAccount: null,
          securityDepositsAccount: null,
          incomeAccount: null,
          damageIncomeAccount: null,
          lossAccount: null,
        };

        rentalMappings.forEach((mapping: AccountMapping) => {
          const account = accountsMap.get(mapping.account_id);
          if (account) {
            switch (mapping.mapping_type) {
              case 'rental_cash':
                mappedAccounts.cashAccount = account;
                break;
              case 'rental_bank':
                mappedAccounts.bankAccount = account;
                break;
              case 'rental_ar':
                mappedAccounts.arAccount = account;
                break;
              case 'rental_assets':
                mappedAccounts.assetsAccount = account;
                break;
              case 'rental_security_deposits':
                mappedAccounts.securityDepositsAccount = account;
                break;
              case 'rental_income':
                mappedAccounts.incomeAccount = account;
                break;
              case 'rental_damage_income':
                mappedAccounts.damageIncomeAccount = account;
                break;
              case 'rental_asset_loss':
                mappedAccounts.lossAccount = account;
                break;
            }
          }
        });

        setMappings(mappedAccounts);
      } catch (e) {
        console.error("Failed to load rental account mappings:", e);
        setError("Failed to load account mappings");
      } finally {
        setLoading(false);
      }
    };

    void loadMappings();
  }, []);

  const isConfigured = {
    cash: mappings.cashAccount !== null,
    bank: mappings.bankAccount !== null,
    ar: mappings.arAccount !== null,
    assets: mappings.assetsAccount !== null,
    securityDeposits: mappings.securityDepositsAccount !== null,
    income: mappings.incomeAccount !== null,
    damageIncome: mappings.damageIncomeAccount !== null,
    loss: mappings.lossAccount !== null,
  };

  const hasRequiredMappings =
    isConfigured.cash &&
    isConfigured.ar &&
    isConfigured.assets &&
    isConfigured.securityDeposits &&
    isConfigured.income;

  const getPaymentAccounts = (): Account[] => {
    const accounts: Account[] = [];
    if (mappings.cashAccount) accounts.push(mappings.cashAccount);
    if (mappings.bankAccount) accounts.push(mappings.bankAccount);
    return accounts;
  };

  const getRefundAccounts = (): Account[] => {
    return getPaymentAccounts(); // Same accounts for refunds
  };

  return {
    mappings,
    loading,
    error,
    isConfigured,
    hasRequiredMappings,
    getPaymentAccounts,
    getRefundAccounts,
  };
}
