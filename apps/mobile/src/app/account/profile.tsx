import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import {
	ActionButton,
	Detail,
	Screen,
	Section,
	Surface,
	Text,
	TextField,
} from "@/components/ui";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing, scale } from "@/theme";

const AVATAR_SIZE = scale(160);

/** The signed-in Clerk user, or nothing while it is still loading. */
type User = ReturnType<typeof useUser>["user"];

/** The three details the reader owns and can change from the phone itself. */
type Details = {
	firstName: string;
	lastName: string;
	phone: string;
};

/** What the screen has to say about the last thing that was tried. */
type Status = "idle" | "saving" | "saved" | "notSaved" | "noPhotoAccess";

/**
 * Account — the details Smaran holds about the reader, and the place to correct
 * them.
 *
 * Everything is edited on one screen and committed by one button, so there is
 * never a half-finished change to remember or a second screen to find the way
 * back from. A new photo is shown immediately but not sent until Save, which
 * means the picker can be opened, looked at, and backed out of with nothing
 * changed.
 *
 * Saving is the one thing here that needs a signal — it writes to the account
 * itself. Nothing else on this screen, and nothing anywhere else in the app,
 * waits on it.
 */
export default function ProfileScreen() {
	const { user } = useUser();
	const { t } = useTranslation();
	const colors = useThemeColors();

	// The saved values are read straight off the Clerk user, so a successful save
	// clears the draft by making it identical rather than by copying anything.
	const saved = detailsOf(user);
	const [draft, setDraft] = useState<Details | null>(null);
	const [photo, setPhoto] = useState<string | null>(null);
	const [status, setStatus] = useState<Status>("idle");

	const details = draft ?? saved;
	const edit = (field: keyof Details) => (value: string) => {
		setDraft({ ...details, [field]: value });
		setStatus("idle");
	};

	const changed =
		photo !== null ||
		(Object.keys(saved) as (keyof Details)[]).some(
			(field) => details[field].trim() !== saved[field].trim(),
		);

	const pickPhoto = async (from: "library" | "camera") => {
		const permission =
			from === "camera"
				? await ImagePicker.requestCameraPermissionsAsync()
				: await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (!permission.granted) {
			setStatus("noPhotoAccess");
			return;
		}

		const options: ImagePicker.ImagePickerOptions = {
			mediaTypes: ["images"],
			allowsEditing: true,
			// Square, because every place the photo is shown is a circle.
			aspect: [1, 1],
			quality: 0.7,
			base64: true,
		};

		const result =
			from === "camera"
				? await ImagePicker.launchCameraAsync(options)
				: await ImagePicker.launchImageLibraryAsync(options);

		const asset = result.assets?.[0];
		if (result.canceled || !asset?.base64) {
			return;
		}

		// Clerk takes the image as a data URI; the file on disk is never uploaded.
		setPhoto(`data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`);
		setStatus("idle");
	};

	const save = async () => {
		if (!user) {
			return;
		}

		setStatus("saving");

		try {
			await user.update({
				firstName: details.firstName.trim(),
				lastName: details.lastName.trim(),
			});
			await user.updateMetadata({
				unsafeMetadata: { phone: details.phone.trim() || null },
			});

			if (photo) {
				await user.setProfileImage({ file: photo });
			}

			setDraft(null);
			setPhoto(null);
			setStatus("saved");
		} catch {
			// Deliberately not inspected or logged: a failure here carries the
			// reader's own name and email, and the only useful answer is the same
			// sentence either way.
			setStatus("notSaved");
		}
	};

	const email = user?.primaryEmailAddress?.emailAddress;
	const initials = getInitials(saved.firstName, saved.lastName);
	const source = photo ?? user?.imageUrl;

	return (
		<Screen
			title={t("profile.title")}
			subtitle={t("profile.subtitle")}
			onBack={() => router.back()}
			withTabBar={false}
			stickyHeader
		>
			<Section
				title={t("profile.photo")}
				description={t("profile.photoDescription")}
			>
				<View style={styles.photo}>
					<View
						style={[
							styles.avatar,
							{
								backgroundColor: colors.primaryMuted,
								borderColor: colors.surface,
							},
						]}
					>
						{source ? (
							<Image
								source={source}
								style={styles.avatarImage}
								contentFit="cover"
								accessibilityIgnoresInvertColors
								accessibilityLabel={t("account.yourPhoto")}
							/>
						) : (
							<Text variant="display" color="primary">
								{initials}
							</Text>
						)}
					</View>

					<View style={styles.photoActions}>
						<ActionButton
							label={t("profile.photoChoose")}
							onPress={() => pickPhoto("library")}
							variant="outlined"
						/>
						<ActionButton
							label={t("profile.photoTake")}
							onPress={() => pickPhoto("camera")}
							variant="outlined"
						/>
					</View>

					{photo ? (
						<Text variant="body" color="textSecondary" center>
							{t("profile.photoPending")}
						</Text>
					) : null}
				</View>
			</Section>

			<Section title={t("profile.details")}>
				<TextField
					label={t("profile.firstName")}
					hint={t("profile.firstNameHint")}
					value={details.firstName}
					onChangeText={edit("firstName")}
					autoComplete="given-name"
					textContentType="givenName"
					autoCapitalize="words"
				/>
				<TextField
					label={t("profile.lastName")}
					value={details.lastName}
					onChangeText={edit("lastName")}
					autoComplete="family-name"
					textContentType="familyName"
					autoCapitalize="words"
				/>
				<TextField
					label={t("profile.phone")}
					hint={t("profile.phoneHint")}
					value={details.phone}
					onChangeText={edit("phone")}
					keyboardType="phone-pad"
					autoComplete="tel"
					textContentType="telephoneNumber"
				/>

				<Surface tone="muted">
					<Detail
						label={t("profile.email")}
						value={email ?? t("common.notSetYet")}
					/>
					<Text variant="caption" color="textSecondary">
						{t("profile.emailFixed")}
					</Text>
				</Surface>
			</Section>

			<Section
				title={t("profile.keep")}
				description={t("profile.keepDescription")}
			>
				<ActionButton
					label={status === "saving" ? t("profile.saving") : t("profile.save")}
					onPress={save}
					size="large"
					disabled={!changed || status === "saving"}
				/>
				<StatusLine status={status} />
			</Section>

			<Section
				title={t("profile.wrong")}
				description={t("profile.wrongDescription")}
			>
				<ActionButton
					label={t("profile.askForHelp")}
					onPress={() => router.push("/help")}
					variant="outlined"
				/>
			</Section>
		</Screen>
	);
}

