/**
 * Premium Calculator Logic
 * Implements a controlled expression parser, keyboard support, and history.
 */

// ==========================================================================
// STATE
// ==========================================================================
let expressionTokens = [];
let currentInput = '0';
let isNewInput = true;
let isCalculated = false;
let history = [];

// DOM Elements
const displayExpression = document.getElementById('expression');
const displayResult = document.getElementById('result');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const buttons = document.querySelectorAll('.btn');

// ==========================================================================
// INITIALIZATION
// ==========================================================================
function init() {
    bindEvents();
    bindKeyboard();
    loadHistory();
    updateDisplay();
}

// ==========================================================================
// CORE LOGIC
// ==========================================================================

function appendNumber(numStr) {
    if (isCalculated) {
        clearCalculator();
    }
    
    if (isNewInput) {
        currentInput = numStr;
        isNewInput = false;
    } else {
        // Prevent multiple leading zeros
        if (currentInput === '0') {
            currentInput = numStr;
        } else {
            currentInput += numStr;
        }
    }
    
    updateDisplay();
}

function appendDecimal() {
    if (isCalculated) {
        clearCalculator();
    }
    
    if (isNewInput) {
        currentInput = '0.';
        isNewInput = false;
    } else if (!currentInput.includes('.')) {
        currentInput += '.';
    }
    
    updateDisplay();
}

function appendOperator(operator) {
    if (isCalculated) {
        // Continue calculation with the result
        expressionTokens = [currentInput, operator];
        isCalculated = false;
        isNewInput = true;
        updateDisplay();
        return;
    }
    
    // If we just entered an operator, replace it
    if (isNewInput && expressionTokens.length > 0 && isOperator(expressionTokens[expressionTokens.length - 1])) {
        expressionTokens[expressionTokens.length - 1] = operator;
    } else {
        // Push the current number and then the operator
        expressionTokens.push(currentInput);
        expressionTokens.push(operator);
        isNewInput = true;
    }
    
    updateDisplay();
}

function handlePercentage() {
    if (isCalculated) {
        isCalculated = false;
        expressionTokens = [];
    }
    
    const val = parseFloat(currentInput);
    if (!isNaN(val)) {
        currentInput = (val / 100).toString();
        // Limit decimals to avoid floating point issues
        currentInput = parseFloat(currentInput).toString();
        isNewInput = true; // next number will overwrite
        updateDisplay();
    }
}

function deleteLast() {
    if (isCalculated) return;
    
    if (!isNewInput) {
        currentInput = currentInput.slice(0, -1);
        if (currentInput === '' || currentInput === '-') {
            currentInput = '0';
            isNewInput = true;
        }
    } else if (expressionTokens.length > 0) {
        // If it's a new input, delete the last operator and revert currentInput to the previous number
        const lastOp = expressionTokens.pop();
        if (isOperator(lastOp)) {
            currentInput = expressionTokens.pop() || '0';
            isNewInput = false;
        }
    }
    
    updateDisplay();
}

function clearCalculator() {
    expressionTokens = [];
    currentInput = '0';
    isNewInput = true;
    isCalculated = false;
    displayResult.classList.remove('error');
    updateDisplay();
}

// ==========================================================================
// CALCULATION (Controlled Parser)
// ==========================================================================

function isOperator(token) {
    return ['+', '-', '*', '/'].includes(token);
}

/**
 * Safely evaluates an array of tokens using basic precedence (*, / then +, -)
 * Returns the numeric result or throws an Error.
 */
