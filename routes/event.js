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
    const snapshot = await firebaseDb.ref('events/' + req.session.uid).once('value');
    const userData = snapshot.val();
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data');
  }
});

router.post('/', async (req, res) => {
  try {
    const eventData = req.body.event;
    console.log('eventData',eventData)
    if (!eventData) {
      return 
    }
    await firebaseDb.ref('events/' + req.session.uid).set(req.body.event);
    const snapshot = await firebaseDb.ref('events/' + req.session.uid).once('value');
    const userData = snapshot.val();
    const msg = 'Event Created Successfully';
    res.status(200).json({ msg, userData });
  } catch (error) {
    console.error('Error updating user account:', error);
    res.status(500).send('Error updating user account');
  }
});

router.post('/uploadImage', upload.array('images'), async (req, res) => {
  try {
    const files = req.files;
    const descs = req.body.descs;
    const urls = req.body.urls;
    console.log('files', files);
    console.log('descs', descs);

    const eventRef = firebaseDb.ref(`events/${req.session.uid}`);
    const eventSnapshot = await eventRef.once('value');
    const existingData = eventSnapshot.val() || {}; // Check if data exists

    const existingPhotoUrls = existingData.photoUrls || [];
    const existingPhotoDescs = existingData.photoDescs || [];
    if (files && descs && files.length > 0 && descs.length > 0) {
      const newDeses = descs.slice(existingPhotoUrls.length)
      const promises = files.map(async (file, index) => {
        const path = `eventImage/${file.originalname}`;

        const storageReference = bucket.file(path);
        await storageReference.save(file.buffer);

        const downloadUrl = await storageReference.getSignedUrl({
          action: 'read',
          expires: '2099-12-31',
        });

        return { url: downloadUrl[0], desc: newDeses[index] };
      });

      const results = await Promise.all(promises);
      console.log('promise results', results)
      const newPhotoUrls = results.map(result => result.url);
      const newPhotoDescs = results.map(result => result.desc);

      // Combine existing images with newly uploaded images
      const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];
      const allPhotoDescs = [...existingPhotoDescs, ...newPhotoDescs];

      await eventRef.update({ photoUrls: allPhotoUrls, photoDescs: allPhotoDescs });

      res.status(200).json({
        msg: 'event photos and descriptions updated successfully',
        urls: allPhotoUrls,
        descs: allPhotoDescs,
      });
    } else if (!files || files.length === 0) {
      if (descs && descs.length > 0 && existingPhotoDescs.length === descs.length) {
        const updateDesc = await eventRef.update({ photoDescs: descs });
        res.status(200).json({ msg: 'event descriptions updated successfully', descs: updateDesc });
      }else if(descs && descs.length > 0 && existingPhotoDescs.length !== descs.length){
        const updateDesc = await eventRef.update({ photoDescs: descs,  photoUrls:urls});
        res.status(200).json({ msg: 'event descriptions updated successfully', descs: updateDesc });
      } else {
        res.status(400).send('No files uploaded.');
      }
    }

  } catch (error) {
    console.error('Error handling image upload:', error);
    res.status(500).send('Error handling image upload');
  }
});


module.exports = router;
