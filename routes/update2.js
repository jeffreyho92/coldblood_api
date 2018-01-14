var express = require('express');
var router = express.Router();
const async = require('async')
var request = require('request');

var config = require('../config.js');
var MongoClient = require('mongodb').MongoClient;
var db;

router.get('/', function(req, res, next) {
  retrieve_images();
  res.render('index', { title: 'update' });
});

//setInterval(retrieve_images, 3600*1000);  //1 hour

function retrieve_images(){
  var cb_results = null
  async.series({
    connect_db: function(callback) {
      MongoClient.connect(config.mongodb_url, function (err, database) {
        if (err) throw err
        db = database;
        console.log("Connected to database");
        callback(null, null);
      })
    },
    get_user_img: function(callback) {
      console.log('get_user_img')
      db.collection('user_list').find().limit(5).toArray(function (err, results) {
      //db.collection('user_list').find({username: 'jerrylorenzo'}).toArray(function (err, results) {
        if (err) throw err
        
        results.forEach((result)=>{
          var username = result.username
          
          async.series({
            get_images: function(callback) {
              console.log('get_images')
              cb_results = null
              request('https://www.instagram.com/'+username+'/?__a=1', function (err, response, body) {
                if (err) throw err
                if(response.statusCode === 200){
                  body = JSON.parse(body)
                  cb_results = body
                  //get images
                  var img_arr = []
                  body.user.media.nodes.forEach(function (item) {
                    if(!item.is_video){
                      var img_obj = {}
                      img_obj.id = item.id
                      img_obj.username = username
                      img_obj.created_time = item.date
                      img_obj.likes = item.likes.count
                      img_obj.caption = item.caption

                      var img_src = {
                        standard_resolution: {
                          url: item.thumbnail_resources[3].src
                        }
                      }

                      img_obj.images = img_src
                      
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
                      console.log("Inserted "+username+" into images collection.");
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
            },
            get_info: function(callback) {
              console.log('get_info')
              if(cb_results){
                var body = cb_results
                var info_obj = {};
                info_obj.username = body.user.username;
                info_obj.full_name = body.user.full_name;
                info_obj.biography = body.user.biography;
                info_obj.followers = body.user.followed_by.count;
                info_obj.following = body.user.follows.count;
                info_obj.media = body.user.media.count;
                info_obj.profile_pic_url = body.user.profile_pic_url;
                
                var query = {
                  username: username
                };
                
                db.collection('user_info').update( query, info_obj, {upsert:true})
                .then(()=>{
                  console.log("Inserted "+username+" into info collection.");
                  callback(null, null);
                });
              }else{
                callback(null, null);
              }
              /*
              //https://www.instagram.com/jeffrey_ho/?__a=1&max_id=1439872330435532024
              request('https://www.instagram.com/'+username+'/?__a=1', function (err, response, body) {
                if (err) throw err
                if(response.statusCode === 200){
                  body = JSON.parse(body)
                  
                  
                }else{
                  console.log('statusCode:', response && response.statusCode);
                  callback(null, null);
                }
              });
              */
            },
            function(err, results) {
              console.log('done');
              //if (err) throw err
              callback(null, null);
            }
          })
        })
      })
    }
  }, function(err, results) {
    console.log('final done');
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
