const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const passport = require('passport');
const axios = require('axios');
const User    = require('../models/UserModel');
const uploader  = require('../config/cloud');


// List all users
// /api/all-users
router.get('/all-users', (req,res,next) =>{
    User.find()
    .then((allUsers) =>{
        res.json(allUsers)
    })
    .catch((err)=>{
        res.json(err)
    })
});


// Create user
// /api/signup-user
router.post('/signup-user',  uploader.single('the-user-picture'), (req, res, next) => {
    User.findOne({email: req.body.theEmail })
    .then((findedUser) =>{
        if(findedUser!==null){
            res.json({message: 'That email is already taken'});
            return;
        }

        const salt     = bcrypt.genSaltSync(10);
        const theHash  = bcrypt.hashSync(req.body.thePassword, salt )

        axios.post(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.body.address}&key=${process.env.googleMapsAPI}`)
            .then((response)=>{
                getZipCode = () => {
                    let addressArray = response.data.results[0].address_components;
                    let zipCode;
                    
                    addressArray.forEach((element) =>{
                        element.long_name.length === 5 ? zipCode =  element.long_name : 'ZipCode not found'
                        
                    })
                    
                    return zipCode
                }
                console.log("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=", response.data)
                console.log(req.body.address)

                User.create({
                    email    : req.body.theEmail,
                    password : theHash,
                    fullName : req.body.theFullName,
                    image    : req.file.url,
                    address  : response.data.results[0].formatted_address,
                    zipCode  : getZipCode(),
                    longLat  : response.data.results[0].geometry.location
                }).then((theUser) =>{
                        console.log("*************************************", theUser)
                        req.login(theUser, (err) =>{
                            if(err) { 
                                res.status(500).json({message : 'Login after signup went bad'})
                                return
                            }
                            res.json(theUser);
                        })
                    })
                    .catch((err) =>{
                        res.json({ message: 'something went wrong with creating user'})
                    })
            })
            .catch((err) =>{
                console.log('1111111111111', err)
                res.json({message: 'something is really bad'})
            })
    })
})

// View for single user
// /api/user/:id
router.get('/user/:id', (req,res,next)=>{
    User.findById(req.params.id)
        .then((response) =>{
            if(response === null){
                res.json({message: 'sorry we could not find this User'})
                return;
            }
            res.json(response)
        })
        .catch((err) =>{
            res.json({message: 'sorry we could not find this user'})
        })
});


// View for single user
// /api/user/:id
router.post('/edit-user/:id',uploader.single('the-picture'), (req,res,next) =>{

    User.findOne({email: req.body.theEmail })
    .then((findedUser)=>{
        if(findedUser!==null){
            res.json({message: 'That email is already taken'});
            return;
        }

        const salt     = bcrypt.genSaltSync(10);
        const theHash  = bcrypt.hashSync(req.body.thePassword, salt );

        User.findByIdAndUpdate(req.params.id, {
            email: req.body.theEmail,
            password: theHash,
            fullName: req.body.theFullName,
            image: req.file.url,
        })
        .then((updatedUser) =>{
            if(updatedUser === null){
                res.json({message: 'sorry we could not find this user'})
                return;
            }
            res.json([{ message:  'everything went cool'}, updatedUser])
        })
        .catch((err) =>{
            res.json(err)
        })

    })
    .catch((err) =>{
        res.json(err)
    })
});


router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, theUser, failureDetails) => {
        if (err) {
            res.status(400).json({ message: 'Something went wrong authenticating user' });
            return;
        }
    
        if (!theUser) {
            // "failureDetails" contains the error messages
            // from our logic in "LocalStrategy" { message: '...' }.
            res.status(400).json(failureDetails);
            return;
        }

        // save user in session
        req.login(theUser, (err) => {
            if (err) {
                res.status(500).json({ message: 'Session save went bad.' });
                return;
            }

            // We are now logged in (that's why we can also send req.user)
            res.json(theUser);
        });
    })(req, res, next);
});

router.post('/logout', (req, res, next) => {
    // req.logout() is defined by passport
    req.logout();
    res.json({ message: 'Log out success!' });
});

router.get('/loggedin', (req, res, next) => {
    // req.isAuthenticated() is defined by passport
    if (req.isAuthenticated()) {
        res.json(req.user);
        return;
    }
    console.log("ahahhahahhahah super bad")
    res.status(500).json({ message: 'Unauthorized' });
});





module.exports = router;
