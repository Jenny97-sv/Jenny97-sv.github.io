// ----- Elements -----
const checkboxes = document.querySelectorAll("li input[type='checkbox']");

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

// ----- Init -----
