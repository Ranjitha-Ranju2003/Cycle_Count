const express = require("express");
const multer = require("multer");
const inventoryController = require("../controllers/inventoryController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const isExcel =
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.toLowerCase().endsWith(".xlsx");

    if (!isExcel) {
      const error = new Error("Only .xlsx files are supported");
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  },
});

router.post("/upload-excel", upload.single("file"), inventoryController.uploadExcel);
router.post("/scan", inventoryController.scanInventoryItem);
router.patch("/inventory/:id/adjust", inventoryController.adjustScannedQuantity);
router.post("/reset", inventoryController.resetInventory);
router.get("/inventory", inventoryController.getInventory);
router.get("/export-excel", inventoryController.exportInventory);

module.exports = router;
