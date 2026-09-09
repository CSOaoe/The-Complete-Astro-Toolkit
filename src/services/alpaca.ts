export interface AlpacaDevice {
  DeviceName: string;
  DeviceType: string;
  DeviceNumber: number;
  UniqueID: string;
}
export function alpacaAddress(input: string) {
  const url = new URL(input.trim());
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  )
    throw new Error("Enter a server origin such as http://192.168.1.20:11111.");
  const host = url.hostname.toLowerCase();
  const ip = host.split(".").map(Number);
  const privateIp =
    ip.length === 4 &&
    ip.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
    (ip[0] === 10 ||
      ip[0] === 127 ||
      (ip[0] === 192 && ip[1] === 168) ||
      (ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31) ||
      (ip[0] === 169 && ip[1] === 254));
  if (
    url.protocol === "http:" &&
    !privateIp &&
    host !== "localhost" &&
    !host.endsWith(".local")
  )
    throw new Error(
      "Unencrypted connections are restricted to your local network. Use HTTPS for other servers.",
    );
  return url.origin;
}
let transaction = 0;
export class AlpacaClient {
  readonly address: string;
  constructor(address: string) {
    this.address = alpacaAddress(address);
  }
  async request<T>(
    path: string,
    method: "GET" | "PUT" = "GET",
    parameters: Record<string, string> = {},
  ): Promise<T> {
    const data = new URLSearchParams({
      ...parameters,
      ClientID: "17151",
      ClientTransactionID: String(++transaction),
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(
        `${this.address}${path}${method === "GET" ? `?${data}` : ""}`,
        {
          method,
          signal: controller.signal,
          ...(method === "PUT"
            ? {
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: data.toString(),
              }
            : {}),
        },
      );
      if (!response.ok)
        throw new Error(`Observatory server returned HTTP ${response.status}.`);
      const body = await response.json();
      if (!body || typeof body.ErrorNumber !== "number")
        throw new Error("This server did not return an Alpaca response.");
      if (body.ErrorNumber !== 0)
        throw new Error(
          `Device error ${body.ErrorNumber}: ${String(body.ErrorMessage || "Request failed")}`,
        );
      return body.Value as T;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError")
        throw new Error(
          "Observatory request timed out. Check Wi-Fi and the server address.",
        );
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  async devices() {
    const list = await this.request<AlpacaDevice[]>(
      "/management/v1/configureddevices",
    );
    if (
      !Array.isArray(list) ||
      !list.every(
        (d) =>
          d &&
          typeof d.DeviceName === "string" &&
          typeof d.DeviceType === "string" &&
          Number.isInteger(d.DeviceNumber) &&
          d.DeviceNumber >= 0,
      )
    )
      throw new Error("Invalid device list.");
    return list.filter((d) =>
      ["telescope", "camera", "focuser"].includes(d.DeviceType.toLowerCase()),
    );
  }
  read<T>(device: AlpacaDevice, property: string) {
    return this.request<T>(
      `/api/v1/${device.DeviceType.toLowerCase()}/${device.DeviceNumber}/${property}`,
    );
  }
  write(
    device: AlpacaDevice,
    property: string,
    parameters: Record<string, string> = {},
  ) {
    return this.request<void>(
      `/api/v1/${device.DeviceType.toLowerCase()}/${device.DeviceNumber}/${property}`,
      "PUT",
      parameters,
    );
  }
}
