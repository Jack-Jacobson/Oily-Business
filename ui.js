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
    btnSettings: document.getElementById('btn-settings')
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

//Ensures html loaded then assigns logic
document.addEventListener('DOMContentLoaded', () => {
    initNavbarListeners();//Initializes buttons


    //TEST OF HEAT BAR, DELETE LATER
    let mockHeat = 50;
    setInterval(() => {
        mockHeat += 1;
        if (mockHeat > 100) mockHeat = 0;
        updateHeatUI(mockHeat);
    }, 60);
});