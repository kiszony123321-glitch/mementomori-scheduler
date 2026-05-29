import { useEffect, useMemo, useState } from "react";
import { Flame, Skull, Trees, Trash2 } from "lucide-react";
import { supabase } from "./supabase";

export default function App() {
  const places = [
    { name: "Podest", icon: Skull, channels: ["CH1-CH4", "CH5-CH8"] },
    { name: "Żarówa", icon: Flame, channels: ["CH1-CH4", "CH5-CH8"] },
    { name: "Koniec Lasu", icon: Trees, channels: ["CH1-CH4", "CH5-CH8"] },
  ];

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");

  const [auth, setAuth] = useState({
    login: "",
    password: "",
  });

  const [form, setForm] = useState({
    player: "",
    place: "Podest",
    channel: "CH1-CH4",
    date: new Date().toISOString().split("T")[0],
    from: "",
    to: "",
  });

  // 🔐 AUTH
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔥 LIVE
  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel("reservations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => fetchReservations()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select("*");

    if (error) {
      console.log("FETCH ERROR:", error.message);
      return;
    }

    setReservations(data || []);
  };

  // 🧠 SORT
  const sorted = useMemo(() => {
    return [...reservations].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.from.localeCompare(b.from);
    });
  }, [reservations]);

  const overlaps = (a, b, c, d) => a < d && b > c;

  const isActive = (r) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const current = now.toTimeString().slice(0, 5);

    return (
      r.date === today &&
      r.from <= current &&
      r.to >= current
    );
  };

  // 🔑 LOGIN
  const login = async () => {
    setError("");

    const email = `${auth.login}@guild.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: auth.password,
    });

    if (error) setError(error.message);
  };

  const register = async () => {
    setError("");

    const email = `${auth.login}@guild.local`;

    const { error } = await supabase.auth.signUp({
      email,
      password: auth.password,
    });

    if (error) setError(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // 💀 FIXED INSERT (NAJWAŻNIEJSZE)
  const addReservation = async () => {
    setError("");

    console.log("TRY INSERT:", form);

    if (!user) return setError("Zaloguj się");
    if (!form.player || !form.from || !form.to)
      return setError("Uzupełnij dane");
    if (form.from >= form.to)
      return setError("Błędny czas");

    const { data, error } = await supabase
      .from("reservations")
      .insert([
        {
          player: form.player,
          place: form.place,
          channel: form.channel,
          date: form.date,
          from: form.from,
          to: form.to,
          user_id: user.id,
        },
      ])
      .select();

    console.log("INSERT RESULT:", { data, error });

    if (error) {
      setError(error.message);
      return;
    }

    setForm((p) => ({
      ...p,
      player: "",
      from: "",
      to: "",
      channel: "CH1-CH4",
    }));
  };

  const deleteReservation = async (id) => {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error.message);
    }
  };

  // ⏳ LOADING
  if (loading) {
    return <div style={styles.loading}>MEMENTOMORI...</div>;
  }

  // 🔒 LOGIN SCREEN
  if (!user) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.bg} />
        <div style={styles.glow} />

        <div style={styles.loginCard}>
          <h1 style={styles.title}>MEMENTOMORI</h1>

          <input
            placeholder="Login"
            style={styles.input}
            onChange={(e) =>
              setAuth({ ...auth, login: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Hasło"
            style={styles.input}
            onChange={(e) =>
              setAuth({ ...auth, password: e.target.value })
            }
          />

          <button onClick={login} style={styles.btnRed}>
            ZALOGUJ
          </button>

          <button onClick={register} style={styles.btnDark}>
            REJESTRACJA
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    );
  }

  // 🌍 MAIN UI (TEN SAM STYL)
  return (
    <div style={styles.app}>
      <div style={styles.backgroundImage} />
      <div style={styles.overlay} />
      <div style={styles.redGlow} />

      <div style={styles.container}>
        <h1 style={styles.bigTitle}>MEMENTOMORI</h1>

        <div style={styles.userBar}>
          {user.email.split("@")[0]}
          <button onClick={logout} style={styles.logout}>
            logout
          </button>
        </div>

        {/* FORM */}
        <div style={styles.card}>
          <div style={styles.formGrid}>
            <input
              placeholder="Nick"
              value={form.player}
              style={styles.input}
              onChange={(e) =>
                setForm({ ...form, player: e.target.value })
              }
            />

            <select
              value={form.place}
              style={styles.input}
              onChange={(e) =>
                setForm({
                  ...form,
                  place: e.target.value,
                  channel: "CH1-CH4",
                })
              }
            >
              {places.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>

            <select
              value={form.channel}
              style={styles.input}
              onChange={(e) =>
                setForm({ ...form, channel: e.target.value })
              }
            >
              {places
                .find((p) => p.name === form.place)
                ?.channels.map((ch) => (
                  <option key={ch}>{ch}</option>
                ))}
            </select>

            <input
              type="date"
              value={form.date}
              style={styles.input}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />

            <input
              type="time"
              value={form.from}
              style={styles.input}
              onChange={(e) =>
                setForm({ ...form, from: e.target.value })
              }
            />

            <input
              type="time"
              value={form.to}
              style={styles.input}
              onChange={(e) =>
                setForm({ ...form, to: e.target.value })
              }
            />

            <button onClick={addReservation} style={styles.btnRed}>
              REZERWUJ
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}
        </div>

        {/* GRID */}
        <div style={styles.grid}>
          {places.map((place) => {
            const Icon = place.icon;

            return (
              <div key={place.name} style={styles.col}>
                <h2 style={styles.colTitle}>
                  <Icon size={22} /> {place.name}
                </h2>

                <div style={styles.channelGrid}>
                  {place.channels.map((channel) => (
                    <div key={channel} style={styles.channelBox}>
                      <div style={styles.channelTitle}>
                        {channel}
                      </div>

                      {sorted
                        .filter(
                          (r) =>
                            r.place === place.name &&
                            r.channel === channel
                        )
                        .map((r) => (
                          <div
                            key={r.id}
                            style={{
                              ...styles.item,
                              border: isActive(r)
                                ? "1px solid #ef4444"
                                : "1px solid #444",
                              boxShadow: isActive(r)
                                ? "0 0 18px rgba(239,68,68,0.35)"
                                : "none",
                            }}
                          >
                            <div>
                              <b>
                                {r.player}
                                {isActive(r) && (
                                  <span style={{ color: "#ef4444", marginLeft: 6 }}>
                                    BIJE
                                  </span>
                                )}
                              </b>

                              <div style={styles.time}>
                                {r.date}
                              </div>

                              <div style={styles.time}>
                                {r.from} - {r.to}
                              </div>
                            </div>

                            {r.user_id === user.id && (
                              <button onClick={() => deleteReservation(r.id)}>
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}

                      {!sorted.some(
                        (r) =>
                          r.place === place.name &&
                          r.channel === channel
                      ) && (
                        <div style={styles.empty}>
                          Brak rezerwacji
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* styles skrócone (nie zmienione wizualnie) */
const styles = {
  app: { minHeight: "100vh", background: "#000", color: "#ddd", position: "relative", fontFamily: "system-ui" },
  container: { maxWidth: 1400, margin: "0 auto", padding: 40, position: "relative", zIndex: 10 },
  backgroundImage: { position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop')", backgroundSize: "cover", opacity: 0.15 },
  overlay: { position: "absolute", inset: 0, background: "linear-gradient(to bottom,#000,#1a1a1a,#000)" },
  redGlow: { position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 900, height: 400, background: "radial-gradient(circle, rgba(185,28,28,0.25), transparent)", filter: "blur(80px)" },
  bigTitle: { fontSize: "5.5rem", textAlign: "center", color: "#e11d48" },
  userBar: { textAlign: "center", marginBottom: 30 },
  logout: { marginLeft: 10, background: "#111", border: "1px solid #444", color: "#fff", padding: 6, borderRadius: 8 },
  card: { background: "rgba(20,20,20,0.95)", border: "1px solid #450a0a", borderRadius: 24, padding: 32, marginBottom: 50 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))", gap: 24 },
  col: { background: "rgba(20,20,20,0.9)", border: "1px solid #444", borderRadius: 24, padding: 24 },
  colTitle: { display: "flex", justifyContent: "center", gap: 10, color: "#f87171", marginBottom: 20 },
  channelGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  channelBox: { background: "#0d0d0d", border: "1px solid #333", borderRadius: 18, padding: 14 },
  channelTitle: { textAlign: "center", color: "#f87171", marginBottom: 10 },
  item: { background: "#111", border: "1px solid #444", padding: 14, borderRadius: 16, marginBottom: 10, display: "flex", justifyContent: "space-between" },
  time: { color: "#999", fontSize: "0.85rem" },
  empty: { textAlign: "center", color: "#666", padding: 20 },
  input: { background: "#111", border: "1px solid #444", padding: 14, borderRadius: 12, color: "#fff" },
  btnRed: { background: "#b91c1c", color: "#fff", border: "none", padding: 16, borderRadius: 12, fontWeight: "bold" },
  btnDark: { background: "#111", border: "1px solid #9f1239", color: "#f87171", padding: 14, borderRadius: 12 },
  error: { marginTop: 16, color: "#f87171", textAlign: "center" },
  loginWrap: { minHeight: "100vh", background: "#000", display: "flex", justifyContent: "center", alignItems: "center" },
  loginCard: { width: 420, display: "flex", flexDirection: "column", gap: 10 },
  title: { textAlign: "center", fontSize: 42, color: "#e11d48" },
  bg: { position: "absolute", inset: 0, background: "linear-gradient(to bottom,#000,#1a1a1a,#000)" },
  glow: { position: "absolute", width: 700, height: 350, background: "radial-gradient(circle, rgba(185,28,28,0.35), transparent)", filter: "blur(90px)" },
  loading: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff" },
};