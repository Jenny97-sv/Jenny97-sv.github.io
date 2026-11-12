/* ---------- Data ---------- */
/** @type {number} */
const id = Number(new URLSearchParams(location.search).get("id"));
/** @type {Array<*>} */
const recipes = JSON.parse(localStorage.getItem("recipes") ?? "[]");
/** @type {*} */
const recipe = recipes.find((r) => r.id === id);

/** @type {*} */
let draft = null;          // working copy that is changed while editing
let editing = false;
/** @type {((dataUrl: string) => void) | null} */
let onPicked = null;

/** One row per color: key in the saved recipe, form field id, CSS variable */
const COLOR_FIELDS = [
  { key: "background",       id: "edit-color-bg",        cssVar: "--color-background" },
  { key: "bodybackground",   id: "edit-color-body-bg",   cssVar: "--color-body-background" },
  { key: "buttonbackground", id: "edit-color-button-bg", cssVar: "--color-button-background" },
  { key: "border",           id: "edit-color-border",    cssVar: "--color-border" },
  { key: "primary",          id: "edit-color-primary",   cssVar: "--color-primary" },
  { key: "text",             id: "edit-color-text",      cssVar: "--color-text" },
];

/* ---------- Elements ---------- */
const titleEl = document.getElementById("title");
const ownerActions = document.getElementById("owner-actions");
const editBar = document.getElementById("edit-bar");
const editButtons = document.getElementById("edit-buttons");
const detailsSection = document.getElementById("edit-details");
const picker = document.getElementById("file-picker");

/* ---------- Small helpers ---------- */
/**
 * @param {string} elementId
 * @returns {HTMLInputElement | HTMLSelectElement | null}
 */
function field(elementId) {
  const el = document.getElementById(elementId);
  return el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el : null;
}

/**
 * @param {string} elementId
 * @param {string | undefined} value
 */
function setField(elementId, value) {
  const el = field(elementId);
  if (el && value) el.value = value;
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
  if (!list) return;
  items.forEach((text) => list.append(createChecklistItem(text)));
}

/**
 * @param {string} name   used for the id: fact-<name>
 * @param {string} label  accessible name
 * @param {string} value
 * @param {string} suffix text after the number
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
function renderFacts() {
  const list = document.getElementById("facts");
  if (!list) return;
  list.replaceChildren();

  if (editing) {
    list.append(
      createNumberFact("servings", "Antal portioner", draft.servings, "port"),
      createNumberFact("time", "Tid i minuter", draft.time, "min"),
      createDifficultyFact()
    );
    return;
  }

  [
    draft.servings && `${draft.servings} port`,
    draft.time && `${draft.time} min`,
    draft.difficulty,
  ].filter(Boolean).forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.append(li);
  });
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
  if (!box || !section) return;

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

/* ---------- Edit mode ---------- */
/** @param {(dataUrl: string) => void} callback */
function pickImage(callback) {
  if (!(picker instanceof HTMLInputElement)) return;
  onPicked = callback;
  picker.value = "";
  picker.click();
}

/** Fill the category and color fields from the draft */
function loadDetails() {
  setField("edit-category", draft.category);
  COLOR_FIELDS.forEach(({ key, id: fieldId }) => setField(fieldId, draft.colors?.[key]));

  const useDefault = field("edit-default-colors");
  if (useDefault instanceof HTMLInputElement) useDefault.checked = !draft.colors;
}

/** @param {boolean} on */
function setEditing(on) {
  editing = on;
  document.body.classList.toggle("editing", on);

  if (editBar) editBar.hidden = !on;
  if (editButtons) editButtons.hidden = !on;
  if (ownerActions) ownerActions.hidden = on;
  if (detailsSection) detailsSection.hidden = !on;

  document.querySelectorAll(".add-row").forEach((button) => {
    if (button instanceof HTMLElement) button.hidden = !on;
  });

  document.querySelectorAll("#title, #ingredients span, #steps span").forEach((el) => {
    if (on) el.setAttribute("contenteditable", "true");
    else el.removeAttribute("contenteditable");
  });

  if (on) loadDetails();
  renderFacts();
  renderImages();
}

/** Copy everything the user changed from the page into the draft */
function readEditedValues() {
  /** @param {Element} el */
  const text = (el) => (el.textContent ?? "").trim();

  if (titleEl) draft.name = text(titleEl) || draft.name;
  draft.ingredients = [...document.querySelectorAll("#ingredients span")].map(text).filter(Boolean);
  draft.steps = [...document.querySelectorAll("#steps span")].map(text).filter(Boolean);

  draft.servings = field("fact-servings")?.value ?? draft.servings;
  draft.time = field("fact-time")?.value ?? draft.time;
  draft.difficulty = field("fact-difficulty")?.value ?? draft.difficulty;
  draft.category = field("edit-category")?.value || draft.category;

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
  // Buttons
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
      if (button instanceof HTMLElement) addRow(button);
    });
  });

  // Image picker
  if (picker instanceof HTMLInputElement) {
    picker.addEventListener("change", async () => {
      const file = picker.files?.[0];
      if (!file || !onPicked) return;
      try {
        onPicked(await resizeImage(file));
      } catch (error) {
        alert("Kunde inte läsa bilden.");
        console.error(error);
      }
    });
  }

  // Enter must not create line breaks in editable text
  document.addEventListener("keydown", (e) => {
    if (editing && e.key === "Enter" && e.target instanceof HTMLElement && e.target.isContentEditable) {
      e.preventDefault();
    }
  });

  // Clicking list text must not tick the checkbox while editing (only the lists, not the form fields)
  document.addEventListener("click", (e) => {
    if (editing && e.target instanceof HTMLElement && e.target.closest("#ingredients label, #steps label")) {
      e.preventDefault();
    }
  });

  // Live color preview
  COLOR_FIELDS.forEach(({ id: fieldId, cssVar }) => {
    field(fieldId)?.addEventListener("input", (e) => {
      if (!(e.target instanceof HTMLInputElement)) return;
      document.documentElement.style.setProperty(cssVar, e.target.value);
      const useDefault = field("edit-default-colors");
      if (useDefault instanceof HTMLInputElement) useDefault.checked = false;
    });
  });

  field("edit-default-colors")?.addEventListener("change", (e) => {
    if (e.target instanceof HTMLInputElement && e.target.checked) clearColors();
  });
}

/* ---------- Init ---------- */
if (!recipe) {
  if (titleEl) titleEl.textContent = "Receptet hittades inte";
} else {
  draft = structuredClone(recipe);
  draft.servingImages ??= [];

  document.title = recipe.name;
  if (titleEl) titleEl.textContent = recipe.name;

  fillChecklist("ingredients", recipe.ingredients);
  fillChecklist("steps", recipe.steps);
  renderFacts();
  renderImages();
  applyColors(recipe.colors);

  if (ownerActions) ownerActions.hidden = false;
  wireEvents();
}