'use strict';
/* src/routes/order.routes.js */
const router      = require('express').Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const ctrl        = require('../controllers/order.controller');

router.get ('/options', requireAuth, ctrl.getOptions);
router.get ('/',        requireAuth, ctrl.list);
router.post('/',        requireAuth, ctrl.create);

module.exports = router;
