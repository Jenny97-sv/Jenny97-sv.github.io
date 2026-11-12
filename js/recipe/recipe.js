/** @type {number} */
const id = Number(new URLSearchParams(location.search).get("id"));
/** @type {Array<*>} */
const recipes = JSON.parse(localStorage.getItem("recipes") ?? "[]");
/** @type {*} */
const recipe = recipes.find((r) => r.id === id);

/**
 * @param {string} listId
 * @param {Array<string>} items
 */
function fill(listId, items) {
  const list = document.getElementById(listId);
  if (!list) return;
  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.append(li);
  });
}
/**
 * @param {string} listId
 * @param {Array<string>} items
 */
function fillChecklist(listId, items) {
  const list = document.getElementById(listId);
  if (!list) 
    return;

  items.forEach((text) => {
    const li = document.createElement("li");
    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const span = document.createElement("span");
    span.textContent = text;

    label.append(checkbox, span);
    li.append(label);
    list.append(li);
  });
}
/**
 * @param {string} listId
 * @param {Array<string>} items
 */
const titleElement = document.getElementById("title");

if (!recipe) {
  if (titleElement) 
    titleElement.textContent = "Receptet hittades inte";
} else {
  document.title = recipe.name;
  if (titleElement) 
    titleElement.textContent = recipe.name;
  fill("facts", [
    recipe.servings && `${recipe.servings} port`,
    recipe.time && `${recipe.time} min`,
    recipe.difficulty,
  ].filter(Boolean));
  fillChecklist("ingredients", recipe.ingredients);
  fillChecklist("steps", recipe.steps);

  const hero = document.getElementById("hero");
  if (hero instanceof HTMLImageElement && recipe.heroImage) {
    hero.src = recipe.heroImage;
    hero.alt = recipe.name;
    hero.hidden = false;
  }
  const servingBox = document.getElementById("serving-images");
  const servingSection = document.getElementById("serving");
  if (servingBox && servingSection && recipe.servingImages?.length) {
    recipe.servingImages.forEach((/** @type {string} */ src) => {
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      figure.append(img);
      servingBox.append(figure);
  });
  servingSection.hidden = false;
  }

  const actions = document.getElementById("owner-actions");
  const editLink = document.getElementById("edit-link");
  const deleteButton = document.getElementById("delete-recipe");
    
  if (actions && editLink instanceof HTMLAnchorElement && deleteButton) {
    actions.hidden = false;
    editLink.href = `ShareRecipe.html?edit=${recipe.id}`;
  
    deleteButton.addEventListener("click", () => {
      if (!confirm(`Ta bort "${recipe.name}"? Det går inte att ångra.`)) 
        return;
      const remaining = recipes.filter((r) => r.id !== recipe.id);
      localStorage.setItem("recipes", JSON.stringify(remaining));
      location.href = "../index.html";
    });
  }

  if (recipe.colors) {
    const root = document.documentElement.style;
    const map = {
        "--color-background": recipe.colors.background,
        "--color-body-background": recipe.colors.bodybackground,
        "--color-button-background": recipe.colors.buttonbackground,
        "--color-border": recipe.colors.border,
        "--color-primary": recipe.colors.primary,
        "--color-text": recipe.colors.text,
    };
    Object.entries(map).forEach(([name, value]) => {
        if (value) 
            root.setProperty(name, value);
    });
  }
}
