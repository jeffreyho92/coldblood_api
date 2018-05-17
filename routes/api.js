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

module.exports = router;
