import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { Colors } from '@/src/constants/colors';

const WALK_EMOJIS = [
  '🚶', '🚶‍♂️', '🚶‍♀️', '🧑‍🦯', '👶', '🧒', '👦', '👧',
  '🧑', '👨', '👩', '🧓', '👴', '👵', '🐕‍🦺', '🐕',
];

function getRandomWalkEmoji(): string {
  return WALK_EMOJIS[Math.floor(Math.random() * WALK_EMOJIS.length)];
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [splashEmoji] = useState(getRandomWalkEmoji);
  const segments = useSegments();
  const router = useRouter();

  // スプラッシュアニメーション
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // スプラッシュアニメーション開始
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // スプラッシュを最低1.5秒表示
      setTimeout(() => {
        setLoading(false);
        // フェードアウト後にスプラッシュを非表示
        setTimeout(() => setSplashDone(true), 300);
      }, 1500);
    });

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 認証状態に基づいてリダイレクト
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  // スプラッシュ画面
  if (!splashDone) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />
        <Animated.View
          style={[
            styles.splashContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.splashEmoji}>{splashEmoji}</Text>
          <Text style={styles.splashTitle}>sanpos</Text>
        </Animated.View>
        <Animated.Text
          style={[
            styles.splashTagline,
            { opacity: subtitleAnim },
          ]}
        >
          みんなの散歩、見つけよう。
        </Animated.Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.base,
  },
  splashContent: {
    alignItems: 'center',
  },
  splashEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  splashTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },
  splashTagline: {
    fontSize: 14,
    color: Colors.textSub,
    marginTop: 12,
  },
});
