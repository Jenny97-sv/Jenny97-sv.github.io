/**@param {string} recipeKey */
const recipeKey = document.body.dataset.recipeKey ?? location.pathname;

document.querySelectorAll("[data-seconds]").forEach((/** @param {Number} item*/item) => {
    if (!(item instanceof HTMLElement)) return;

    const seconds = Number(item.dataset.seconds);
    if (!(seconds > 0)) return;

    // Position among the steps, so each step saves its own timer
    const index = [...(item.parentElement?.children ?? [])].indexOf(item);

    item.append(createTimer(recipeKey, index, seconds));
});