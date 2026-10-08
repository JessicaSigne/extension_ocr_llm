const captureButton = document.getElementById("captureButton");
const result = document.getElementById("result");

captureButton.addEventListener("click", async () => {

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const image = await chrome.tabs.captureVisibleTab(
        tab.windowId,
        {
            format: "png"
        }
    );

    createSelectionInterface(image);
});


function createSelectionInterface(image) {

    result.innerHTML = "";

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    
    canvas.style.display = "block";
    canvas.style.width = "800px";
    canvas.style.height = "auto";

    const screenshot = new Image();

    screenshot.onload = () => {

        canvas.width = screenshot.width;
        canvas.height = screenshot.height;

        context.drawImage(
            screenshot,
            0,
            0
        );

        enableSelection(canvas, context, screenshot);
    };

    screenshot.src = image;

    result.appendChild(canvas);
}


function enableSelection(canvas, context, screenshot) {

    let startX = 0;
    let startY = 0;
    let isSelecting = false;

    canvas.addEventListener("mousedown", (event) => {

        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        startX = (event.clientX - rect.left) * scaleX;
        startY = (event.clientY - rect.top) * scaleY;

        isSelecting = true;
    });


    canvas.addEventListener("mousemove", (event) => {

        if (!isSelecting) {
            return;
        }

        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const currentX = (event.clientX - rect.left) * scaleX;
        const currentY = (event.clientY - rect.top) * scaleY;

        const width = currentX - startX;
        const height = currentY - startY;

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.drawImage(
            screenshot,
            0,
            0
        );

        context.strokeStyle = "red";
        context.lineWidth = 5;
        context.fillStyle = "rgba(255, 0, 0, 0.08)";

        context.strokeRect(
            startX,
            startY,
            width,
            height
        );
        context.strokeRect(
            startX,
            startY,
            width,
            height
        );

    });

    canvas.addEventListener("mouseup", (event) => {

        if (!isSelecting) {
            return;
        }

        isSelecting = false;

        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const endX = (event.clientX - rect.left) * scaleX;
        const endY = (event.clientY - rect.top) * scaleY;

        const width = endX - startX;
        const height = endY - startY;

        const selectedCanvas = document.createElement("canvas");

        selectedCanvas.width = Math.abs(width);
        selectedCanvas.height = Math.abs(height);

        const selectedContext = selectedCanvas.getContext("2d");

        const sourceX = Math.min(startX, endX);
        const sourceY = Math.min(startY, endY);

        selectedContext.drawImage(
            screenshot,
            sourceX,
            sourceY,
            Math.abs(width),
            Math.abs(height),
            0,
            0,
            Math.abs(width),
            Math.abs(height)
        );

        const selectedImage = selectedCanvas.toDataURL("image/png");

        console.log("Image sélectionnée :", selectedImage);

        result.innerHTML = "";

        const preview = document.createElement("img");

        preview.src = selectedImage;
        preview.style.maxWidth = "100%";

        result.appendChild(preview);
    });
}