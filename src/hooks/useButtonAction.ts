import { useState, useCallback } from 'react';

/**
 * Custom hook to prevent duplicate button clicks and actions
 * Useful for preventing race conditions in async operations
 */
export const useButtonAction = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const executeAction = useCallback(async <T>(
    action: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await action();
      onSuccess?.(result);
      return result;
    } catch (error) {
      onError?.(error as Error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  return { isProcessing, executeAction };
};
