// ----- Elements -----
const myHeading = document.querySelector("h1");
const myImage = document.querySelector("img");
const myButton = document.querySelector("button");
const myListItems = document.querySelectorAll("li");

// ----- Functions -----
function setHeading(name)
{
    myHeading.textContent = `Welcome to class ${name}`;
}

function toggleDone(e)
{
    e.target.classList.toggle("done");
}

function toggleImage()
{
    const src = myImage.getAttribute("src");
    myImage.setAttribute("src", src === "TempBat2.png" ? "CoffeMug.png" : "TempBat2.png");
}

function setUserName()
{
    const name = prompt("Please enter your name.");
    if (!name) return;
    localStorage.setItem("name", name);
    setHeading(name);
}

// ----- Event listeners -----
myHeading.addEventListener("click", () => myHeading.textContent = "You clicked me!");
myImage.addEventListener("click", toggleImage);
// myButton.addEventListener("click", setUserName);
myListItems.forEach((item) => item.addEventListener("click", toggleDone));

// ----- Init -----
// const storedName = localStorage.getItem("name");
// if (storedName)
//     setHeading(storedName);
// else
//     setUserName();