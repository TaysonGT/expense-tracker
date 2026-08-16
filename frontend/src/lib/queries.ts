import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type { Category, Expense } from "../types";

/**
 * Raw shapes as they come off the wire (cost is a numeric string or null).
 */
interface ExpenseDto extends Omit<Expense, "cost"> {
  cost: string | null;
}

function normalizeExpense(dto: ExpenseDto): Expense {
  return {
    ...dto,
    cost: dto.cost != null ? Number(dto.cost) : null,
  };
}

export const queryKeys = {
  categories: ["categories"] as const,
  expenses: (filters?: ExpenseFilters) =>
    ["expenses", filters ?? {}] as const,
  pending: ["expenses", "pending"] as const,
};

/* ------------------------------- Categories ------------------------------ */

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async (): Promise<Category[]> => {
      const { data } = await api.get<Category[]>("/categories");
      return data;
    },
  });
}

/* -------------------------------- Expenses ------------------------------- */

export interface ExpenseFilters {
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  pending?: boolean;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: queryKeys.expenses(filters),
    queryFn: async (): Promise<Expense[]> => {
      const params: Record<string, string> = {};
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.pending !== undefined)
        params.pending = String(filters.pending);

      const { data } = await api.get<ExpenseDto[]>("/expenses", { params });
      return data.map(normalizeExpense);
    },
  });
}

export function usePendingExpenses() {
  return useQuery({
    queryKey: queryKeys.pending,
    queryFn: async (): Promise<Expense[]> => {
      const { data } = await api.get<ExpenseDto[]>("/expenses/pending");
      return data.map(normalizeExpense);
    },
  });
}

/* ------------------------------- Mutations ------------------------------- */

export interface ManualExpenseInput {
  title: string;
  cost: number;
  categoryId: string;
  date?: string;
}

export function useCreateManualExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ManualExpenseInput): Promise<Expense> => {
      const { data } = await api.post<ExpenseDto>("/expenses", input);
      return normalizeExpense(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export interface VoiceEntryInput {
  transcript: string;
  date?: string;
}

export function useVoiceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VoiceEntryInput): Promise<Expense[]> => {
      const { data } = await api.post<ExpenseDto[]>("/voice-entry", input);
      return data.map(normalizeExpense);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export interface ApproveExpenseInput {
  id: string;
  title?: string;
  cost?: number;
  categoryId?: string;
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: ApproveExpenseInput): Promise<Expense> => {
      const { data } = await api.patch<ExpenseDto>(
        `/expenses/${id}/approve`,
        body
      );
      return normalizeExpense(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
