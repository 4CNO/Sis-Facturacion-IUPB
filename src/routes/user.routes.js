'use strict';
/* src/routes/user.routes.js */
const router   = require('express').Router();
const ctrl     = require('../controllers/user.controller');
const { requireAuth, requireSameUser } = require('../middlewares/auth.middleware');
const upload   = require('../middlewares/upload.middleware');

router.get ('/:id/dashboard',       requireAuth, requireSameUser, ctrl.dashboard);
router.post('/:id/profile-photo',   requireAuth, requireSameUser, upload.single('profileImage'), ctrl.uploadPhoto);
router.post('/:id/events',          requireAuth, requireSameUser, ctrl.trackEvent);

module.exports = router;
