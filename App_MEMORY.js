import { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  FlatList, StyleSheet, StatusBar,
} from "react-native";
import { signInAnonymously } from "firebase/auth";
import {
  addDoc, collection, getDocs, limit,
  query, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./src/firebase";

const EMOJIS = ["🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🐸", "🐵"];

const makeDeck = () =>
  [...EMOJIS, ...EMOJIS]
    .map((value) => ({ value, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((c, i) => ({ id: i, value: c.value, matched: false }));

export default function App() {
  const [uid, setUid] = useState(null);
  const [cards, setCards] = useState(makeDeck);
  const [open, setOpen] = useState([]);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeSec, setTimeSec] = useState(0);
  const [screen, setScreen] = useState("play");
  const [name, setName] = useState("");
  const [ranking, setRanking] = useState([]);
  const [error, setError] = useState("");
  const startRef = useRef(null);

  useEffect(() => {
    signInAnonymously(auth)
      .then((cred) => setUid(cred.user.uid))
      .catch((e) => setError("ログイン失敗: " + (e.code || e.message)));
  }, []);

  useEffect(() => {
    if (screen !== "play") return;
    const t = setInterval(() => {
      if (startRef.current) {
        setTimeSec(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [screen]);

  const onTap = (id) => {
    if (lock || open.includes(id) || cards[id].matched) return;
    if (!startRef.current) startRef.current = Date.now();

    const next = [...open, id];
    setOpen(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    setLock(true);
    const [a, b] = next;

    if (cards[a].value === cards[b].value) {
      const updated = cards.map((c) =>
        next.includes(c.id) ? { ...c, matched: true } : c
      );
      setCards(updated);
      setOpen([]);
      setLock(false);
      if (updated.every((c) => c.matched)) {
        setTimeSec(Math.round((Date.now() - startRef.current) / 1000));
        setScreen("done");
      }
    } else {
      setTimeout(() => {
        setOpen([]);
        setLock(false);
      }, 800);
    }
  };

  const onSave = async () => {
    try {
      setError("");
      await addDoc(collection(db, "scores"), {
        uid,
        name: name.trim(),
        moves,
        timeSec,
        createdAt: serverTimestamp(),
      });
      const q = query(collection(db, "scores"), limit(10));
      const snap = await getDocs(q);
      setRanking(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setScreen("rank");
    } catch (e) {
      setError("エラー: " + (e.code || e.message));
    }
  };

  const reset = () => {
    setCards(makeDeck());
    setOpen([]);
    setLock(false);
    setMoves(0);
    setTimeSec(0);
    setName("");
    setError("");
    startRef.current = null;
    setScreen("play");
  };

  if (!uid) {
    return (
      <View style={s.center}>
        <Text>{error || "ログイン中..."}</Text>
      </View>
    );
  }

  if (screen === "done") {
    return (
      <View style={s.center}>
        <Text style={s.title}>クリア！</Text>
        <Text style={s.text}>{moves}手 / {timeSec}秒</Text>
        <TextInput
          style={s.input}
          placeholder="名前（12文字まで）"
          maxLength={12}
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity
          style={[s.btn, !name.trim() && { opacity: 0.4 }]}
          disabled={!name.trim()}
          onPress={onSave}
        >
          <Text style={s.btnText}>ランキングに登録</Text>
        </TouchableOpacity>
        {!!error && <Text style={s.error}>{error}</Text>}
      </View>
    );
  }

  if (screen === "rank") {
    return (
      <View style={s.center}>
        <Text style={s.title}>ランキング</Text>
        <FlatList
          style={{ width: "90%", flexGrow: 0 }}
          data={ranking}
          keyExtractor={(i) => i.id}
          renderItem={({ item, index }) => (
            <Text style={s.row}>
              {index + 1}. {item.name} {item.moves}手 / {item.timeSec}秒
            </Text>
          )}
        />
        <TouchableOpacity style={s.btn} onPress={reset}>
          <Text style={s.btnText}>もう一度遊ぶ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.center}>
      <Text style={s.title}>神経衰弱</Text>
      <Text style={s.text}>{moves}手 / {timeSec}秒</Text>
      <View style={s.grid}>
        {cards.map((c) => {
          const faceUp = c.matched || open.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[s.card, faceUp && s.cardUp]}
              onPress={() => onTap(c.id)}
            >
              <Text style={s.emoji}>{faceUp ? c.value : "？"}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: StatusBar.currentHeight || 40,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "bold" },
  text: { fontSize: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 320, gap: 8 },
  card: {
    width: 72, height: 72, borderRadius: 8,
    backgroundColor: "#4a6cf7", alignItems: "center", justifyContent: "center",
  },
  cardUp: { backgroundColor: "#fff", borderWidth: 2, borderColor: "#4a6cf7" },
  emoji: { fontSize: 32, color: "#fff" },
  input: {
    width: 220, borderWidth: 1, borderColor: "#999",
    borderRadius: 6, padding: 10,
  },
  btn: { backgroundColor: "#4a6cf7", padding: 12, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "bold" },
  row: { fontSize: 18, paddingVertical: 4 },
  error: { color: "red" },
});
