const { validationResult } = require('express-validator')
const { logger } = require('@chauhaidang/xq-js-common-kit')

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }))

        logger.warn('Validation errors:', errorMessages)

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorMessages
        })
    }

    next()
}

module.exports = {
    handleValidationErrors
}