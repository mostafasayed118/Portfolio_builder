import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, useRef } from "react";

interface SmartQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  staleTime?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

interface SmartQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  retry: () => Promise<void>;
}

export function useSmartQuery<T>(options: SmartQueryOptions<T>): SmartQueryResult<T> {
  const [manualRetry, setManualRetry] = useState(false);
  
  const query = useQuery({
    queryKey: options.queryKey,
    queryFn: async () => {
      try {
        const result = await options.queryFn();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        options.onError?.(error);
        throw error;
      }
    },
    enabled: options.enabled,
    retry: options.retry ?? 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: options.staleTime ?? 60_000,
  });

  const onSuccessRef = useRef(options.onSuccess);
  onSuccessRef.current = options.onSuccess;

  useEffect(() => {
    if (query.isSuccess && query.data !== undefined) {
      onSuccessRef.current?.(query.data);
    }
  }, [query.isSuccess, query.data]);

  const retry = useCallback(async () => {
    setManualRetry(true);
    await query.refetch();
    setManualRetry(false);
  }, [query.refetch]);

  return {
    data: query.data as T | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: async () => { await query.refetch(); },
    retry,
  };
}

export function useSmartMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    onSettled?: () => void;
  }
) {
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);

  const mutation = useCallback(async (variables: TVariables) => {
    try {
      const result = await mutationFn(variables);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      options?.onError?.(error);
      throw error;
    } finally {
      options?.onSettled?.();
    }
  }, [mutationFn, options]);

  const retryMutation = useCallback(async (variables: TVariables) => {
    setIsRetrying(true);
    try {
      return await mutation(variables);
    } finally {
      setIsRetrying(false);
    }
  }, [mutation]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return {
    mutate: mutation,
    mutateAsync: retryMutation,
    isLoading: false,
    isRetrying,
    invalidate,
  };
}