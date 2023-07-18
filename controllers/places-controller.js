const HttpError = require("../models/http-error");
const uuid = require("uuid").v4; //v4 also has a timestamp component in it
const { validationResult } = require("express-validator");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const fs=require('fs');
const place = require("../models/place");


const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await Place.find({ creator: userId }); //it returns an array
    /*DUMMY_PLACES.filter((p) => {
    return p.creator == userId;
  }) */
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,couldnt find a place",
      500
    );
    return next(error);
  }
  if (!places || places.length === 0) {
    //return res.status(404).json({message:'Could not find a place from provided id'});
    // const error=new Error('Couldnt find a place for provided user id');
    // error.code=404;
    // throw error;//trigger the error handling middleware
    const error = new HttpError("Could not find a place from provided id", 404);
    return next(error);
  }
  //throw is used in sync functions
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  }); //cant use to Object on array
};

const getPlacesById = async (req, res, next) => {
  //the filter (here '/') is automatically called from prev filter(/places/api)
  const placeId = req.params.pid;
  let places;
  try {
    places = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,couldnt find a place",
      500
    );
    return next(error);
  }
  //     DUMMY_PLACES.filter((p) => {
  //     return p.id == placeId;
  //   });
  if (!places || places.length === 0) {
    // return res.status(404).json({message:'Could not find a place from provided id'});
    //    const error=new Error('Couldnt find a place for provided id');
    //    error.code=404;
    //    return next(error);//NOTE:u need to return else following code will be execute and 2 resp will be sent
    return next(new HttpError("Could not find a place from provided id", 404));
  }
  //next() is used to trigger error handling middleware in case of async functions(used in db)
  //console.log("get req in places");
  res.json({ places: places.toObject({ getters: true }) }); //getters add id property to object
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req); //fun will look into the request object and see if there are nay validation errors which were detected
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed,please check your data", 422)
    );
  }
  const { title, description, address } = req.body;
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator:req.userData.userId,
  });
  //(rel between user and places)
  //new to check if creator user exists

  let user;

  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      "Creating place failed,Please try again later",
      500
    );
    return next(error);
  }
  if (!user) {
    const error = new HttpError("Couldnt find user for provided place", 404);
    return next(error);
  }

  /*
    {
        id:uuid(),//creates a unique id
        title,
        description,
        location:coordinates,
        address,
        creator
    };
     */
  //DUMMY_PLACES.push(createdPlace);
  try {
    //await createdPlace.save();

    const sess = await mongoose.startSession();
    sess.startTransaction();
    //first creating and storing place
    await createdPlace.save({ session: sess }); //automatically create a new id for place

    //now adding place id to user
    user.places.push(createdPlace);
    await user.save({ session: sess }); //saving the newly updated user

    await sess.commitTransaction(); //actual changed made to db
  } catch (err) {
    const error = new HttpError("Creating place Failed,please try again", 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req); //fun will look into the request object and see if there are nay validation errors which were detected
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed,please check your data", 422)
    );
  }
  const { title, description } = req.body;
  const placeId = req.params.pid;

  let places;
  try {
    places = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,couldnt update place",
      500
    );
    return next(error);
  }

  //authorization check at backend
  if(places.creator.toString()!==req.userData.userId){
    const error=new HttpError(
      'You are not allowed to edit this place',
      401
    );
    return next(error);
  }
  //   const updatedPlace = { ...DUMMY_PLACES.find((p) => p.id == placeId) };
  //   const placeIndex = DUMMY_PLACES.findIndex((p) => p.id == placeId);
  places.title = title;
  places.description = description;

  try {
    await places.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,could not update place",
      500
    );
    return next(error);
  }

  //DUMMY_PLACES[placeIndex] = updatedPlace;

  res.status(200).json({ places: places.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let places;
  try {
    places = await Place.findById(placeId).populate("creator");
    //populate allows us to refer to a document in another collection(here users as we have build connection in places model by providing ref)
    //and to work with the data in that existing document
  } catch (err) {
    const error = new HttpError("Something went wrong,couldnt find place", 500);
    return next(error);
  }

  if (!places) {
    const error = new HttpError("Couldnt find place for this id", 404);
    return next(error);
  }

  if(places.creator.id!==req.userData.userId){//here creator is full object so no need to call toString
    const error=new HttpError(
      'You are not allowed to delete this place',
      401
    );
    return next(error);
  }
  const imagePath=places.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await places.deleteOne({ session: sess });

    //accessing the place id stored in creator
    places.creator.places.pull(places); //automatically remove the id

    //saving the newly updated user
    await places.creator.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,couldnt delete place",
      500
    );
    return next(error);
  }

  fs.unlink(imagePath,err=>{
    console.log(err);
  });
  //   if (!DUMMY_PLACES.find((p) => p.id === placeId)) {
  //     throw new HttpError("Couldnt find a place for that id", 404);
  //   }
  //   DUMMY_PLACES = DUMMY_PLACES.filter((p) => p.id !== placeId);
  res.status(200).json({ message: "Deleted Place" });
};

exports.getPlacesById = getPlacesById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
