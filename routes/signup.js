const express = require('express');
const router = express.Router();
const fireBase = require('../connection/firebase_admin');
const firebaseAuth = fireBase.auth();
const firebaseDb = fireBase.database();

router.get('/', (req, res) => {
    firebaseDb.ref('/users').once('value',function(snapshot){
      res.status(200).send(snapshot.val())
    })
    
});

router.post('/', async (req, res) => {
  try {
    const { email, password, name, phone, address, gender} = req.body;
    console.log('post data', email, password);

    const user = await firebaseAuth.createUser({
        email: email,
        password: password,
    });

    const userSave = {
        email,
        password: password,
        uid: user.uid,
        name:name,
        phone:phone,
        address:address,
        gender:gender
    };
    console.log('userSave',userSave)
    await firebaseDb.ref(`/users/${user.uid}`).set(userSave);

    firebaseDb.ref(`/users/${user.uid}`).once('value', function (snapshot) {
        const userData = snapshot.val();
        const msg = 'User account signup success';
        res.status(200).json({ msg, userData });
    });

    } catch (error) {
        res.status(441).json({errorMsg:'signup faild'})
    }
});

module.exports = router;
