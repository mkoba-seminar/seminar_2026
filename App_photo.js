import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Button, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { signInAnonymously } from 'firebase/auth';
import { addDoc, collection, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from './src/firebase';

export default function App() {
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [checked, setChecked] = useState({});
  const [message, setMessage] = useState('認証中...');
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const videoContainerRef = useRef(null);

  const loadPhotos = async () => {
    try {
      setMessage('一覧を取得中...');
      const snap = await getDocs(query(collection(db, 'photos'), orderBy('createdAt', 'desc'), limit(20)));
      setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMessage(`${snap.size}件の写真を取得しました`);
    } catch (e) { setMessage('取得エラー: ' + e.message); }
  };

  useEffect(() => {
    signInAnonymously(auth).then(() => { setReady(true); loadPhotos(); })
      .catch(e => setMessage('認証エラー: ' + e.message));
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    if (Platform.OS !== 'web') {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert('カメラの許可が必要です'); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.2, base64: true });
        if (!result.canceled && result.assets?.[0]?.base64) {
          const asset = result.assets[0];
          setPhoto({ uri: asset.uri, base64: asset.base64 });
          setMessage(`撮影しました（Base64 ${asset.base64.length}文字）`);
        }
      } catch (e) { setMessage('撮影エラー: ' + e.message); }
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('このブラウザではカメラを利用できません。localhost または HTTPS で開いてください。');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.width = '100%';
      video.style.maxWidth = '420px';
      video.style.borderRadius = '8px';
      video.srcObject = stream;
      videoRef.current = video;
      if (videoContainerRef.current) {
        videoContainerRef.current.innerHTML = '';
        videoContainerRef.current.appendChild(video);
      }
      await video.play();
      setCameraOn(true);
      setMessage('Webカメラを起動しました');
    } catch (e) { stopCamera(); setMessage('カメラエラー: ' + e.message); }
  };

  const captureWebPhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setMessage('カメラの映像を待ってから撮影してください'); return; }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const uri = canvas.toDataURL('image/jpeg', 0.5);
    const base64 = uri.split(',')[1];
    setPhoto({ uri, base64 });
    stopCamera();
    setMessage(`撮影しました（Base64 ${base64.length}文字）`);
  };

  const savePhoto = async () => {
    if (!ready || !photo || busy) return;
    if (photo.base64.length > 600000) { Alert.alert('画像が大きすぎます', '60万文字以下にしてください'); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, 'photos'), {
        imageBase64: photo.base64, mimeType: 'image/jpeg', createdAt: serverTimestamp()
      });
      setPhoto(null);
      await loadPhotos();
      Alert.alert('保存成功', 'Firestoreに保存しました');
      if (Platform.OS === 'web') setMessage('保存しました');
    } catch (e) { setMessage('保存エラー: ' + e.message); }
    finally { setBusy(false); }
  };

  const selectedCount = photos.filter(p => checked[p.id]).length;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>写真撮影・一覧・チェック</Text>
      <Button title={Platform.OS === 'web' ? 'Webカメラを起動' : '写真を撮影'} onPress={startCamera} disabled={!ready || cameraOn} />
      {Platform.OS === 'web' && (
        <View style={styles.cameraArea}>
          <div ref={videoContainerRef} style={{ width: '100%', textAlign: 'center' }} />
          {cameraOn && <View style={styles.actions}>
            <Button title="撮影する" onPress={captureWebPhoto} />
            <Button title="カメラを閉じる" onPress={stopCamera} />
          </View>}
        </View>
      )}
      {photo && <View style={styles.previewBox}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        <Text>Base64: {photo.base64.length}文字</Text>
        <Button title="Firebaseに保存" onPress={savePhoto} disabled={busy || !ready} />
      </View>}
      <Button title="一覧を更新" onPress={loadPhotos} disabled={!ready || busy} />
      <Text>{message}</Text>
      <Text style={styles.count}>チェックした写真：{selectedCount}件</Text>
      {photos.map(p => <TouchableOpacity key={p.id} style={styles.item}
        onPress={() => setChecked(old => ({ ...old, [p.id]: !old[p.id] }))}>
        <Text style={styles.checkbox}>{checked[p.id] ? '☑' : '☐'}</Text>
        <Image source={{ uri: `data:image/jpeg;base64,${p.imageBase64}` }} style={styles.thumbnail} />
        <View style={{ flex: 1 }}>
          <Text>{p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : '日時不明'}</Text>
          <Text>{p.imageBase64?.length || 0}文字</Text>
        </View>
      </TouchableOpacity>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, gap: 14, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  cameraArea: { alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', gap: 12 },
  previewBox: { alignItems: 'center', gap: 10 },
  preview: { width: 250, height: 250, resizeMode: 'contain' },
  count: { fontSize: 18, fontWeight: 'bold' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  checkbox: { fontSize: 30 },
  thumbnail: { width: 85, height: 85 },
});
