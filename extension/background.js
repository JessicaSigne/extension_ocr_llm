
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SNAP_LEARN_START_CAPTURE") {
        startCapture(message.options)
            .then(() => sendResponse({ ok: true }))
            .catch((error) => {
                console.error("Snap Learn - capture :", error);
                sendResponse({
                    ok: false,
                    error: error.message || "Impossible de démarrer la capture."
                });
            });

        return true;
    }

    if (message.type === "SNAP_LEARN_SELECTION_DONE") {
        saveSelection(message.selectedImage)
            .then(() => sendResponse({ ok: true }))
            .catch((error) => {
                console.error("Snap Learn - sélection :", error);
                sendResponse({ ok: false, error: error.message });
            });

        return true;
    }

    if (message.type === "SNAP_LEARN_SELECTION_CANCELLED") {
        // chrome.storage.session.remove("captureOptions");
    }
});


async function startCapture() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab || tab.id === undefined || tab.windowId === undefined) {
        throw new Error("Aucun onglet actif disponible.");
    }

    if (!tab.url || !/^https?:/.test(tab.url)) {
        throw new Error(
            "Cette page ne permet pas la capture. Essaie sur un site web classique."
        );
    }

    // Capture de la partie visible de la page.
    const screenshot = await chrome.tabs.captureVisibleTab(
        tab.windowId,
        { format: "png" }
    );

    // Injecte le sélecteur de zone dans la page.
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });

    // Envoie l'image au sélecteur.
    await chrome.tabs.sendMessage(tab.id, {
        type: "SNAP_LEARN_START_SELECTION",
        screenshot
    });
}


async function saveSelection(selectedImage) {
    if (
        typeof selectedImage !== "string" ||
        !selectedImage.startsWith("data:image/png;base64,")
    ) {
        throw new Error("L'image sélectionnée est invalide.");
    }

    // On conserve uniquement l'image.
    // Le type d'analyse et le contexte seront choisis dans le popup.
    await chrome.storage.session.set({
        pendingCapture: {
            selectedImage
        }
    });
}