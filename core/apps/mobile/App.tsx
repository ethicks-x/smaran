import { createApiClient, type Item } from "@repo/api-client";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, View } from "react-native";

// Android emulator maps localhost to 10.0.2.2; iOS uses localhost
const API_URL = Platform.select({
  android: "http://10.0.2.2:8000",
  ios: "http://localhost:8000",
  default: "http://localhost:8000",
});

const mobileClient = createApiClient({ baseUrl: API_URL });

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await mobileClient.GET("/items");
      if (error) {
        setErrorMsg("Failed to connect to backend");
      } else if (data) {
        setItems(data);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mobile Client (Expo)</Text>
      {errorMsg ? (
        <Text style={styles.error}>{errorMsg}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20, backgroundColor: "#f9f9f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 8, marginBottom: 12, elevation: 1 },
  itemTitle: { fontSize: 16, fontWeight: "600" },
  itemPrice: { fontSize: 14, color: "#16a34a", marginTop: 4 },
  error: { color: "#dc2626", marginTop: 8 },
});
