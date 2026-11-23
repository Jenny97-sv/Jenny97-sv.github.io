const UNITS = ["", "dl", "l", "msk", "tsk", "krm", "g", "kg", "st"];

/**
 * Gamla recept sparade ingredienser som text. Gör om dem till objekt.
 * @param {any} item
 */
function normalizeIngredient(item) {
    if (typeof item === "string") {
        return { amount: null, unit: "", name: item, substitute: "" };
    }
    return item;
}

/** @param {string} label */
function createRemoveButton(label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "remove-row";
    button.textContent = "−";
    button.setAttribute("aria-label", label);
    button.addEventListener("click", () => button.closest("li")?.remove());
    return button;
}

/**
 * @param {string} className
 * @param {string} label
 * @param {string} value
 * @param {string} [placeholder]
 */
function createTextInput(className, label, value, placeholder = "") {
    const input = document.createElement("input");
    input.type = "text";
    input.className = className;
    input.value = value;
    input.placeholder = placeholder;
    input.setAttribute("aria-label", label);
    return input;
}

/** En rad med mängd, enhet, namn och ersättning. @param {any} [ing] */
function createIngredientRow(ing = {}) {
    const li = document.createElement("li");
    li.className = "ingredient-row";

    const amount = document.createElement("input");
    amount.type = "number";
    amount.min = "0";
    amount.step = "any";
    amount.className = "ing-amount";
    amount.placeholder = "Mängd";
    amount.value = String(ing.amount ?? "");
    amount.setAttribute("aria-label", "Mängd");

    const unit = document.createElement("select");
    unit.className = "ing-unit";
    unit.setAttribute("aria-label", "Enhet");
    UNITS.forEach((u) => {
        const option = document.createElement("option");
        option.value = u;
        option.textContent = u || "(ingen)";
        unit.append(option);
    });
    unit.value = ing.unit ?? "";

    li.append(
        amount,
        unit,
        createTextInput("ing-name", "Ingrediens", ing.name ?? "", "Ingrediens"),
        createRemoveButton("Ta bort ingrediensraden"),
        createTextInput("ing-substitute", "Kan bytas mot", ing.substitute ?? "", "Kan bytas mot (valfritt)")
    );
    return li;
}

/**
 * Old recipes saved steps as text. Turn them into objects.
 * @param {any} item
 * @returns {{ text: string, seconds: number }}
 */
function normalizeStep(item) {
    if (typeof item === "string") {
        return { text: item, seconds: 0 };
    }
    return {
        text: String(item?.text ?? ""),
        seconds: Math.max(0, Number(item?.seconds) || 0),
    };
}

/**
 * @param {string} className
 * @param {string} label
 * @param {number} value
 */
function createTimeInput(className, label, value) {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.className = className;
    input.placeholder = "0";
    input.value = value ? String(value) : "";
    input.setAttribute("aria-label", label);
    return input;
}

/** @param {any} [step] a step object, or old-style text */
function createStepRow(step = "") {
    const { text, seconds } = normalizeStep(step);

    const li = document.createElement("li");
    li.className = "step-row";

    const time = document.createElement("div");
    time.className = "step-time";
    time.append(
        "⏱ Timer (valfri): ",
        createTimeInput("step-min", "Minuter", Math.floor(seconds / 60)),
        " min ",
        createTimeInput("step-sec", "Sekunder", seconds % 60),
        " sek"
    );

    li.append(
        createTextInput("step-input", "Steg", text, "Beskriv steget"),
        createRemoveButton("Ta bort steget"),
        time
    );
    return li;
}

/** @param {HTMLElement} list */
function readStepRows(list) {
    return [...list.querySelectorAll(".step-row")]
        .map((row) => {
            const minutes = Number(valueOf(row, ".step-min")) || 0;
            const secs = Number(valueOf(row, ".step-sec")) || 0;
            return {
                text: valueOf(row, ".step-input"),
                seconds: Math.max(0, Math.round(minutes * 60 + secs)),
            };
        })
        .filter((s) => s.text);
}

/**
 * @param {Element} row
 * @param {string} selector
 */
function valueOf(row, selector) {
    const el = row.querySelector(selector);
    return el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el.value.trim() : "";
}

/** @param {HTMLElement} list */
function readIngredientRows(list) {
    return [...list.querySelectorAll(".ingredient-row")]
        .map((row) => {
            const raw = valueOf(row, ".ing-amount");
            const amount = raw === "" ? null : Number(raw);
            return {
                amount: amount !== null && Number.isFinite(amount) ? amount : null,
                unit: valueOf(row, ".ing-unit"),
                name: valueOf(row, ".ing-name"),
                substitute: valueOf(row, ".ing-substitute"),
            };
        })
        .filter((i) => i.name);
}

/**
 * Räknar om och avrundar. 10 dl visas som 1 l, 1000 g som 1 kg.
 * @param {number | null} amount
 * @param {string} unit
 * @param {number} [factor]
 */
function formatAmount(amount, unit, factor = 1) {
    if (amount === null || amount === undefined) return "";
    let value = amount * factor;
    let u = unit;

    if (u === "dl" && value >= 10) { value /= 10; u = "l"; }
    else if (u === "g" && value >= 1000) { value /= 1000; u = "kg"; }
    else if (u === "kg" && value < 1) { value *= 1000; u = "g"; }
    else if (u === "l" && value < 1) { value *= 10; u = "dl"; }

    const digits = value < 1 ? 100 : 10;
    const text = String(Math.round(value * digits) / digits).replace(".", ",");
    return u ? `${text} ${u}` : text;
}