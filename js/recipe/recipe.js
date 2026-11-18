/* ---------- Data ---------- */
/** @type {number} */
const id = Number(new URLSearchParams(location.search).get("id"));
/** @type {Array<*>} */
let recipes = [];
try {
  recipes = JSON.parse(localStorage.getItem("recipes") ?? "[]");
} catch (error) {
  console.error("Could not read saved recipes", error);
}
/** @type {*} */
const recipe = recipes.find((r) => r.id === id);

/** @type {*} */
let draft = null;          // arbetskopia som ändras under redigering
let editing = false;
let currentServings = 0;   // portionerna som visas (påverkar bara visningen)
/** @type {((dataUrl: string) => void) | null} */
let onPicked = null;

const COLOR_FIELDS = [
  { key: "background",       id: "edit-color-bg",        cssVar: "--color-background" },
  { key: "bodybackground",   id: "edit-color-body-bg",   cssVar: "--color-body-background" },
  { key: "buttonbackground", id: "edit-color-button-bg", cssVar: "--color-button-background" },
  { key: "notesbackground",  id: "edit-color-notes-bg",  cssVar: "--color-notes-background" },
  { key: "border",           id: "edit-color-border",    cssVar: "--color-border" },
  { key: "primary",          id: "edit-color-primary",   cssVar: "--color-primary" },
  { key: "text",             id: "edit-color-text",      cssVar: "--color-text" },
];

/* ---------- Elements ---------- */
const titleEl = document.getElementById("title");
const ownerActions = document.getElementById("owner-actions");
const editBar = document.getElementById("edit-bar");
const detailsSection = document.getElementById("edit-details");
const editButtons = document.getElementById("edit-buttons");
const picker = document.getElementById("file-picker");

/* ---------- Small helpers ---------- */
/**
 * @param {string} elementId
 * @returns {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null}
 */
function field(elementId) {
  const el = document.getElementById(elementId);
  return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
    ? el
    : null;
}

/**
 * @param {string} elementId
 * @param {string | undefined} value
 */
function setField(elementId, value) {
  const el = field(elementId);
  if (el && value) 
    el.value = value;
}

/** @param {string} text */
function createChecklistItem(text) {
  const li = document.createElement("li");
  const label = document.createElement("label");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const span = document.createElement("span");
  span.textContent = text;

  label.append(checkbox, span);
  li.append(label);
  return li;
}

/**
 * @param {string} listId
 * @param {Array<string>} items
 */
function fillChecklist(listId, items) {
  const list = document.getElementById(listId);
  if (!list) 
    return;
  items.forEach((text) => list.append(createChecklistItem(text)));
}

/**
 * Ingrediens med kryssruta, och ⓘ-knapp om en ersättning finns.
 * @param {*} ing
 * @param {number} index
 * @param {number} factor
 */
function createIngredientItem(ing, index, factor) {
  const li = createChecklistItem(
    [formatAmount(ing.amount, ing.unit, factor), ing.name].filter(Boolean).join(" ")
  );
  li.className = "ingredient-item";

  if (ing.substitute) {
    const popup = document.createElement("span");
    popup.className = "popup";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "info-button";
    button.textContent = "i";
    button.setAttribute("aria-label", `Ersättning för ${ing.name}`);
    button.setAttribute("aria-describedby", `sub-${index}`);

    const tip = document.createElement("span");
    tip.className = "popuptext";
    tip.id = `sub-${index}`;
    tip.setAttribute("role", "tooltip");
    tip.textContent = `Kan bytas mot: ${ing.substitute}`;

    popup.append(button, tip);
    li.append(popup);
  }
  return li;
}

/**
 * @param {string} name
 * @param {string} label
 * @param {string} value
 * @param {string} suffix
 */
function createNumberFact(name, label, value, suffix) {
  const li = document.createElement("li");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.id = `fact-${name}`;
  input.className = "fact-input";
  input.value = value ?? "";
  input.setAttribute("aria-label", label);
  li.append(input, ` ${suffix}`);
  return li;
}

