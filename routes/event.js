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
    res.status(500).send({errorMsg:'Error fetching user data'});
  }
});

router.post('/', async (req, res) => {
  try {
    const eventData = req.body.event;
    if (!eventData) {
      return 
    }

    const settedEvent = await firebaseDb.ref(`events/${req.session.uid}`).once('value');
    if(settedEvent.val() && settedEvent.val().length >= 10){
      res.status(411).send({errorMsg:'initiate event limit 10.'})
      return 
    }
    
    let updatedEvents;

    if (settedEvent.exists()) {
      updatedEvents = [...settedEvent.val(), eventData];
    } else {
      updatedEvents = [eventData];
    }

    await firebaseDb.ref(`events/${req.session.uid}`).set(updatedEvents);

    const snapshot = await firebaseDb.ref(`events/${req.session.uid}`).once('value');
    const userData = snapshot.val();
    const msg = 'Event Created Successfully';

    res.status(200).json({ msg, userData });
  } catch (error) {
    console.error('Error updating user account:', error);
    res.status(500).send({errorMsg:'Error updating user event'});
  }
});

router.put('/:id', async(req, res)=>{
    try{
      const updatedUuid = req.params.id;
      const updatedEventData = req.body.event;

      if(!updatedUuid || !updatedEventData){
        return res.status(400).send('can not update event');
      }

      const snapshot = await firebaseDb.ref(`events/${req.session.uid}`).once('value');
      const events = snapshot.val();

      if (events && events) {
        const updatedEventIndex = events.findIndex(event => event.uuid === updatedUuid);
  
        if (updatedEventIndex !== -1) {
          events[updatedEventIndex] = updatedEventData

          await firebaseDb.ref(`events/${req.session.uid}`).set(events);
  
          res.status(200).json({ msg: 'Event updated successfully', data : updatedEventData });
        } else {
          res.status(404).send({errorMsg:'Event not found'});
        }
      } else {
        res.status(404).send({errorMsg:'No events found'});
      }
  
    }catch(error){
      res.status(500).send({errorMsg:'Error updating user event'});
    }
})

router.delete('/:id', async (req, res) => {
  try {
    const eventIdToDelete = req.params.id;

    if (!eventIdToDelete) {
      return res.status(400).send({errorMsg:'Event ID is required for deletion'});
    }

    const snapshot = await firebaseDb.ref(`events/${req.session.uid}`).once('value');
    const events = snapshot.val();

    if (events && events.length > 0) {
      const eventIndexToDelete = events.findIndex(event => event.uuid === eventIdToDelete);
      const deleteEvent = events[eventIndexToDelete].eventName
      if (eventIndexToDelete !== -1) {
        events.splice(eventIndexToDelete, 1);

        await firebaseDb.ref(`events/${req.session.uid}`).set(events);
        res.status(200).json({ msg: `${deleteEvent} Event deleted successfully` });
      } else {
        res.status(404).send({errorMsg:'Event not found'});
      }
    } else {
      res.status(404).send({errorMsg: 'No events found'});
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).send({errorMsg:'Error deleting event'});
  }
});

router.post('/uploadImage', upload.array('images'), async (req, res) => {
  try {
    const files = req.files;
    if(files && files.length > 0 ){
      const promises = files.map(async (file, index) => {
        const path = `eventImage/${file.originalname}`;

        const storageReference = bucket.file(path);
        await storageReference.save(file.buffer);

        const downloadUrl = await storageReference.getSignedUrl({
          action: 'read',
          expires: '2099-12-31',
        });
        return { url: downloadUrl[0] };
      });
      const uploadResults =  await Promise.all(promises);
      const uploadedImageArr = uploadResults.map((item) => item.url)
      res.status(200).json(uploadedImageArr);
    }

  } catch (error) {
    res.status(500).send({errorMsg:'Error handling image upload'});
  }
});


module.exports = router;
