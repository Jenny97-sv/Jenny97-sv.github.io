// @ts-check

// ----- Elements -----
/** @type {NodeListOf<HTMLInputElement>} */
const checkboxes = document.querySelectorAll("li input[type='checkbox']");

/** @type {NodeListOf<HTMLElement>} */
const filterButtons = document.querySelectorAll("[data-filter]");

/** @type {NodeListOf<HTMLElement>} */
const cards = document.querySelectorAll(".card");

/** @type {HTMLFormElement | null} */
const form = document.querySelector("#recipe-form");

const formStatus = document.querySelector("#form-status");

/** @type {HTMLDivElement | null} */
const grid = document.querySelector(".recipe-grid");
// ----- Data -----
const saved = JSON.parse(localStorage.getItem("recipes") ?? "[]");

const addServing = document.querySelector("#add-serving");
const servingFields = document.querySelector("#serving-fields");

// ----- Functions -----
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
/** @param {string} message */
function showStatus(message) {
    if (formStatus) {
        formStatus.textContent = message;
    }
}

// ----- Event listeners -----
checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
        checkbox.closest("li")?.classList.toggle("done", checkbox.checked);
    });
});

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        filterButtons.forEach(b => b.setAttribute("aria-pressed", String(b === button)));

        document.querySelectorAll(".card").forEach(card => {
            if (card instanceof HTMLElement) {
                card.hidden = filter !== "all" && card.dataset.category !== filter;
            }
        });
    });
});

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(form);

        /** @param {string} key */
        const text = (key) => String(data.get(key) ?? "").trim();

        try {
            const servingFiles = data.getAll("serving-image")
                .filter(f => f instanceof File && f.size > 0);

            const recipe = {
                id: Date.now(),
                name: text("name"),
                category: text("category"),
                time: text("time"),
                servings: text("servings"),
                difficulty: text("difficulty"),
                ingredients: text("ingredients").split("\n").map(s => s.trim()).filter(Boolean),
                steps: text("steps").split("\n").map(s => s.trim()).filter(Boolean),
                author: text("author"),
                thumbnail: await imageFrom(data.get("thumbnail")),
                heroImage: await imageFrom(data.get("hero-image")),
                servingImages: await Promise.all(servingFiles.map(f => imageFrom(f)))
            };

            const recipes = JSON.parse(localStorage.getItem("recipes") ?? "[]");
            recipes.push(recipe);
            localStorage.setItem("recipes", JSON.stringify(recipes));
            showStatus(`Tack! Receptet "${recipe.name}" är sparat.`);
            form.reset();
            servingFields?.querySelectorAll("input:not(#serving-image)").forEach((i) => i.remove());
        } catch (error) {
            showStatus("Det gick inte att spara receptet. Bilderna kan vara för stora.");
            console.error(error);
        }
    });
}

if (grid) {
    saved.forEach((/** @type {any} */ recipe) => {
        const card = document.createElement("article");
        card.className = "card";
        card.dataset.category = recipe.category;

        const link = document.createElement("a");
        link.href = `Pages/Recipe.html?id=${recipe.id}`;

        const title = document.createElement("h3");
        title.textContent = recipe.name;

        const time = document.createElement("p");
        time.textContent = recipe.time ? `${recipe.time} min` : "";

        if (recipe.thumbnail) {
            const pic = document.createElement("img");
            pic.src = recipe.thumbnail;
            pic.alt = "";
            link.append(pic);
        }

        link.append(title, time);
        card.append(link);
        grid.append(card);
    });
}

if (addServing && servingFields) {
    addServing.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.name = "serving-image";
        input.accept = "image/*";
        input.multiple = true;
        input.setAttribute("aria-label", "Fler serveringsbilder");
        servingFields.append(input);
        input.focus();
    });
}