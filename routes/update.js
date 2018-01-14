var express = require('express');
var router = express.Router();
const async = require('async')
var request = require('request');
var rp = require('request-promise');

var config = require('../config.js');
var MongoClient = require('mongodb').MongoClient;
var db;


function connect_db () {
  return new Promise((resolve, reject) => {
    MongoClient.connect(config.mongodb_url, function (err, database) {
      if (err) reject()
      db = database;
      console.log("Connected to database");
      resolve()
    })
  })
}

function remove_user_img (username) {
  return new Promise((resolve, reject) => {
    console.log("remove_user_img");
    var query = {
      username: username
    };
    db.collection('images').remove(query)
    .then(()=>{
      resolve()
    })
  })
}

function insert_img (img) {
  return new Promise((resolve, reject) => {
    db.collection('images').insertOne( img, function(err, result) {
      if (err) reject()
      resolve()
    });
  })
}

async function loop_media (nodes, username) {
  var img_arr = []
  for (let item of nodes) {
    if(!item.is_video){
      var img_obj = {}
      img_obj.id = item.id
      img_obj.username = username
      img_obj.created_time = item.date
      img_obj.likes = item.likes.count
      img_obj.caption = item.caption

      var img_src = {
        thumbnail: {
          url: item.thumbnail_resources[0].src
        },
        low_resolution: {
          url: item.thumbnail_resources[2].src
        },
        standard_resolution: {
          url: item.thumbnail_resources[4].src
        }
      }

      img_obj.images = img_src
      img_obj.comments = []
      /*
      if(item.comments){
        img_obj.comments = item.comments.data
      }else{
        img_obj.comments = []
      }
      */
      img_arr.push(img_obj)
    }
  }
  if(img_arr.length > 0){
    await remove_user_img(username);
    for(var b = 1; b < img_arr.length; b++){
      await insert_img(img_arr[b]);
    }
    return console.log("Inserted "+username+" into images collection.");
  }else{
    return console.log('img_arr empty ' + username);
  }
}

function insert_info (info_obj, query, username) {
  return new Promise((resolve, reject) => {
    db.collection('user_info').update( query, info_obj, {upsert:true})
    .then(()=>{
      console.log("Inserted "+username+" into info collection.");
      resolve()
    });
  })
}

async function read_body(body, username) {
  console.log('start read_body')
  if(body.user.media.nodes){
    await loop_media(body.user.media.nodes, username);
  }

  //insert info
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
  await insert_info(info_obj, query, username);

  return console.log('done read_body')
}

function get_user_list () {
  console.log('get_user_list')
  return new Promise((resolve, reject) => {
    //db.collection('user_list').find().limit(2).sort({_id:-1}).toArray(function (err, results) {
    //db.collection('user_list').find({username: 'rated_apparel'}).toArray(function (err, results) {
    db.collection('user_list').find().toArray(function (err, results) {
      if (err) reject()
      resolve(results)
    })
  })
}

async function retrieve_images() {
  await connect_db()
  let user_list = await get_user_list()
  for(list of user_list){
    console.log('user_list '+ list.username)
    var username = list.username
    var options = {
      uri: 'https://www.instagram.com/'+username+'/?__a=1',
      resolveWithFullResponse: true
    };
    let body = await rp(options).then(function (response) {
      if(response && response.statusCode === 200){
        return JSON.parse(response.body);
      }else{
        return null;
      }
    }).catch(function (err) {
      return null;
    });
    if(body){
      await read_body(body, username);
    }
  }
  return console.log('done retrieve_images')
}

router.get('/', function(req, res, next) {
  retrieve_images();
  res.render('index', { title: 'update' });
});

//setInterval(retrieve_images, 3600*1000);  //1 hour

module.exports = router;
