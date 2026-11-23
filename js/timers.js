const TIMER_PREFIX = "timers:";

/**Timer that are currently running. One shared interval ticks them all. */
const activeTimers = new Set();
/**@type {number | null} */
let tickHandle = null;
/**@type {AudioContext | null} */
let audioContext = null;


/**-----------Formatting----------- */
/**@param {number} totalSeconds */
function formatTime(totalSeconds)
{
    const s = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600 / 60));
    const seconds = s % 60;
    const pad = (/**@type {number} */n) => String(n).padStart(2, "0");
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}


/**For screen readers: 1 minut 30 sekunder  @param {number} totalSeconds*/
function spokenTime(totalSeconds)
{
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60; 
    const parts = [];
    if (minutes) 
        parts.push(`${minutes} ${minutes === 1 ? "minut" : "minuter"}`);
    if (seconds) 
        parts.push(`${seconds} ${seconds === 1 ? "sekund" : "sekunder"}`);
    return parts.join(" ") || "0 sekunder";
}

/**@param {string} message */
function announce(message)
{
    const region = document.getElementById("timer-status");
    if (!region)
        return;
    region.textContent = "";
    setTimeout(() => {region.textContent = message;}, 50);
}


/**---------Saving------------ */
/**@param {number} recipeId */
function loadTimerStore(recipeId)
{
    try {
        return JSON.parse(localStorage.getItem(TIMER_PREFIX + recipeId) ?? "{}") || {};
    }
    catch {
        return {};
    }
}


/**
 * @param {number} recipeId
 * @param {number} index
 * @param {*} state null removes the saved state
 */
function saveTimerState(recipeId, index, state)
{
    const store = loadTimerStore(recipeId);
    if (state)
        store[index] = state;
    else 
        delete store[index];

    try {
        if (Object.keys(store).length > 0)
            localStorage.setItem(TIMER_PREFIX + recipeId, JSON.stringify(store));
        else
            localStorage.removeItem(TIMER_PREFIX + recipeId);
    }
    catch (error) {
        console.error("Could not save timer", error);
    }
}

/**@param {number} recipeId */
function clearTimers(recipeId)
{
    localStorage.removeItem(TIMER_PREFIX + recipeId);
}


/**----------Sound----------- */
function getAudioContext()
{
    if (!audioContext)
    {
        const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
        if (Ctx)
            audioContext = new Ctx();
    }
    return audioContext;
}

/**Browser only allow sound after a click, so unlock it early */
function unlockAudio()
{
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended")
        ctx.resume().catch(() => {});
}

function playBeep()
{
    const ctx = getAudioContext();
    if (!ctx)
        return;
    if (ctx.state === "suspended")
        ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    [0,0.35,0.7].forEach((offset) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.4, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.3);
    });
}

["pointerdown", "keydown"].forEach((type) =>
    document.addEventListener(type, unlockAudio, {once: true}));

/** ------------- The shared clock--------------  */
function startTicking() 
{
  if (tickHandle === null) 
    tickHandle = setInterval(tickAll, 250);
}

function tickAll() 
{
    const now = Date.now();
    activeTimers.forEach((timer) => timer.tick(now));
    if (activeTimers.size === 0 && tickHandle !== null)
    {
        clearInterval(tickHandle);
        tickHandle = null;
    }
}

/**------------One timer------------ */
/**
 * @param {number} recipeId
 * @param {number} index
 * @param {number} totalSeconds
 */
