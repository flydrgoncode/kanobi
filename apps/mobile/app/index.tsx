import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.badge}>
        <View style={styles.dot} />
        <Text style={styles.badgeText}>v0.1.0 — Early Preview</Text>
      </View>

      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>K</Text>
        </View>
      </View>

      <Text style={styles.title}>Kanobi</Text>
      <Text style={styles.subtitle}>
        AI-native platform.{"\n"}Web, mobile, and desktop.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => Linking.openURL("https://github.com/ruipereira/kanobi")}
      >
        <Text style={styles.buttonText}>View on GitHub →</Text>
      </TouchableOpacity>

      <View style={styles.features}>
        {[
          ["🧠", "AI-Native"],
          ["⚡", "Cross-Platform"],
          ["🔒", "Local-First"],
          ["🛠️", "TypeScript"],
        ].map(([icon, label]) => (
          <View key={label} style={styles.feature}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <Text style={styles.featureLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1629",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(45,95,255,0.3)",
    backgroundColor: "rgba(45,95,255,0.1)",
    marginBottom: 32,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#5585ff" },
  badgeText: { color: "#8ab0ff", fontSize: 12, fontWeight: "500" },
  logoContainer: { marginBottom: 20 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#2d5fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "white", fontSize: 32, fontWeight: "bold" },
  title: { fontSize: 48, fontWeight: "bold", color: "white", marginBottom: 12 },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2d5fff",
    marginBottom: 48,
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 15 },
  features: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  feature: {
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    minWidth: 120,
  },
  featureIcon: { fontSize: 24, marginBottom: 4 },
  featureLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "500" },
});
