# App Store preparation — 6 September 2026

**Not submitted.** Apple membership is active according to the owner. Account access,
team ownership, Mac/Xcode access and a deployed release are not yet verified.

## Metadata draft

| Field | Draft value |
|---|---|
| Name | Communication |
| Subtitle | Nachrichten & Termine |
| Category / language | Business / German |
| Operator | Zetac IT Solutions |
| Support email | info@zetac.de |
| Support URL after deployment | https://communication-system.zetac.de/support |
| Privacy URL | Pending owner publication |
| Bundle ID | de.zetac.communication |
| Version/build | 1.0 / 2 |
| Keywords | Kommunikation,Nachrichten,Kunden,Partner,Termine,Business |

Description:

> Communication verbindet Kunden und Geschäftspartner in einem persönlichen
> Kommunikationsbereich. Tauschen Sie Textnachrichten, Bilder und Videos aus und
> stimmen Sie Ihre Verfügbarkeit über den Kalender ab. Verwalten Sie Ihre Kontakte
> und melden oder blockieren Sie unangemessene Kontakte direkt im Gespräch.
>
> Für die Nutzung benötigen Sie einen Zugang von Zetac IT Solutions und eine
> Internetverbindung. Bei Fragen erreichen Sie uns unter info@zetac.de.

Confirm price, territories, public/unlisted/custom distribution, rights, legal seller
details and age rating with the owner. Do not advertise background push or offline access.

## Gates before upload

1. Deploy using `../DEPLOYMENT.md`. Publish the real privacy policy and set its URL in
   the app and App Store Connect. Keep the backend available during review.
2. Verify team `4WL253X4A3` in Xcode. Keep the permanent bundle ID and increment build 2
   if that number already exists in App Store Connect.
3. Use Xcode 26 or newer with iOS 26 SDK or newer. Test a signed Release build on iPhone
   and TestFlight; see Apple's [submission requirements](https://developer.apple.com/app-store/submitting/).
4. Resolve the minimum-functionality risk: this remains a website wrapper. Determine
   useful iPhone-specific functionality before public submission. Reporting/blocking
   exists, but content filtering and a timely human moderation process remain pending.
   See sections 4.2 and 1.2 of the [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
5. Prepare privacy disclosures. Code stores names, emails, user IDs, password hashes,
   messages, photos/videos, calendar notes, contacts and reports. No advertising/analytics
   SDK was found. Verify hosting/proxy logs, providers, retention and outside services
   before answering App Privacy. This inventory is not an approved legal disclosure.
6. Capture actual signed-app screenshots; confirm final icon ownership. Complete export
   compliance based on real encryption usage; no exemption declaration was guessed.
7. Create dedicated reviewer customer/partner accounts with sample-only conversations
   and calendar data. Share credentials privately through App Store Connect, never use
   the public repository demo passwords.

## Reviewer walkthrough draft

Log in with the supplied customer account. Open the partner contact, send text and
attach a photo/video. Open the calendar and create a slot. “Melden / Blockieren” in the
chat header provides safety controls. “Hilfe & Datenschutz” provides support, the published
privacy policy, blocked contacts and password-confirmed account deletion. Staff review
reports in the admin panel.

## Device checklist

- Login/logout, wrong password, revoked session and relaunch persistence.
- Text/photo/video delivery and preservation of drafts after failed sends.
- Video playback/seeking and denied/allowed camera/photo permissions.
- Keyboard, portrait/landscape, small iPhone, large text and VoiceOver.
- Offline retry, server errors, back navigation and external links.
- Confirmation dialogs, reporting, blocking and account deletion.
- Background/foreground transitions; no background-push claims.

Archive the verified Release build, upload through Xcode Organizer, complete TestFlight,
finish metadata/disclosures and submit for review. Public release requires Apple approval.
