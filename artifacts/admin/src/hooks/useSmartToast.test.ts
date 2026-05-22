import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSmartToast } from "./useSmartToast";

const { mockToast, mockDismiss } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockDismiss: vi.fn(),
}));

vi.mock("@workspace/ui", () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: mockDismiss,
    toasts: [],
  }),
  toast: mockToast,
  ToastAction: (props: any) => props,
}));

describe("useSmartToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("success calls toast with variant 'success'", () => {
    const { success } = useSmartToast();
    success({ title: "Done", description: "Item saved" });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Done", variant: "success" })
    );
  });

  it("error calls toast with variant 'destructive'", () => {
    const { error } = useSmartToast();
    error({ title: "Oops", description: "Failed" });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Oops", variant: "destructive" })
    );
  });

  it("warning calls toast with variant 'warning'", () => {
    const { warning } = useSmartToast();
    warning({ title: "Careful" });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Careful", variant: "warning" })
    );
  });

  it("info calls toast with variant 'default'", () => {
    const { info } = useSmartToast();
    info({ title: "FYI" });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "FYI", variant: "default" })
    );
  });

  it("apiError shows 'Network Error' for network errors", () => {
    const { apiError } = useSmartToast();
    apiError(new Error("network failure"));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Network Error" })
    );
  });

  it("apiError shows 'Session Expired' for 401 errors", () => {
    const { apiError } = useSmartToast();
    apiError(new Error("unauthorized 401"));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Session Expired" })
    );
  });

  it("apiError shows 'Request Timeout' for timeout errors", () => {
    const { apiError } = useSmartToast();
    apiError(new Error("request timeout exceeded"));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Request Timeout" })
    );
  });

  it("apiSuccess returns true on success, false on failure", () => {
    const { apiSuccess } = useSmartToast();
    const resultTrue = apiSuccess({ success: true, message: "OK" });
    expect(resultTrue).toBe(true);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success" })
    );

    vi.clearAllMocks();

    const resultFalse = apiSuccess({ success: false, message: "Failed" });
    expect(resultFalse).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Operation Failed" })
    );
  });
});
