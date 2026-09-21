import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');

  async function signIn() {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      setError('Unable to sign in');
      return;
    }
    setSignedIn(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>CREWSPACE MOBILE</Text>
        {signedIn ? (
          <>
            <Text style={styles.title}>Your team is with you.</Text>
            <Text style={styles.body}>
              Inbox, approvals, conversations, and important workspace events
              will live here.
            </Text>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>No approvals waiting</Text>
              <Text style={styles.body}>You are all caught up.</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Welcome back.</Text>
            <TextInput
              autoCapitalize="none"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <Pressable onPress={signIn} style={styles.button}>
              <Text style={styles.buttonText}>Sign in</Text>
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7f4' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  eyebrow: {
    color: '#d86b3f',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: { color: '#17202a', fontSize: 42, lineHeight: 46, marginTop: 16 },
  body: { color: '#68737d', fontSize: 16, lineHeight: 24, marginTop: 12 },
  panel: {
    backgroundColor: '#fff',
    borderColor: '#d9ded8',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 36,
    padding: 20,
  },
  panelTitle: { color: '#17202a', fontSize: 20 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d9ded8',
    borderWidth: 1,
    borderRadius: 6,
    marginTop: 14,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#17202a',
    borderRadius: 6,
    marginTop: 18,
    padding: 13,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  error: { color: '#a73e2d', marginTop: 12 },
});
