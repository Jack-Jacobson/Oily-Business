/**
 * 
 * UI MANAGER
 * Handles frontent rendering, ui states, visual logic, DOM interactions
 * 
 */

/**
 * GLOBALS
 */
let oilStored = 0;
let oilMultiplier = 1;
let money = 0;
let oilPrice = 78.50;
let heat = 0;
let demand = 100;
let isSpinning = false;
const heatPerDegree = 10/ 360 //10% heat gained per turn
const heatCooldownPerSec = 10; 
let overheatPopupShown = false;

let upgradeLevels = [1, 1, 1, 1, 1];
let upgradeCosts = [100, 150, 200, 250, 400]; 
const upgradeDefs = [
    {
        title: 'Drill Power',
        asset: 'assets/drill.png'
    },
    {
        title: 'Spin Power',
        asset: 'assets/piston.png'
    },
    {
        title: 'Cooling',
        asset: 'assets/fan.png'
    },
    {
        title: 'Storage',
        asset: 'assets/barrel.png'
    },
    {
        title: 'Automation',
        asset: 'assets/robotarm.png'
    }
];

const uiElements = {
    btnMoney: document.getElementById('btn-money'),
    btnOil: document.getElementById('btn-oil'),
    btnHeat: document.getElementById('btn-heat'),
    btnAchievement: document.getElementById('btn-achievement'),
    btnSettings: document.getElementById('btn-settings'),

    oilCount: document.getElementById('oil-count'),
    moneyCount: document.getElementById('money-count'),

    wheel: document.getElementById('spin-wheel'),
    upgradesPanel: document.getElementById('upgrades-panel'),
    upgradesToggle: document.getElementById('upgrades-toggle'),
    upgradesContent: document.getElementById('upgrades-content'),

    oilSellPanel: document.getElementById('oil-sell-panel'),
    oilPriceValue: document.getElementById('oil-price-value'),
    sellOilBtn: document.getElementById('sell-oil-btn')
};

/** 
* @param {number} heatValue - Int between 0-100, represents heat levels for UI button
* updateHeatUI automatically gradients with red orange and white based on heat percent
*/
function updateHeatUI(heatValue) {
    const clampedHeat = Math.max(0, Math.min(100, heatValue));

    if (uiElements.btnHeat) {
        uiElements.btnHeat.style.background = `linear-gradient(to right, 
            #8b3f00 0%,
            #d97706 ${clampedHeat}%,
            #212428 ${clampedHeat}%
        )`;
    }
}

/**
 * Helper functions to control amount of oil stored and make it pop up on screen
 * @param {number} amount - Amount of oil to display on popup/add to total count.
 */



function updateOilUI() {
    if (uiElements.oilCount) {
        uiElements.oilCount.textContent = oilStored;
    }
}

function updateMoneyUi(){
    if (uiElements.moneyCount){
        uiElements.moneyCount.textContent = money.toFixed(2);
    }
}

function spawnOilPopup(amount) {
    const container = uiElements.wheel?.parentElement;
    if (!container) return;

    const popup = document.createElement('div');
    popup.className = 'oil-popup';
    popup.textContent = `+${amount} oil`;

    // Random offset
    const side = Math.random() < 0.5 ? -1 : 1;
    const xOffset = 170 + Math.random() * 80;
    const yOffset = 50 + Math.random() * 70;

    popup.style.left = `calc(50% + ${side * xOffset}px)`;
    popup.style.top = `${yOffset}`;

    container.appendChild(popup);

    popup.addEventListener('animationend', () => {
        popup.remove();
    }, { once: true });
}
/** 
* NOTE: Adapted to have any message when called
* @param {message} Any message you want with the overheat popup
*/
function spawnOverheatPopup(message = `Drill overheated!<br>Stop and let it cool down.`) {
    const container = uiElements.wheel?.parentElement;
    if(!container) return;

    const popup = document.createElement('div');
    popup.className = 'oil-popup overheat-popup';
    popup.innerHTML = message;

    const side = Math.random() < 0.5 ? -1 : 1;
    const xOffset = 170 + Math.random() * 80;
    const yOffset = 70 + Math.random() * 70;

    popup.style.left = `calc(50% + ${side * xOffset}px)`;
    popup.style.top = `${yOffset}`;

    container.appendChild(popup);

    popup.addEventListener('animationend', () => {
        popup.remove();
    }, {once:true});
}
function spawnNotEnoughMoneyPopup() {
    spawnOverheatPopup(`You can't afford that yet!`);
}
function addOil(amount) {
    oilStored += amount;
    updateOilUI();
    spawnOilPopup(amount);
}

