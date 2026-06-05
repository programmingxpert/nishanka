const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'bot.log');
const logsBuffer = [];
const MAX_LOGS = 1000;

// Keep original methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Initialize log file (append mode)
try {
    fs.appendFileSync(logFilePath, `\n=== Logger started at ${new Date().toISOString()} ===\n`);
} catch (e) {
    originalError.call(console, 'Failed to initialize log file:', e);
}

function addLog(level, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
        if (arg instanceof Error) {
            return arg.stack || arg.message;
        }
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch (_) {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');

    const formattedLog = {
        timestamp,
        level,
        message,
        guildId: extractGuildId(message)
    };

    logsBuffer.push(formattedLog);
    if (logsBuffer.length > MAX_LOGS) {
        logsBuffer.shift();
    }

    // Append to file, enforce file cap of 5MB
    try {
        const fileLine = `[${timestamp}] [${level}] ${message}\n`;
        fs.appendFileSync(logFilePath, fileLine);

        // Check file size, if > 5MB, truncate it
        const stats = fs.statSync(logFilePath);
        if (stats.size > 5 * 1024 * 1024) {
            fs.writeFileSync(logFilePath, `=== Logger truncated at ${new Date().toISOString()} (Size exceeded 5MB) ===\n`);
        }
    } catch (e) {
        originalError.call(console, 'Logger file append error:', e);
    }

    // Call original console methods
    if (level === 'INFO') originalLog.apply(console, args);
    else if (level === 'WARN') originalWarn.apply(console, args);
    else if (level === 'ERROR') originalError.apply(console, args);
}

// Helper to extract a 17-19 digit Discord ID that represents a guild ID in common logs
function extractGuildId(msg) {
    const match = msg.match(/\b\d{17,19}\b/);
    return match ? match[0] : null;
}

console.log = (...args) => addLog('INFO', args);
console.warn = (...args) => addLog('WARN', args);
console.error = (...args) => addLog('ERROR', args);

module.exports = {
    getLogs: () => logsBuffer,
    logFilePath
};
