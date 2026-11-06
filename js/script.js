// ----- Elements -----
const checkboxes = document.querySelectorAll("li input[type='checkbox']");
const filterButtons = document.querySelectorAll("[data-filter]");
const cards = document.querySelectorAll(".card");
// ----- Functions -----
function toggleDone(e) 
{
    const checkbox = e.currentTarget.querySelector(
        "input[type='checkbox']"
    );

    if (e.target.type !== "checkbox")
    {
        checkbox.checked = !checkbox.checked;
    }

    e.currentTarget.classList.toggle("done", checkbox.checked);
}

// ----- Event listeners -----
checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
        checkbox.closest("li").classList.toggle("done", checkbox.checked);
    });
});
filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        const filter = button.dataset.filter;

        filterButtons.forEach(b => b.setAttribute("aria-pressed", b === button));

        cards.forEach(card => {
            card.hidden = filter !== "all" && card.dataset.category !== filter;
        });
    });
});

// ----- Init -----
