import { useEffect, useState } from "react";

const InstallPWA = () => {
  const [installPrompt, setInstallPrompt] =
    useState(null);

  const [installed, setInstalled] =
    useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();

      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleInstalled
    );

    if (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches
    ) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleInstalled
      );
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      return;
    }

    installPrompt.prompt();

    await installPrompt.userChoice;

    setInstallPrompt(null);
  };

  if (installed || !installPrompt) {
    return null;
  }

  return (
    <button
      className="install-pwa-button"
      onClick={installApp}
      type="button"
    >
      <i className="bi bi-download" />
      Install TaskWake
    </button>
  );
};

export default InstallPWA;