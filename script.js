document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------
    // Theme Toggle Logic
    // -------------------------------
    const themeToggle = document.getElementById("theme-toggle");
    const htmlEl = document.documentElement;

    const currentTheme = localStorage.getItem("theme") || "dark";
    
    if (themeToggle) {
        if (currentTheme === "light") {
            themeToggle.checked = true; 
        } else {
            themeToggle.checked = false; 
        }
        
        themeToggle.addEventListener("change", () => {
            if (themeToggle.checked) {
                htmlEl.setAttribute("data-theme", "light");
                localStorage.setItem("theme", "light");
            } else {
                htmlEl.setAttribute("data-theme", "dark");
                localStorage.setItem("theme", "dark");
            }
        });
    }
    // -------------------------------
    // Global Elements
    // -------------------------------
    const navLinks = document.querySelectorAll(".nav-link");
    const pages = document.querySelectorAll(".page-content");

    const mainInput = document.getElementById("main-input");
    const fromInput = document.getElementById("select-from");
    const toInput = document.getElementById("select-to");
    const resultBox = document.getElementById("result-box")?.querySelector("p");
    const swapBtn = document.getElementById("swap-btn");
    const backBtn = document.getElementById("back-btn");
    const menuBtn = document.getElementById("menu-btn");
    const appFooter = document.querySelector(".app-footer");

    let currentRates = null;
    let currentUnitData = null;
    let currentCalc = "currency";

    // --- Input History State ---
    const inputHistory = {
        currency: "1",
        length: "1",
        mass: "1",
        speed: "1",
        volume: "1",
        area: "1",
        data: "1",
        temp: "1"
    };

    // -------------------------------
    // Navigation Switching
    // -------------------------------
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();

            // 1. Save current input value before switching
            if (mainInput) {
                inputHistory[currentCalc] = mainInput.value;
            }

            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            
            const target = link.getAttribute("data-target");
            currentCalc = target.replace("page-", "");
            
            pages.forEach(p => {
                if (p.id === target) {
                    p.style.display = "block";
                } else {
                    p.style.display = "none";
                }
            });

            // 2. Load saved input value for the new calculator
            if (mainInput) {
                mainInput.value = inputHistory[currentCalc] || "1";
            }

            loadCalculator(currentCalc);
        });
    });

    // -------------------------------
    // API Fetch Functions
    // -------------------------------
    async function fetchRatesFromFawaz() {
        const response = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json");
        if (!response.ok) throw new Error(`Fawaz API request failed: ${response.statusText}`);
        return response.json();
    }

    async function fetchRatesFromFrankfurter() {
        const response = await fetch("https://api.frankfurter.app/latest");
        if (!response.ok) throw new Error(`Frankfurter API request failed: ${response.statusText}`);
        return response.json();
    }

    async function getLiveRates() {
        const note = document.getElementById("currency-note");
        
        try {
            if (note) note.innerHTML = "Loading rates...";
            const data = await fetchRatesFromFawaz(); 
            
            if (!data.usd) throw new Error("Data malformed: 'usd' key missing");

            const rates = data.usd;
            const upperRates = {};
            Object.keys(rates).forEach(key => {
                upperRates[key.toUpperCase()] = rates[key];
            });
            upperRates.USD = 1.0; 
            
            return upperRates; 
        } catch (e) {
            console.warn("Fawaz fetching failed, trying backup:", e.message);
        }

        try {
            if (note) note.innerHTML = "Loading rates (API: Frankfurter)...";
            const data = await fetchRatesFromFrankfurter();
            
            if (!data.rates) throw new Error("Frankfurter data malformed: 'rates' key missing");
            data.rates[data.base] = 1.0; 
            return data.rates; 
        } catch (e) {
            console.warn("Frankfurter API failed:", e.message);
        }
        
        throw new Error("All currency APIs failed to load.");
    }


    // -------------------------------
    // Load Currency Data
    // -------------------------------
    async function loadCurrency() {
        const note = document.getElementById("currency-note");
        let namesObject = null;

        try {
            const namesResponse = await fetch("./data/currencies.json");
            if (!namesResponse.ok) throw new Error("currencies.json file not found");
            namesObject = await namesResponse.json();
            fillCurrencyLists(null, namesObject);
        } catch (e) {
            console.error("Failed to load currencies.json.", e.message);
            if (note) note.innerHTML = "Error: Could not load currency list file.";
            return; 
        }

        try {
            if (note) note.innerHTML = "Loading live exchange rates...";
            const ratesObject = await getLiveRates(); 
            currentRates = ratesObject; 
            currentUnitData = null;
            fillCurrencyLists(ratesObject, namesObject);
            if (note) note.innerHTML = "Live currency data loaded.";
        } catch (e) {
            console.warn(e.message); 
            if (note) note.innerHTML = "Failed to load live rates. Calculations disabled.";
            currentRates = null;
        }
    }


    function fillCurrencyLists(rates, names) {
        if (!fromInput || !toInput) return; 

        const oldFrom = fromInput.value;
        const oldTo = toInput.value;
        fromInput.innerHTML = "";
        toInput.innerHTML = "";

        // If names provided, use them. If not, just codes.
        let codesToDisplay = [];
        if (rates) {
            codesToDisplay = Object.keys(rates).sort();
        }

        codesToDisplay.forEach(code => {
            // FIX: Only add to dropdown if it exists in 'names' (the JSON file)
            // This acts as a strict whitelist.
            if (names && names[code]) { 
                const fullName = names[code];
                const displayText = `${code} - ${fullName}`;

                const opt1 = document.createElement("option");
                opt1.value = code;
                opt1.textContent = displayText;
                fromInput.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = code;
                opt2.textContent = displayText;
                toInput.appendChild(opt2);
            }
        });
        
        // Restore selection or default
        if (fromInput.querySelector(`option[value="${oldFrom}"]`)) {
            fromInput.value = oldFrom;
        } else if (fromInput.querySelector(`option[value="USD"]`)) {
            fromInput.value = "USD";
        }

        if (toInput.querySelector(`option[value="${oldTo}"]`)) {
            toInput.value = oldTo;
        } else if (toInput.querySelector(`option[value="EUR"]`)) {
            toInput.value = "EUR"; 
        } else if (toInput.querySelector(`option[value="INR"]`)) {
            toInput.value = "INR";
        }
    }

    function convertCurrency() {
        if (!currentRates || !resultBox) {
            if (resultBox) resultBox.innerHTML = "--";
            return;
        }

        const amount = parseFloat(mainInput.value);
        const from = fromInput.value;
        const to = toInput.value;

        if (isNaN(amount) || !currentRates[from] || !currentRates[to]) {
            resultBox.innerHTML = "--";
            return;
        }

        const result = (amount / currentRates[from]) * currentRates[to];
        
        resultBox.innerHTML = result.toFixed(3);
    }

    // -------------------------------
    // Temperature Converter
    // -------------------------------
    function convertTemperature() {
        if (!resultBox) return;

        const amount = parseFloat(mainInput.value);
        const from = fromInput.value;
        const to = toInput.value;

        if (isNaN(amount)) {
            resultBox.innerHTML = "--";
            return;
        }

        let result;
        if (from === "Celsius" && to === "Fahrenheit") result = (amount * 9/5) + 32;
        else if (from === "Celsius" && to === "Kelvin") result = amount + 273.15;
        else if (from === "Fahrenheit" && to === "Celsius") result = (amount - 32) * 5/9;
        else if (from === "Fahrenheit" && to === "Kelvin") result = (amount - 32) * 5/9 + 273.15;
        else if (from === "Kelvin" && to === "Celsius") result = amount - 273.15;
        else if (from === "Kelvin" && to === "Fahrenheit") result = (amount - 273.15) * 9/5 + 32;
        else result = amount;

        resultBox.innerHTML = result.toFixed(2);
    }

    // -------------------------------
    // Generic Unit Converters
    // -------------------------------
    function fillUnitSelects(data) {
        if (!fromInput || !toInput) return;

        fromInput.innerHTML = "";
        toInput.innerHTML = "";

        const units = Object.keys(data);

        units.forEach(unit => {
            const opt1 = document.createElement("option");
            opt1.value = unit;
            opt1.textContent = unit;
            fromInput.appendChild(opt1);

            const opt2 = document.createElement("option");
            opt2.value = unit;
            opt2.textContent = unit;
            toInput.appendChild(opt2);
        });

        if (units.length > 1) {
            fromInput.value = units[0];
            toInput.value = units[1];
        }
    }

    async function loadUnitJSON(type) {
        const file = `./data/${type}.json`;

        try {
            const res = await fetch(file);
            const data = await res.json();

            currentUnitData = data; 
            currentRates = null; 
            fillUnitSelects(data);

        } catch (err) {
            console.log("Failed to load unit data", err);
            if (resultBox) resultBox.innerHTML = "--";
            currentUnitData = null;
        }
    }

    function convertUnits() {
        if (!resultBox || !currentUnitData) {
            if(resultBox) resultBox.innerHTML = "--";
            return;
        }

        const amount = parseFloat(mainInput.value);
        const from = fromInput.value;
        const to = toInput.value; 

        if (isNaN(amount) || !currentUnitData[from] || !currentUnitData[to]) {
            resultBox.innerHTML = "--";
            return;
        }

        const base = amount * currentUnitData[from];
        const result = base / currentUnitData[to];
        resultBox.innerHTML = result.toFixed(6);
    }

    // -------------------------------
    // Main Calculation Router
    // -------------------------------
    
    async function loadCalculator(type) {
        currentRates = null;
        currentUnitData = null;
        
        if (type === "currency") {
            await loadCurrency(); 
        } else {
            await loadUnitJSON(type);
        }
        
        handleCalculation();
    }

    function handleCalculation() {
        if (currentCalc === "currency") {
            convertCurrency();
        } else if (currentCalc === "temp") {
            convertTemperature();
        } else {
            convertUnits(); 
        }
    }

    // -------------------------------
    // Input & Swap Events
    // -------------------------------
    if (mainInput) {
        mainInput.addEventListener("input", (e) => {
            inputHistory[currentCalc] = e.target.value;
            handleCalculation();
        });
    }

    if (fromInput) {
        fromInput.addEventListener("input", handleCalculation);
    }

    if (toInput) {
        toInput.addEventListener("input", handleCalculation);
    }

    if (swapBtn) {
        swapBtn.addEventListener("click", () => {
            const temp = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = temp;

            swapBtn.classList.add("animating");
            setTimeout(() => {
                swapBtn.classList.remove("animating");
            }, 400); 

            handleCalculation();
        });
    }

    // --- Header Button Listeners ---
    if (backBtn) {
        backBtn.addEventListener("click", () => {
             // window.history.back();
        });
    }

    // -------------------------------
    // Keyboard / Footer Visibility
    // -------------------------------
    if (appFooter) {
        const initialViewHeight = window.innerHeight;
        
        // Method 1: Resize detection
        window.addEventListener("resize", () => {
            if (window.innerHeight < initialViewHeight * 0.75) {
                appFooter.classList.add("footer-hidden");
            } else {
                appFooter.classList.remove("footer-hidden");
            }
        });
        
        // Method 2: Focus detection
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                 appFooter.classList.add("footer-hidden");
            });
            input.addEventListener('blur', () => {
                 setTimeout(() => {
                     if (document.activeElement.tagName !== 'INPUT' && 
                         document.activeElement.tagName !== 'SELECT') {
                         appFooter.classList.remove("footer-hidden");
                     }
                 }, 100);
            });
        });
    }

    // -------------------------------
    // Initial Load
    // -------------------------------
    const initialPage = document.getElementById("page-currency");
    if (initialPage) initialPage.style.display = "block";
    
    // Set initial input from history
    if (mainInput) {
        mainInput.value = inputHistory["currency"];
    }
    
    loadCalculator("currency");
});