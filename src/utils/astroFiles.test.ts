import { describe, expect, it } from "vitest";
import { inspectFits, inspectXisf } from "./astroFiles";

function card(key: string, value?: string) { return value == null ? key.padEnd(80) : `${key.padEnd(8)}= ${value}`.padEnd(80); }
describe("astronomy file inspection", () => {
  it("reads a FITS header and uncompressed pixel sample", () => {
    const header = [card("SIMPLE", "T"), card("BITPIX", "16"), card("NAXIS", "2"), card("NAXIS1", "2"), card("NAXIS2", "2"), card("OBJECT", "'M31'"), card("EXPTIME", "120"), card("END")].join("").padEnd(2880);
    const bytes = new Uint8Array(2888); bytes.set(new TextEncoder().encode(header)); const view = new DataView(bytes.buffer); [10, 20, 30, 40].forEach((value, index) => view.setInt16(2880 + index * 2, value, false));
    const result = inspectFits(bytes); expect(result.width).toBe(2); expect(result.object).toBe("M31"); expect(result.maximum).toBe(40);
  });
  it("reads XISF geometry and properties", () => {
    const xml = '<xisf><Image geometry="100:80:3" sampleFormat="UInt16"><Property id="Observation:Object:Name" value="Jupiter"/></Image></xisf>'; const payload = new TextEncoder().encode(xml); const bytes = new Uint8Array(16 + payload.length); bytes.set(new TextEncoder().encode("XISF0100")); new DataView(bytes.buffer).setUint32(8, payload.length, true); bytes.set(payload, 16);
    const result = inspectXisf(bytes); expect(result.width).toBe(100); expect(result.channels).toBe(3); expect(result.object).toBe("Jupiter");
  });
});
