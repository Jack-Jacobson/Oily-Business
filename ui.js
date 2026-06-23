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

function checkRotationRewards() {
    const rotationsEarned =  Math.floor(Math.abs(currentRotation) / 360);
    const rotationsAlreadyPaid = Math.floor(Math.abs(rewardedRotation) / 350);
    const newRotations = rotationsEarned - rotationsAlreadyPaid;

    if(newRotations > 0){
        addOil(newRotations * oilMultiplier);
        rewardedRotation += newRotations * 360 * Math.sign(currentAngle || 1)
    }
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
 * WHEEL DRAG LOGIC
 * Uses trig to calculate angle of pointer relative to wheel center
 */
function initWheelDrag() {
    const wheel = uiElements.wheel;
    if(!wheel) return;

    //Wheel spinning vars
    let isDragging = false;

    let currentRotation = 0;
    let rewardedRotation = 0;
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
        checkRotationRewards();
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
        checkRotationRewards();
        wheel.style.transform = `rotate(${currentRotation}deg)`;

        velocity = frameDiff * grabStrength;

        lastAngle = currentAngle;
        
    });

    const stopDrag = (e) => {

        wheel.style.cursor = 'grab';

        if (e.pointerId) wheel.releasePointerCapture(e.pointerId);

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