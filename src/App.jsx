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

  // 🔐 AUTH
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
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
    setReservations(data || []);
  };

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.from.localeCompare(b.from);
    });
  }, [reservations]);

  const overlaps = (aStart, aEnd, bStart, bEnd) =>
    aStart < bEnd && aEnd > bStart;

  // 🔑 AUTH
  const login = async () => {
    const email = `${authForm.login}@guild.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: authForm.password,
    });

    if (error) setError(error.message);
  };

  const register = async () => {
    const email = `${authForm.login}@guild.local`;

    const { error } = await supabase.auth.signUp({
      email,
      password: authForm.password,
    });

    if (error) setError(error.message);
  };

  // 🚪 LOGOUT (FIX)
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // 🔥 POWRÓT DO LOGINU 1:1
  };

  // ➕ ADD
  const addReservation = async () => {
    setError("");

    if (!user) return setError("Zaloguj się.");
    if (!form.player.trim()) return setError("Podaj nick.");
    if (!form.from || !form.to) return setError("Godziny.");
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

  // 🔒 LOGIN SCREEN
  if (!user) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.bg1} />
        <div style={styles.bgGlow} />

        <div style={styles.loginBox}>
          <h1 style={styles.title}>MEMENTOMORI</h1>

          <input
            placeholder="Login"
            onChange={(e) =>
              setAuthForm({ ...authForm, login: e.target.value })
            }
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Hasło"
            onChange={(e) =>
              setAuthForm({ ...authForm, password: e.target.value })
            }
            style={styles.input}
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

  // 🌍 MAIN (GRID 3 COLS)
  return (
    <div style={styles.app}>
      <div style={styles.bgImage} />
      <div style={styles.bgDark} />

      <div style={styles.container}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h1 style={styles.titleBig}>MEMENTOMORI</h1>

          <p style={{ color: "#aaa" }}>
            Rezerwacje gildii live
          </p>

          <div style={{ marginTop: 10 }}>
            {user.email.split("@")[0]}{" "}
            <button onClick={logout}>Logout</button>
          </div>
        </div>

        {/* FORM */}
        <div style={styles.card}>
          <div style={styles.gridForm}>
            <input
              placeholder="Nick"
              value={form.player}
              onChange={(e) =>
                setForm({ ...form, player: e.target.value })
              }
              style={styles.input}
            />

            <select
              value={form.place}
              onChange={(e) =>
                setForm({ ...form, place: e.target.value })
              }
              style={styles.input}
            >
              {places.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>

            <input type="date" style={styles.input}
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />

            <input type="time" style={styles.input}
              value={form.from}
              onChange={(e) =>
                setForm({ ...form, from: e.target.value })
              }
            />

            <input type="time" style={styles.input}
              value={form.to}
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
        <div style={styles.gridTable}>
          {places.map((place) => {
            const col = sortedReservations.filter(
              (r) => r.place === place.name
            );

            return (
              <div key={place.name} style={styles.column}>
                <h2 style={styles.colTitle}>{place.name}</h2>

                {col.length === 0 && (
                  <div style={styles.empty}>Brak rezerwacji</div>
                )}

                {col.map((r) => (
                  <div key={r.id} style={styles.row}>
                    <div>
                      <b>{r.player}</b>
                      <div style={{ color: "#999", fontSize: 13 }}>
                        📅 {r.date}<br />
                        ⏰ {r.from} - {r.to}
                      </div>
                    </div>

                    {r.user_id === user.id && (
                      <button onClick={() => deleteReservation(r.id)}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* 🎨 STYLES */
const styles = {
  app: {
    minHeight: "100vh",
    background: "#000",
    color: "#ddd",
    position: "relative",
    fontFamily: "system-ui",
  },

  container: {
    position: "relative",
    maxWidth: 1200,
    margin: "0 auto",
    padding: 40,
  },

  titleBig: {
    fontSize: "5rem",
    color: "#e11d48",
    textShadow: "0 0 40px rgba(225,29,72,0.8)",
  },

  card: {
    background: "rgba(20,20,20,0.95)",
    border: "1px solid #450a0a",
    padding: 30,
    borderRadius: 24,
    marginBottom: 40,
  },

  gridForm: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
    gap: 10,
  },

  gridTable: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
  },

  column: {
    background: "rgba(20,20,20,0.9)",
    border: "1px solid #333",
    borderRadius: 20,
    padding: 15,
    minHeight: 400,
  },

  colTitle: {
    textAlign: "center",
    color: "#e11d48",
    marginBottom: 10,
  },

  row: {
    background: "#111",
    border: "1px solid #444",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    display: "flex",
    justifyContent: "space-between",
  },

  empty: {
    textAlign: "center",
    color: "#666",
    padding: 30,
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
    fontWeight: "bold",
    cursor: "pointer",
  },

  btnDark: {
    background: "#111",
    border: "1px solid #9f1239",
    color: "#f87171",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    cursor: "pointer",
  },

  error: {
    marginTop: 15,
    padding: 10,
    background: "#450a0a",
    color: "#fca5a5",
    borderRadius: 10,
  },

  loginWrap: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#000",
  },

  bg1: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom,#000,#1a1a1a,#000)",
  },

  bgGlow: {
    position: "absolute",
    width: 600,
    height: 300,
    background: "radial-gradient(circle, rgba(185,28,28,0.35), transparent 70%)",
    filter: "blur(80px)",
  },
};