import SwiftUI

/// Root screen. Hosts the live Communication website inside a full-screen web view.
struct ContentView: View {
    @StateObject private var state = WebViewState()
    /// The live website this app wraps. Nothing about the site itself is bundled;
    /// the app always loads the current production deployment.
    private static let websiteURL = URL(string: "https://communication-system.zetac.de")!

    var body: some View {
        ZStack {
            WebView(url: Self.websiteURL, state: state)
            if let error = state.error {
                VStack(spacing: 16) {
                    Image(systemName: "wifi.exclamationmark").font(.largeTitle)
                    Text("Verbindung nicht möglich").font(.headline)
                    Text(error).multilineTextAlignment(.center)
                    Button("Erneut versuchen") { state.retry() }
                        .buttonStyle(.borderedProminent)
                    Link("Support kontaktieren", destination: URL(string: "mailto:info@zetac.de")!)
                }
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(uiColor: .systemBackground))
            } else if state.isLoading {
                ProgressView("Wird geladen …")
                    .padding().background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }
}

#Preview {
    ContentView()
}
