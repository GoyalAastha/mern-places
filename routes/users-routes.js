const express=require('express');
const {check}=require('express-validator')

const HttpError=require('../models/http-error');

const usersControllers=require('../controllers/users-controller')

const router=express.Router();//gives a special object which we can also register middleware which is filtered by HTTP method in path
//we can export our configured router 

const fileUpload=require('../middleware/file-upload');

router.get('/',usersControllers.getUsers);

router.post('/signup',
fileUpload.single('image'),
[
    check('name')
    .not()
    .isEmpty(),
    check('email')
    .normalizeEmail() // Test@test.com => test@test.com
    .isEmail(),
    check('password')
    .isLength({min:6})

],usersControllers.signup);

router.post('/login',usersControllers.login);


module.exports=router; //exporting