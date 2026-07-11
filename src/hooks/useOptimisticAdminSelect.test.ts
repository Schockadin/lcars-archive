import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOptimisticAdminSelect } from "./useOptimisticAdminSelect";

describe("useOptimisticAdminSelect", () => {
  it("optimistically applies the new value while the action is pending", async () => {
    let resolveAction: (result: { error?: string }) => void = () => {};
    const action = vi.fn(
      () =>
        new Promise<{ error?: string }>((resolve) => {
          resolveAction = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useOptimisticAdminSelect<string>("public", action),
    );

    act(() => {
      result.current.change("private");
    });

    expect(result.current.value).toBe("private");
    expect(result.current.pending).toBe(true);

    await act(async () => {
      resolveAction({});
    });

    expect(action).toHaveBeenCalledWith("private");
  });

  it("sets an error message when the action reports one", async () => {
    const action = vi.fn().mockResolvedValue({ error: "Fehlgeschlagen" });

    const { result } = renderHook(() =>
      useOptimisticAdminSelect<string>("public", action),
    );

    act(() => {
      result.current.change("private");
    });

    await waitFor(() => expect(result.current.pending).toBe(false));

    expect(result.current.error).toBe("Fehlgeschlagen");
  });

  it("clears a previous error when a new change is started", async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ error: "Fehlgeschlagen" })
      .mockResolvedValueOnce({});

    const { result } = renderHook(() =>
      useOptimisticAdminSelect<string>("public", action),
    );

    act(() => {
      result.current.change("private");
    });
    await waitFor(() => expect(result.current.error).toBe("Fehlgeschlagen"));

    act(() => {
      result.current.change("public");
    });

    expect(result.current.error).toBeNull();
  });
});
