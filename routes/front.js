var express = require("express");
var router = express.Router();
const async = require("async");
var request = require("request");
var moment = require("moment");

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
    .sort({ promote: -1, created_time: -1 })
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

  /*
  //wait all img checking and retrun all OK
  var err_count = 10;
  while (err_count > 0) {
    err_count = 0;
    var results = await retrieve_list(skip, limit, cat);
    for (let i = 0; i < results.length; i++) {
      var data = results[i];
      var test = await testUrl(data.img_link);
      console.log(test);
      if (test == 403) {
        err_count++;
        await updateImgValid(data);
      }
    }

    console.log("err_count" + err_count);
    if (err_count == 0) {
      console.log("results done2");
      return results;
    }
  }
  */

  //return all img first, afterthat do checking and updateImgValid
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

async function click_logs(req) {
  await connect_db();

  var client_ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  /*
  1 = btnHowToBuy
  2 = Discover
  3 = discover Hype
  4 = discover Sport
  5 = discover Techwear
  6 = discover Local
  7 = discover Minimalist
  8 = discover Korean
  9 = discover Accessories
  */
  var obj = {
    id: req.body.id,
    created_time: moment().unix(),
    client_ip: client_ip
  };

  db.collection("click_logs").insertOne(obj, function(err, result) {
    if (err) reject();
    console.log("done insert_click_logs");
    return true;
  });
}

router.get("/lists", async (req, res) => {
  var results = await get_lists(req);
  res.send(JSON.stringify(results));
});

router.post("/click_logs", async (req, res) => {
  click_logs(req);
  res.send("");
});

module.exports = router;
