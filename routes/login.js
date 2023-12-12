const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const firebaseConfig = require('../connection/firebase_auth');
const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);
const fireBase = require('../connection/firebase_admin');
const firebaseDb = fireBase.database();
const express = require('express');
const router = express.Router();

router.post('/', function (req, res) {
    const email = req.body.email;
    const password = req.body.password;
    signInWithEmailAndPassword(firebaseAuth, email, password)
        .then(function (userCredential) {
            const user = userCredential.user;
            if (user) {
                req.session.uid = user.uid;
                firebaseDb.ref('users/' + req.session.uid).once('value',function(snapshot){
                    res.status(200).send(snapshot.val());
                })
            } else {
                console.error('login failed: User not found');
                res.status(400).send('login failed: User not found');
            }
        })
        .catch(function (error) {
            console.error('login failed', error);
            res.status(400).send('login failed')
        });
});

module.exports = router;