function createTimer(recipeId, index, totalSeconds) 
{
    const totalMs = totalSeconds * 1000;
    const spoken = spokenTime(totalSeconds);
    const name = `Steg ${index + 1}`;

    /**@type {"idle" | "running" | "paused" | "finished"} */
    let state = "idle";
    let endsAt = 0;
    let remainingMs = totalMs;

    const root = document.createElement("div");
    root.className = "timer";

    const controls = document.createElement("div");
    controls.className = "timer-controls";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "timer-toggle";

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "timer-reset";
    reset.textContent = "↺";
    reset.title = "Nollställ timer";

    const display = document.createElement("div");
    display.className = "timer-display";
    display.setAttribute("aria-hidden", "true");

    const time = document.createElement("span");
    time.className = "timer-time";
    const track = document.createElement("div");
    track.className = "timer-track";
    const bar = document.createElement("div");
    bar.className = "timer-bar";

    track.append(bar);
    display.append(time, track);
    controls.append(toggle, reset);
    root.append(controls, display);

    /**@param {number} ms */
    function show(ms)
    {
        const clamped = Math.max(0,ms);
        time.textContent = formatTime(Math.ceil(clamped / 1000));
        bar.style.inlineSize = `${totalMs > 0 ? clamped / totalMs * 100 : 0}%`;
    }

    /**@param {string} label @param {string} aria */
    function setToggle(label, aria)
    {
        toggle.textContent = label;
        toggle.setAttribute("aria-label", aria);
    }

    function render()
    {
        root.dataset.state = state;
        display.hidden = state === "idle";
        reset.hidden = state === "idle";

        if (state === "idle") 
            setToggle(`⏱ Starta ${formatTime(totalSeconds)}`, `Starta timer för ${name.toLowerCase()}, ${spoken}`);
        else if (state === "running") 
            setToggle("⏸ Pausa", `Pausa timer för ${name.toLowerCase()}`);
        else if (state === "paused") 
            setToggle("▶ Fortsätt", `Fortsätt timer för ${name.toLowerCase()}`);
        else 
            setToggle("↻ Starta om", `Starta om timer för ${name.toLowerCase()}, ${spoken}`);
    }

    function save()
    {
        if (state === "idle")
            saveTimerState(recipeId, index, null);
        else
            saveTimerState(recipeId, index, {state, total: totalSeconds, endsAt, remainingMs});
    }

    /** @param {boolean} withSound/ */
    function finish(withSound)
    {
        state = "finished";
        remainingMs = 0;
        activeTimers.delete(api);
        save();
        render();
        show(0);
        if (withSound)
        {
            playBeep();
            announce(`Timer klar: ${name}`);
        }
    }

    /**@param {number} now */
    function tick(now)
    {
        if (!root.isConnected)
        {
            activeTimers.delete(api);
            return;
        }

        const left = endsAt - now;
        if (left <= 0)
            finish(true);
        else 
            show(left);
    }

    const api = {tick};

    function start()
    {
        unlockAudio();
        if (state === "finished")
            remainingMs = totalMs;
        state = "running";
        endsAt = Date.now() + remainingMs;
        activeTimers.add(api);
        startTicking();
        save();
        render();
        show(remainingMs);
        announce(`Timer startad: ${name}, ${spoken}`);
    }

    function pause()
    {
        remainingMs = Math.max(0, endsAt - Date.now());
        state = "paused";
        activeTimers.delete(api);
        save();
        render();
        show(totalMs);
        announce(`Timer pausad: ${name}`);
    }

    function resetTimer()
    {
        state = "idle";
        remainingMs = totalMs;
        activeTimers.delete(api);
        save();
        render();
        show(totalMs);
        announce(`Timer nollställd: ${name}`);
    }

    toggle.addEventListener("click", () => (state === "running" ? pause() : start()));
    reset.addEventListener("click", resetTimer);

    /**Restore a saved timer (only if the step's time is unchanged) */
    const saved = loadTimerStore(recipeId)[index];
    if (saved && saved.total === totalSeconds)
    {
        if (saved.state === "running" && Number.isFinite(saved.endsAt))
        {
            endsAt = saved.endsAt;
            remainingMs = endsAt - Date.now();
            if (remainingMs <= 0)
            {
                state = "finished";
                remainingMs = 0;
                save();
            }
            else
            {
                state = "running";
                activeTimers.add(api);
                startTicking();
            }
        }
        else if (saved.state === "paused")
        {
            state = "paused";
            remainingMs = Number(saved.remainingMs) || totalMs;
        }
        else if (saved.state === "finished")
        {
            state = "finished";
            remainingMs = 0;
        }
    }

    render();
    show(state === "running" ? endsAt - Date.now() : remainingMs);
    return root;
}