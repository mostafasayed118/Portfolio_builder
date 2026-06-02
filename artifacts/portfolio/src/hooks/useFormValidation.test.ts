import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormValidation } from "@workspace/ui/hooks";
import type { RuleFn } from "@workspace/validation/validate";

const required =
  (msg = "Required"): RuleFn =>
  (v) =>
    (v == null || (typeof v === "string" && v.trim() === "")) ? msg : null;

const minLen =
  (n: number, msg?: string): RuleFn =>
  (v) =>
    typeof v === "string" && v.trim().length < n ? (msg ?? `Min ${n}`) : null;

type Form = { name: string; email: string; message: string };

const schema = {
  name: [required("Name is required"), minLen(2, "Name too short")],
  email: [required("Email is required")],
  message: [required("Message is required")],
};

const renderForm = () =>
  renderHook(() =>
    useFormValidation<Form>({ name: "", email: "", message: "" }, schema),
  );

describe("useFormValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty values, no errors, no touched, not submitting", () => {
    const { result } = renderForm();
    expect(result.current.values).toEqual({ name: "", email: "", message: "" });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it("setField updates the value and marks the form dirty", () => {
    const { result } = renderForm();
    act(() => result.current.setField("name", "Ada"));
    expect(result.current.values.name).toBe("Ada");
    expect(result.current.isDirty).toBe(true);
  });

  it("setField on a previously-touched field clears that field's error when the new value is valid", () => {
    const { result } = renderForm();
    act(() => result.current.handleBlur("name"));
    expect(result.current.errors.name).toBe("Name is required");
    act(() => result.current.setField("name", "Bob"));
    expect(result.current.errors.name).toBeUndefined();
  });

  it("setField on a previously-touched field sets an error when the new value is still invalid", () => {
    const { result } = renderForm();
    act(() => result.current.handleBlur("name"));
    act(() => result.current.setField("name", "x"));
    expect(result.current.errors.name).toBe("Name too short");
  });

  it("setField on a never-touched field does not pre-emptively set an error", () => {
    const { result } = renderForm();
    act(() => result.current.setField("name", ""));
    expect(result.current.errors.name).toBeUndefined();
  });

  it("handleBlur marks the field as touched and runs single-field validation", () => {
    const { result } = renderForm();
    act(() => result.current.handleBlur("email"));
    expect(result.current.touched.email).toBe(true);
    expect(result.current.errors.email).toBe("Email is required");
  });

  it("validateAll returns false and sets all errors + all touched when invalid", () => {
    const { result } = renderForm();
    let isValid: boolean | undefined;
    act(() => {
      isValid = result.current.validateAll();
    });
    expect(isValid).toBe(false);
    expect(result.current.errors).toEqual({
      name: "Name is required",
      email: "Email is required",
      message: "Message is required",
    });
    expect(result.current.touched).toEqual({
      name: true,
      email: true,
      message: true,
    });
  });

  it("validateAll returns true when all fields are valid", () => {
    const { result } = renderForm();
    act(() => result.current.setField("name", "Ada"));
    act(() => result.current.setField("email", "ada@example.com"));
    act(() => result.current.setField("message", "Hello there friend"));
    let isValid: boolean | undefined;
    act(() => {
      isValid = result.current.validateAll();
    });
    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it("setIsSubmitting flips the submitting flag", () => {
    const { result } = renderForm();
    act(() => result.current.setIsSubmitting(true));
    expect(result.current.isSubmitting).toBe(true);
    act(() => result.current.setIsSubmitting(false));
    expect(result.current.isSubmitting).toBe(false);
  });

  it("reset restores initial values, clears errors, touched, and submitting", () => {
    const { result } = renderForm();
    act(() => result.current.setField("name", "Ada"));
    act(() => result.current.handleBlur("email"));
    act(() => result.current.setIsSubmitting(true));
    act(() => result.current.reset());
    expect(result.current.values).toEqual({ name: "", email: "", message: "" });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it("isValid reflects current errors reactively", () => {
    const { result } = renderForm();
    expect(result.current.isValid).toBe(true);
    act(() => result.current.handleBlur("message"));
    expect(result.current.isValid).toBe(false);
  });
});
