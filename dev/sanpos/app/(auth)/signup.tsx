import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { supabase } from '@/src/lib/supabase';

export default function SignupScreen() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!nickname.trim()) {
      Alert.alert('入力エラー', 'ニックネームを入力してください');
      return;
    }

    if (nickname.trim().length > 20) {
      Alert.alert('入力エラー', 'ニックネームは20文字以内にしてください');
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('入力エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    if (password.length < 6) {
      Alert.alert('入力エラー', 'パスワードは6文字以上にしてください');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('入力エラー', 'パスワードが一致しません');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          Alert.alert('エラー', 'このメールアドレスは既に登録されています');
        } else {
          Alert.alert('エラー', error.message);
        }
      } else {
        // プロフィールにニックネームを保存
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ display_name: nickname.trim() })
            .eq('id', data.user.id);
        }

        Alert.alert(
          '登録完了！',
          `ようこそ、${nickname.trim()}さん！`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (e: any) {
      Alert.alert('エラー', e.message || '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🌿</Text>
          <Text style={styles.title}>アカウント作成</Text>
          <Text style={styles.subtitle}>散歩を記録して共有しよう</Text>
        </View>

        {/* フォーム */}
        <View style={styles.form}>
          <Text style={styles.label}>ニックネーム</Text>
          <TextInput
            style={styles.input}
            placeholder="さんぽ太郎"
            placeholderTextColor={Colors.textSub}
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
            autoCorrect={false}
          />
          <Text style={styles.hint}>タイムラインで表示される名前です</Text>

          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor={Colors.textSub}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>パスワード</Text>
          <TextInput
            style={styles.input}
            placeholder="6文字以上"
            placeholderTextColor={Colors.textSub}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>パスワード（確認）</Text>
          <TextInput
            style={styles.input}
            placeholder="もう一度入力"
            placeholderTextColor={Colors.textSub}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>新規登録</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ログインリンク */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>すでにアカウントをお持ちの方</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>ログインはこちら</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSub,
    marginTop: 4,
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  hint: {
    fontSize: 11,
    color: Colors.textSub,
    marginTop: -2,
  },
  button: {
    backgroundColor: Colors.buttonDark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSub,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
});
