var express = require('express');
var router = express.Router();

var config = require('../config.js');

var MongoClient = require('mongodb').MongoClient;
var db;
var arr = [];

MongoClient.connect(config.mongodb_url, function (err, database) {
    if (err) throw err
    db = database;
    console.log("Connected to database");
    
    db.collection('user_list').find().toArray(function (err, result) {
      if (err) throw err
      result.forEach(function (res) {
          var obj = {username: res.username, category: res.category };
          arr.push(obj)
      });
    })
})

/* GET home page. */
router.get('/', function(req, res, next) {
    res.send(JSON.stringify(arr));
  //res.render('index', { title: 'Express' });
});

module.exports = router;
