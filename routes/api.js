var express = require('express');
var router = express.Router();

var MongoClient = require('mongodb').MongoClient;
var db_url = 'mongodb://admin:admin@ds155150.mlab.com:55150/lawa';
var db;

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
  MongoClient.connect(db_url, function (err, database) {
    if (err) throw err
    db = database;
    console.log("Connected to database");
    
    db.collection('images').find().sort({created_time: -1}).toArray(function (err, result) {
      if (err) throw err
      res.send(JSON.stringify(result));
    })
  })
});

router.get('/images/:username', function(req, res, next) {
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

module.exports = router;
