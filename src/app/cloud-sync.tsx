import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import type { Session } from "@supabase/supabase-js";
import {
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
  uiStyles,
} from "@/components/ui";
import { useAppData, CloudSnapshot } from "@/context/AppDataContext";
import { cloudConfigured, supabase } from "@/services/supabase";
import { createThemedStyles, spacing } from "@/theme";

export default function CloudSyncScreen() {
  const router = useRouter();
  const data = useAppData();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data: current }) => setSession(current.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, value) => setSession(value),
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  const authenticate = async (mode: "signin" | "signup") => {
    if (!supabase) return;
    setBusy(true);
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setMessage(
      result.error?.message ??
        (mode === "signup" && !result.data.session
          ? "Check your email to confirm the account."
          : "Signed in."),
    );
    setBusy(false);
  };
  const push = async () => {
    if (!supabase || !session) return;
    setBusy(true);
    const payload: CloudSnapshot = {
      projects: data.projects,
      equipment: data.equipment,
      favourites: data.favourites,
      observer: data.observer,
      sessions: data.sessions,
      horizon: data.horizon,
      calibrationFrames: data.calibrationFrames,
    };
    const { error } = await supabase
      .from("astrotoolkit_backups")
      .upsert({
        user_id: session.user.id,
        payload,
        updated_at: new Date().toISOString(),
      });
    setMessage(error?.message ?? "Local data backed up to the cloud.");
    setBusy(false);
  };
  const pull = async () => {
    if (!supabase || !session) return;
    setBusy(true);
    const { data: row, error } = await supabase
      .from("astrotoolkit_backups")
      .select("payload")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) setMessage(error.message);
    else if (!row) setMessage("No cloud backup exists yet.");
    else {
      await data.restoreSnapshot(row.payload as CloudSnapshot);
      setMessage("Cloud backup restored to this device.");
    }
    setBusy(false);
  };
  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Equipment</Text>
      </Pressable>
      <SectionHeader
        title="Cloud sync"
        subtitle="Optional Supabase account backup across devices"
      />
      {!cloudConfigured ? (
        <>
          <Card style={styles.notice}>
            <Text style={uiStyles.h3}>Cloud project setup required</Text>
            <Text style={uiStyles.muted}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to
              an `.env.local` file. The app remains fully functional offline
              until configured.
            </Text>
          </Card>
          <Card>
            <Text style={uiStyles.h3}>Required Supabase table</Text>
            <Text style={styles.code}>
              create table astrotoolkit_backups ( user_id uuid primary key
              references auth.users, payload jsonb not null, updated_at
              timestamptz not null );
            </Text>
            <Text style={uiStyles.muted}>
              Enable Row Level Security and add SELECT, INSERT and UPDATE
              policies restricted to `auth.uid() = user_id`.
            </Text>
          </Card>
        </>
      ) : !session ? (
        <Card>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button
            title={busy ? "Please wait…" : "Sign in"}
            disabled={busy}
            onPress={() => void authenticate("signin")}
          />
          <Button
            title="Create account"
            variant="secondary"
            disabled={busy}
            onPress={() => void authenticate("signup")}
          />
        </Card>
      ) : (
        <>
          <Card>
            <Text style={uiStyles.h3}>{session.user.email}</Text>
            <Text style={uiStyles.muted}>
              Journal, equipment, favourites, observing site and session history
              are included in one encrypted-transport JSON backup.
            </Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <Button
              title={busy ? "Syncing…" : "Back up this device"}
              disabled={busy}
              onPress={() => void push()}
            />
            <Button
              title="Restore cloud backup"
              variant="secondary"
              disabled={busy}
              onPress={() => void pull()}
            />
            <Button
              title="Sign out"
              variant="danger"
              onPress={() => void supabase?.auth.signOut()}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}
const styles = createThemedStyles((colors) => ({
  back: { color: colors.blue, fontWeight: "700" },
  notice: { borderColor: colors.gold },
  code: {
    color: colors.success,
    backgroundColor: colors.input,
    padding: spacing.md,
    fontFamily: "monospace",
    lineHeight: 20,
  },
  message: { color: colors.gold, lineHeight: 20 },
}));
