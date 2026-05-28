import { useEffect, useMemo, useState } from "react";
import { Clock3, Flame, Skull, Trees, Trash2 } from "lucide-react";
import { supabase } from "./supabase";

export default function App() {
  const places = [
    { name: "Podest", icon: Skull },
    { name: "Żarówa", icon: Flame },
    { name: "Koniec Lasu", icon: Trees },
  ];

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState("");

  const [auth, setAuth] = useState({ login: "", password: "" });

  const [form, setForm] = useState({
    player: "",
    place: "Podest",
    date: new Date().toISOString().split("T")[0],
    from: "",
    to: "",
  });

  // 🔐 AUTH SAFE
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

  // 🔥 LIVE SAFE
  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel("reservations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => fetchReservations()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchReservations = async () => {
    const { data } = await supabase.from("reservations").select("*");
    setReservations(Array.isArray(data) ? data : []);
  };

  const sorted = useMemo(() => {
    return [...reservations].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.from.localeCompare(b.from);
    });
  }, [reservations]);

  const overlaps = (a, b, c, d) => a < d && b > c;

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

  const add = async () => {
    setError("");

    if (!user) return setError("Zaloguj się");
    if (!form.player || !form.from || !form.to)
      return setError("Uzupełnij dane");
    if (form.from >= form.to) return setError("Błędny czas");

    const conflict = reservations.find(
      (r) =>
        r.place === form.place &&
        r.date === form.date &&
        overlaps(form.from, form.to, r.from, r.to)
    );

    if (conflict) return setError(`Zajęte przez ${conflict.player}`);

    await supabase.from("reservations").insert([
      { ...form, user_id: user.id },
    ]);

    setForm((p) => ({ ...p, player: "", from: "", to: "" }));
  };

  const del = async (id) => {
    await supabase.from("reservations").delete().eq("id", id);
  };

  // ⏳ LOADING GUARD
  if (loading) {
    return (
      <div style={styles.loading}>
        MEMENTOMORI...
      </div>
    );
  }

  // 🔒 LOGIN SCREEN (TWÓJ STYL)
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

  // 🌍 MAIN (TWÓJ STYL 1:1)
  return (
    <div style={styles.app}>
      <div style={styles.container}>
        <h1 style={styles.bigTitle}>MEMENTOMORI</h1>

        <div style={styles.userBar}>
          {user?.email?.split("@")?.[0] ?? "user"}
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
                setForm({ ...form, place: e.target.value })
              }
            >
              {places.map((p) => (
                <option key={p.name}>{p.name}</option>
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

            <button onClick={add} style={styles.btnRed}>
              REZERWUJ
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}
        </div>

        {/* 3 KOLUMNY */}
        <div style={styles.grid}>
          {places.map((place) => {
            const Icon = place.icon;

            return (
              <div key={place.name} style={styles.col}>
                <h2 style={styles.colTitle}>
                  <Icon size={20} /> {place.name}
                </h2>

                {sorted
                  .filter((r) => r.place === place.name)
                  .map((r) => (
                    <div key={r.id} style={styles.item}>
                      <div>
                        <b>{r.player}</b>
                        <div style={styles.time}>
                          {r.date} | {r.from} - {r.to}
                        </div>
                      </div>

                      {r.user_id === user.id && (
                        <button onClick={() => del(r.id)}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}

                {!sorted.some((r) => r.place === place.name) && (
                  <div style={styles.empty}>Brak rezerwacji</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* 💀 TWÓJ ORYGINALNY STYL */
const styles = {
  app: { minHeight: "100vh", background: "#000", color: "#ddd", fontFamily: "system-ui" },
  container: { maxWidth: 1200, margin: "0 auto", padding: 40 },
  bigTitle: { fontSize: "5.5rem", textAlign: "center", color: "#e11d48", textShadow: "0 0 40px rgba(225,29,72,0.8)" },
  userBar: { textAlign: "center", marginBottom: 30 },
  card: { background: "rgba(20,20,20,0.95)", border: "1px solid #450a0a", borderRadius: 24, padding: 32, marginBottom: 50, boxShadow: "0 0 30px rgba(185,28,72,0.3)" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 },
  col: { background: "rgba(20,20,20,0.9)", border: "1px solid #444", borderRadius: 24, padding: 28 },
  colTitle: { textAlign: "center", color: "#e11d48", marginBottom: 20, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" },
  item: { background: "#111", border: "1px solid #444", padding: 14, borderRadius: 16, marginBottom: 12, display: "flex", justifyContent: "space-between" },
  time: { color: "#999", marginTop: 4 },
  empty: { textAlign: "center", color: "#666", padding: 40 },
  input: { background: "#111", border: "1px solid #444", padding: 14, borderRadius: 12, color: "white" },
  btnRed: { background: "#b91c1c", color: "white", border: "none", borderRadius: 12, padding: 16, fontWeight: "bold", cursor: "pointer" },
  btnDark: { background: "#111", border: "1px solid #9f1239", color: "#f87171", padding: 14, borderRadius: 12 },
  error: { marginTop: 16, color: "#f87171" },
  loginWrap: { minHeight: "100vh", background: "#000", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" },
  loginCard: { width: 420, display: "flex", flexDirection: "column", gap: 10, zIndex: 2 },
  title: { textAlign: "center", fontSize: 40, color: "#e11d48", marginBottom: 20 },
  bg: { position: "absolute", inset: 0, background: "linear-gradient(to bottom,#000,#1a1a1a,#000)" },
  glow: { position: "absolute", width: 700, height: 350, background: "radial-gradient(circle, rgba(185,28,28,0.35), transparent 70%)", filter: "blur(90px)" },
  logout: { marginLeft: 10, background: "#111", border: "1px solid #444", color: "#fff", padding: 6, borderRadius: 8, cursor: "pointer" },
  loading: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#000", color: "#fff" },
};