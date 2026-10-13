

const captureButton = document.getElementById("captureButton");
const resultCard = document.getElementById("resultCard");
const selectionPreview = document.getElementById("selectionPreview");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const errorMessage = document.getElementById("errorMessage");
const ocrSection = document.getElementById("ocrSection");
const llmSection = document.getElementById("llmSection");
const ocrText = document.getElementById("ocrText");
const llmText = document.getElementById("llmText");
const answerTitle = document.getElementById("answerTitle");
const taskSelect = document.getElementById("task");
const contextInput = document.getElementById("context");
const questionGroup = document.getElementById("questionGroup");
const questionInput = document.getElementById("question");
const copyButton = document.getElementById("copyButton");

let lastAnswer = "";

taskSelect.addEventListener("change", () => {
    questionGroup.classList.toggle(
        "hidden",
        taskSelect.value !== "answer"
    );
});

copyButton.addEventListener("click", async () => {
    if (!lastAnswer) return;

    try {
        await navigator.clipboard.writeText(lastAnswer);
        copyButton.textContent = "Réponse copiée !";
        setTimeout(() => {
            copyButton.textContent = "Copier la réponse";
        }, 1500);
    } catch (error) {
        showError("Impossible de copier la réponse. Sélectionne le texte manuellement.");
    }
});



captureButton.addEventListener("click", async () => {
    // Une image a déjà été capturée : on lance l'analyse seulement au clic.
    if (window.pendingSelectedImage) {
        if (taskSelect.value === "answer" && !questionInput.value.trim()) {
            showError("Saisis une question avant de lancer l'analyse.");
            return;
        }

        await analyzeImage(window.pendingSelectedImage);
        return;
    }

    // Aucune image en attente : on démarre une nouvelle capture.
    captureButton.disabled = true;
    captureButton.textContent = "Capture en cours...";

    try {
        const result = await chrome.runtime.sendMessage({
            type: "SNAP_LEARN_START_CAPTURE"
        });

        if (!result || !result.ok) {
            throw new Error(
                result?.error || "Impossible de démarrer la capture."
            );
        }

        // Le popup se ferme pour permettre de sélectionner la zone sur la page.
        window.close();
    } catch (error) {
        showError(error.message || "Une erreur est survenue.");
        captureButton.disabled = false;
        captureButton.textContent = "Capturer une zone";
    }
});

function resetResults() {
    selectionPreview.innerHTML = "";
    selectionPreview.classList.add("hidden");
    ocrSection.classList.add("hidden");
    llmSection.classList.add("hidden");
    loading.classList.add("hidden");
    errorMessage.classList.add("hidden");
    lastAnswer = "";
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
}

function createSelectionInterface(image) {
    const canvas = document.createElement("canvas");
    const canvasContext = canvas.getContext("2d");
    const screenshot = new Image();

    canvas.className = "selection-canvas";
    canvas.setAttribute("aria-label", "Sélectionne la zone à analyser");

    screenshot.onload = () => {
        canvas.width = screenshot.naturalWidth;
        canvas.height = screenshot.naturalHeight;

        canvasContext.drawImage(screenshot, 0, 0);

        selectionPreview.innerHTML = "";
        selectionPreview.appendChild(canvas);

        const hint = document.createElement("p");
        hint.className = "hint";
        hint.textContent = "Clique et fais glisser pour sélectionner une zone.";
        selectionPreview.appendChild(hint);

        enableSelection(canvas, canvasContext, screenshot);
    };

    screenshot.onerror = () => {
        showError("Impossible de charger la capture d'écran.");
    };

    screenshot.src = image;
}

function enableSelection(canvas, canvasContext, screenshot) {
    let startX = 0;
    let startY = 0;
    let isSelecting = false;

    function getPosition(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: Math.max(
                0,
                Math.min(
                    canvas.width,
                    (event.clientX - rect.left) * canvas.width / rect.width
                )
            ),
            y: Math.max(
                0,
                Math.min(
                    canvas.height,
                    (event.clientY - rect.top) * canvas.height / rect.height
                )
            )
        };
    }

    function drawSelection(x, y) {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        canvasContext.drawImage(screenshot, 0, 0);

        const left = Math.min(startX, x);
        const top = Math.min(startY, y);
        const width = Math.abs(x - startX);
        const height = Math.abs(y - startY);

        canvasContext.fillStyle = "rgba(98, 88, 217, 0.15)";
        canvasContext.fillRect(left, top, width, height);

        canvasContext.strokeStyle = "#6258d9";
        canvasContext.lineWidth = Math.max(2, canvas.width / 500);
        canvasContext.strokeRect(left, top, width, height);
    }

    canvas.addEventListener("pointerdown", (event) => {
        const position = getPosition(event);

        startX = position.x;
        startY = position.y;
        isSelecting = true;

        canvas.setPointerCapture(event.pointerId);
        drawSelection(startX, startY);
    });

    canvas.addEventListener("pointermove", (event) => {
        if (!isSelecting) return;

        const position = getPosition(event);
        drawSelection(position.x, position.y);
    });

    canvas.addEventListener("pointerup", async (event) => {
        if (!isSelecting) return;

        isSelecting = false;

        const position = getPosition(event);
        const left = Math.floor(Math.min(startX, position.x));
        const top = Math.floor(Math.min(startY, position.y));
        const width = Math.floor(Math.abs(position.x - startX));
        const height = Math.floor(Math.abs(position.y - startY));

        if (width < 5 || height < 5) {
            showError("La zone est trop petite. Sélectionne une zone plus grande.");
            return;
        }

        const selectedCanvas = document.createElement("canvas");
        selectedCanvas.width = width;
        selectedCanvas.height = height;

        const selectedContext = selectedCanvas.getContext("2d");
        selectedContext.drawImage(
            screenshot,
            left, top, width, height,
            0, 0, width, height
        );

        const selectedImage = selectedCanvas.toDataURL("image/png");

        selectionPreview.innerHTML = "";
        selectionPreview.classList.remove("hidden");

        const preview = document.createElement("img");
        preview.src = selectedImage;
        preview.alt = "Zone sélectionnée";
        selectionPreview.appendChild(preview);

        await analyzeImage(selectedImage);
    });
}

