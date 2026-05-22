import { createElement } from "react";
import { useToast, ToastAction, type ToastActionElement } from "@workspace/ui";
import { categorizeError } from "@/lib/error-messages";

interface SmartToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function toToastAction(action: { label: string; onClick: () => void }): ToastActionElement {
  return createElement(ToastAction, { altText: action.label, onClick: action.onClick }, action.label) as unknown as ToastActionElement;
}

export function useSmartToast() {
  const { toast, dismiss, toasts } = useToast();

  const success = (options: SmartToastOptions) => {
    toast({
      title: options.title ?? "Success",
      description: options.description,
      variant: "success",
      duration: options.duration ?? 3000,
      action: options.action ? toToastAction(options.action) : undefined,
    });
  };

  const error = (options: SmartToastOptions) => {
    toast({
      title: options.title ?? "Error",
      description: options.description,
      variant: "destructive",
      duration: options.duration ?? 5000,
      action: options.action ? toToastAction(options.action) : undefined,
    });
  };

  const warning = (options: SmartToastOptions) => {
    toast({
      title: options.title ?? "Warning",
      description: options.description,
      variant: "warning",
      duration: options.duration ?? 4000,
      action: options.action ? toToastAction(options.action) : undefined,
    });
  };

  const info = (options: SmartToastOptions) => {
    toast({
      title: options.title ?? "Info",
      description: options.description,
      variant: "default",
      duration: options.duration ?? 3000,
      action: options.action ? toToastAction(options.action) : undefined,
    });
  };

  const apiError = (err: unknown, fallbackMessage = "An error occurred") => {
    const { category, message } = categorizeError(err);

    switch (category) {
      case "network":
        toast({ title: "Network Error", description: "Please check your internet connection and try again.", variant: "destructive", duration: 6000 });
        break;
      case "auth":
        toast({ title: "Session Expired", description: "Please sign in again to continue.", variant: "destructive", duration: 5000, action: toToastAction({ label: "Sign In", onClick: () => window.location.reload() }) });
        break;
      case "timeout":
        toast({ title: "Request Timeout", description: "The request took too long. Please try again.", variant: "warning", duration: 4000 });
        break;
      default:
        toast({ title: "Error", description: message || fallbackMessage, variant: "destructive", duration: 5000 });
    }
  };

  const apiSuccess = (res: { success?: boolean; message?: string }, successMessage = "Operation completed") => {
    if (res.success) {
      toast({
        title: "Success",
        description: res.message ?? successMessage,
        variant: "success",
        duration: 3000,
      });
      return true;
    }
    
    toast({
      title: "Operation Failed",
      description: res.message ?? "Something went wrong",
      variant: "destructive",
      duration: 4000,
    });
    return false;
  };

  return {
    toast,
    dismiss,
    toasts,
    success,
    error,
    warning,
    info,
    apiError,
    apiSuccess,
  };
}