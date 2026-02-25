const multer = require("multer");
const sharp = require("sharp");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Please upload only images", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserImage = upload.single("profileImg");

exports.resizeUserImage = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const filename = `user-${req.user._id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(600, 600)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`uploads/users/${filename}`);

  req.body.profileImg = filename;

  next();
});