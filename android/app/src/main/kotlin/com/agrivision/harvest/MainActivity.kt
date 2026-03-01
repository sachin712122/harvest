package com.agrivision.harvest

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import com.agrivision.harvest.databinding.ActivityMainBinding

/**
 * MainActivity – wraps the AgriVision web app in a full-screen WebView.
 *
 * Features enabled:
 *  • Geolocation API (GPS-based farm location detection)
 *  • Camera / file-chooser API (disease photo upload)
 *  • JavaScript enabled
 *  • DOM storage (for PWA caching)
 *  • Pull-to-refresh
 *  • Forced-dark mode on supported devices
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var geolocationCallback: GeolocationPermissions.Callback? = null
    private var geolocationOrigin: String? = null

    // ── Permission launchers ──────────────────────────────────────────────────

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val granted = results.values.any { it }
        geolocationCallback?.invoke(geolocationOrigin, granted, false)
        geolocationCallback = null
        geolocationOrigin = null
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        fileChooserCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else emptyArray())
        fileChooserCallback = null
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        configureWebView()
        setupSwipeRefresh()
        setupBackNavigation()

        if (savedInstanceState != null) {
            binding.webView.restoreState(savedInstanceState)
        } else {
            binding.webView.loadUrl(BuildConfig.SERVER_URL)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    // ── WebView setup ─────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val webView = binding.webView
        val settings: WebSettings = webView.settings

        // Core capabilities
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true

        // Display
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false

        // Cache – use the cache when available, fall back to network
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // Media
        settings.mediaPlaybackRequiresUserGesture = false

        // Forced-dark mode (Android 10+)
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, true)
        }

        webView.webViewClient = AgriWebViewClient()
        webView.webChromeClient = AgriWebChromeClient()
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.green_mid)
        )
        binding.swipeRefresh.setOnRefreshListener {
            binding.webView.reload()
        }
    }

    // ── WebViewClient ─────────────────────────────────────────────────────────

    inner class AgriWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()
            // Keep all navigation within the AgriVision server inside the WebView
            return !url.startsWith(BuildConfig.SERVER_URL)
        }

        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            binding.swipeRefresh.isRefreshing = false
        }
    }

    // ── WebChromeClient ───────────────────────────────────────────────────────

    inner class AgriWebChromeClient : WebChromeClient() {

        override fun onProgressChanged(view: WebView, newProgress: Int) {
            binding.progressBar.progress = newProgress
            binding.progressBar.visibility =
                if (newProgress == 100) android.view.View.GONE else android.view.View.VISIBLE
        }

        // Geolocation permission
        override fun onGeolocationPermissionsShowPrompt(
            origin: String,
            callback: GeolocationPermissions.Callback
        ) {
            val fine = Manifest.permission.ACCESS_FINE_LOCATION
            val coarse = Manifest.permission.ACCESS_COARSE_LOCATION
            if (ContextCompat.checkSelfPermission(this@MainActivity, fine) ==
                PackageManager.PERMISSION_GRANTED
            ) {
                callback.invoke(origin, true, false)
            } else {
                geolocationCallback = callback
                geolocationOrigin = origin
                locationPermissionLauncher.launch(arrayOf(fine, coarse))
            }
        }

        // Camera / file chooser for disease photo uploads
        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams
        ): Boolean {
            fileChooserCallback?.onReceiveValue(emptyArray())
            fileChooserCallback = filePathCallback
            fileChooserLauncher.launch("image/*")
            return true
        }

        // WebRTC camera permission (Android 6+)
        override fun onPermissionRequest(request: PermissionRequest) {
            request.grant(request.resources)
        }
    }
}