function createDifficultyFact() {
  const li = document.createElement("li");
  const select = document.createElement("select");
  select.id = "fact-difficulty";
  select.setAttribute("aria-label", "Svårighetsgrad");
  ["Lätt", "Medel", "Svår"].forEach((level) => {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level;
    select.append(option);
  });
  select.value = draft.difficulty || "Lätt";
  li.append(select);
  return li;
}

/* ---------- Rendering ---------- */
function scaleFactor() {
  const base = Number(draft.servings);
  return !editing && base > 0 && currentServings > 0 ? currentServings / base : 1;
}

function renderFacts() {
  const list = document.getElementById("facts");
  if (!list) 
    return;
  list.replaceChildren();

  if (editing) {
    list.append(
      createNumberFact("servings", "Antal portioner", draft.servings, "port"),
      createNumberFact("time", "Tid i minuter", draft.time, "min"),
      createDifficultyFact()
    );
    return;
  }

  if (draft.servings) {
    const li = createNumberFact("servings", "Antal portioner", String(currentServings), "port");
    const input = li.querySelector("input");
    if (input) {
      input.title = "Ändra portioner för att räkna om ingredienserna";
      input.addEventListener("input", () => {
        currentServings = Number(input.value);
        renderIngredients();
      });
    }
    list.append(li);
  }

  [draft.time && `${draft.time} min`, draft.difficulty].filter(Boolean).forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.append(li);
  });
}

function renderIngredients() {
  const list = document.getElementById("ingredients");
  if (!list) 
    return;
  list.replaceChildren();

  if (editing) {
    draft.ingredients.forEach((/** @type {*} */ ing) => list.append(createIngredientRow(ing)));
    return;
  }

  const factor = scaleFactor();
  draft.ingredients.forEach((/** @type {*} */ ing, /** @type {number} */ i) =>
    list.append(createIngredientItem(ing, i, factor)));
}

function placeNotes() {
  const section = document.getElementById("notes-section");
  const recipeSection = document.querySelector("section.recipe");
  if (!section || !recipeSection) return;

  if (draft.notesPosition === "above") recipeSection.before(section);
  else recipeSection.after(section);
}

function renderNotes() {
  const section = document.getElementById("notes-section");
  const text = document.getElementById("notes-text");
  if (!section || !text) return;

  text.textContent = draft.notes ?? "";
  section.hidden = !editing && !draft.notes;   // visible while editing, hidden if empty otherwise
  placeNotes();
}

function renderImages() {
  const hero = document.getElementById("hero");
  if (hero instanceof HTMLImageElement) {
    hero.src = draft.heroImage || "";
    hero.alt = draft.name;
    hero.hidden = !draft.heroImage;
  }

  const box = document.getElementById("serving-images");
  const section = document.getElementById("serving");
  if (!box || !section) 
    return;

  box.replaceChildren();
  draft.servingImages.forEach((/** @type {string} */ src, /** @type {number} */ i) => {
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    figure.append(img);

    if (editing) {
      const change = document.createElement("button");
      change.type = "button";
      change.textContent = "Byt bild";
      change.addEventListener("click", () =>
        pickImage((url) => { draft.servingImages[i] = url; renderImages(); }));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Ta bort bild";
      remove.addEventListener("click", () => {
        draft.servingImages.splice(i, 1);
        renderImages();
      });

      figure.append(change, remove);
    }
    box.append(figure);
  });

  section.hidden = draft.servingImages.length === 0;
}

/** @param {*} colors */
function applyColors(colors) {
  const root = document.documentElement.style;
  COLOR_FIELDS.forEach(({ key, cssVar }) => {
    if (colors?.[key]) root.setProperty(cssVar, colors[key]);
  });
}

function clearColors() {
  COLOR_FIELDS.forEach(({ cssVar }) => document.documentElement.style.removeProperty(cssVar));
}

