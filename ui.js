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
 * Attachese navigation listeners
 * CURRENTLY PLACEHOLDERS!
 */

function initNavbarListeners() {
    uiElements.btnMoney?.addEventListener('click', () => console.log('Money clicked'));
    uiElements.btnOil?.addEventListener('click', () => console.log('Oil clicked'));
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

    let isDragging = false;
    let currentRotation = 0;
    let startAngle = 0;
    let startRotation = 0;
    let chachedCenter = null;

    //Helper to find wheel center x and y on screen
    function getCenter(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    } 

    //Mathing angles and prepares to spin wheel when click on the wheel
    wheel.addEventListener('pointerdown', (e) => {
        isDragging = true;
        const center = getCenter(wheel);

        startAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);
        startRotation = currentRotation;

        wheel.setPointerCapture(e.pointerId);
    });

    //when user rotates, spin wheel after calculating angle change
    wheel.addEventListener('pointermove', (e) => {
        if(!isDragging) return;

        const center = getCenter(wheel);
        const currentAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);

        const angleDiff = currentAngle - startAngle;

        currentRotation = startRotation + angleDiff;

        wheel.style.transform = `rotate(${currentRotation}deg)`;
    });

    const stopDrag = (e) => {
        isDragging = false;
        if (e.pointerId) wheel.releasePointerCapture(e.pointerId);
    };

    wheel.addEventListener('pointerup', stopDrag);
    wheel.addEventListener('pointercancel', stopDrag);

}

//Ensures html loaded then assigns logic
document.addEventListener('DOMContentLoaded', () => {
    initNavbarListeners();//Initializes buttons
    initWheelDrag(); //Initializes wheel spin


    //TEST OF HEAT BAR, DELETE LATER
    let mockHeat = 50;
    setInterval(() => {
        mockHeat += 1;
        if (mockHeat > 100) mockHeat = 0;
        updateHeatUI(mockHeat);
    }, 60);
});