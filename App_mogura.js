import { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  FlatList, StyleSheet, StatusBar,
} from "react-native";
import { signInAnonymously } from "firebase/auth";
import {
  addDoc, collection, getDocs, limit,
  orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./src/firebase";

const GAME_SEC = 30;
const HOLES = 9;
const COLLECTION = "scores2";

export default function App() {
  const [uid, setUid] = useState(null);
  const [screen, setScreen] = useState("start");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SEC);
  const [mole, setMole] = useState(-1);
  const [name, setName] = useState("");
  const [ranking, setRanking] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lastRef = useRef(-1);

  useEffect(() => {
    signInAnonymously(auth)
      .then((cred) => setUid(cred.user.uid))
      .catch((e) => setError("ログイン失敗: " + (e.code || e.message)));
  }, []);

  useEffect(() => {
    if (screen !== "play") return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    const moleTimer = setInterval(() => {
      let n = Math.floor(Math.random() * HOLES);
      while (n === lastRef.current) n = Math.floor(Math.random() * HOLES);
      lastRef.current = n;
      setMole(n);
    }, 700);
    return () => {
      clearInterval(timer);
      clearInterval(moleTimer);
    };
  }, [screen]);

  useEffect(() => {
    if (screen === "play" && timeLeft <= 0) {
      setMole(-1);
      setScreen("done");
    }
  }, [timeLeft, screen]);

  const start = () => {
    setScore(0);
    setTimeLeft(GAME_SEC);
    setMole(-1);
    lastRef.current = -1;
    setName("");
    setError("");
    setScreen("play");
  };

  const onHole = (i) => {
    if (screen !== "play" || i !== mole) return;
    setScore((s) => s + 1);
    setMole(-1);
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      setError("");
      await addDoc(collection(db, COLLECTION), {
        uid,
        name: name.trim(),
        score,
        createdAt: serverTimestamp(),
      });
      const q = query(
        collection(db, COLLECTION),
        orderBy("score", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      setRanking(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setScreen("rank");
    } catch (e) {
      setError("エラー: " + (e.code || e.message));
    }
    setSaving(false);
  };

  if (!uid) {
    return (
      <View style={s.center}>
        <Text>{error || "ログイン中..."}</Text>
      </View>
    );
  }

  if (screen === "start") {
    return (
      <View style={s.center}>
        <Text style={s.title}>もぐらたたき</Text>
        <Text style={s.text}>{GAME_SEC}秒でいくつ叩けるかな</Text>
        <TouchableOpacity style={s.btn} onPress={start}>
          <Text style={s.btnText}>スタート</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === "done") {
    return (
      <View style={s.center}>
        <Text style={s.title}>終了！</Text>
        <Text style={s.text}>{score}匹</Text>
        <TextInput
          style={s.input}
          placeholder="名前（12文字まで）"
          maxLength={12}
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity
          style={[s.btn, (!name.trim() || saving) && { opacity: 0.4 }]}
          disabled={!name.trim() || saving}
          onPress={onSave}
        >
          <Text style={s.btnText}>ランキングに登録</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSub} onPress={start}>
          <Text style={s.btnSubText}>登録せずにもう一度</Text>
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
              {index + 1}. {item.name} {item.score}匹
            </Text>
          )}
        />
        <TouchableOpacity style={s.btn} onPress={start}>
          <Text style={s.btnText}>もう一度遊ぶ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.center}>
      <Text style={s.title}>もぐらたたき</Text>
      <Text style={s.text}>残り {timeLeft}秒 / {score}匹</Text>
      <View style={s.grid}>
        {Array.from({ length: HOLES }).map((_, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            style={[s.hole, i === mole && s.holeUp]}
            onPress={() => onHole(i)}
          >
            <Text style={s.emoji}>{i === mole ? "🐹" : ""}</Text>
          </TouchableOpacity>
        ))}
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
  grid: { flexDirection: "row", flexWrap: "wrap", width: 320, gap: 10 },
  hole: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "#6b4a2b", alignItems: "center", justifyContent: "center",
  },
  holeUp: { backgroundColor: "#a67c52" },
  emoji: { fontSize: 48 },
  input: {
    width: 220, borderWidth: 1, borderColor: "#999",
    borderRadius: 6, padding: 10,
  },
  btn: { backgroundColor: "#4a6cf7", padding: 12, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "bold" },
  btnSub: { padding: 8 },
  btnSubText: { color: "#4a6cf7" },
  row: { fontSize: 18, paddingVertical: 4 },
  error: { color: "red" },
});
