var express = require('express');
var router = express.Router();
const async = require('async')
var request = require('request');

var config = require('../config.js');
var MongoClient = require('mongodb').MongoClient;
var db;

router.get('/', function(req, res, next) {
  res.render('index', { title: 'update' });
});

setInterval(retrieve_images, 3600*1000);  //1 hour

function retrieve_images(){
  async.series({
    connect_db: function(callback) {
      MongoClient.connect(config.mongodb_url, function (err, database) {
        if (err) throw err
        db = database;
        console.log("Connected to database");
        callback(null, null);
      })
    },
    get_user_list: function(callback) {
      console.log('get_user_list');
      callback(null, null);
    },
    get_user_img: function(callback) {
      db.collection('user_list').find().toArray(function (err, results) {
        if (err) throw err
        
        results.forEach((result)=>{
          var username = result.username
          
          request('https://www.instagram.com/'+username+'/media/', function (err, response, body) {
            if (err) throw err
            if(response.statusCode === 200){
              var img_arr = []
              body = JSON.parse(body)
              body.items.forEach(function (item) {
                if(item.type === "image"){
                  var img_obj = {}
                  img_obj.id = item.id
                  img_obj.username = username
                  img_obj.created_time = item.created_time
                  img_obj.likes = item.likes.count
                  img_obj.caption = item.caption
                  img_obj.images = item.images
                  
                  if(item.comments){
                    img_obj.comments = item.comments.data
                  }else{
                    img_obj.comments = []
                  }
                  
                  img_arr.push(img_obj)
                }
              })
              if(img_arr.length > 0){
                var query = {
                  username: username
                };
                db.collection('images').remove(query)
                .then(()=>{
                  img_arr.forEach(function (img) {
                    db.collection('images').insertOne( img, function(err, result) {
                      if (err) throw err
                    });
                  })
                })
                .then(()=>{
                  console.log("Inserted "+username+" into the images collection.");
                  callback(null, null);
                })
                .catch((err)=>{
                  if (err) throw err
                })
              }
            }else{
              console.log('statusCode:', response && response.statusCode);
              callback(null, null);
            }
          });
          
        })
      })
    }
  }, function(err, results) {
    if (err) throw err
    //console.log(results.get_user_list)
    db.collection('images').find().toArray(function (err, result) {
      if (err) throw err
      console.log(result.length)
    })
    /*
    db.collection('user_list').findAndModify(
      {username: 'alkarus'}, // query
      [['_id','asc']],  // sort order
      {$set: {category: 'global'}}, // replacement, replaces only the field
      {}, // options
      function(err, object) {
        if (err){
          console.warn(err.message);  // returns error if no matching object found
        }else{
          console.log(object)
        }
      }
    );
    */
    return true;
  });
}

module.exports = router;
