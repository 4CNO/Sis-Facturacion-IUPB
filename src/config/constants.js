'use strict';

/**
 * src/config/constants.js
 * Constantes de negocio centralizadas. Sin cambios funcionales respecto a v3.
 */

module.exports = {
    DISCOUNT_BLOCK_SIZE:     10,
    DISCOUNT_PER_BLOCK:      0.025,
    MAX_FILE_SIZE_BYTES:     5 * 1024 * 1024,
    ALLOWED_MIME_TYPES:      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    MIME_TO_EXT: {
        'image/jpeg': '.jpg',
        'image/png':  '.png',
        'image/gif':  '.gif',
        'image/webp': '.webp',
    },
    JWT_EXPIRES_IN:          '8h',
    RATE_LIMIT_WINDOW_MS:    60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: 10,
    DEFAULT_PAGE_SIZE:       50,
};
