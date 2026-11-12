/* ---- Elements ---- */

/* ---- Functions ---- */
/**
 * Shrinks an image file and returns it as a JPEG data URL.
 * @param {File} file
 * @param {number} maxSize longest side in pixels
 * @returns {Promise<string>}
 */
function resizeImage(file, maxSize = 800) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Canvas not supported"));
                return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = () => reject(new Error("Could not read image"));
        img.src = url;
    });
}

/**
 * @param {FormDataEntryValue | null} value
 * @returns {Promise<string>} data URL, or "" if no file was chosen
 */
async function imageFrom(value) {
    return value instanceof File && value.size > 0 ? resizeImage(value) : "";
}

/* ---- EventListeners ---- */

/* ---- Init ---- */