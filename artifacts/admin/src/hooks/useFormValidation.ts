import { useState, useCallback, useRef } from "react";
import { validateForm, isFormValid } from "@workspace/validation/validate";
import type { FormErrors, ValidationSchema } from "@workspace/validation/validate";

export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  schema: ValidationSchema<T>,
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dirtyRef = useRef(false);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    dirtyRef.current = true;
    setValues((prev: T) => ({ ...prev, [key]: value }));
    if (touched[key]) {
      const fieldErrors = validateForm(
        { [key]: value } as unknown as Partial<T>,
        { [key]: schema[key] } as ValidationSchema<Partial<T>>,
      );
      setErrors((prev: FormErrors<T>) => ({
        ...prev,
        ...fieldErrors,
        ...(fieldErrors[key] ? {} : { [key]: undefined }),
      }));
    }
  }, [touched, schema]);

  const handleBlur = useCallback(<K extends keyof T>(key: K) => {
    setTouched((prev: Partial<Record<keyof T, boolean>>) => ({ ...prev, [key]: true }));
    const fieldErrors = validateForm(
      { [key]: values[key] } as unknown as Partial<T>,
      { [key]: schema[key] } as ValidationSchema<Partial<T>>,
    );
    setErrors((prev: FormErrors<T>) => ({ ...prev, ...fieldErrors }));
  }, [values, schema]);

  const validateAll = useCallback(() => {
    const allErrors = validateForm(values, schema);
    setErrors(allErrors);
    setTouched(
      Object.fromEntries(Object.keys(schema).map(k => [k, true])) as Partial<Record<keyof T, boolean>>,
    );
    return isFormValid(allErrors);
  }, [values, schema]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    dirtyRef.current = false;
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty: dirtyRef.current,
    setField,
    handleBlur,
    validateAll,
    setIsSubmitting,
    reset,
    isValid: isFormValid(errors),
  };
}
