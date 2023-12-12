const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                res.status(500).send('Internal Server Error');
            } else {
                res.json({ logout: true });
            }
        });
    } else {
        res.json({ logout: true });
    }
});

module.exports = router;