/**
 * One sentence about what just happened, in the same place every time. Nothing
 * here scolds, and nothing here is an error code.
 */
function StatusLine({ status }: { status: Status }) {
	const { t } = useTranslation();

	if (status === "saved") {
		return (
			<Text variant="body" color="success">
				{t("profile.saved")}
			</Text>
		);
	}

	if (status === "notSaved" || status === "noPhotoAccess") {
		return (
			<Text variant="body" color="danger">
				{t(
					status === "notSaved" ? "profile.notSaved" : "profile.noPhotoAccess",
				)}
			</Text>
		);
	}

	return null;
}

/**
 * The phone number lives in the account's own metadata rather than as a Clerk
 * phone number: adding one there means an SMS code to read and re-type, which
 * is exactly the kind of task this app exists to avoid. See decisions.md D-13.
 */
function storedPhone(user: User) {
	const phone = user?.unsafeMetadata?.phone;

	return typeof phone === "string" ? phone : undefined;
}

function detailsOf(user: User): Details {
	return {
		firstName: user?.firstName ?? "",
		lastName: user?.lastName ?? "",
		phone: storedPhone(user) ?? user?.primaryPhoneNumber?.phoneNumber ?? "",
	};
}

/** At most two letters — more than that stops reading as a monogram. */
function getInitials(firstName: string, lastName: string) {
	const letters = [firstName, lastName]
		.map((part) => part.trim()[0]?.toUpperCase() ?? "")
		.join("");

	return letters.slice(0, 2) || "?";
}

const styles = StyleSheet.create({
	photo: {
		alignItems: "center",
		gap: Spacing.lg,
	},
	avatar: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		borderRadius: AVATAR_SIZE / 2,
		borderWidth: scale(6),
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	avatarImage: {
		width: "100%",
		height: "100%",
	},
	photoActions: {
		width: "100%",
		gap: Spacing.md,
	},
});