function sellAllOil() {
    if(oilStored <= 0) return;
    
    const dynamicPrice = getDynamicOilPrice();
    const earnings = oilStored * dynamicPrice;

    money += earnings;
    oilStored = 0;

    updateOilUI();
    updateMoneyUi();
}

function updateDemand() {
    const change = Math.floor(Math.random() * 4) + 1;
    const goesUp = Math.random() < 0.5;

    if (goesUp) {
        demand += change;
    } else {
        demand -= change;
    }

    demand = Math.max(50, Math.min(150, demand));

    updateOilPanelUI();
}

function coolHeat() {
    if(!isSpinning) addHeat(-heatCooldownPerSec);
}

function getDynamicOilPrice() {
    return oilPrice * (demand / 100);
}

function updateOilPanelUI() {
    if (uiElements.oilSellPanel?.classList.contains('open') && uiElements.oilPriceValue) {
        uiElements.oilPriceValue.textContent = `$${getDynamicOilPrice().toFixed(2)}`;
    }
}

function addHeat(amount) {
    const prevHeat = heat;

    heat += amount;
    heat = Math.max(0, Math.min(100, heat));

    updateHeatUI(heat);

    if(heat >= 100 && prevHeat < 100 && !overheatPopupShown) {
        overheatPopupShown = true;
        spawnOverheatPopup();
    }

    if(heat < 100){
        overheatPopupShown = false;
    }
}

function isOverheated() {
    return heat >= 100;
}

/** 
 * Upgrades Content Creation
 * renderUpgradesPanels creates HTMl for each button based on upgradesDef set for easy changing and adaptation
 * Other two manage upgrade variables and keep panel live to variables
 */
function renderUpgradesPanel() {
    if (!uiElements.upgradesContent) return;

    uiElements.upgradesContent.innerHTML = upgradeDefs.map((upgrade, index) => `
        <div class="upgrade-card">
            <div class="upgrade-icon-wrap">
                <img
                    src="${upgrade.asset}"
                    alt="${upgrade.title} Icon"
                    class="upgrade-icon"
                    draggable="false"
                >
            </div>

            <div class="upgrade-meta">
                <div class="upgrade-title">${upgrade.title}</div>
                <div class="upgrade-level">level: <span id="upgrade-level-${index}">${upgradeLevels[index]}</span></div>
                <button class="upgrade-buy-btn" id="upgrade-buy-${index}" type="button">$${upgradeCosts[index]}</button>
            </div>
        </div>
    `).join('');

    for (let i = 0; i < upgradeDefs.length; i++) {
        const btn = document.getElementById(`upgrade-buy-${i}`);
        if (btn) {
            btn.addEventListener('click', () => buyUpgrade(i));
        }
    }
}
function updateUpgradePanelUI() {
    for (let i = 0; i < upgradeDefs.length; i++) {
        const levelEl = document.getElementById(`upgrade-level-${i}`);
        const btnEl = document.getElementById(`upgrade-buy-${i}`);

        if (levelEl) {
            levelEl.textContent = upgradeLevels[i];
        }

        if (btnEl) {
            btnEl.textContent = `$${upgradeCosts[i]}`;
        }
    }
}
function buyUpgrade(index) {
    const cost = upgradeCosts[index];

    if (money < cost){ 
        
        spawnNotEnoughMoneyPopup();
        return;
    }

    money -= cost;
    upgradeLevels[index] += 1;
    upgradeCosts[index] = Math.ceil(cost * 1.35);

    updateMoneyUi();
    updateUpgradePanelUI();
}
/**
 * Attachese navigation listeners
 */
