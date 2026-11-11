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
  if (!list) return;

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
  if (titleElement) titleElement.textContent = "Receptet hittades inte";
} else {
  document.title = recipe.name;
  if (titleElement) titleElement.textContent = recipe.name;
  fill("facts", [
    recipe.servings && `${recipe.servings} port`,
    recipe.time && `${recipe.time} min`,
    recipe.difficulty,
  ].filter(Boolean));
//   fill("ingredients", recipe.ingredients);
//   fill("steps", recipe.steps);
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
}
