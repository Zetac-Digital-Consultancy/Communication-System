import SwiftUI

/// Root screen. Hosts the live Communication website inside a full-screen web view.
struct ContentView: View {
    /// The live website this app wraps. Nothing about the site itself is bundled;
    /// the app always loads the current production deployment.
    private static let websiteURL = URL(string: "https://communication-system.zetac.de")!

    var body: some View {
        WebView(url: Self.websiteURL)
            .ignoresSafeArea()
    }
}

#Preview {
    ContentView()
}
