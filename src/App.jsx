import { useMemo, useState, useEffect } from "react";
import { Clock3, Flame, Skull, Trees, Plus, Trash2 } from "lucide-react";
import { supabase } from "./supabase";

export default function App() {
  const places = [
    { name: "Podest", icon: Skull },
    { name: "Żarówa", icon: Flame },
    { name: "Koniec Lasu", icon: Trees },
  ];

  const [reservations, setReservations] = useState([]);
  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    player: "",
    place: "Podest",
    date: new Date().toISOString().split("T")[0],
    from: "",
    to: "",
  });

  const [authForm, setAuthForm] = useState({
    login: "",
    password: "",
  });

  const [error, setError] = useState("");

  // 🔐 AUTH STATE
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🔥 LIVE DATA
  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel("reservations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        () => fetchReservations()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchReservations = async () => {
    const { data } = await supabase.from("reservations").select("*");
    setReservations(data || []);
  };

  // 📅 GROUP
  const groupedReservations = useMemo(() => {
    const sorted = [...reservations].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.from.localeCompare(b.from);
    });

    return sorted.reduce((acc, res) => {
      if (!acc[res.date]) acc[res.date] = [];
      acc[res.date].push(res);
      return acc;
    }, {});
  }, [reservations]);

  const overlaps = (aStart, aEnd, bStart, bEnd) =>
    aStart < bEnd && aEnd > bStart;

  const isOngoing = (date, from, to) => {
    if (date !== new Date().toISOString().split("T")[0]) return false;
    const now = new Date();
    const current = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    return current >= from && current <= to;
  };

  // 🔑 LOGIN (fake email system)
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

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const handleReservation = async () => {
    setError("");

    if (!user) return setError("Zaloguj się.");
    if (!form.player?.trim()) return setError("Podaj nick.");
    if (!form.from || !form.to) return setError("Godziny wymagane.");
    if (form.from >= form.to)
      return setError("Zła godzina.");

    const conflict = reservations.find(
      (r) =>
        r.place === form.place &&
        r.date === form.date &&
        overlaps(form.from, form.to, r.from, r.to)
    );

    if (conflict) return setError(`Zajęte przez ${conflict.player}`);

    const { error } = await supabase.from("reservations").insert([
      {
        player: form.player,
        place: form.place,
        date: form.date,
        from: form.from,
        to: form.to,
        user_id: user.id,
      },
    ]);

    if (error) setError(error.message);

    setForm((p) => ({ ...p, player: "", from: "", to: "" }));
  };

  const deleteReservation = async (id) => {
    await supabase.from("reservations").delete().eq("id", id);
  };

  return (
    <div style={{ background: "#000", color: "#ddd", minHeight: "100vh", padding: "30px" }}>

      {/* LOGIN */}
      {!user ? (
        <div style={{ marginBottom: 30 }}>
          <h2>Login</h2>

          <input
            placeholder="login"
            onChange={(e) =>
              setAuthForm({ ...authForm, login: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="hasło"
            onChange={(e) =>
              setAuthForm({ ...authForm, password: e.target.value })
            }
          />

          <button onClick={login}>Zaloguj</button>
          <button onClick={register}>Rejestracja</button>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          Zalogowany ✔
          <button onClick={logout}>Logout</button>
        </div>
      )}

      {/* FORM */}
      <div>
        <input
          placeholder="Nick"
          value={form.player}
          onChange={(e) => setForm({ ...form, player: e.target.value })}
        />

        <select
          value={form.place}
          onChange={(e) => setForm({ ...form, place: e.target.value })}
        >
          {places.map((p) => (
            <option key={p.name}>{p.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />

        <input
          type="time"
          value={form.from}
          onChange={(e) => setForm({ ...form, from: e.target.value })}
        />

        <input
          type="time"
          value={form.to}
          onChange={(e) => setForm({ ...form, to: e.target.value })}
        />

        <button onClick={handleReservation}>REZERWUJ</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* LIST */}
      {places.map((place) => (
        <div key={place.name} style={{ marginTop: 40 }}>
          <h2>{place.name}</h2>

          {Object.entries(groupedReservations).map(([date, items]) => (
            <div key={date}>
              <h4 style={{ color: "red" }}>{date}</h4>

              {items
                .filter((r) => r.place === place.name)
                .map((res) => (
                  <div key={res.id} style={{ padding: 10, border: "1px solid #444" }}>
                    {res.player} — {res.from} - {res.to}

                    {res.user_id === user?.id && (
                      <button onClick={() => deleteReservation(res.id)}>
                        <Trash2 />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}