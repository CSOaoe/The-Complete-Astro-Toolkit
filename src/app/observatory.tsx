import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Body,
  Equator,
  EquatorFromVector,
  Observer,
  RotateVector,
  Rotation_EQJ_EQD,
  Spherical,
  VectorFromSphere,
} from "astronomy-engine";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { AlpacaClient, AlpacaDevice } from "@/services/alpaca";
import { useAppData } from "@/context/AppDataContext";
import { horizontalCoordinates } from "@/utils/astronomy";
import { isAboveLocalHorizon } from "@/utils/horizon";
import { angularSeparation } from "@/utils/planning";

interface DeviceStatus {
  device: AlpacaDevice;
  values: Record<string, unknown>;
  error?: string;
}
export default function ObservatoryScreen() {
  const { observer, horizon } = useAppData();
  const params = useLocalSearchParams<{ ra?: string; dec?: string }>();
  const [address, setAddress] = useState("http://192.168.1.20:11111"),
    [client, setClient] = useState<AlpacaClient | null>(null),
    [devices, setDevices] = useState<AlpacaDevice[]>([]),
    [statuses, setStatuses] = useState<DeviceStatus[]>([]),
    [message, setMessage] = useState(""),
    [updated, setUpdated] = useState(""),
    [busy, setBusy] = useState(false);
  const [ra, setRa] = useState(params.ra ?? ""),
    [dec, setDec] = useState(params.dec ?? ""),
    [pending, setPending] = useState<{
      device: AlpacaDevice;
      kind: "connect" | "slew";
      ra: number;
      dec: number;
    } | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) =>
      setActive(s === "active"),
    );
    return () => sub.remove();
  }, []);
  const refresh = useCallback(async () => {
    if (!client || lock.current) return;
    lock.current = true;
    const gen = generation.current;
    try {
      const results: DeviceStatus[] = [];
      for (const d of devices) {
        try {
          const connected = await client.read<boolean>(d, "connected");
          const properties =
            d.DeviceType.toLowerCase() === "telescope"
              ? ["rightascension", "declination", "slewing", "atpark"]
              : d.DeviceType.toLowerCase() === "camera"
                ? ["ccdtemperature", "camerastate"]
                : ["position", "ismoving"];
          const values: Record<string, unknown> = { connected };
          if (connected)
            for (const p of properties)
              values[p] = await client.read(d, p).catch(() => "Unavailable");
          results.push({ device: d, values });
        } catch (e) {
          results.push({
            device: d,
            values: {},
            error: e instanceof Error ? e.message : "Device unavailable",
          });
        }
      }
      if (gen === generation.current) {
        setStatuses(results);
        setUpdated(new Date().toLocaleTimeString());
      }
    } finally {
      lock.current = false;
    }
  }, [client, devices]);
  useFocusEffect(
    useCallback(() => {
      if (!active) return;
      void refresh();
      const timer = setInterval(() => void refresh(), 10000);
      return () => {
        clearInterval(timer);
        generation.current++;
      };
    }, [refresh, active]),
  );
  const command = async () => {
    if (!client || !pending || busy) return;
    setBusy(true);
    try {
      const p = pending;
      setPending(null);
      if (p.kind === "connect") {
        await client.write(p.device, "connected", { Connected: "true" });
        setMessage("Connection requested. Refresh to check device status.");
      } else {
        const ok = await client.read<boolean>(p.device, "canslewasync");
        const parked = await client.read<boolean>(p.device, "atpark");
        const moving = await client.read<boolean>(p.device, "slewing");
        const lat = await client.read<number>(p.device, "sitelatitude"),
          lon = await client.read<number>(p.device, "sitelongitude");
        if (ok !== true || parked !== false || moving !== false)
          throw new Error(
            "Mount must support asynchronous slewing, be unparked and stationary.",
          );
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon) ||
          Math.abs(lat - observer.latitude) > 0.2 ||
          Math.abs(((lon - observer.longitude + 540) % 360) - 180) > 0.2
        )
          throw new Error(
            "Mount site does not match the app observing location. Correct the site settings before slewing.",
          );
        const now = new Date();
        const sun = Equator(
          Body.Sun,
          now,
          new Observer(lat, lon, 0),
          false,
          true,
        );
        const horizontal = horizontalCoordinates(
          p.ra * 15,
          p.dec,
          observer,
          now,
        );
        if (
          horizontal.altitudeDegrees < 20 ||
          !isAboveLocalHorizon(
            horizon,
            horizontal.azimuthDegrees,
            horizontal.altitudeDegrees,
          ) ||
          angularSeparation(p.ra, p.dec, sun.ra, sun.dec) < 25
        )
          throw new Error(
            "Target is too low, obstructed by your local horizon, or too close to the Sun for this command.",
          );
        const system = await client.read<number>(p.device, "equatorialsystem");
        let coords = { ra: p.ra, dec: p.dec };
        if (system === 1) {
          const eq = EquatorFromVector(
            RotateVector(
              Rotation_EQJ_EQD(now),
              VectorFromSphere(new Spherical(p.dec, p.ra * 15, 1), now),
            ),
          );
          coords = { ra: eq.ra, dec: eq.dec };
        } else if (system !== 2)
          throw new Error(
            "This mount coordinate system is not supported for pointing.",
          );
        await client.write(p.device, "slewtocoordinatesasync", {
          RightAscension: String(coords.ra),
          Declination: String(coords.dec),
        });
        setMessage(
          "Slew command accepted. Monitor the mount and use Stop motion if needed.",
        );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Command failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <SectionHeader
        title="Observatory connection"
        subtitle="Optional ASCOM Alpaca devices on your Wi-Fi network"
      />
      <Card>
        <Input
          label="Alpaca server address"
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={uiStyles.muted}>
          Enter the address shown by your Alpaca server. Your phone and server
          must share a network. Listing devices does not connect hardware or
          start motion.
        </Text>
        <Button
          title="Read server devices"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            setPending(null);
            generation.current++;
            setClient(null);
            setStatuses([]);
            setDevices([]);
            try {
              const next = new AlpacaClient(address);
              void next
                .devices()
                .then((list) => {
                  setClient(next);
                  setDevices(list);
                  setMessage(
                    list.length
                      ? "Device list loaded."
                      : "No supported devices found.",
                  );
                })
                .catch((e) => setMessage(e.message))
                .finally(() => setBusy(false));
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Invalid server");
              setBusy(false);
            }
          }}
        />
      </Card>
      <Text style={uiStyles.muted} accessibilityLiveRegion="polite">
        {message}
      </Text>
      <Text style={uiStyles.muted}>
        Last read: {updated || "not yet"} · automatic refresh while this screen
        is active
      </Text>
      {statuses.map((s) => (
        <Card key={`${s.device.DeviceType}-${s.device.DeviceNumber}`}>
          <Text style={uiStyles.h3}>
            {s.device.DeviceName} · {s.device.DeviceType}
          </Text>
          {s.error ? (
            <Text style={uiStyles.body}>{s.error}</Text>
          ) : (
            Object.entries(s.values).map(([k, v]) => (
              <Text key={k} style={uiStyles.body}>
                {k}: {String(v)}
              </Text>
            ))
          )}
          {s.values.connected === false ? (
            <Button
              title="Review hardware connection"
              variant="secondary"
              disabled={busy}
              onPress={() =>
                setPending({ device: s.device, kind: "connect", ra: 0, dec: 0 })
              }
            />
          ) : null}
          {s.device.DeviceType.toLowerCase() === "telescope" &&
          s.values.connected === true ? (
            <>
              <Input
                label="Target J2000 RA (hours, 0–24)"
                value={ra}
                onChangeText={setRa}
                keyboardType="decimal-pad"
              />
              <Input
                label="Target J2000 Dec (degrees, −90 to 90)"
                value={dec}
                onChangeText={setDec}
                keyboardType="numbers-and-punctuation"
              />
              <Button
                title="Review slew to coordinates"
                disabled={busy}
                onPress={() => {
                  if (
                    !ra.trim() ||
                    !dec.trim() ||
                    !Number.isFinite(+ra) ||
                    !Number.isFinite(+dec) ||
                    +ra < 0 ||
                    +ra >= 24 ||
                    Math.abs(+dec) > 90
                  ) {
                    setMessage("Enter valid RA and Dec.");
                    return;
                  }
                  setPending({
                    device: s.device,
                    kind: "slew",
                    ra: +ra,
                    dec: +dec,
                  });
                }}
              />
              <Button
                title="STOP MOUNT MOTION"
                variant="danger"
                onPress={() => {
                  if (client)
                    void client
                      .write(s.device, "abortslew")
                      .then(() =>
                        setMessage(
                          "Stop requested. Verify the mount has stopped.",
                        ),
                      )
                      .catch((e) =>
                        setMessage(
                          `Stop request failed: ${e.message}. Use the mount controller.`,
                        ),
                      );
                }}
              />
            </>
          ) : null}
        </Card>
      ))}
      {pending ? (
        <Card>
          <Text style={uiStyles.h3}>
            Confirm{" "}
            {pending.kind === "slew" ? "mount movement" : "hardware connection"}
          </Text>
          <Text style={uiStyles.body}>
            {pending.device.DeviceName} at {client?.address}
            {pending.kind === "slew"
              ? ` → RA ${pending.ra}h, Dec ${pending.dec}°. Check the physical path, cables and surroundings before confirming.`
              : ". This connects the device driver to the equipment."}
          </Text>
          <View style={{ gap: 10 }}>
            <Button
              title="Confirm command"
              disabled={busy}
              onPress={() => void command()}
            />
            <Button
              title="Cancel"
              variant="secondary"
              disabled={busy}
              onPress={() => setPending(null)}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
