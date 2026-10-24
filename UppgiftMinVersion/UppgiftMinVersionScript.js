// ----- Elements -----
const myHeading = document.querySelector("h1");
const myImage = document.querySelector("img");
const myButton = document.querySelector("button");
const languageButtons = document.querySelectorAll("[data-language]");
const checkboxes = document.querySelectorAll("li input[type='checkbox']");
let myHeadingClicked = false;
let myOriginalHeading = "";

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

function toggleImage()
{
    const src = myImage.getAttribute("src");
    myImage.setAttribute("src", src === "Pannkakor4.jpg" ? "Pannkakor1.jpg" : "Pannkakor4.jpg");
}

function setUserName()
{
    const name = prompt("Please enter your name.");
    if (!name) 
        return;
    localStorage.setItem("name", name);
    setHeading(name);
}

async function changeLanguage(language) 
{
    try 
    {
        // Load the selected JSON file
        const response = await fetch(`${language}.json`);

        if (!response.ok) {
            throw new Error(`Could not load ${language}.json`);
        }

        const translations = await response.json();

        // Translate all text elements
        document.querySelectorAll("[data-i18n]").forEach(element => {
            const key = element.dataset.i18n;

            if (translations[key] !== undefined) {
                element.textContent = translations[key];
            }
        });

        // Translate image alt attributes
        document.querySelectorAll("[data-i18n-alt]").forEach(element => {
            const key = element.dataset.i18nAlt;

            if (translations[key] !== undefined) {
                element.alt = translations[key];
            }
        });

        // Update document language and page title
        document.documentElement.lang = language;
        document.title = translations.pageTitle;

        // Highlight the selected language
        languageButtons.forEach(button => {
            const isActive = button.dataset.language === language;

            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", isActive);
        });
        myHeadingClicked = false;

    } 
    catch (error) 
    {
        console.error("Translation error:", error);
    }
}

// ----- Event listeners -----
myImage.addEventListener("click", toggleImage);
languageButtons.forEach(button => {
    button.addEventListener("click", () => {
        changeLanguage(button.dataset.language);
    });
});
checkboxes.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
        checkbox.closest("li").classList.toggle("done", checkbox.checked);
    });
});
myHeading.addEventListener("click", () => {
    if (!myHeadingClicked) 
    {
        myOriginalHeading = myHeading.textContent;
        myHeading.textContent = "You clicked me!";
    } 
    else 
    {
        myHeading.textContent = myOriginalHeading;
    }
    myHeadingClicked = !myHeadingClicked;
});

// ----- Init -----

// Load Swedish by default
changeLanguage("sv");