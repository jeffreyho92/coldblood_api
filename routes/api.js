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

async function check_id(id) {
  console.log(id);
  return await db
    .collection("lists")
    .find({ item_id: id })
    .toArray();
}

async function insert_item(req) {
  await connect_db();
  var checking = await check_id(req.body.form.item_id);
  if (checking.length != 0) {
    return false;
  }

  /*
  var obj = {
    item_id: req.body.form.item_id,
    img_link: req.body.form.img_link,
    shop_name: req.body.form.shop_name,
    tag: req.body.form.tag,
    click_link: req.body.form.click_link,
    img_valid: true,
    created_time: moment().unix()
  };
  */

  var obj = req.body.form;
  obj.img_valid = true;
  obj.created_time = moment().unix();

  db.collection("lists").insertOne(obj, function(err, result) {
    if (err) reject();
    console.log("done insert_item");
    return true;
  });
}

async function get_lists() {
  await connect_db();
  return await db
    .collection("lists")
    .find()
    .sort({ promote: -1, created_time: -1 })
    .toArray();
}

async function delete_item(req) {
  await connect_db();
  await db.collection("lists").remove({ item_id: req.body.item_id });
  console.log("done delete_item");
  return true;
}

async function update_item(req) {
  var obj = req.body.form;
  obj.img_valid = true;
  delete obj._id;

  var query = { item_id: req.body.form.item_id };

  await connect_db();
  await db.collection("lists").update(query, obj, { upsert: true });
  return true;
}

async function get_browse_logs() {
  await connect_db();
  /*
  return await db
    .collection("browse_logs")
    .find({
		    "created_time": 
		    {
		        $gte: moment().add(-30, 'days').unix()
		    }
		})
    .sort({ created_time: -1 })
    .toArray();
  */
  return await db
    .collection("browse_logs")
    .aggregate([
      { $match:
        { 'created_time': {$gte: moment().add(-30, 'days').unix()} }
      },
      { $group: 
        { _id: {
          year : { 
            "$year": {
                "$add": [
                    new Date(0),
                    { "$multiply": [1000, "$created_time"] }
                ]
            }
          },
          month : { 
            "$month": {
                "$add": [
                    new Date(0),
                    { "$multiply": [1000, "$created_time"] }
                ]
            }
          },
          day : { 
            "$dayOfMonth": {
                "$add": [
                    new Date(0),
                    { "$multiply": [1000, "$created_time"] }
                ]
            }
          }
        }, group_count: { $sum: 1 } } 
      }])
    .toArray();

    
}

async function get_click_logs() {
  await connect_db();
  return await db
    .collection("click_logs")
    .find({
		    "created_time": 
		    {
		        $gte: moment().add(-30, 'days').unix()
		    }
		})
    .sort({ created_time: -1 })
    .toArray();
}

async function count_browse_logs() {
  await connect_db();
  return await db
    .collection("browse_logs")
    .aggregate([
		 { $group: 
		    { _id: {cat : '$cat',currentPage:'$currentPage'}, group_count: { $sum: 1 } } 
		 }])
    .toArray();
}

async function count_click_logs() {
  await connect_db();
  return await db
    .collection("click_logs")
    .aggregate([
		 { $group: 
		    { _id: '$id', group_count: { $sum: 1 } } 
		 }])
    .toArray();
}



router.get("/lists", async (req, res) => {
  var arr = [];
  arr = await get_lists();

  console.log("done find");

  res.send(JSON.stringify(arr));
});

router.post("/item", async (req, res) => {
  if ((await insert_item(req)) == false) {
    res.send({ status: false });
  } else {
    res.send({ status: true });
  }
});

router.post("/item_delete", async (req, res) => {
  console.log("item_delete");
  await delete_item(req);
  res.send({ status: true });
});

router.post("/item_update", async (req, res) => {
  console.log("item_update");
  await update_item(req);
  res.send({ status: true });
});

router.get("/browse_logs", async (req, res) => {
  var arr = [];
  arr = await get_browse_logs();
  res.send(JSON.stringify(arr));
});

router.get("/click_logs", async (req, res) => {
  var arr = [];
  arr = await get_click_logs();
  res.send(JSON.stringify(arr));
});

router.get("/count_browse_logs", async (req, res) => {
  var arr = [];
  arr = await count_browse_logs();
  res.send(JSON.stringify(arr));
});

router.get("/count_click_logs", async (req, res) => {
  var arr = [];
  arr = await count_click_logs();
  res.send(JSON.stringify(arr));
});

module.exports = router;
