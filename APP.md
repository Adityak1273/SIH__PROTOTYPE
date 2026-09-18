# Cognitive Care NER — Mobile App

The project is now structured as an **installable Android app** using Capacitor. The existing elderly-friendly UI, Momo companion, five-game continuous session, scoring, and offline web shell are bundled into the native Android container.

## Local Android build

Requirements:
- Node.js 20+
- Android Studio
- Android SDK
- JDK 21

Commands:

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Build a debug APK from the terminal:

```bash
cd android
./gradlew assembleDebug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Automatic APK build

Every push to `main` also starts `.github/workflows/android-app.yml`. GitHub Actions creates an installable debug APK and uploads it as the `cognitive-care-ner-debug-apk` workflow artifact.

## Web deployment

The same repository still serves the browser/PWA version through the existing deployment setup. This is useful for demos, while the Capacitor Android build is the actual mobile-app path.

## Future production work

The Android shell is the foundation. Native voice input, secure backend sync, reminders/notifications, caregiver authentication, and production signing can be added without replacing the game engine.
