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
let maxOilStorage = 10;
let money = 0;
let oilPrice = 78.50;
let heat = 0;
let demand = 100;

let isSpinning = false;

const baseHeatPerDegree = 5 / 360 //10% heat gained per turn
const baseHeatCooldownPerSec = 15; 

let heatPerDegree = baseHeatPerDegree;
let heatCooldownPerSec = baseHeatCooldownPerSec;

let oilMultiplier = 1;
let spinPowerMultiplier = 1;
let coolingMultiplier = 1;

const NUMBER_PRECISION = 2;

function roundTo(value, decimals = NUMBER_PRECISION) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatNumber(value, decimals = NUMBER_PRECISION) {
    return roundTo(value, decimals)
        .toFixed(decimals)
        .replace(/\.?0+$/, '');
}

let overheatPopupShown = false;
let oilFullPopupShown = false;

let upgradeLevels = [1, 1, 1, 1, 1];
let upgradeCosts = [2500, 1500, 1800, 1800, 3100]; 
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

let autoSpinEnabled = false;
let autoVelocity = 0;

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
    sellOilBtn: document.getElementById('sell-oil-btn'),

    btnSave: document.getElementById('btn-save'),
    btnLoad: document.getElementById('btn-load'),
    fileLoad: document.getElementById('file-load'),

    btnCredits: document.getElementById('btn-credits'),
    creditsOverlay: document.getElementById('credits-overlay'),
    creditsClose: document.getElementById('credits-close')
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
        uiElements.oilCount.textContent = `${formatNumber(oilStored)}/${formatNumber(maxOilStorage)}`;
    }
}

function updateMoneyUi(){
    if (uiElements.moneyCount){
        uiElements.moneyCount.textContent = formatNumber(money);
    }
}

function spawnOilPopup(amount) {
    const container = uiElements.wheel?.parentElement;
    if (!container) return;

    const popup = document.createElement('div');
    popup.className = 'oil-popup';
    popup.textContent = `+${formatNumber(amount)} oil`;

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
function spawnStorageFullPopup() {
    if(!oilFullPopupShown){
        spawnOverheatPopup(`Your oil storage is full!\nClick the "oil" button to sell!`);
    }
}
function getUpgradeSubtext(index) {
    const texts = [
        'Increases oil per spin by 30%',
        'Increases manual spin power by 20%',
        'Increases cooling by 20%',
        'Increases storage by 100%',
        'Increases auto spin by 50%'
    ];

    return texts[index] ?? '';
}

function updateUpgradeEffects() {
    oilMultiplier = roundTo(Math.pow(1.3, upgradeLevels[0]-1));
    spinPowerMultiplier = roundTo(Math.pow(1.2, upgradeLevels[1]-1));
    coolingMultiplier = roundTo(Math.pow(1.2, upgradeLevels[2]-1));

    heatPerDegree = roundTo(baseHeatPerDegree / coolingMultiplier); 
    heatCooldownPerSec = roundTo(baseHeatCooldownPerSec * coolingMultiplier);

    maxOilStorage = roundTo(10 * Math.pow(2, upgradeLevels[3]-1));

    autoVelocity = upgradeLevels[4] > 1 ? roundTo(1.0 * Math.pow(1.5, upgradeLevels[4] - 2)) : 0;
    
    const autoContainer = document.getElementById('auto-toggle-container');
    if (autoContainer && upgradeLevels[4] > 1) {
        autoContainer.style.display = 'flex';
    }
}
function addOil(amount) {

    if(oilStored >= maxOilStorage){
        spawnStorageFullPopup();
        oilFullPopupShown = true;
        return;
    }

    const amountAdded = roundTo(Math.min(amount, maxOilStorage-oilStored));

    oilStored = roundTo(oilStored + amountAdded);
    oilFullPopupShown = false;

    updateOilUI();
    spawnOilPopup(amountAdded);
}

function sellAllOil() {
    if(oilStored <= 0) return;
    
    const dynamicPrice = getDynamicOilPrice();
    const earnings = roundTo(oilStored * dynamicPrice);

    money = roundTo(money + earnings);
    oilStored = 0;

    updateOilUI();
    updateMoneyUi();
}

function updateDemand() {
    const change = Math.floor(Math.random() * 4) + 1;
    const goesUp = Math.random() < 0.5;

    if (goesUp) {
        demand += change;
        console.log(`Increased ${change}% to ${demand}% of original`)
    } else {
        demand -= change;
        console.log(`Decresed ${change}% to ${demand}% of original`)
    }

    demand = Math.max(50, Math.min(150, demand));

    updateOilPanelUI();
}

function coolHeat() {
    if(!isSpinning) addHeat(-heatCooldownPerSec);
}

function getDynamicOilPrice() {
    return roundTo(oilPrice * (demand / 100));
}

function updateOilPanelUI() {
    if (uiElements.oilSellPanel?.classList.contains('open') && uiElements.oilPriceValue) {
        uiElements.oilPriceValue.textContent = `$${formatNumber(getDynamicOilPrice())}`;
    }
}

function addHeat(amount) {
    const prevHeat = heat;

    heat = roundTo(heat + amount);
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
                <div class="upgrade-subtext" id="upgrade-subtext-${index}">${getUpgradeSubtext(index)}</div>
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
        const subtextEl = document.getElementById(`upgrade-subtext-${i}`);
        const btnEl = document.getElementById(`upgrade-buy-${i}`);

        if (levelEl) {
            levelEl.textContent = upgradeLevels[i];
        }

        if (subtextEl) {
            subtextEl.textContent = getUpgradeSubtext(i);
        }

        if (btnEl) {
            btnEl.textContent = `$${upgradeCosts[i]}`;
        }
    }
}

