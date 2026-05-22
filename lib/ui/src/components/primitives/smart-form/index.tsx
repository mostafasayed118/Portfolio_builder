import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  validationRules?: ValidationRule[];
  onValidationChange?: (isValid: boolean) => void;
  debounceMs?: number;
  showSuccess?: boolean;
}

export function SmartInput({
  validationRules = [],
  onValidationChange,
  debounceMs = 300,
  showSuccess = true,
  value,
  onChange,
  ...props
}: SmartInputProps) {
  const [status, setStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [error, setError] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const validate = useCallback((val: string) => {
    for (const rule of validationRules) {
      if (!rule.validate(val)) {
        setError(rule.message);
        setStatus("invalid");
        return false;
      }
    }
    setError("");
    setStatus("valid");
    return true;
  }, [validationRules]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(e);

    if (validationRules.length === 0) return;

    setStatus("validating");

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const isValid = validate(newValue);
      onValidationChange?.(isValid);
    }, debounceMs);
  }, [onChange, validationRules, validate, debounceMs, onValidationChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <input
        {...props}
        value={value}
        onChange={handleChange}
        className={`pr-10 ${props.className || ""}`}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {status === "validating" && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {status === "valid" && showSuccess && (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
        {status === "invalid" && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
      </div>
      {status === "invalid" && error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  validationRules?: ValidationRule[];
  onValidationChange?: (isValid: boolean) => void;
  debounceMs?: number;
  showSuccess?: boolean;
}

export function SmartTextarea({
  validationRules = [],
  onValidationChange,
  debounceMs = 500,
  showSuccess = true,
  value,
  onChange,
  ...props
}: SmartTextareaProps) {
  const [status, setStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [error, setError] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const validate = useCallback((val: string) => {
    for (const rule of validationRules) {
      if (!rule.validate(val)) {
        setError(rule.message);
        setStatus("invalid");
        return false;
      }
    }
    setError("");
    setStatus("valid");
    return true;
  }, [validationRules]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange?.(e);

    if (validationRules.length === 0) return;

    setStatus("validating");

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const isValid = validate(newValue);
      onValidationChange?.(isValid);
    }, debounceMs);
  }, [onChange, validationRules, validate, debounceMs, onValidationChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        {...props}
        value={value}
        onChange={handleChange}
        className={`${props.className || ""}`}
      />
      {status === "valid" && showSuccess && (
        <div className="absolute right-3 top-3">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </div>
      )}
      {status === "invalid" && error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}

export function createValidationRules() {
  return {
    required: (message = "This field is required"): ValidationRule => ({
      validate: (value) => value.trim().length > 0,
      message,
    }),
    minLength: (min: number, message?: string): ValidationRule => ({
      validate: (value) => value.length >= min,
      message: message || `Minimum ${min} characters required`,
    }),
    maxLength: (max: number, message?: string): ValidationRule => ({
      validate: (value) => value.length <= max,
      message: message || `Maximum ${max} characters allowed`,
    }),
    url: (message = "Please enter a valid URL"): ValidationRule => ({
      validate: (value) => {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message,
    }),
    email: (message = "Please enter a valid email"): ValidationRule => ({
      validate: (value) => {
        if (!value) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message,
    }),
  };
}
