const express = require('express');
const router  = express.Router();
const Property = require('../models/Property');
const User = require('../models/UserModel');
const Review = require('../models/Review');

const axios = require('axios');
const uploader  = require('../config/cloud');

// GET all properties
// /api/all-properties
// tested and working
router.get('/all-properties', (req,res,next) =>{
    Property.find()
    .then((allProperties) =>{
        res.json(allProperties)
    })
    .catch((err)=>{
        res.json(err)
    })
});

router.post('/add-property-to-user/:id', (req,res,next) =>{
    Property.findById(req.params.id)
    .then((foundProperty) =>{
        User.findByIdAndUpdate(req.user._id, {$push: {propertiesViewed :foundProperty._id }})
        .then(( foundUser ) =>{
            res.json(propertiesViewed)
        })
        .catch((err) =>{
            res.json(err)
        })
    })
})


// POST to get all properties by searched zipCode
// /api/all-properties-searched-zipCode
// tested and working
router.post('/all-properties-searched-zipCode', (req,res,next) =>{
    let searchedZipCode = req.body.zipCode
    if(searchedZipCode === null){
        res.json({message: 'Sorry, you must enter a zip code to search. Please try again.'})
        return
    }
    if(searchedZipCode !== Number){
        res.json({message: 'Sorry, you must enter a numerical zip code to search. Please try again.'})
        return
    }
        Property.find({zipCode: searchedZipCode})
            .then((allProperties) =>{
                res.json(allProperties)
        })
            .catch((err)=>{
                res.json(err)
        })
});  // end of all properties by searched zipCode


// GET all properties in USERS zipCode - //"Find lights near me"
// /api/all-properties-user-zipCode
// tested and working
router.get('/all-properties-user-zipCode', (req,res,next) =>{
    let theZipCode = req.user.zipCode;
    Property.find({zipCode: theZipCode})
    .then((allProperties) =>{
        res.json(allProperties)
    })
    .catch((err)=>{
        res.json(err)
    })
});  // end of view ALL properties route


// Creates property
// /api/create-property
// tested and working
router.post('/create-property', uploader.single('the-picture'), (req, res, next) => {
    axios.post(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.body.address}&key=${process.env.googleMapsAPI}`)
    .then((response)=>{
        getZipCode = () => {
            let addressArray = response.data.results[0].address_components;
            let zipCode;
            
            addressArray.forEach((element) =>{
                element.long_name.length === 5 ? zipCode =  element.long_name : 'ZipCode not found'
                
            })
            console.log("LATLONG<><><><>", )
            return zipCode
        }        

        Property.create({
            image: req.file.url,
            address: response.data.results[0].formatted_address, //to get full address from Google API
            features: req.body.features,
            creator: req.user._id, // cannot test until logged-in
            zipCode: getZipCode(),
            latLong: response.data.results[0].geometry.location
            
        })

            .then((createdProperty) =>{
                console.log("CREATED PROPERTY------------------", createdProperty)
                User.findByIdAndUpdate(req.user._id, {$push: {propertiesCreated :createdProperty._id }})
                    .then((response)=> {
                        res.json(createdProperty)
                    })
                    .catch((err)=>{
                        res.json(err)
                    })
            })
            .catch((err)=>{
                console.log(err)
            })
    })
    .catch((err)=>{
    })
})  // end of create new property route


// View for single property
// /api/property/:id
// tested and working
router.get('/property/:id', (req,res,next)=>{
    Property.findById(req.params.id).populate({path: 'review', model: 'Review'})
        .then((theProperty) =>{
            if(theProperty === null){
                res.json({message: 'Sorry, you must enter a Property. Please try again.'})
                return;
            }
            res.json(theProperty)
        })
        .catch((err) =>{
            res.json([{message: 'Sorry, we could not find this Property. Please try another address.'}, err])
        })
});  // end of view single property route


// Edits property
// /api/edit-property/:id
// tested and working
router.post('/edit-property/:id', uploader.single('the-picture') , (req,res,next) =>{
    axios.post(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.body.address}&key=${process.env.googleMapsAPI}`)
    .then((response)=>{
        getZipCode = () => {
            let addressArray = response.data.results[0].address_components;
            let zipCode;
            
            addressArray.forEach((element) =>{
                element.long_name.length === 5 ? zipCode =  element.long_name : 'ZipCode not found'
            })
            // console.log("ZIPCODE<><><><><><>",zipCode)
            return zipCode
        }
        let updatedContent = {};
        if(req.file===undefined) {
            updatedContent = {
            address: response.data.results[0].formatted_address,
            features: req.body.features,
            creator: req.user._id, // cannot test until logged-in
            zipCode: getZipCode(),
            latLong: response.data.results[0].geometry.location
            }
        }
        else{
            updatedContent = {
                image: req.file.url,
                address: response.data.results[0].formatted_address,
                features: req.body.features,
                creator: req.user._id, // cannot test until logged-in
                zipCode: getZipCode(),
                latLong: response.data.results[0].geometry.location
                }
        }




        Property.findByIdAndUpdate(req.params.id, updatedContent  )
        .then((response) =>{
            if(response === null){ 
                res.json({message: 'Sorry, you must enter a Property. Please try again.'})
                return;
            }
            res.json(response)
        })
        .catch((err) =>{
            res.json([{message: 'Sorry, we could not find this Property. Please try another address.'}, err])
        })
    .catch((err)=>{
        res.json(err)
    })
    })
}); // end of edit property route


// Deletes property
// /api/delete-property/:id
// tested and working
router.post('/delete-property/:id', (req, res, next)=>{

    Property.findByIdAndRemove(req.params.id)
        .then((deletedProperty)=>{
                res.json([
                    {message: 'Property successfully deleted'},
                    deletedProperty
                ])
                User.findByIdAndUpdate(req.user._id, {$pull: {propertiesCreated :deletedProperty._id }})
                        .then((response)=> {
                            console.log('USER UPDATE<><><><><><><>', response)
                            res.json(deletedProperty)
                        })
                        .catch((err)=>{
                            res.json(err)
                        })  
        })      
        .catch((err)=>{
            res.json([{message: 'sorry this property could not be found'}, err])
        })    
});  // end of delete property route


module.exports = router;