const admin = require("firebase-admin");
const serviceAccount = require("../group-97700-firebase-adminsdk-9efwg-adedffce2f.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://group-97700-default-rtdb.firebaseio.com",
  storageBucket:'gs://group-97700.appspot.com/'
});
module.exports = admin;