const express = require('express');
const router = express.Router();
const fireBase = require('../connection/firebase_admin');
const firebaseDb = fireBase.database();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
const bucket = fireBase.storage().bucket();


const ITEMS_PER_PAGE = 12; 
router.get('/', async (req, res) => {
  try {  
    let snapshot = await firebaseDb.ref('events/').once('value');
    let eventsData = snapshot.val();

    function calcEventStatus(event){
      const today = new Date().getTime()
      const start = new Date(event.meetingTime).getTime()
      const end = new Date(event.endTime).getTime()
      if(today > end){
        return 'expired'
      }else if(today < start){
        return 'open'
      }else{
        return 'ing'
      }
    }

    for(let k in eventsData){
      const eventsDataWithExpired = eventsData[k].map((item)=>{
        return {
          ...item,
          eventStatus:calcEventStatus(item)
        }
      })
      firebaseDb.ref('events/' + k).set(eventsDataWithExpired)
    }

    snapshot = await firebaseDb.ref('events/').once('value');
    eventsData = snapshot.val();

    let eventsArray = Object.values(eventsData || []);

    if (eventsArray.length !== 0) {
      eventsArray = eventsArray.flat();
    }

    eventsArray = eventsArray.filter((item) => item.eventStatus !== 'expired').sort((a, b) => new Date(a.meetingTime) - new Date(b.meetingTime))

    if (!req.query.page && !req.query.id) {
      res.status(200).json({
        totalItems: eventsArray.length,
        allEvents: eventsArray,
      });
      return;
    }

    if (!req.query.page && req.query.id) {
      const event = eventsArray.find(event => req.query.id === event.uuid);
      res.status(200).json({
        event: event,
      });
      return;
    }

    const page = req.query.page || 1;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedEvents = eventsArray.slice(startIndex, endIndex)

    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存一小时
    res.status(200).json({
      totalItems: eventsArray.length,
      currentPage: page,
      itemsPerPage: ITEMS_PER_PAGE,
      events: paginatedEvents,
      allEvents: eventsArray,
    });
  } catch (error) {
    console.error('Error fetching events data:', error);
    res.status(500).send({ errorMsg: 'Error fetching events data' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedUuid = req.params.id;
    const updatedEventData = req.body.event;

    if (!updatedUuid || !updatedEventData) {
      return res.status(400).send('Cannot update event');
    }

    const eventsSnapshot = await firebaseDb.ref(`events/${updatedUuid}`).once('value');
    const events = eventsSnapshot.val();

    if (!events) {
      return res.status(404).send({ errorMsg: 'No events found' });
    }

    const updatedEventIndex = events.findIndex(event => event.uuid === updatedEventData.uuid);
    if (updatedEventIndex === -1) {
      return res.status(404).send({ errorMsg: 'Event not found' });
    }

    if (!events[updatedEventIndex].joinUserId) {
      events[updatedEventIndex].joinUserId = [];
    }

    const hasSameJoinUser = events[updatedEventIndex].joinUserId.some(item => {
      return Object.keys(item)[0] === Object.keys(updatedEventData.joinUserId)[0];
    });

    if (hasSameJoinUser) {
      return res.status(411).send({ errorMsg: 'Each individual can only sign up for one event.' });
    }

    events[updatedEventIndex].joinUserId.push(updatedEventData.joinUserId);

    const calcJoinNumbers = events[updatedEventIndex].joinUserId.reduce((acc, curr) => {
      const value = Number(Object.values(curr)[0]);
      return acc + (isNaN(value) ? 0 : value);
    }, 0);

    if (calcJoinNumbers > parseInt(events[updatedEventIndex].selectNum)) {
      return res.status(411).send({ errorMsg: `Event limit ${events[updatedEventIndex].selectNum}, Event Full.` });
    }

    const usersSnapshot = await firebaseDb.ref(`users/${req.session.uid}`).once('value');
    const user = usersSnapshot.val();

    if (!user.events) {
      user.events = [];
    }

    user.events.push({ [updatedEventData.uuid]: Object.values(updatedEventData.joinUserId)[0] });

    await Promise.all([
      firebaseDb.ref(`users/${req.session.uid}`).set(user),
      firebaseDb.ref(`events/${updatedUuid}`).set(events)
    ]);

    res.status(200).json({ msg: `Joined ${updatedEventData.eventName} successfully`, data: events[updatedEventIndex] });
  } catch (error) {
    res.status(500).send({ errorMsg: 'Error updating user event' });
  }
});


module.exports = router;