function initNavbarListeners() {
    uiElements.btnMoney?.addEventListener('click', () => console.log('Money clicked'));
    uiElements.btnHeat?.addEventListener('click', () => console.log('Heat clicked'));
    uiElements.btnAchievement?.addEventListener('click', () => console.log('Achievement clicked'));
    uiElements.btnSettings?.addEventListener('click', () => console.log('Settings clicked'));
}

function initUpgradesPanel() {
    uiElements.upgradesToggle?.addEventListener('click', () => {
        uiElements.upgradesPanel?.classList.toggle('open');

        uiElements.upgradesToggle.textContent =
            uiElements.upgradesPanel.classList.contains('open')
                ? '<'
                : '>';
    });
}

function initOilPanel() {
    uiElements.btnOil?.addEventListener('click', () => {
        uiElements.oilSellPanel?.classList.toggle('open');

        updateOilPanelUI();
    });

    uiElements.sellOilBtn?.addEventListener('click', sellAllOil);
}

/**
 * Save data functions and variables
 * Add all variables here ( you may need to change this to be in a function depending on how you setup Global vars ) for save files.
 */

let saveData = {
    oilStored: oilStored,
    oilMultiplier: oilMultiplier,
    money: money,
    oilPrice: oilPrice,
    heat: heat,
    demand: demand
}

async function signData(data, secretKey) {
    const json = JSON.stringify(data);
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secretKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign(
        "HMAC", keyMaterial, new TextEncoder().encode(json)
    );
    return {
        payload: json,
        sig: btoa(String.fromCharCode(...new Uint8Array(signature)))
    };
}

function encodeSave(signedBundle) {
    const json = JSON.stringify(signedBundle);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const xorKey = 0x5A; /* if one of you cares you can change this to something else */
    const xored = Array.from(b64) /* again just doing base64 because it doesn't really matter that much it's just extra */
        .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (xorKey + i % 16 )))
        .join("");
    return btoa(xored);
}
/* export / load */

async function exportSave(saveData, secretKey) {
    const signed = await signData(saveData, secretKey);
    const encoded = encodeSave(signed);
    const blob = new Blob([encoded], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "savedata.dat";
    a.click();
}

async function loadSave(file, secretKey) {
    const raw = await file.text();
    const xorKey = 0x5A;
    const step1 = atob(raw);
    const unxored = Array.from(step1)
        .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (xorKey + i % 16)))
        .join("");

    const bundleJson = decodeURIComponent(escape(atob(unxored)));
    const bundle = JSON.parse(bundleJson);

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secretKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(bundle.sig), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
        "HMAC", keyMaterial, sigBytes,
        new TextEncoder().encode(bundle.payload)
    );

    if (!valid) throw new Error("File is corrupted.");
    return JSON.parse(bundle.payload);
}

/**
 * WHEEL DRAG LOGIC
 * Uses trig to calculate angle of pointer relative to wheel center
 */