function evaluateTokens(tokens) {
    if (tokens.length === 0) return 0;
    
    // Create a copy to process
    let arr = [...tokens];
    
    // Parse strings to numbers where applicable
    for (let i = 0; i < arr.length; i++) {
        if (!isOperator(arr[i])) {
            const val = parseFloat(arr[i]);
            if (isNaN(val)) throw new Error("Invalid number");
            arr[i] = val;
        }
    }
    
    // Pass 1: Multiplication and Division
    let i = 0;
    while (i < arr.length) {
        if (arr[i] === '*' || arr[i] === '/') {
            const left = arr[i - 1];
            const right = arr[i + 1];
            let res;
            
            if (arr[i] === '*') {
                res = left * right;
            } else {
                if (right === 0) throw new Error("Cannot divide by zero");
                res = left / right;
            }
            
            // Replace left, op, right with result
            arr.splice(i - 1, 3, res);
            i -= 1; // Adjust index after array modification
        } else {
            i++;
        }
    }
    
    // Pass 2: Addition and Subtraction
    i = 0;
    while (i < arr.length) {
        if (arr[i] === '+' || arr[i] === '-') {
            const left = arr[i - 1];
            const right = arr[i + 1];
            let res;
            
            if (arr[i] === '+') {
                res = left + right;
            } else {
                res = left - right;
            }
            
            arr.splice(i - 1, 3, res);
            i -= 1;
        } else {
            i++;
        }
    }
    
    return arr[0];
}

function calculateResult() {
    if (isCalculated || (expressionTokens.length === 0 && isNewInput)) return;
    
    // Build full expression array
    let fullExpression = [...expressionTokens];
    if (!isNewInput || !isOperator(fullExpression[fullExpression.length - 1])) {
        fullExpression.push(currentInput);
    } else {
        // If last is operator, remove it for the final calculation
        fullExpression.pop();
    }
    
    try {
        const result = evaluateTokens(fullExpression);
        const formattedResult = formatNumber(result);
        
        // Add to history
        addToHistory(formatExpression(fullExpression), formattedResult);
        
        currentInput = formattedResult;
        expressionTokens = [];
        isCalculated = true;
        isNewInput = true;
        
        displayResult.classList.remove('error');
    } catch (e) {
        showError(e.message);
    }
    
    updateDisplay();
}

function getPreviewResult() {
    if (expressionTokens.length === 0) return null;
    
    let previewTokens = [...expressionTokens];
    if (!isNewInput) {
        previewTokens.push(currentInput);
    } else if (previewTokens.length > 0 && isOperator(previewTokens[previewTokens.length - 1])) {
        previewTokens.pop();
    }
    
    try {
        return formatNumber(evaluateTokens(previewTokens));
    } catch (e) {
        return null; // Ignore errors during preview
    }
}

function showError(msg) {
    displayResult.textContent = msg;
    displayResult.classList.add('error');
    expressionTokens = [];
    currentInput = '0';
    isNewInput = true;
    isCalculated = true;
}

// ==========================================================================
// FORMATTING & DISPLAY
// ==========================================================================

function formatNumber(num) {
    // Avoid floating point weirdness like 0.1 + 0.2 = 0.30000000000000004
    const rounded = Math.round(num * 10000000000) / 10000000000;
    let str = rounded.toString();
    
    // If it's incredibly long, use exponential
    if (str.length > 12) {
        return rounded.toPrecision(10).replace(/\.?0+e/, 'e');
    }
    return str;
}

function formatExpression(tokens) {
    return tokens.map(t => {
        if (t === '*') return '×';
        if (t === '/') return '÷';
        if (t === '-') return '−';
        return t;
    }).join(' ');
}

function updateDisplay() {
    if (displayResult.classList.contains('error')) return;
    
    // Display Expression
    let exprStr = formatExpression(expressionTokens);
    if (!isNewInput) {
        // We just show the tokens if available
    }
    displayExpression.textContent = exprStr;
    
    // Display Current Input / Result
    displayResult.textContent = currentInput;
    
    // Preview Result
    if (!isCalculated && expressionTokens.length > 0) {
        const preview = getPreviewResult();
        if (preview !== null && preview !== currentInput) {
            displayExpression.textContent = exprStr + ' ' + currentInput + ' = ' + preview;
        } else {
            displayExpression.textContent = exprStr + ' ' + (isNewInput ? '' : currentInput);
        }
    }
    
    // Adjust font size if it gets too long
    adjustFontSize();
}

