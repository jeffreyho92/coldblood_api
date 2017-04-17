var express = require('express');
var router = express.Router();
const async = require('async')
var request = require('request');

var MongoClient = require('mongodb').MongoClient;
var db_url = 'mongodb://admin:admin@ds155150.mlab.com:55150/lawa';
var db;

var url = require('url');

router.get('/users', function(req, res, next) {
  MongoClient.connect(db_url, function (err, database) {
    if (err) throw err
    db = database;
    console.log("Connected to database");
    
    db.collection('user_list').find().toArray(function (err, result) {
      if (err) throw err
      res.send(JSON.stringify(result));
    })
  })
});

router.get('/images', function(req, res, next) {
    var limit = 6;
    var query = url.parse(req.url,true).query;
    var currentPage = query.page;
    var skip = currentPage * limit;
    console.log(skip, limit);
    
  MongoClient.connect(db_url, function (err, database) {
    if (err) throw err
    db = database;
    console.log("Connected to database");
    
    async.waterfall([
        function(callback) {
            var filter = {}
            //if category exist
            if(query.cat){
              var cat = query.cat;
              var arr_users = []
              //get user in category
              db.collection('user_list').find({category: cat}).toArray(function (err, results) {
                if (err) throw err
                results.forEach((result)=>{
                  arr_users.push(result.username)
                })
                filter = {username: { '$in': arr_users }}
                callback(null, filter);
              })
            }else{
                callback(null, filter);
            }
        },
        function(arg1, callback) {
            var filter = arg1
            console.log(filter)
            db.collection('images').find(filter).skip(skip).limit(limit).sort({created_time: -1}).toArray(function (err, result) {
              if (err) throw err
              res.send(JSON.stringify(result));
            })
            callback(null, null);
        }
    ], function (err, result) {
        if (err) throw err
    });
  })
});

router.get('/images/:id', function(req, res, next) {
  MongoClient.connect(db_url, function (err, database) {
    if (err) throw err
    db = database;
    console.log("Connected to database");
    
    db.collection('images').find({id: req.params.id}).toArray(function (err, result) {
      if (err) throw err
      res.send(JSON.stringify(result));
    })
  })
});

/*
router.get('/user/:username', function(req, res, next) {
  MongoClient.connect(db_url, function (err, database) {
    if (err) throw err
    db = database;
    console.log("Connected to database");
    
    db.collection('images').find({username: req.params.username}).sort({created_time: -1}).toArray(function (err, result) {
      if (err) throw err
      res.send(JSON.stringify(result));
    })
  })
});
*/
module.exports = router;
