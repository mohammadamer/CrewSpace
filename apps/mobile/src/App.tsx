import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>CREWSPACE MOBILE</Text>
        <Text style={styles.title}>Your team is with you.</Text>
        <Text style={styles.body}>
          Inbox, approvals, conversations, and important workspace events will
          live here.
        </Text>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>No approvals waiting</Text>
          <Text style={styles.body}>You are all caught up.</Text>
        </View>
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
});
