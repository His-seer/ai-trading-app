import { logger } from './logger.js';

/**
 * Environment Variable Validation
 * Ensures all required variables are set and valid before app startup
 */

const REQUIRED_VARS = [
    'GEMINI_API_KEY',
    'FINNHUB_API_KEY',
];

const OPTIONAL_VARS = [
    'TWELVEDATA_API_KEY',
];

const NUMERIC_VARS = {
    'PORT': { default: 3001, min: 1000, max: 65535 },
    'INITIAL_BALANCE': { default: 10000, min: 100 },
    'MAX_RISK_PER_TRADE': { default: 0.02, min: 0.01, max: 0.5 },
    'MAX_TRADES_PER_DAY': { default: 3, min: 1, max: 100 },
    'AUTONOMY_INTERVAL_MINUTES': { default: 15, min: 1, max: 1440 },
};

const ENUM_VARS = {
    'NODE_ENV': { default: 'development', allowed: ['development', 'production', 'test'] },
    'LOG_LEVEL': { default: 'INFO', allowed: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] },
};

/**
 * Validation result
 */
class ValidationResult {
    constructor() {
        this.isValid = true;
        this.errors = [];
        this.warnings = [];
    }

    addError(message) {
        this.isValid = false;
        this.errors.push(message);
    }

    addWarning(message) {
        this.warnings.push(message);
    }

    getReport() {
        return {
            isValid: this.isValid,
            errors: this.errors,
            warnings: this.warnings,
        };
    }
}

/**
 * Validate required variables
 */
function validateRequired() {
    const result = new ValidationResult();

    for (const varName of REQUIRED_VARS) {
        const value = process.env[varName];
        if (!value || value.trim() === '') {
            result.addError(`Required environment variable missing: ${varName}`);
        }
    }

    return result;
}

/**
 * Validate optional variables
 */
function validateOptional() {
    const result = new ValidationResult();

    for (const varName of OPTIONAL_VARS) {
        const value = process.env[varName];
        if (!value || value.trim() === '') {
            result.addWarning(`Optional environment variable not set: ${varName}`);
        }
    }

    return result;
}

/**
 * Validate numeric variables
 */
function validateNumeric() {
    const result = new ValidationResult();

    for (const [varName, config] of Object.entries(NUMERIC_VARS)) {
        const value = process.env[varName];

        if (!value) {
            // Optional numeric - use default
            continue;
        }

        const numValue = parseFloat(value);

        if (isNaN(numValue)) {
            result.addError(`Invalid numeric value for ${varName}: "${value}"`);
            continue;
        }

        if (config.min !== undefined && numValue < config.min) {
            result.addError(`${varName} must be at least ${config.min}, got ${numValue}`);
        }

        if (config.max !== undefined && numValue > config.max) {
            result.addError(`${varName} must not exceed ${config.max}, got ${numValue}`);
        }
    }

    return result;
}

/**
 * Validate enum variables
 */
function validateEnums() {
    const result = new ValidationResult();

    for (const [varName, config] of Object.entries(ENUM_VARS)) {
        const value = process.env[varName];

        if (!value) {
            // Use default
            continue;
        }

        if (!config.allowed.includes(value)) {
            result.addError(
                `Invalid value for ${varName}: "${value}". Allowed: ${config.allowed.join(', ')}`
            );
        }
    }

    return result;
}

/**
 * Perform all validations
 */
export function validateEnvironment() {
    const results = [
        validateRequired(),
        validateOptional(),
        validateNumeric(),
        validateEnums(),
    ];

    // Combine results
    const combined = new ValidationResult();
    for (const result of results) {
        combined.isValid = combined.isValid && result.isValid;
        combined.errors.push(...result.errors);
        combined.warnings.push(...result.warnings);
    }

    return combined;
}

/**
 * Log validation results
 */
export function logValidationResults(result) {
    if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
            logger.warn(`Environment: ${warning}`);
        });
    }

    if (result.errors.length > 0) {
        result.errors.forEach(error => {
            logger.error(`Environment: ${error}`);
        });
        logger.error('Environment validation failed - cannot start application');
        return false;
    }

    logger.info('Environment variables validated successfully');
    return true;
}

/**
 * Validate and log environment, throw if invalid
 */
export function validateAndExit() {
    const result = validateEnvironment();

    if (!logValidationResults(result)) {
        process.exit(1);
    }

    return result;
}

/**
 * Get validation summary
 */
export function getValidationSummary() {
    const result = validateEnvironment();
    return {
        status: result.isValid ? 'valid' : 'invalid',
        requiredVars: REQUIRED_VARS,
        optionalVars: OPTIONAL_VARS,
        numericVars: NUMERIC_VARS,
        enumVars: ENUM_VARS,
        errors: result.errors,
        warnings: result.warnings,
    };
}

export default {
    validateEnvironment,
    logValidationResults,
    validateAndExit,
    getValidationSummary,
    REQUIRED_VARS,
    OPTIONAL_VARS,
    NUMERIC_VARS,
    ENUM_VARS,
};
