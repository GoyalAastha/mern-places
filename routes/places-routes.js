const express = require("express");
const { check } = require("express-validator");

const HttpError = require("../models/http-error");

const placesControllers = require("../controllers/places-controller");

const fileUpload=require('../middleware/file-upload');//it is an object with a bunch of middlewares

const router = express.Router(); //gives a special object which we can also register middleware which is filtered by HTTP method in path
//we can export our configured router

const checkAuth=require('../middleware/check-auth');

router.get("/:pid", placesControllers.getPlacesById); //the filter (here '/') is automatically called from prev filter(/places/api)


router.get("/user/:uid", placesControllers.getPlacesByUserId);

router.use(checkAuth);//middleware-protects all succeeding routes

router.post(
  "/",
  fileUpload.single('image'),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.createPlace
);
//here we created multiple middlewares for the same path-they will be executed sequentially from left to right

router.patch(
  "/:pid",
[ check("title")
  .not()
  .isEmpty(), 
  check("description")
  .isLength({ min: 5 })
],
  placesControllers.updatePlace
);

router.delete("/:pid", placesControllers.deletePlace);

module.exports = router; //exporting
