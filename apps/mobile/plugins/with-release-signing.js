const fs = require("node:fs");
const path = require("node:path");

const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require("expo/config-plugins");

/**
 * Teaches `expo prebuild` how this app is signed for release.
 *
 * `android/` is generated and gitignored, and prebuild **clears** it rather
 * than merging into it. Anything hand-written there — the upload keystore, the
 * `signingConfigs.release` block, the version numbers — is deleted the next
 * time anybody runs it. That has already cost this project twice: once the
 * keystore itself, and once a release APK whose `versionName` had been edited
 * by hand and no longer matched the `version` in `app.json`, which left the
 * updater comparing a number the build did not actually carry and offering the
 * same update on every launch, for ever.
 *
 * So nothing about the native project is edited by hand any more. The keystore
 * lives in `credentials/` beside this file and is copied in on every prebuild;
 * the signing config is written into `build.gradle` from here; and the two
 * version numbers go back to being derived from `app.json`, which is the only
 * place either of them should ever be written.
 *
 * **Passwords are never in this file.** They come from `.env`, which prebuild
 * loads into the environment before plugins run and which git ignores (§2.5).
 * `.env.example` names them.
 *
 * With no keystore present the plugin does nothing at all and the release build
 * falls back to the debug key, which is right for somebody who has only cloned
 * the repository to work on it. A keystore with no passwords beside it is the
 * one case that stops the build: silently signing a release with the debug key
 * would produce an APK that no installed Smaran can ever accept as an update,
 * and finding that out afterwards means finding it out from a phone in
 * somebody's hands.
 */

/** Where the keystore is kept, relative to the project root. Not generated. */
const CREDENTIALS_DIR = "credentials";

/** The gradle properties the signing config reads. */
const STORE_FILE = "MYAPP_UPLOAD_STORE_FILE";
const STORE_PASSWORD = "MYAPP_UPLOAD_STORE_PASSWORD";
const KEY_ALIAS = "MYAPP_UPLOAD_KEY_ALIAS";
const KEY_PASSWORD = "MYAPP_UPLOAD_KEY_PASSWORD";

/**
 * What the environment says about signing, or null if there is no keystore to
 * sign with.
 *
 * Read once per mod rather than at module scope: prebuild loads `.env` itself,
 * and a plugin that captured the environment as it was required could easily
 * read it before that happened.
 */
function credentials(projectRoot) {
  const file = process.env.ANDROID_KEYSTORE_FILE || "my-upload-key.keystore";
  const source = path.join(projectRoot, CREDENTIALS_DIR, file);

  if (!fs.existsSync(source)) {
    return null;
  }

  const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
  const keyAlias = process.env.ANDROID_KEY_ALIAS;
  const keyPassword = process.env.ANDROID_KEY_PASSWORD;

  if (!storePassword || !keyAlias || !keyPassword) {
    throw new Error(
      `Found ${CREDENTIALS_DIR}/${file} but not the passwords for it. ` +
        "Set ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and " +
        "ANDROID_KEY_PASSWORD in apps/mobile/.env — see .env.example. " +
        "Refusing to prebuild rather than sign a release with the debug key.",
    );
  }

  return { file, source, storePassword, keyAlias, keyPassword };
}

/** Copy the keystore into the freshly generated project, where gradle wants it. */
function withKeystore(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const found = credentials(config.modRequest.projectRoot);

      if (found) {
        fs.copyFileSync(
          found.source,
          path.join(config.modRequest.platformProjectRoot, "app", found.file),
        );
      }

      return config;
    },
  ]);
}

/** Put the passwords where `build.gradle` can read them. */
function withSigningProperties(config) {
  return withGradleProperties(config, (config) => {
    const found = credentials(config.modRequest.projectRoot);

    if (!found) {
      return config;
    }

    const values = {
      [STORE_FILE]: found.file,
      [STORE_PASSWORD]: found.storePassword,
      [KEY_ALIAS]: found.keyAlias,
      [KEY_PASSWORD]: found.keyPassword,
    };

    for (const [key, value] of Object.entries(values)) {
      const existing = config.modResults.find(
        (item) => item.type === "property" && item.key === key,
      );

      if (existing) {
        existing.value = value;
      } else {
        config.modResults.push({ type: "property", key, value });
      }
    }

    return config;
  });
}

/** The release `signingConfig`, and the build type pointed at it. */
function withSigningConfig(config) {
  return withAppBuildGradle(config, (config) => {
    if (!credentials(config.modRequest.projectRoot)) {
      return config;
    }

    let contents = config.modResults.contents;

    // Idempotent: prebuild regenerates the file, but `expo prebuild` on an
    // existing project can run the mod against output it has already written.
    if (!contents.includes(`storeFile file(${STORE_FILE})`)) {
      contents = replaceOnce(
        contents,
        "    signingConfigs {\n",
        `    signingConfigs {
        release {
            storeFile file(${STORE_FILE})
            storePassword ${STORE_PASSWORD}
            keyAlias ${KEY_ALIAS}
            keyPassword ${KEY_PASSWORD}
        }
`,
        "signingConfigs block",
      );
    }

    // The template signs release with the debug key and says so in a comment
    // directly above the line, which is what makes it safe to anchor on: two
    // build types both say `signingConfig signingConfigs.debug`, and only this
    // one is wrong.
    contents = replaceOnce(
      contents,
      "            // see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug",
      "            // see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.release",
      "release signingConfig line",
      { optional: contents.includes("signingConfig signingConfigs.release") },
    );

    config.modResults.contents = contents;

    return config;
  });
}

/**
 * Replace exactly one occurrence, or say which anchor has moved.
 *
 * The alternative to throwing is a release APK signed with the debug key that
 * looks entirely normal until a phone somewhere refuses to install it, so a
 * template that has changed under this plugin has to stop the build rather than
 * quietly produce the wrong thing.
 */
function replaceOnce(contents, find, replace, what, { optional = false } = {}) {
  if (!contents.includes(find)) {
    if (optional) {
      return contents;
    }

    throw new Error(
      `with-release-signing: could not find the ${what} in android/app/build.gradle. ` +
        "The Expo template has changed shape — update the plugin rather than " +
        "shipping a release signed with the debug key.",
    );
  }

  return contents.replace(find, replace);
}

module.exports = (config) =>
  withSigningConfig(withSigningProperties(withKeystore(config)));
