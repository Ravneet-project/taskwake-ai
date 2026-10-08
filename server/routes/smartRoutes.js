const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  getSmartInsight,
} = require("../controllers/smartController");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/insight",
  getSmartInsight
);

module.exports = router;