const express = require('express');
const router = express.Router();
const fireBase = require('../connection/firebase_admin');
const firebaseDb = fireBase.database();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
const bucket = fireBase.storage().bucket(); // Get the default storage bucket


router.get('/', async (req, res) => {
  try {
    const snapshot = await firebaseDb.ref('users/' + req.session.uid).once('value');
    const userData = snapshot.val();
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data');
  }
});

router.post('/', async (req, res) => {
  try {
    await firebaseDb.ref('users/' + req.session.uid).set(req.body.user);
    const snapshot = await firebaseDb.ref('users/' + req.session.uid).once('value');
    const userData = snapshot.val();
    const msg = 'User account update success';
    res.status(200).json({ msg, userData });
  } catch (error) {
    console.error('Error updating user account:', error);
    res.status(500).send('Error updating user account');
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

    await userRef.update({ photoUrl: downloadUrl });

    res.status(200).json({ msg: 'user photo updated successfully', url: downloadUrl });
  } catch (error) {
    console.error('Error handling image upload:', error);
    res.status(500).send('Error handling image upload');
  }
});

module.exports = router;
