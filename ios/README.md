# Communication for iPhone

Open `Communication.xcodeproj` on a Mac using Xcode 26 or newer for submission.
Scheme: `Communication`. Deployment target: iOS 17.0; iPhone only.

- Bundle ID: `de.zetac.communication`
- Version/build: `1.0` / `2`
- Existing signing team: `4WL253X4A3` (ownership must be verified)
- Website: `https://communication-system.zetac.de`

SwiftUI and WKWebView provide session cookies, media upload, refresh/navigation gestures,
loading/error recovery, confirmation dialogs and external HTTPS/mail/telephone links.
Only the configured HTTPS origin loads inside the web view. No APNs push, offline
messaging or end-to-end encryption is implemented.

Swift changes have not been compiled or tested on this Windows host. Camera, microphone,
photo picker, keyboard/safe areas, alerts and playback must be verified on an iPhone.
Permission descriptions do not guarantee approval.

See [APP_STORE_RELEASE.md](APP_STORE_RELEASE.md) for metadata and remaining requirements.
