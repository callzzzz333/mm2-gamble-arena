import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseButtonActionOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook to prevent double-clicks and handle button loading states
 * Automatically prevents duplicate requests and manages UI feedback
 */
export const useButtonAction = (options: UseButtonActionOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const execute = useCallback(
    async (action: () => Promise<any>) => {
      // Prevent duplicate requests
      if (isLoading) {
        console.log('Request already in progress, ignoring duplicate click');
        return;
      }

      // Generate unique request ID
      const requestId = `${Date.now()}-${Math.random()}`;
      requestIdRef.current = requestId;

      setIsLoading(true);

      try {
        const result = await action();

        // Only process if this is still the current request
        if (requestIdRef.current === requestId) {
          if (options.successMessage) {
            toast({ 
              title: options.successMessage,
              duration: 2000,
            });
          }
          options.onSuccess?.(result);
        }

        return result;
      } catch (error: any) {
        // Only process if this is still the current request
        if (requestIdRef.current === requestId) {
          console.error('Button action error:', error);
          toast({
            title: options.errorMessage || error.message || 'An error occurred',
            variant: 'destructive',
            duration: 3000,
          });
          options.onError?.(error);
        }
        throw error;
      } finally {
        // Only reset loading if this is still the current request
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
          requestIdRef.current = null;
        }
      }
    },
    [isLoading, options, toast]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    requestIdRef.current = null;
  }, []);

  return { execute, isLoading, reset };
};
