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

const ITEMS_PER_PAGE = 12; // 每頁顯示的項目數

router.get('/', async (req, res) => {
  try {
    const snapshot = await firebaseDb.ref('events/').once('value');
    const eventsData = snapshot.val();

    let eventsArray = Object.values(eventsData || []);


    console.log('eventsArray', eventsArray)

    if (eventsArray.length !== 0) {
      eventsArray = eventsArray.flat();
    }

    eventsArray = eventsArray.sort((a, b) => {
      const startTimeA = new Date(a.startTime);
      const startTimeB = new Date(b.startTime);
      return startTimeA - startTimeB;
    })

    // 分頁邏輯
    const page = req.query.page || 1; // 從請求的查詢參數中獲取當前頁碼
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedEvents = eventsArray.slice(startIndex, endIndex);

    res.status(200).json({
      totalItems: eventsArray.length,
      currentPage: page,
      itemsPerPage: ITEMS_PER_PAGE,
      events: paginatedEvents,
    });
  } catch (error) {
    console.error('Error fetching events data:', error);
    res.status(500).send({ errorMsg: 'Error fetching events data' });
  }
});

module.exports = router;
