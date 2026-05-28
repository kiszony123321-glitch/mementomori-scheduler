import { useMemo, useState, useEffect } from "react";
import { Clock3, Flame, Skull, Trees, Plus, Trash2 } from "lucide-react";

export default function App() {
  const places = [
    { name: "Podest", icon: Skull },
    { name: "Żarówa", icon: Flame },
    { name: "Koniec Lasu", icon: Trees },
  ];

  const [reservations, setReservations] = useState(() => {
    const saved = localStorage.getItem("mementoReservations");
    return saved ? JSON.parse(saved) : [
      { id: 1, player: "Mroczny", place: "Podest", date: "2026-05-29", from: "18:00", to: "20:00" },
      { id: 2, player: "Azrael", place: "Żarówa", date: "2026-05-29", from: "21:00", to: "23:00" },
    ];
  });

  const [form, setForm] = useState({
    player: "",
    place: "Podest",
    date: new Date().toISOString().split("T")[0],
    from: "",
    to: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("mementoReservations", JSON.stringify(reservations));
  }, [reservations]);

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.from.localeCompare(b.from);
    });
  }, [reservations]);

  const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

  const isOngoing = (date, from, to) => {
    if (date !== new Date().toISOString().split("T")[0]) return false;
    const now = new Date();
    const current = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    return current >= from && current <= to;
  };

  const handleReservation = () => {
    setError("");
    if (!form.player?.trim()) return setError("Podaj nick gracza.");
    if (!form.from || !form.to) return setError("Wybierz godziny.");
    if (form.from >= form.to) return setError("Godzina zakończenia musi być późniejsza.");

    const conflict = reservations.find(r => 
      r.place === form.place && r.date === form.date && overlaps(form.from, form.to, r.from, r.to)
    );

    if (conflict) {
      setError(`Zajęte przez ${conflict.player}`);
      return;
    }

    setReservations(prev => [...prev, { id: Date.now(), ...form }]);
    setForm(prev => ({ ...prev, player: "", from: "", to: "" }));
  };

  const deleteReservation = (id) => {
    setReservations(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      color: '#ddd',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.15
      }} />

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #000, #1a1a1a, #000)' }} />
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '900px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(185,28,28,0.25) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 1
      }} />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontSize: '5.5rem',
            fontWeight: '900',
            letterSpacing: '0.08em',
            color: '#e11d48',
            textShadow: '0 0 40px rgba(225,29,72,0.8)',
            margin: 0
          }}>
            MEMENTOMORI
          </h1>
          <p style={{ color: '#aaa', marginTop: '16px', fontSize: '1.2rem' }}>
            Rezerwacja spotów na żywo dla członków gildii
          </p>
        </div>

        {/* Form */}
        <div style={{
          backgroundColor: 'rgba(20,20,20,0.95)',
          border: '1px solid #450a0a',
          borderRadius: '24px',
          padding: '32px',
          marginBottom: '50px',
          boxShadow: '0 0 30px rgba(185,28,28,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '52px', height: '52px', backgroundColor: '#450a0a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #9f1239' }}>
              <Plus size={28} color="#f87171" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Dodaj Rezerwację</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <input
              type="text"
              placeholder="Nick gracza"
              value={form.player}
              onChange={(e) => setForm({ ...form, player: e.target.value })}
              style={{ backgroundColor: '#111', border: '1px solid #444', padding: '16px', borderRadius: '12px', color: 'white' }}
            />
            <select
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value })}
              style={{ backgroundColor: '#111', border: '1px solid #444', padding: '16px', borderRadius: '12px', color: 'white' }}
            >
              {places.map(p => <option key={p.name}>{p.name}</option>)}
            </select>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ backgroundColor: '#111', border: '1px solid #444', padding: '16px', borderRadius: '12px', color: 'white' }} />
            <input type="time" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} style={{ backgroundColor: '#111', border: '1px solid #444', padding: '16px', borderRadius: '12px', color: 'white' }} />
            <input type="time" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} style={{ backgroundColor: '#111', border: '1px solid #444', padding: '16px', borderRadius: '12px', color: 'white' }} />

            <button
              onClick={handleReservation}
              style={{
                backgroundColor: '#b91c1c',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '12px',
                padding: '16px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.1rem'
              }}
            >
              REZERWUJ
            </button>
          </div>

          {error && <div style={{ marginTop: '20px', color: '#fda4af', backgroundColor: '#450a0a', padding: '16px', borderRadius: '12px', border: '1px solid #9f1239' }}>{error}</div>}
        </div>

        {/* Places */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
          {places.map((place) => {
            const Icon = place.icon;
            const placeRes = sortedReservations.filter(r => r.place === place.name);

            return (
              <div key={place.name} style={{
                backgroundColor: 'rgba(20,20,20,0.9)',
                border: '1px solid #444',
                borderRadius: '24px',
                padding: '28px',
                boxShadow: '0 0 25px rgba(185,28,28,0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '64px', height: '64px', backgroundColor: '#111', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #9f1239' }}>
                    <Icon size={36} color="#f87171" />
                  </div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{place.name}</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {placeRes.length > 0 ? placeRes.map(res => {
                    const ongoing = isOngoing(res.date, res.from, res.to);
                    return (
                      <div key={res.id} style={{
                        backgroundColor: '#111',
                        border: ongoing ? '1px solid #ef4444' : '1px solid #444',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{res.player}</div>
                          <div style={{ color: '#999', marginTop: '4px' }}>
                            <Clock3 size={16} style={{ display: 'inline', marginRight: '6px' }} />
                            {res.from} — {res.to}
                          </div>
                        </div>
                        <button onClick={() => deleteReservation(res.id)} style={{ color: '#f87171' }}>
                          <Trash2 size={24} />
                        </button>
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666', border: '2px dashed #444', borderRadius: '16px' }}>
                      Spot wolny
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}