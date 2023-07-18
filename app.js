const fs=require('fs');//allows to interact with file system
const path=require('path');

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json()); //parse any incoming request body and extract any json obj -> convert to javascript structures->then call next automatically and also add the json data there

app.use('/uploads/images',express.static(path.join('uploads','images')));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");//2nd arg-value-allows us to control which domains should have access (can restrict to localhost 3000 also)
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization"
  );//allowed headers
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE');//allowed methods in frontend
  next();
});

app.use("/api/places", placesRoutes); //filter applied on the middleware to start path with /api/places

app.use("/api/users", usersRoutes);

//unsupported routes
app.use((req, res, next) => {
  throw new HttpError("Couldnt find route", 404); //now reach bottom default error handler
});
//this is not an error handling middleware -but anormal middleware that runs only if we didnt sent the
//response in one of our routes before

app.use((error, req, res, next) => {
  if(req.file){
    fs.unlink(req.file.path,(err)=>{
      console.log(err);
    });
  }
  if (res.headerSent) {
    // check if resp has already been sent
    return next(error); // we wont send response on our own bcoz somehow we already did send a resp and u can deal with only one response in total
  } 
    res.status(error.code || 500);
    res.json({ message: error.message || "An unknown error occured" });
  
});
//this is a special error handling middleware function-applied on every incoming request
//doesnt need a path filter
//4 parameters
//executed of any middleware infront of it throws an error

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vrqippg.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(5000); //here we start our backend server---if the connection was successful
    console.log("connected to db");
  })
  .catch((err) => {
    console.log(err);
  });

  //"mongodb+srv://aasthagoyal1405:5Gp2rgFiqvJr2c5H@cluster0.vrqippg.mongodb.net/MERN?retryWrites=true&w=majority"