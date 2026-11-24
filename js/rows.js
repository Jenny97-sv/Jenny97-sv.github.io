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
 * One two-digit box: hours, minutes or seconds.
 * @param {string} className
 * @param {string} label
 * @param {string} value  already padded, or "" when empty
 */
function createTimePart(className, label, value) {
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 2;
    input.pattern = "[0-9]*";
    input.autocomplete = "off";
    input.className = className;
    input.placeholder = "00";
    input.value = value;
    input.setAttribute("aria-label", label);

    // Only digits are allowed
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "");
    });
    // Pad to two digits when leaving the box: "5" becomes "05"
    input.addEventListener("blur", () => {
        if (input.value !== "") input.value = input.value.padStart(2, "0");
    });
    // Select everything on focus, so typing replaces the old value
    input.addEventListener("focus", () => input.select());

    return input;
}

/** @param {any} [step] a step object, or old-style text */
function createStepRow(step = "") {
    const { text, seconds } = normalizeStep(step);
    const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");

    // Show 00:00:00 style values only when a timer exists
    const hours = seconds > 0 ? pad(Math.floor(seconds / 3600)) : "";
    const minutes = seconds > 0 ? pad(Math.floor((seconds % 3600) / 60)) : "";
    const secs = seconds > 0 ? pad(seconds % 60) : "";

    const li = document.createElement("li");
    li.className = "step-row";

    const time = document.createElement("div");
    time.className = "step-time";

    const title = document.createElement("span");
    title.className = "step-time-title";
    title.textContent = "⏱ Timer (valfri)";

    const fields = document.createElement("div");
    fields.className = "time-fields";
    fields.setAttribute("role", "group");
    fields.setAttribute("aria-label", "Timer: timmar, minuter och sekunder");

    const colon = () => {
        const span = document.createElement("span");
        span.textContent = ":";
        span.setAttribute("aria-hidden", "true");
        return span;
    };

    fields.append(
        createTimePart("step-hour", "Timmar", hours),
        colon(),
        createTimePart("step-min", "Minuter", minutes),
        colon(),
        createTimePart("step-sec", "Sekunder", secs)
    );

    // const hint = document.createElement("small");
    // hint.className = "time-hint";
    // hint.textContent = "timmar : minuter : sekunder";

    time.append(title, fields);

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
            const hours = Number(valueOf(row, ".step-hour")) || 0;
            const minutes = Number(valueOf(row, ".step-min")) || 0;
            const secs = Number(valueOf(row, ".step-sec")) || 0;
            return {
                text: valueOf(row, ".step-input"),
                seconds: Math.max(0, hours * 3600 + minutes * 60 + secs),
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