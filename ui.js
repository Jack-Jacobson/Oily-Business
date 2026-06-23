/**
 * 
 * UI MANAGER
 * Handles frontent rendering, ui states, visual logic, DOM interactions
 * 
 */

const uiElements = {
    btnMoney: document.getElementById('btn-money'),
    btnOil: document.getElementById('btn-oil'),
    btnHeat: document.getElementById('btn-heat'),
    btnAchievement: document.getElementById('btn-achievement'),
    btnSettings: document.getElementById('btn-settings'),
    oilCount: document.getElementById('oil-count'),
    wheel: document.getElementById('spin-wheel')
};

/** 
* @param {number} heatValue - Int between 0-100, represents heat levels for UI button
* updateHeatUI automatically gradients with red orange and white based on heat percent
*/

function updateHeatUI(heatValue) {
    const clampedHeat = Math.max(0, Math.min(100, heatValue));

    if(uiElements.btnHeat) {
        uiElements.btnHeat.style.background = `linear-gradient(to right, 
            #ff3b30 0%,
            #ff9500 ${clampedHeat}%,
            #696161bd ${clampedHeat}%
        )`;
    }
}

/**
 * Helper functions to control amount of oil stored and make it pop up on screen
 * @param {number} amount - Amount of oil to display on popup/add to total count.
*/

let oilStored = 0;
const oilMultiplier = 1;

function updateOilUI(){
    if(uiElements.oilCount) {
        uiElements.oilCount.textContent=oilStored;
    }
}

function spawnOilPopup(amount) {
    const container = uiElements.wheel?.parentElement;
    if(!container) return;

    const popup = document.createElement('div');
    popup.className = 'oil-popup';
    popup.textContent = `+${amount} oil`;

    //random offset
    popup.style.left = `${50 + (Math.random() * 8 - 4)}%`;

    container.appendChild(popup);

    popup.addEventListener('animationend', () => {
        popup.remove();
    }, {once: true});
}

function addOil(amount) {
    oilStored += amount;
    updateOilUI();
    spawnOilPopup(amount);
}

/**
 * Attachese navigation listeners
 * CURRENTLY PLACEHOLDERS!
 */

function initNavbarListeners() {
    uiElements.btnMoney?.addEventListener('click', () => console.log('Money clicked'));
    uiElements.btnHeat?.addEventListener('click', () => console.log('Heat clicked'));
    uiElements.btnAchievement?.addEventListener('click', () => console.log('Achievement clicked'));
    uiElements.btnSettings?.addEventListener('click', () => console.log('Settings clicked'));
}

/**
 * Save data functions and variables
 * Add all variables here ( you may need to change this to be in a function depending on how you setup Global vars ) for save files.
 */

const saveData = {
    money: 100, /* example variable */
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
    if(!wheel) return;

    //Wheel spinning vars
    let isDragging = false;
    let currentRotation = 0;
    let startAngle = 0;
    let startRotation = 0;

    //Wheel spinning physics vars
    let lastAngle = 0;
    let velocity = 0;
    let friction = 0.98; //ADAPT AS NECESSARY --> Smaller number = more speed lost per frame 
    let animationFrameId = null; //Physics animation loop reference


    const grabArea = 0.59; //Outer percent of wheel that you can grab ADAPT AS NECESSARY
    const grabFalloff = 0.88 //Distance from center where power fades to 0 ADAPT AS NECESSARY

    //Helper to find wheel center x and y on screen
    function getCenter(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            radius: Math.min(element.offsetWidth, element.offsetHeight) / 2
        };
    }

    //Helper to find strength depending on how close to center you are (leverage)
    function getGrabStrength(dist, radius) {
        const fadeDistance = radius * grabFalloff;
        return Math.max(0, 1 - Math.min(1, Math.abs(dist - radius) / fadeDistance));
    }

    //Pyhsics engine to animate wheel after release
    function updateInertia() {
        if(isDragging) return;

        velocity *= friction;

        //Once spinning very slowly just stop, adjust as necessary
        if(Math.abs(velocity) < 0.01){
            velocity = 0;
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        currentRotation += velocity;
        wheel.style.transform = `rotate(${currentRotation}deg)`;

        animationFrameId = requestAnimationFrame(updateInertia);
    }

    //Mathing angles and prepares to spin wheel when click on the wheel
    wheel.addEventListener('pointerdown', (e) => {

        if(animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        velocity = 0;

        const center = getCenter(wheel);

        //Calculates hypotenuse between click and center
        const dist = Math.hypot(e.clientX - center.x, e.clientY - center.y);

        //Return if hypotenuse is less that allowed by grab area percent
        if (dist < center.radius * (1 - grabArea) || dist > center.radius) {
            return; 
        } 

        isDragging = true;
        didSpinThisDrag = false;
        wheel.style.cursor = 'grabbing';

        startAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);
        lastAngle = startAngle;
        startRotation = currentRotation;

        wheel.setPointerCapture(e.pointerId);
    });

    //when user rotates, spin wheel after calculating angle change
    wheel.addEventListener('pointermove', (e) => {
        if(!isDragging) {
            const center = getCenter(wheel);
            const dist = Math.hypot(e.clientX - center.x, e.clientY - center.y);

            //Logic for not allowed or grab cursor when hovering over grabable area
            if (dist >= center.radius * (1 - grabArea) && dist <= center.radius) {
                wheel.style.cursor = 'grab';
            } else {
                wheel.style.cursor = 'not-allowed';
            }
            return;
        }

        const center = getCenter(wheel);
        const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);
        const dist = Math.hypot(e.clientX - center.x, e.clientY - center.y);

        let frameDiff = currentAngle - lastAngle;

        if(frameDiff > 180) frameDiff -=360;
        if(frameDiff < -180) frameDiff +=360;

        const grabStrength = getGrabStrength(dist, center.radius);
        const appliedDiff = frameDiff * grabStrength;

        currentRotation += appliedDiff;
        wheel.style.transform = `rotate(${currentRotation}deg)`;

        velocity = frameDiff * grabStrength;
        if(Math.abs(appliedDiff) > 0.05) {
            didSpinThisDrag = true;
        }
        lastAngle = currentAngle;
        
    });

    const stopDrag = (e) => {
        const wasDragging = isDragging;
        isDragging = false;
       
        wheel.style.cursor = 'grab';

        if (e.pointerId) wheel.releasePointerCapture(e.pointerId);

        if(e.type === 'pointerup' && wasDragging && didSpinThisDrag){
            addOil(1 * oilMultiplier);
        }

        animationFrameId = requestAnimationFrame(updateInertia);
    };

    wheel.addEventListener('pointerup', stopDrag);
    wheel.addEventListener('pointercancel', stopDrag);

}

//Ensures html loaded then assigns logic
document.addEventListener('DOMContentLoaded', () => {
    initNavbarListeners();//Initializes buttons
    initWheelDrag(); //Initializes wheel spin

    updateOilUI();

    //TEST OF HEAT BAR, DELETE LATER
    let mockHeat = 50;
    setInterval(() => {
        mockHeat += 1;
        if (mockHeat > 100) mockHeat = 0;
        updateHeatUI(mockHeat);
    }, 60);
});
