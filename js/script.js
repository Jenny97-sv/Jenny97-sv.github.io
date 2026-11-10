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

// ----- Functions -----
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

        cards.forEach(card => {
            card.hidden = filter !== "all" && card.dataset.category !== filter;
        });
    });
});

if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = new FormData(form);

        /** @param {string} key */
        const text = (key) => String(data.get(key) ?? "").trim();

        const recipe = {
            id: Date.now(),
            name: text("name"),
            category: text("category"),
            time: text("time"),
            servings: text("servings"),
            difficulty: text("difficulty"),
            ingredients: text("ingredients").split("\n").map(s => s.trim()).filter(Boolean),
            steps: text("steps").split("\n").map(s => s.trim()).filter(Boolean),
            author: text("author")
        };

        try {
            const recipes = JSON.parse(localStorage.getItem("recipes") ?? "[]");
            recipes.push(recipe);
            localStorage.setItem("recipes", JSON.stringify(recipes));
            showStatus(`Tack! Receptet "${recipe.name}" är sparat.`);
            form.reset();
        } catch (error) {
            showStatus("Det gick inte att spara receptet.");
            console.error(error);
        }
    });
}