function initWheelDrag() {
    const wheel = uiElements.wheel;
    if (!wheel) return;

    wheel.draggable = false;
    wheel.addEventListener('dragstart', (e) => e.preventDefault());

    // Wheel spinning vars
    let isDragging = false;
    let currentRotation = 0;
    let totalRotationTravel = 0;

    // Wheel spinning physics vars
    let lastAngle = 0;
    let velocity = 0;
    let friction = 0.98; // ADAPT AS NECESSARY --> Smaller number = more speed lost per frame 
    let animationFrameId = null; // Physics animation loop reference

    const grabArea = 0.59; // Outer percent of wheel that you can grab ADAPT AS NECESSARY
    const grabFalloff = 0.88; // Distance from center where power fades to 0 ADAPT AS NECESSARY

    // Helper to find wheel center x and y on screen
    function getCenter(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            radius: Math.min(element.offsetWidth, element.offsetHeight) / 2
        };
    }

    // Helper to find strength depending on how close to center you are (leverage)
    function getGrabStrength(dist, radius) {
        const fadeDistance = radius * grabFalloff;
        return Math.max(0, 1 - Math.min(1, Math.abs(dist - radius) / fadeDistance));
    }

    function checkRotationRewards() {
        while (totalRotationTravel >= 360) {
            totalRotationTravel -= 360;
            addOil(1 * oilMultiplier);
        }
    }

    // Physics engine to animate wheel after release
    function updateInertia() {
        if (isDragging) return;

        velocity *= friction;

        // Once spinning very slowly just stop, adjust as necessary
        if (Math.abs(velocity) < 0.04) {
            velocity = 0;
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            isSpinning = false;
            return;
        }

        currentRotation += velocity;
        totalRotationTravel += Math.abs(velocity);

        addHeat(Math.abs(velocity) * heatPerDegree);

        checkRotationRewards();

        wheel.style.transform = `rotate(${currentRotation}deg)`;

        animationFrameId = requestAnimationFrame(updateInertia);
    }

    // Calculates angles and prepares to spin wheel when click on the wheel
    wheel.addEventListener('pointerdown', (e) => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        velocity = 0;

        const center = getCenter(wheel);

        // Calculates hypotenuse between click and center
        const dist = Math.hypot(e.clientX - center.x, e.clientY - center.y);

        // Return if hypotenuse is less than allowed by grab area percent
        if (dist < center.radius * (1 - grabArea) || dist > center.radius) {
            return;
        }

        if(isOverheated()) {
            return;
        }

        isSpinning = true;
        isDragging = true;
        wheel.style.cursor = 'grabbing';

        const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);
        lastAngle = currentAngle;

        wheel.setPointerCapture(e.pointerId);
    });

    // When rotated, spin wheel after calculating angle change
    wheel.addEventListener('pointermove', (e) => {
        if (!isDragging) {
            const center = getCenter(wheel);
            const dist = Math.hypot(e.clientX - center.x, e.clientY - center.y);

            // Logic for not allowed or grab cursor when hovering over grabable area
            if (dist >= center.radius * (1 - grabArea) && dist <= center.radius) {
                wheel.style.cursor = 'grab';
            } else {
                wheel.style.cursor = 'not-allowed';
            }
            return;
        }
        if(isOverheated()){
            isDragging = false;
            velocity = 0;
            isSpinning = false;
            return;
        }

        const center = getCenter(wheel);
        const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);
        const dist = Math.hypot(e.clientX - center.x, e.clientY - center.y);

        let frameDiff = currentAngle - lastAngle;

        if (frameDiff > 180) frameDiff -= 360;
        if (frameDiff < -180) frameDiff += 360;

        const grabStrength = getGrabStrength(dist, center.radius);
        const appliedDiff = frameDiff * grabStrength;

        currentRotation += appliedDiff;
        totalRotationTravel += Math.abs(appliedDiff);

        addHeat(Math.abs(appliedDiff) *heatPerDegree);

        checkRotationRewards();

        wheel.style.transform = `rotate(${currentRotation}deg)`;

        velocity = appliedDiff;
        lastAngle = currentAngle;
    });

    const stopDrag = (e) => {
        isDragging = false;
        wheel.style.cursor = 'grab';

        if (e.pointerId) {
            try {
                wheel.releasePointerCapture(e.pointerId);
            } catch {
                // Ignore if capture was already released
            }
        }

        animationFrameId = requestAnimationFrame(updateInertia);
    };

    wheel.addEventListener('pointerup', stopDrag);
    wheel.addEventListener('pointercancel', stopDrag);
}

// Ensures html loaded then assigns logic
document.addEventListener('DOMContentLoaded', () => {
    initNavbarListeners(); 
    initWheelDrag(); 
    renderUpgradesPanel();
    initUpgradesPanel();
    updateMoneyUi();
    initOilPanel();
    updateOilUI();
    updateOilPanelUI();

    setInterval(updateDemand, 10000);
    setInterval(coolHeat, 1000);
});