async function analyzeImage(selectedImage) {
    resetOutputSections();

    loading.classList.remove("hidden");
    loadingText.textContent = "Extraction du texte...";
    captureButton.disabled = true;

    try {
        const ocrResult = await sendImageToOCR(selectedImage);

        if (!ocrResult.text || !ocrResult.text.trim()) {
            throw new Error("Aucun texte n'a été détecté. Essaie une zone plus lisible.");
        }

        ocrText.textContent = ocrResult.text;
        ocrSection.classList.remove("hidden");

        const task = taskSelect.value;
        const userContext = contextInput.value.trim();
        const question = questionInput.value.trim();

        if (task === "answer" && !question) {
            throw new Error("Saisis une question avant de lancer l'analyse.");
        }

        loadingText.textContent = "Qwen prépare sa réponse...";

        const llmResult = await sendImageToLLM(
            ocrResult.text,
            task,
            userContext,
            question
        );

        lastAnswer = llmResult.response || "Aucune réponse reçue.";
        llmText.textContent = lastAnswer;

        const titles = {
            explain: "Explication de l'IA",
            summarize: "Résumé de l'IA",
            answer: "Réponse à ta question"
        };

        answerTitle.textContent = titles[task] || "Réponse de l'IA";
        llmSection.classList.remove("hidden");
    } catch (error) {
        console.error("Erreur d'analyse :", error);
        showError(error.message || "Une erreur est survenue pendant l'analyse.");
    } finally {
        loading.classList.add("hidden");
        captureButton.disabled = false;
    }
}

function resetOutputSections() {
    loading.classList.add("hidden");
    errorMessage.classList.add("hidden");
    ocrSection.classList.add("hidden");
    llmSection.classList.add("hidden");
}

async function sendImageToOCR(selectedImage) {
    const imageResponse = await fetch(selectedImage);
    const blob = await imageResponse.blob();

    const formData = new FormData();
    formData.append("file", blob, "capture.png");

    const response = await fetch("http://127.0.0.1:8000/ocr", {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Erreur OCR : ${response.status}`);
    }

    return await response.json();
}

async function sendImageToLLM(text, task, userContext, question) {
    const response = await fetch("http://127.0.0.1:8000/llm", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
            task: task,
            context: userContext,
            question: question || null
        })
    });

    if (!response.ok) {
        let detail = `Erreur LLM : ${response.status}`;

        try {
            const errorData = await response.json();
            if (errorData.detail) detail = errorData.detail;
        } catch (_) {
            // Conserver le message d'erreur par défaut.
        }

        throw new Error(detail);
    }

    return await response.json();
}



async function restorePendingCapture() {
    const { pendingCapture } = await chrome.storage.session.get(
        "pendingCapture"
    );

    if (!pendingCapture) {
        captureButton.disabled = false;
        captureButton.textContent = "Capturer une zone";
        return;
    }

    // La capture est récupérée, mais aucune analyse n'est lancée ici.
    await chrome.storage.session.remove("pendingCapture");

    resetResults();

    window.pendingSelectedImage = pendingCapture.selectedImage;

    resultCard.classList.remove("hidden");
    selectionPreview.classList.remove("hidden");

    const preview = document.createElement("img");
    preview.src = pendingCapture.selectedImage;
    preview.alt = "Zone sélectionnée pour l'analyse";
    preview.className = "selection-canvas";

    selectionPreview.replaceChildren(preview);

    captureButton.disabled = false;
    captureButton.textContent = "Analyser la capture";
}

restorePendingCapture().catch((error) => {
    console.error("Snap Learn - récupération de la capture :", error);
    showError("Impossible de récupérer la capture sélectionnée.");
    captureButton.disabled = false;
    captureButton.textContent = "Capturer une zone";
});