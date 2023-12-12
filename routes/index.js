const express = require('express');
const router = express.Router();
const admin = require('../connection/firebase_admin');
const fireData = admin.database();

/* GET home page. */
router.get('/', function(req, res, next) {
  // console.log('fireData',fireData)
  // fireData.ref('name').once('value',function(snapshot){
  //   res.send(snapshot.val(),200)
  // })
 
});

module.exports = router;