function syncColors() {
  const useDefault = field("edit-default-colors");
  if (!(useDefault instanceof HTMLInputElement)) 
    return;

  COLOR_FIELDS.forEach(({ id: fieldId, cssVar }) => {
    const input = field(fieldId);
    if (!input) 
      return;
    input.disabled = useDefault.checked;          // locked when standard colors are used
    if (!useDefault.checked) {
      document.documentElement.style.setProperty(cssVar, input.value);
    }
  });

  if (useDefault.checked) 
    clearColors();          // back to the colors in style.css
}

/* ---------- Edit mode ---------- */
/** @param {(dataUrl: string) => void} callback */
function pickImage(callback) {
  if (!(picker instanceof HTMLInputElement)) 
    return;
  onPicked = callback;
  picker.value = "";
  picker.click();
}

function loadDetails() {
  setField("edit-category", draft.category);
  setField("edit-notes-position", draft.notesPosition ?? "below");
  COLOR_FIELDS.forEach(({ key, id: fieldId }) => setField(fieldId, draft.colors?.[key]));

  const useDefault = field("edit-default-colors");
  if (useDefault instanceof HTMLInputElement) 
    useDefault.checked = !draft.colors;

  syncColors();
}

/** @param {boolean} on */
function setEditing(on) {
  editing = on;
  document.body.classList.toggle("editing", on);

  if (editBar) 
    editBar.hidden = !on;
  if (ownerActions) 
    ownerActions.hidden = on;
  if (detailsSection) 
    detailsSection.hidden = !on;
  if (editButtons) 
    editButtons.hidden = !on;

  document.querySelectorAll(".add-row").forEach((button) => {
    if (button instanceof HTMLElement) button.hidden = !on;
  });

  document.querySelectorAll("#title, #steps span").forEach((el) => {
    if (on) el.setAttribute("contenteditable", "true");
    else el.removeAttribute("contenteditable");
  });

  const notesText = document.getElementById("notes-text");
  if (notesText) {
    if (on) notesText.setAttribute("contenteditable", "plaintext-only");
    else notesText.removeAttribute("contenteditable");
  }

  if (on) 
    loadDetails();
  renderFacts();
  renderIngredients();
  renderNotes();
  renderImages();
}

function readEditedValues() {
  /** @param {Element} el */
  const text = (el) => (el.textContent ?? "").trim();

  if (titleEl) 
    draft.name = text(titleEl) || draft.name;

  const ingredientList = document.getElementById("ingredients");
  if (ingredientList) 
    draft.ingredients = readIngredientRows(ingredientList);
  draft.steps = [...document.querySelectorAll("#steps span")].map(text).filter(Boolean);

  draft.servings = field("fact-servings")?.value ?? draft.servings;
  draft.time = field("fact-time")?.value ?? draft.time;
  draft.difficulty = field("fact-difficulty")?.value ?? draft.difficulty;
  draft.category = field("edit-category")?.value || draft.category;
  draft.notes = document.getElementById("notes-text")?.innerText.trim() ?? "";
  draft.notesPosition = field("edit-notes-position")?.value || "below";

  const useDefault = field("edit-default-colors");
  if (useDefault instanceof HTMLInputElement && useDefault.checked) {
    draft.colors = null;
  } else {
      const useDefault = field("edit-default-colors");
    if (useDefault instanceof HTMLInputElement && useDefault.checked) {
      draft.colors = null;
    } else {
      /** @type {Record<string, string | undefined>} */
      const colors = {};
      COLOR_FIELDS.forEach(({ key, id: fieldId }) => { colors[key] = field(fieldId)?.value; });
      draft.colors = colors;
    }
  }
}

function saveEdit() {
  readEditedValues();

  try {
    const all = JSON.parse(localStorage.getItem("recipes") ?? "[]");
    const index = all.findIndex((/** @type {any} */ r) => r.id === draft.id);
    if (index < 0) {
      alert("Receptet hittades inte i lagringen.");
      return;
    }
    all[index] = draft;
    localStorage.setItem("recipes", JSON.stringify(all));
    location.reload();
  } catch (error) {
    alert("Det gick inte att spara. Bilderna kan vara för stora.");
    console.error(error);
  }
}

