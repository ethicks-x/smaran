import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { ActivityIndicator, Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MainScreen() {
	const { isLoaded, isSignedIn, userId } = useAuth();
	const { startHostedAuth } = useHostedAuth();

	const handleSignUp = async () => {
		try {
			await startHostedAuth({ mode: "sign-up" });
		} catch (error) {
			// Handle the error in your app.
		}
	};

	if (!isLoaded) {
		return (
			<ThemedView style={styles.container}>
				<ActivityIndicator size="large" />
			</ThemedView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<ThemedView style={styles.container}>
				{isSignedIn ? (
					<ThemedText>You're signed in</ThemedText>
				) : (
					<Button title="Sign up" onPress={handleSignUp} />
				)}
			</ThemedView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		gap: 12,
		alignItems: "center",
		justifyContent: "center",
		color: "#fff",
	},
	safeArea: {
		flex: 1,
		paddingHorizontal: Spacing.four,
		alignItems: "center",
		gap: Spacing.three,
		paddingBottom: BottomTabInset + Spacing.three,
		maxWidth: MaxContentWidth,
	},
});