function buyUpgrade(index) {
    const cost = upgradeCosts[index];

    if (money < cost) { 
        spawnNotEnoughMoneyPopup();
        return;
    }

    money -= cost;
    upgradeLevels[index] += 1;

    if (index === 0) {
        upgradeCosts[index] = Math.ceil(cost * 1.6);
    }
    else if (index === 1) {
        upgradeCosts[index] = Math.ceil(cost * 1.6);
    }
    else if (index === 2) {
        upgradeCosts[index] = Math.ceil(cost * 1.6);
    }
    else if (index === 3) {
        maxOilStorage *= 2;
        upgradeCosts[index] = Math.ceil(cost * 1.6);
    }
    else if (index === 4) {
        upgradeCosts[index] = Math.ceil(cost * 1.6);
    }

    updateUpgradeEffects();
    updateMoneyUi();
    updateOilUI();
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

const SECRET_KEY = "oily_business_secret"; 

function handleSave() {
    const currentData = {
        oilStored: oilStored,
        money: money,
        heat: heat,
        demand: demand,
        upgradeLevels: upgradeLevels,
        upgradeCosts: upgradeCosts
    };
    
    exportSave(currentData, SECRET_KEY);
}

async function handleLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const loadedData = await loadSave(file, SECRET_KEY);
        
        oilStored = roundTo(loadedData.oilStored || 0);
        money = roundTo(loadedData.money || 0);
        heat = roundTo(loadedData.heat || 0);
        demand = loadedData.demand || 100;
        autoSpinEnabled = loadedData.autoSpinEnabled || false;
        
        const btnAuto = document.getElementById('btn-auto-toggle');
        if (btnAuto) {
            btnAuto.textContent = `Auto Spin: ${autoSpinEnabled ? 'ON' : 'OFF'}`;
            btnAuto.style.color = autoSpinEnabled ? '#111' : '#ff9a1f';
            btnAuto.style.background = autoSpinEnabled ? '#ff9a1f' : 'transparent';
        }
        
        window.dispatchEvent(new Event('startAutoSpin'));
        
        if (loadedData.upgradeLevels) upgradeLevels = [...loadedData.upgradeLevels];
        if (loadedData.upgradeCosts) upgradeCosts = [...loadedData.upgradeCosts];

        updateUpgradeEffects();
        
        updateOilUI();
        updateMoneyUi();
        updateHeatUI(heat);
        updateOilPanelUI();
        updateUpgradePanelUI();
        
    } catch (e) {
        console.error("Failed to load save:", e);
        alert("Save file is corrupted or invalid.");
    }
    
    event.target.value = ''; 
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

    const btnAutoToggle = document.getElementById('btn-auto-toggle');
    if (btnAutoToggle) {
        btnAutoToggle.addEventListener('click', () => {
            autoSpinEnabled = !autoSpinEnabled;
            btnAutoToggle.textContent = `Auto Spin: ${autoSpinEnabled ? 'ON' : 'OFF'}`;
            btnAutoToggle.style.color = autoSpinEnabled ? '#111' : '#ff9a1f';
            btnAutoToggle.style.background = autoSpinEnabled ? '#ff9a1f' : 'transparent';
            
            // Kickstart the physics loop if it's dead
            if (autoSpinEnabled && !isDragging && !animationFrameId) {
                animationFrameId = requestAnimationFrame(updateInertia);
            }
        });
    }

    window.addEventListener('startAutoSpin', () => {
        if (autoSpinEnabled && !isDragging && !animationFrameId) {
            animationFrameId = requestAnimationFrame(updateInertia);
        }
    });

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
            addOil(roundTo(1 * oilMultiplier));
        }
    }

    // Physics engine to animate wheel after release
    function updateInertia() {
        if (isDragging) return;

        let targetVelocity = (autoSpinEnabled && autoVelocity > 0 && !isOverheated()) ? autoVelocity : 0;

        if (targetVelocity === 0) {
            velocity *= friction;
        } else {
            if (velocity > targetVelocity) {
                velocity = roundTo(velocity * friction);
                if (velocity < targetVelocity) velocity = targetVelocity;
            } else if (velocity < targetVelocity) {
                velocity = roundTo(velocity + 0.08); 
                if (velocity > targetVelocity) velocity = targetVelocity;
            }
        }

        if (Math.abs(velocity) < 0.04) {
            velocity = 0;
        }

        if (velocity === 0 && targetVelocity === 0) {
            isSpinning = false; // Flags coolHeat() to start cooling
            if (!autoSpinEnabled) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
                return; // Kill the loop entirely to save CPU
            }
        } else {
            isSpinning = true;
        }

        currentRotation = roundTo(currentRotation + velocity);
        totalRotationTravel = roundTo(totalRotationTravel + Math.abs(velocity));

        addHeat(roundTo(Math.abs(velocity) * heatPerDegree));
        checkRotationRewards();

        wheel.style.transform = `rotate(${formatNumber(currentRotation)}deg)`;

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
        const appliedDiff = roundTo(frameDiff * grabStrength * spinPowerMultiplier);

        currentRotation = roundTo(currentRotation + appliedDiff);
        totalRotationTravel = roundTo(totalRotationTravel + Math.abs(appliedDiff));

        addHeat(roundTo(Math.abs(appliedDiff) * heatPerDegree));

        checkRotationRewards();

        wheel.style.transform = `rotate(${formatNumber(currentRotation)}deg)`;

        velocity = roundTo(appliedDiff);
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

    uiElements.btnSave?.addEventListener('click', handleSave);
    uiElements.btnLoad?.addEventListener('click', () => uiElements.fileLoad?.click());
    uiElements.fileLoad?.addEventListener('change', handleLoad);

    uiElements.btnCredits?.addEventListener('click', () => {
        uiElements.creditsOverlay?.classList.add('open');
    });
    uiElements.creditsClose?.addEventListener('click', () => {
        uiElements.creditsOverlay?.classList.remove('open');
    });
    uiElements.creditsOverlay?.addEventListener('click', (e) => {
        if (e.target === uiElements.creditsOverlay) {
            uiElements.creditsOverlay.classList.remove('open');
        }
    });

    setInterval(updateDemand, 10000);
    setInterval(coolHeat, 1000);
});
