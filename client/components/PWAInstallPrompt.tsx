import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  X,
  Smartphone,
  Shield,
  Navigation,
  CheckCircle,
  Globe,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({
  onInstall,
  onDismiss,
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed/running as PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);

    setIsStandalone(standalone);
    setIsIOS(ios);
    setIsInstalled(standalone);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log("PWA install prompt available");
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log("PWA was installed");
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      onInstall?.();
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS, show manual install instructions if not already standalone
    if (ios && !standalone) {
      // Show iOS install instructions after a short delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOS) return;

    if (deferredPrompt) {
      // Show the install prompt for Android/Desktop
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
  };

  // Don't show if already installed
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Smartphone className="h-5 w-5 text-primary" />
            <span>Install Fusion Tracker</span>
            <Badge
              variant="secondary"
              className="bg-primary text-primary-foreground"
            >
              Recommended
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Install this app on your device for enhanced location tracking
          capabilities
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <Shield className="h-4 w-4 text-success" />
            <span>
              <strong>Better Background Tracking</strong> - Works when phone is
              in pocket
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Navigation className="h-4 w-4 text-primary" />
            <span>
              <strong>Improved GPS Accuracy</strong> - More precise location
              updates
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="h-4 w-4 text-info" />
            <span>
              <strong>App-like Experience</strong> - Faster loading and better
              performance
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Globe className="h-4 w-4 text-accent" />
            <span>
              <strong>Offline Support</strong> - Basic functionality without
              internet
            </span>
          </div>
        </div>

        {/* Installation instructions */}
        {isIOS ? (
          <div className="bg-info/10 border border-info/20 rounded-lg p-3">
            <div className="text-sm font-medium text-info mb-2">
              iOS Installation:
            </div>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                Tap the <strong>Share</strong> button (square with arrow) in
                Safari
              </li>
              <li>
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </li>
              <li>
                Tap <strong>"Add"</strong> to install the app
              </li>
              <li>Find the app on your home screen and open it</li>
            </ol>
          </div>
        ) : (
          <div className="flex space-x-2">
            <Button
              onClick={handleInstallClick}
              className="flex-1"
              disabled={!deferredPrompt}
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Not Now
            </Button>
          </div>
        )}

        {/* Additional info */}
        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> Installing as a PWA provides native app-like
          capabilities while maintaining all web features. No app store
          required.
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to check PWA install status
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);

    setIsInstalled(standalone);

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS, always show as installable if not standalone
    if (ios && !standalone) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return { canInstall, isInstalled };
}
