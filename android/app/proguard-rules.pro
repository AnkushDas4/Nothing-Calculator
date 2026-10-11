# n-calc keeps the WebView host and the JS interface reachable.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# The app ships no reflection-heavy libraries; the defaults are enough.
-dontwarn android.webkit.**
