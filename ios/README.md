# Communication — iOS app

A native iPhone wrapper around the live Communication website
(`https://communication-system.zetac.de`). The app is a thin `WKWebView`
client: it bundles no web code and always shows the current production
deployment. The web app, Docker setup, and everything under the repo root
are untouched by this folder.

## Open in Xcode

Open **`ios/Communication.xcodeproj`**.

- Requires Xcode 16 or newer (built and verified with Xcode 26.6).
- Scheme: **Communication** (shared, already selected).

## Project layout

```
ios/
├── Communication.xcodeproj/         Xcode project (open this)
└── Communication/
    ├── CommunicationApp.swift        App entry point (SwiftUI lifecycle)
    ├── ContentView.swift             Root screen — holds the web view
    ├── WebView.swift                 WKWebView wrapper (pull-to-refresh,
    │                                 back/forward gestures, mailto/tel handling)
    ├── Assets.xcassets/              App icon (1024²) + accent color
    └── Preview Content/              SwiftUI preview assets
```

Source files live in a *file-system synchronized group*, so anything you
add to `ios/Communication/` is picked up by the target automatically —
no need to edit the project file.

## Key build settings

| Setting | Value |
| --- | --- |
| Display name | Communication |
| Bundle identifier | `de.zetac.communication` |
| Version / build | `1.0` / `1` |
| Deployment target | iOS 17.0 |
| Devices | iPhone |
| Signing | Automatic (no team set yet) |
| Orientations | Portrait, Landscape Left/Right |

Camera / microphone / photo-library usage descriptions are already set
(via `INFOPLIST_KEY_*`) so in-conversation photo and video uploads work
and pass App Store review.

## Run on your iPhone

1. Open the project, select the **Communication** target → **Signing &
   Capabilities**, and choose your Apple ID under **Team**. (With a free
   Apple ID the bundle id may need to be made unique, e.g.
   `de.zetac.communication.yourname`.)
2. Plug in your iPhone, pick it as the run destination, and press **Run**.
3. First launch only: on the iPhone, trust the developer profile under
   **Settings → General → VPN & Device Management**.

## App Store preparation notes

- Replace the placeholder icon in `Assets.xcassets/AppIcon.appiconset`
  with final artwork if desired (current one is a generated 1024² PNG).
- Set a real **Team** and a permanent **bundle identifier**, then
  **Product → Archive** to produce an upload build.
- Because the app is a web wrapper, App Review may expect meaningful
  native value; the current build adds pull-to-refresh, swipe
  navigation, and system handling of `mailto:` / `tel:` links.