function adjustFontSize() {
    const len = displayResult.textContent.length;
    if (len > 14) {
        displayResult.style.fontSize = '1.5rem';
    } else if (len > 10) {
        displayResult.style.fontSize = '2rem';
    } else {
        displayResult.style.fontSize = '3rem';
    }
}

// ==========================================================================
// HISTORY
// ==========================================================================

function addToHistory(expr, res) {
    history.unshift({ expr, res });
    if (history.length > 20) history.pop();
    saveHistory();
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<li class="history-empty">No calculations yet</li>';
        return;
    }
    
    historyList.innerHTML = history.map((item, index) => `
        <li class="history-item" data-index="${index}">
            <div class="hist-expr">${item.expr}</div>
            <div class="hist-res">${item.res}</div>
        </li>
    `).join('');
}

function loadHistory() {
    try {
        const saved = localStorage.getItem('calc_history');
        if (saved) {
            history = JSON.parse(saved);
        }
    } catch (e) {}
    renderHistory();
}

function saveHistory() {
    try {
        localStorage.setItem('calc_history', JSON.stringify(history));
    } catch (e) {}
}

function clearHistoryUI() {
    history = [];
    saveHistory();
    renderHistory();
}

function loadFromHistory(index) {
    const item = history[index];
    if (item) {
        clearCalculator();
        currentInput = item.res;
        isCalculated = true; // Act as if we just calculated it
        updateDisplay();
    }
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================

function bindEvents() {
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            handleButtonPress(btn.dataset.action, btn.dataset.value);
            animateButton(btn);
        });
    });
    
    clearHistoryBtn.addEventListener('click', clearHistoryUI);
    
    historyList.addEventListener('click', (e) => {
        const item = e.target.closest('.history-item');
        if (item) {
            loadFromHistory(parseInt(item.dataset.index, 10));
        }
    });
}

function handleButtonPress(action, value) {
    switch (action) {
        case 'number':
            appendNumber(value);
            break;
        case 'operator':
            if (value === '%') handlePercentage();
            else appendOperator(value);
            break;
        case 'decimal':
            appendDecimal();
            break;
        case 'clear':
            clearCalculator();
            break;
        case 'delete':
            deleteLast();
            break;
        case 'calculate':
            calculateResult();
            break;
    }
}

function animateButton(btn) {
    btn.classList.add('active');
    setTimeout(() => {
        btn.classList.remove('active');
    }, 100);
}

// ==========================================================================
// KEYBOARD SUPPORT
// ==========================================================================

function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
        // Prevent default for calculator keys so they don't scroll the page, etc.
        let action = null;
        let value = null;
        let selector = null;
        
        if (/[0-9]/.test(e.key)) {
            action = 'number';
            value = e.key;
            selector = `[data-value="${e.key}"]`;
        } else if (['+', '-', '*', '/'].includes(e.key)) {
            action = 'operator';
            value = e.key;
            selector = `[data-value="${e.key}"]`;
        } else if (e.key === '%') {
            action = 'operator';
            value = '%';
            selector = `[data-value="%"]`;
        } else if (e.key === '.') {
            action = 'decimal';
            value = '.';
            selector = `[data-value="."]`;
        } else if (e.key === 'Enter' || e.key === '=') {
            action = 'calculate';
            selector = `[data-action="calculate"]`;
            e.preventDefault();
        } else if (e.key === 'Backspace') {
            action = 'delete';
            selector = `[data-action="delete"]`;
        } else if (e.key === 'Escape') {
            action = 'clear';
            selector = `[data-action="clear"]`;
        }
        
        if (action) {
            handleButtonPress(action, value);
            if (selector) {
                const btn = document.querySelector(selector);
                if (btn) animateButton(btn);
            }
        }
    });
}

// Boot up
document.addEventListener('DOMContentLoaded', init);
