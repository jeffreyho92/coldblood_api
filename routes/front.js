var express = require("express");
var router = express.Router();
const async = require("async");
var request = require("request");

var config = require("../config.js");
var MongoClient = require("mongodb").MongoClient;
var db_url = config.mongodb_url;
var db;
var limit = 6;

var url = require("url");

//test
MongoClient.connect(config.mongodb_url, function(err, database) {
  if (err) throw err;
  db = database;
  console.log("Connected to database");
});

function connect_db() {
  return;
  return new Promise((resolve, reject) => {
    MongoClient.connect(db_url, function(err, database) {
      if (err) reject();
      db = database;
      console.log("Connected to database");
      resolve();
    });
  });
}

function testUrl(url) {
  return new Promise((resolve, reject) => {
    request(url, function(error, response, body) {
      if (error) {
        reject(error);
      }
      resolve(response.statusCode);
    });
  });
}

async function updateImgValid(item) {
  var obj = item;
  obj.img_valid = false;
  delete obj._id;
  var query = { item_id: item.item_id };

  await connect_db();
  await db.collection("lists").update(query, obj, { upsert: true });
  return true;
}

async function retrieve_list(skip, limit, cat) {
  return await db
    .collection("lists")
    .find({ img_valid: true, tag: { $regex: ".*" + cat + ".*" } })
    .skip(skip)
    .limit(limit)
    .sort({ created_time: -1 })
    .toArray();
}

async function get_lists(req) {
  var query = url.parse(req.url, true).query;
  var currentPage = query.page;
  var skip = currentPage * limit;
  console.log(skip, limit);

  var cat = "";
  //if category exist
  if (query.cat) {
    cat = query.cat;
  }

  var err_count = 10;
  while (err_count > 0) {
    err_count = 0;
    var results = await retrieve_list(skip, limit, cat);
    results.map(async data => {
      var test = await testUrl(data.img_link);
      console.log(test);
      if (test == 403) {
        err_count++;
        await updateImgValid(data);
      }
    });
  }

  return results;
}

router.get("/lists", async (req, res) => {
  var results = await get_lists(req);
  res.send(JSON.stringify(results));
});

module.exports = router;
