const express = require('express');
const router = express.Router();
const fireBase = require('../connection/firebase_admin');
const firebaseAuth = fireBase.auth();
const firebaseDb = fireBase.database();
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });
const bucket = fireBase.storage().bucket(); // Get the default storage bucket

router.get('/', (req, res) => {
    firebaseDb.ref('/users').once('value',function(snapshot){
      res.status(200).send(snapshot.val())
    })
    
});

router.post('/', async (req, res) => {
  try {
    const { email, password, name, phone, address, gender, photo} = req.body;
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
        gender:gender,
        photo:photo
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

router.post('/uploadImage', upload.single('image'), async (req, res) => {
    try {
        const file = req.file;
        const path = `userImage/${file.originalname}`;
    
        if (!file) {
          return res.status(400).send('No file uploaded.');
        }
    
        const storageReference = bucket.file(path);
        await storageReference.save(file.buffer);
    
        const downloadUrl = await storageReference.getSignedUrl({
          action: 'read',
          expires: '2099-12-31', // URL expires in 1 hour (adjust as needed)
        });
    
        const userRef = firebaseDb.ref(`users/${req.session.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();
    
        await userRef.update({ photo: downloadUrl });
    
        res.status(200).json({ msg: 'user photo updated successfully', url: downloadUrl });
      } catch (error) {
        console.error('Error handling image upload:', error);
        res.status(500).send('Error handling image upload');
      }
});

module.exports = router;
