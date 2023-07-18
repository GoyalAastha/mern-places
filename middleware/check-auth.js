const HttpError = require("../models/http-error");
const jwt=require('jsonwebtoken');
module.exports = (req, res, next) => {
  if(req.method=='OPTIONS'){
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1]; //Authorization:'Bearer TOKEN'
    if (!token) {
      throw new Error('Authentication failed');
    }
    const decodedToken=jwt.verify(token,process.env.JWT_KEY);//returns the payload which as encoded into the token
    req.userData={userId:decodedToken.userId};//adding data to request
    next();
  } catch (err) {
    const error = new HttpError("Authentication failed", 403);
      return next(error);
  }
};
