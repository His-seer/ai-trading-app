/**
 * Input Validation Schemas
 * Provides validation for all API inputs and configuration
 */

const VALID_MARKETS = ['stock', 'forex', 'crypto'];
const VALID_RECOMMENDATIONS = ['BUY', 'SELL', 'HOLD'];
const VALID_SIDES = ['long', 'short'];

/**
 * Validation result object
 */
class ValidationResult {
    constructor(isValid = true, error = null) {
        this.isValid = isValid;
        this.error = error;
    }
}

/**
 * Validate market type
 */
export function validateMarket(market) {
    if (!market) {
        return new ValidationResult(false, 'Market type is required');
    }
    if (!VALID_MARKETS.includes(market.toLowerCase())) {
        return new ValidationResult(false, `Market must be one of: ${VALID_MARKETS.join(', ')}`);
    }
    return new ValidationResult(true);
}

/**
 * Validate symbol format (alphanumeric, forward slash for forex pairs)
 */
export function validateSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') {
        return new ValidationResult(false, 'Symbol is required and must be a string');
    }

    const trimmedSymbol = symbol.trim().toUpperCase();

    // Allow letters, numbers, and forward slash (for forex pairs)
    if (!/^[A-Z0-9\/]{1,20}$/.test(trimmedSymbol)) {
        return new ValidationResult(false, 'Invalid symbol format (alphanumeric and / allowed, max 20 chars)');
    }

    return new ValidationResult(true);
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value, fieldName = 'value', minValue = 0) {
    if (value === null || value === undefined) {
        return new ValidationResult(false, `${fieldName} is required`);
    }

    const numValue = Number(value);

    if (isNaN(numValue)) {
        return new ValidationResult(false, `${fieldName} must be a number`);
    }

    if (numValue <= minValue) {
        return new ValidationResult(false, `${fieldName} must be greater than ${minValue}`);
    }

    return new ValidationResult(true);
}

/**
 * Validate percentage (0-100)
 */
export function validatePercentage(value, fieldName = 'percentage') {
    const numResult = validatePositiveNumber(value, fieldName, -1);
    if (!numResult.isValid) return numResult;

    const numValue = Number(value);
    if (numValue > 100) {
        return new ValidationResult(false, `${fieldName} must not exceed 100`);
    }

    return new ValidationResult(true);
}

/**
 * Validate trading side
 */
export function validateSide(side) {
    if (!side || !VALID_SIDES.includes(side.toLowerCase())) {
        return new ValidationResult(false, `Side must be one of: ${VALID_SIDES.join(', ')}`);
    }
    return new ValidationResult(true);
}

/**
 * Validate recommendation
 */
export function validateRecommendation(recommendation) {
    if (!recommendation || !VALID_RECOMMENDATIONS.includes(recommendation.toUpperCase())) {
        return new ValidationResult(false, `Recommendation must be one of: ${VALID_RECOMMENDATIONS.join(', ')}`);
    }
    return new ValidationResult(true);
}

/**
 * Validate bot start request
 */
export function validateBotStartRequest(body) {
    if (!body || typeof body !== 'object') {
        return new ValidationResult(false, 'Request body must be a JSON object');
    }

    const marketResult = validateMarket(body.market);
    if (!marketResult.isValid) return marketResult;

    return new ValidationResult(true);
}

/**
 * Validate market change request
 */
export function validateMarketChangeRequest(body) {
    return validateBotStartRequest(body);
}

/**
 * Validate position opening request
 */
export function validatePositionOpenRequest(symbol, side, entryPrice) {
    let result = validateSymbol(symbol);
    if (!result.isValid) return result;

    result = validateSide(side);
    if (!result.isValid) return result;

    result = validatePositiveNumber(entryPrice, 'Entry price', 0);
    if (!result.isValid) return result;

    return new ValidationResult(true);
}

/**
 * Validate position closing request
 */
export function validatePositionCloseRequest(positionId, exitPrice) {
    const idResult = validatePositiveNumber(positionId, 'Position ID', 0);
    if (!idResult.isValid) return idResult;

    const priceResult = validatePositiveNumber(exitPrice, 'Exit price', 0);
    if (!priceResult.isValid) return priceResult;

    return new ValidationResult(true);
}

/**
 * Create middleware for request validation
 */
export function createValidationMiddleware(validator) {
    return (req, res, next) => {
        const result = validator(req);
        if (!result.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: result.error
            });
        }
        next();
    };
}

export default {
    validateMarket,
    validateSymbol,
    validatePositiveNumber,
    validatePercentage,
    validateSide,
    validateRecommendation,
    validateBotStartRequest,
    validateMarketChangeRequest,
    validatePositionOpenRequest,
    validatePositionCloseRequest,
    createValidationMiddleware,
    ValidationResult,
    VALID_MARKETS,
    VALID_RECOMMENDATIONS,
    VALID_SIDES,
};
