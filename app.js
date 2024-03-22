const createError = require('http-errors');
const express = require('express');
const cors = require('cors'); 
const session = require("express-session")
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const signupRouter = require('./routes/signup');
const loginRouter = require('./routes/login');
const accountRouter = require('./routes/account');
const logoutRouter = require('./routes/logout');
const eventRouter = require('./routes/event')
const allEventRouter = require('./routes/allEvents')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: 'http://localhost:8080', 
  credentials:true
}));

function ensureLoggedIn(req, res, next) {
  if (req.session.uid) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
}
app.use(session({ secret: 'mysupersecret',cookie:{maxAge : 1000 * 60 * 60 * 24}, resave: false, saveUninitialized: true }));
app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/signup', signupRouter);
app.use('/logout', logoutRouter);

app.use('/account',ensureLoggedIn, accountRouter);
app.use('/events',ensureLoggedIn, eventRouter);
app.use('/allEvents',allEventRouter);
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
