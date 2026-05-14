'use strict';

/**
 * src/middlewares/upload.middleware.js
 * Configuración de multer para subida de fotos de perfil.
 * Extensión basada en mimetype (no en nombre de archivo).
 */

const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, MIME_TO_EXT } = require('../config/constants');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename:    (_req, file, cb) => {
        /* ✅ Extensión desde mimetype, no del nombre original */
        const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
        cb(null, `profile-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(Object.assign(
                new Error('Solo se permiten imágenes JPEG, PNG, GIF o WebP.'),
                { status: 400 }
            ));
        }
        cb(null, true);
    },
});

module.exports = upload;
