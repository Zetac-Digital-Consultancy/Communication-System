import SwiftUI
import WebKit

final class WebViewState: ObservableObject {
    @Published var isLoading = true
    @Published var error: String?
    var retry: () -> Void = {}
}

/// A full-screen `WKWebView` wrapper that renders the live website.
///
/// This is a thin client: it does not cache or bundle the site, it just
/// displays whatever `https://communication-system.zetac.de` currently serves.
struct WebView: UIViewRepresentable {
    let url: URL
    @ObservedObject var state: WebViewState

    func makeCoordinator() -> Coordinator {
        Coordinator(url: url, state: state)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .all
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // Pull-to-refresh.
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(
            context.coordinator,
            action: #selector(Coordinator.handleRefresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refreshControl
        context.coordinator.webView = webView
        let initialURL = url
        state.retry = { [weak webView] in webView?.load(URLRequest(url: initialURL)) }

        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?
        let allowedURL: URL
        let state: WebViewState

        init(url: URL, state: WebViewState) {
            self.allowedURL = url
            self.state = state
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            state.error = nil
            state.isLoading = true
        }

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            webView?.reload()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            state.isLoading = false
            webView.scrollView.refreshControl?.endRefreshing()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            showError(error)
            webView.scrollView.refreshControl?.endRefreshing()
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            showError(error)
            webView.scrollView.refreshControl?.endRefreshing()
        }

        private func showError(_ error: Error) {
            if (error as NSError).code == NSURLErrorCancelled { return }
            state.isLoading = false
            state.error = "Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            state.isLoading = false
            state.error = "Die Ansicht wurde beendet. Bitte laden Sie sie erneut."
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
                     decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
            if navigationResponse.isForMainFrame,
               let response = navigationResponse.response as? HTTPURLResponse, response.statusCode >= 400 {
                state.isLoading = false
                state.error = "Der Dienst ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut."
                webView.scrollView.refreshControl?.endRefreshing()
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        /// Route non-web schemes (mailto:, tel:, etc.) to the system.
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if url.scheme == "https", url.host == allowedURL.host, url.port == allowedURL.port {
                decisionHandler(.allow)
            } else {
                if ["https", "mailto", "tel"].contains(url.scheme?.lowercased() ?? ""),
                   navigationAction.targetFrame?.isMainFrame != false {
                    UIApplication.shared.open(url)
                }
                decisionHandler(.cancel)
            }
        }

        /// Open `target="_blank"` links in the same web view instead of dropping them.
        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if navigationAction.targetFrame == nil,
               navigationAction.request.url?.scheme == "https",
               navigationAction.request.url?.host == allowedURL.host {
                webView.load(navigationAction.request)
            }
            return nil
        }

        // Web deletion confirmations and error alerts must complete in WKWebView.
        private func present(_ alert: UIAlertController, fallback: () -> Void) {
            guard var presenter = webView?.window?.rootViewController else { fallback(); return }
            while let presented = presenter.presentedViewController { presenter = presented }
            guard !presenter.isBeingDismissed else { fallback(); return }
            presenter.present(alert, animated: true)
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: "Communication", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            present(alert, fallback: completionHandler)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: "Communication", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "Bestätigen", style: .default) { _ in completionHandler(true) })
            present(alert) { completionHandler(false) }
        }
    }
}