function deleteRecipe() {
  if (!confirm(`Ta bort "${recipe.name}"? Det går inte att ångra.`)) return;
  const remaining = recipes.filter((r) => r.id !== recipe.id);
  localStorage.setItem("recipes", JSON.stringify(remaining));
  location.href = "../index.html";
}

/** @param {HTMLElement} button */
function addRow(button) {
  const list = document.getElementById(button.dataset.list ?? "");
  if (!list) return;

  if (list.id === "ingredients") {
    const row = createIngredientRow();
    list.append(row);
    row.querySelector("input")?.focus();
    return;
  }

  const li = createChecklistItem("");
  list.append(li);
  const span = li.querySelector("span");
  if (span) {
    span.setAttribute("contenteditable", "true");
    span.focus();
  }
}

/* ---------- Event listeners ---------- */
function wireEvents() {
  document.getElementById("edit-recipe")?.addEventListener("click", () => setEditing(true));
  document.getElementById("cancel-edit")?.addEventListener("click", () => location.reload());
  document.getElementById("save-edit")?.addEventListener("click", saveEdit);
  document.getElementById("delete-recipe")?.addEventListener("click", deleteRecipe);

  document.getElementById("change-thumb")?.addEventListener("click", () =>
    pickImage((url) => { draft.thumbnail = url; alert("Miniatyrbild vald. Tryck Spara för att behålla den."); }));
  document.getElementById("change-hero")?.addEventListener("click", () =>
    pickImage((url) => { draft.heroImage = url; renderImages(); }));
  document.getElementById("add-serving")?.addEventListener("click", () =>
    pickImage((url) => { draft.servingImages.push(url); renderImages(); }));

  document.querySelectorAll(".add-row").forEach((button) => {
    button.addEventListener("click", () => {
      if (button instanceof HTMLElement) 
        addRow(button);
    });
  });

  if (picker instanceof HTMLInputElement) {
    picker.addEventListener("change", async () => {
      const file = picker.files?.[0];
      if (!file || !onPicked) 
        return;
      try {
        onPicked(await resizeImage(file));
      } catch (error) {
        alert("Kunde inte läsa bilden.");
        console.error(error);
      }
    });
  }

  // Enter får inte skapa radbrytningar i redigerbar text
  document.addEventListener("keydown", (e) => {
    if (
      editing &&
      e.key === "Enter" &&
      e.target instanceof HTMLElement &&
      e.target.isContentEditable &&
      e.target.id !== "notes-text"
    ) {
      e.preventDefault();
    }
  });

  field("edit-notes-position")?.addEventListener("change", (e) => {
    if (e.target instanceof HTMLSelectElement) {
      draft.notesPosition = e.target.value;
      placeNotes();
    }
  });

  // Klick på stegtext ska inte bocka i rutan under redigering
  document.addEventListener("click", (e) => {
    if (editing && e.target instanceof HTMLElement && e.target.closest("#steps label")) {
      e.preventDefault();
    }
  });

    // Live preview while a color is being picked
  COLOR_FIELDS.forEach(({ id: fieldId, cssVar }) => {
    field(fieldId)?.addEventListener("input", (e) => {
      if (e.target instanceof HTMLInputElement) {
        document.documentElement.style.setProperty(cssVar, e.target.value);
      }
    });
  });

  // Checking or unchecking "standard colors"
  field("edit-default-colors")?.addEventListener("change", syncColors);
}

/* ---------- Init ---------- */
if (!recipe) {
  if (titleEl) 
    titleEl.textContent = "Receptet hittades inte";
} else {
  draft = structuredClone(recipe);
  draft.servingImages ??= [];
  draft.ingredients = (draft.ingredients ?? []).map(normalizeIngredient);
  currentServings = Number(draft.servings) || 0;

  document.title = recipe.name;
  if (titleEl) 
    titleEl.textContent = recipe.name;

  fillChecklist("steps", draft.steps);
  renderFacts();
  renderIngredients();
  renderNotes();
  renderImages();
  applyColors(recipe.colors);

  if (ownerActions) 
    ownerActions.hidden = false;
  wireEvents();
}