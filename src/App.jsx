import { useMemo, useState, useEffect } from "react";
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

  const [authForm, setAuthForm] = useState({
    login: "",
    password: "",
  });

  const [form, setForm] = useState({
    player: "",
    place: "Podest",
    date: new Date().toISOString().split("T")[0],
    from: "",
    to: "",
  });

  // 🔐 AUTH SAFE FIX (NO WHITE / BLACK SCREEN)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);
      setLoading(false); // 🔥 KLUCZ
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // 🔥 LIVE DATA
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
    setReservations(data ?? []);
  };

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.from.localeCompare(b.from);
    });
  }, [reservations]);

  const overlaps = (aStart, aEnd, bStart, bEnd) =>
    aStart < bEnd && aEnd > bStart;

  // 🔑 LOGIN
  const login = async () => {
    setError("");

    const email = `${authForm.login}@guild.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: authForm.password,
    });

    if (error) setError(error.message);
  };

  const register = async () => {
    setError("");

    const email = `${authForm.login}@guild.local`;

    const { error } = await supabase.auth.signUp({
      email,
      password: authForm.password,
    });

    if (error) setError(error.message);
  };

  // 🚪 LOGOUT FIXED (NO WHITE SCREEN EVER)
  const logout = async () => {
    await supabase.auth.signOut();

    setUser(null);
    setReservations([]);
    setError("");
    setLoading(false); // 🔥 KLUCZOWE
  };

  // ➕ ADD
  const addReservation = async () => {
    setError("");

    if (!user) return setError("Zaloguj się.");
    if (!form.player.trim()) return setError("Podaj nick.");
    if (!form.from || !form.to) return setError("Ustaw godziny.");
    if (form.from >= form.to) return setError("Błędny czas.");

    const conflict = reservations.find(
      (r) =>
        r.place === form.place &&
        r.date === form.date &&
        overlaps(form.from, form.to, r.from, r.to)
    );

    if (conflict) return setError(`Zajęte przez ${conflict.player}`);

    await supabase.from("reservations").insert([
      {
        player: form.player,
        place: form.place,
        date: form.date,
        from: form.from,
        to: form.to,
        user_id: user.id,
      },
    ]);

    setForm((p) => ({ ...p, player: "", from: "", to: "" }));
  };

  const deleteReservation = async (id) => {
    await supabase.from("reservations").delete().eq("id", id);
  };

  // ⏳ LOADING SAFE
  if (loading) {
    return (
      <div style={styles.loading}>
        MEMENTOMORI...
      </div>
    );
  }

  // 🔒 LOGIN SCREEN SAFE
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
              setAuthForm({ ...authForm, login: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Hasło"
            style={styles.input}
            onChange={(e) =>
              setAuthForm({ ...authForm, password: e.target.value })
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

  // 🌍 MAIN APP
  return (
    <div style={styles.app}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.bigTitle}>MEMENTOMORI</h1>

          <div style={styles.userBar}>
            {user?.email?.split("@")[0] || "player"}
            <button onClick={logout} style={styles.logout}>
              logout
            </button>
          </div>
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

            <button onClick={addReservation} style={styles.btnRed}>
              REZERWUJ
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}
        </div>

        {/* 3 KOLUMNY */}
        <div style={styles.grid}>
          {places.map((place) => {
            const col = sortedReservations.filter(
              (r) => r.place === place.name
            );

            return (
              <div key={place.name} style={styles.col}>
                <h2 style={styles.colTitle}>{place.name}</h2>

                {col.map((r) => (
                  <div key={r.id} style={styles.item}>
                    <div>
                      <b>{r.player}</b>
                      <div style={styles.time}>
                        {r.date} | {r.from} - {r.to}
                      </div>
                    </div>

                    {r.user_id === user?.id && (
                      <button onClick={() => deleteReservation(r.id)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}

                {col.length === 0 && (
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

/* 💀 ORIGINAL DARK STYLE (SAFE) */
const styles = {
  app: {
    minHeight: "100vh",
    background: "#000",
    color: "#ddd",
    fontFamily: "system-ui",
  },

  loading: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#e11d48",
    fontSize: 30,
  },

  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: 40,
  },

  header: {
    textAlign: "center",
    marginBottom: 50,
  },

  bigTitle: {
    fontSize: "5rem",
    color: "#e11d48",
    textShadow: "0 0 40px rgba(225,29,72,0.8)",
  },

  userBar: {
    marginTop: 10,
  },

  card: {
    background: "rgba(20,20,20,0.95)",
    border: "1px solid #450a0a",
    borderRadius: 24,
    padding: 30,
    marginBottom: 40,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
    gap: 10,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
  },

  col: {
    background: "rgba(20,20,20,0.9)",
    border: "1px solid #444",
    borderRadius: 20,
    padding: 20,
  },

  colTitle: {
    textAlign: "center",
    color: "#e11d48",
    marginBottom: 10,
  },

  item: {
    background: "#111",
    border: "1px solid #444",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    display: "flex",
    justifyContent: "space-between",
  },

  time: {
    color: "#999",
    fontSize: 12,
  },

  empty: {
    textAlign: "center",
    color: "#666",
    padding: 20,
  },

  input: {
    background: "#111",
    border: "1px solid #444",
    padding: 14,
    borderRadius: 12,
    color: "white",
  },

  btnRed: {
    background: "#b91c1c",
    color: "white",
    border: "none",
    borderRadius: 12,
    padding: 14,
    cursor: "pointer",
    fontWeight: "bold",
  },

  btnDark: {
    background: "#111",
    border: "1px solid #9f1239",
    color: "#f87171",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },

  error: {
    marginTop: 15,
    color: "#f87171",
  },

  loginWrap: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  loginCard: {
    width: 400,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  title: {
    textAlign: "center",
    fontSize: 40,
    color: "#e11d48",
    marginBottom: 20,
  },

  bg: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom,#000,#1a1a1a,#000)",
  },

  glow: {
    position: "absolute",
    width: 600,
    height: 300,
    background: "radial-gradient(circle, rgba(185,28,28,0.3), transparent 70%)",
    filter: "blur(80px)",
  },

  logout: {
    marginLeft: 10,
    background: "#111",
    border: "1px solid #444",
    color: "#fff",
    padding: 6,
    borderRadius: 8,
    cursor: "pointer",
  },
};