import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Check, Loader, X } from "lucide-react";

interface ActionOverlayState {
  open: boolean;
  status: "loading" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
}

interface ActionOverlayContextValue {
  /**
   * Trigger the action overlay with a promise-based async action.
   * Shows loading → success/error → auto-closes (or waits for confirm on error).
   */
  runWithOverlay: <T,>(
    action: () => Promise<T>,
    options: {
      loadingTitle: string;
      loadingMessage?: string;
      successTitle: string;
      successMessage?: string;
      errorTitle?: string;
      errorMessage?: string;
      autoCloseSuccess?: boolean;
      autoCloseDelay?: number;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ) => Promise<T | null>;

  /**
   * Simple fire-and-forget overlay for actions that don't return a value.
   */
  showOverlay: (options: {
    title: string;
    message?: string;
    status: "loading" | "success" | "error";
    duration?: number;
    onConfirm?: () => void;
  }) => void;
}

const ActionOverlayContext = createContext<ActionOverlayContextValue>({
  runWithOverlay: async () => null,
  showOverlay: () => {},
});

export function useActionOverlay() {
  return useContext(ActionOverlayContext);
}

interface ActionOverlayProviderProps {
  children: ReactNode;
}

export function ActionOverlayProvider({ children }: ActionOverlayProviderProps) {
  const [state, setState] = useState<ActionOverlayState>({
    open: false,
    status: "loading",
    title: "",
    message: "",
  });

  const runWithOverlay = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: {
        loadingTitle: string;
        loadingMessage?: string;
        successTitle: string;
        successMessage?: string;
        errorTitle?: string;
        errorMessage?: string;
        autoCloseSuccess?: boolean;
        autoCloseDelay?: number;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
      }
    ): Promise<T | null> => {
      const {
        loadingTitle,
        loadingMessage,
        successTitle,
        successMessage,
        errorTitle = "Error",
        errorMessage = "Something went wrong",
        autoCloseSuccess = true,
        autoCloseDelay = 1200,
        onSuccess,
        onError,
      } = options;

      setState({
        open: true,
        status: "loading",
        title: loadingTitle,
        message: loadingMessage ?? "",
      });

      try {
        const result = await action();
        setState({
          open: true,
          status: "success",
          title: successTitle,
          message: successMessage ?? "",
        });

        if (autoCloseSuccess) {
          setTimeout(() => {
            setState((s) => ({ ...s, open: false }));
          }, autoCloseDelay);
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({
          open: true,
          status: "error",
          title: errorTitle,
          message: errorMessage ?? error.message,
        });
        onError?.(error);
        return null;
      }
    },
    []
  );

  const showOverlay = useCallback(
    (options: {
      title: string;
      message?: string;
      status: "loading" | "success" | "error";
      duration?: number;
      onConfirm?: () => void;
    }) => {
      setState({
        open: true,
        status: options.status,
        title: options.title,
        message: options.message ?? "",
      });

      if (options.duration && options.status !== "loading") {
        setTimeout(() => {
          setState((s) => ({ ...s, open: false }));
          options.onConfirm?.();
        }, options.duration);
      }
    }, []);

  return (
    <ActionOverlayContext.Provider value={{ runWithOverlay, showOverlay }}>
      {children}
      <ActionOverlayRenderer state={state} />
    </ActionOverlayContext.Provider>
  );
}

function ActionOverlayRenderer({ state }: { state: ActionOverlayState }) {
  const isLoading = state.status === "loading";
  const isSuccess = state.status === "success";
  const isError = state.status === "error";

  const icon = isLoading
    ? <Loader className="animate-spin" size={22} />
    : isSuccess
    ? <Check size={26} />
    : <X size={26} />;

  const iconBg = isError ? "bg-danger" : "bg-primary";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
        state.open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center gap-4 rounded-3xl bg-card p-8 shadow-xl transition-all duration-300 ${
          state.open
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        }`}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-background ${iconBg}`}>
          {icon}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-primary">{state.title}</p>
          {state.message && (
            <p className="mt-0.5 text-xs text-empty-title">{state.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}