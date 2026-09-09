import { afterEach, describe, expect, it, vi } from "vitest";
import { AlpacaClient, alpacaAddress } from "./alpaca";
afterEach(() => vi.unstubAllGlobals());
describe("Alpaca transport", () => {
  it("limits unencrypted endpoints to local networks", () => {
    expect(alpacaAddress("http://192.168.1.2:11111/")).toBe(
      "http://192.168.1.2:11111",
    );
    expect(() => alpacaAddress("http://example.com")).toThrow();
    expect(() => alpacaAddress("https://user:secret@example.com")).toThrow();
  });
  it("reads devices without issuing hardware commands", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ErrorNumber: 0,
          Value: [
            {
              DeviceName: "Mount",
              DeviceType: "Telescope",
              DeviceNumber: 0,
              UniqueID: "test",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetch);
    expect(
      await new AlpacaClient("http://localhost:11111").devices(),
    ).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].method).toBe("GET");
    expect(fetch.mock.calls[0][0]).toContain(
      "/management/v1/configureddevices?",
    );
  });
  it("encodes explicit writes and surfaces device errors", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ErrorNumber: 1024,
          ErrorMessage: "Not connected",
        }),
      });
    vi.stubGlobal("fetch", fetch);
    const client = new AlpacaClient("http://localhost:11111");
    await expect(
      client.write(
        {
          DeviceName: "Mount",
          DeviceType: "Telescope",
          DeviceNumber: 0,
          UniqueID: "test",
        },
        "connected",
        { Connected: "true" },
      ),
    ).rejects.toThrow("Device error 1024: Not connected");
    expect(fetch.mock.calls[0][1].method).toBe("PUT");
    expect(fetch.mock.calls[0][1].body).toContain("Connected=true");
  });
});
