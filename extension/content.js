
(() => {
    // Évite d'ajouter plusieurs écouteurs si le script est réinjecté.
    if (window.__snapLearnListenerInstalled) return;
    window.__snapLearnListenerInstalled = true;

    let overlay = null;
    let selectionBox = null;
    let screenshotImage = null;
    let startX = 0;
    let startY = 0;
    let isSelecting = false;

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "SNAP_LEARN_START_SELECTION") {
            startSelection(message.screenshot);
        }
    });

    function startSelection(screenshot) {
        if (overlay) overlay.remove();

        screenshotImage = new Image();

        screenshotImage.onload = () => {
            createOverlay(screenshot);
        };

        screenshotImage.onerror = () => {
            alert("Snap Learn n'a pas pu charger la capture.");
        };

        screenshotImage.src = screenshot;
    }

    function createOverlay(screenshot) {
        overlay = document.createElement("div");

        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            width: "100vw",
            height: "100vh",
            zIndex: "2147483647",
            cursor: "crosshair",
            backgroundImage: `url("${screenshot}")`,
            backgroundSize: "100% 100%",
            backgroundPosition: "top left",
            backgroundRepeat: "no-repeat",
            overflow: "hidden",
            touchAction: "none"
        });

        const instructions = document.createElement("div");
        instructions.textContent =
            "Snap Learn — Clique et fais glisser pour sélectionner le texte. Échap pour annuler.";

        Object.assign(instructions.style, {
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 18px",
            borderRadius: "10px",
            background: "#25243a",
            color: "#fff",
            font: "14px Arial, sans-serif",
            boxShadow: "0 4px 18px #0004",
            maxWidth: "90vw",
            textAlign: "center",
            pointerEvents: "none"
        });

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Annuler";

        Object.assign(cancelButton.style, {
            position: "absolute",
            top: "12px",
            right: "16px",
            padding: "10px 16px",
            border: "0",
            borderRadius: "8px",
            background: "#fff",
            color: "#25243a",
            font: "bold 13px Arial, sans-serif",
            cursor: "pointer"
        });

        cancelButton.addEventListener("click", (event) => {
            event.stopPropagation();
            closeSelection(true);
        });

        selectionBox = document.createElement("div");

        Object.assign(selectionBox.style, {
            position: "absolute",
            display: "none",
            border: "2px solid #6258d9",
            background: "rgba(98, 88, 217, 0.18)",
            boxSizing: "border-box",
            pointerEvents: "none"
        });

        overlay.append(instructions, cancelButton, selectionBox);
        document.documentElement.appendChild(overlay);

        overlay.addEventListener("pointerdown", onPointerDown);
        overlay.addEventListener("pointermove", onPointerMove);
        overlay.addEventListener("pointerup", onPointerUp);

        document.addEventListener("keydown", onKeyDown, true);
    }

    function getPosition(event) {
        return {
            x: Math.max(0, Math.min(window.innerWidth, event.clientX)),
            y: Math.max(0, Math.min(window.innerHeight, event.clientY))
        };
    }

    function onPointerDown(event) {
        if (event.button !== 0) return;

        event.preventDefault();

        const position = getPosition(event);
        startX = position.x;
        startY = position.y;
        isSelecting = true;

        selectionBox.style.display = "block";
        updateSelection(position.x, position.y);
    }

    function onPointerMove(event) {
        if (!isSelecting) return;

        const position = getPosition(event);
        updateSelection(position.x, position.y);
    }

    function updateSelection(x, y) {
        const left = Math.min(startX, x);
        const top = Math.min(startY, y);
        const width = Math.abs(x - startX);
        const height = Math.abs(y - startY);

        Object.assign(selectionBox.style, {
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`
        });
    }

    async function onPointerUp(event) {
        if (!isSelecting) return;

        isSelecting = false;

        const position = getPosition(event);
        const left = Math.min(startX, position.x);
        const top = Math.min(startY, position.y);
        const width = Math.abs(position.x - startX);
        const height = Math.abs(position.y - startY);

        if (width < 8 || height < 8) {
            selectionBox.style.display = "none";
            return;
        }

        const scaleX = screenshotImage.naturalWidth / window.innerWidth;
        const scaleY = screenshotImage.naturalHeight / window.innerHeight;

        const sourceX = Math.round(left * scaleX);
        const sourceY = Math.round(top * scaleY);
        const sourceWidth = Math.min(
            screenshotImage.naturalWidth - sourceX,
            Math.round(width * scaleX)
        );
        const sourceHeight = Math.min(
            screenshotImage.naturalHeight - sourceY,
            Math.round(height * scaleY)
        );

        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        const context = canvas.getContext("2d");

        context.drawImage(
            screenshotImage,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            sourceWidth,
            sourceHeight
        );

        const selectedImage = canvas.toDataURL("image/png");

        closeSelection(false);

        try {
            await chrome.runtime.sendMessage({
                type: "SNAP_LEARN_SELECTION_DONE",
                selectedImage
            });
        } catch (error) {
            console.error("Snap Learn - transmission de l'image :", error);
        }
    }

    function onKeyDown(event) {
        if (event.key === "Escape") {
            closeSelection(true);
        }
    }

    function closeSelection(cancelled) {
        if (overlay) overlay.remove();

        document.removeEventListener("keydown", onKeyDown, true);

        overlay = null;
        selectionBox = null;
        isSelecting = false;

        if (cancelled) {
            chrome.runtime.sendMessage({
                type: "SNAP_LEARN_SELECTION_CANCELLED"
            });
        }
    }
})();