var express = require('express');
var router = express.Router();

var passport = require('passport');
var MercadoLibreStrategy = require('passport-mercadolibre').Strategy;

const Account = require('../model/account');


var CLIENT_ID = process.env.MELI_CLIENT_ID;
var SECRET_KEY = process.env.MELI_CLIENT_SECRET;

passport.use(new MercadoLibreStrategy({
        clientID: CLIENT_ID,
        clientSecret: SECRET_KEY,
        callbackURL: '/auth/mercadolibre/callback',
    },
    async function (accessToken, refreshToken, profile, cb) {
        // + store/retrieve user from database, together with access token and refresh token
        // await db.users.save(profile)

        let {id, nickname, first_name, last_name, email} = profile;

        // console.log({accessToken, refreshToken});

        let expires = new Date();
        expires.setSeconds(expires.getSeconds() + 21000);

        let account = {
            id,
            nickname,
            firstName: first_name,
            lastName: last_name,
            email,
            auth: {
                accessToken,
                refreshToken,
                expires
            }
        };

        await Account.findOneAndUpdate({id}, account, {upsert: true}).exec();

        console.log(`Login & save ${nickname} account auth successful!`);

        return cb(null, profile);
    }
));

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((obj, cb) => {
    cb(null, obj);
});

router.get('/mercadolibre', passport.authorize('mercadolibre'));

router.get('/mercadolibre/callback', passport.authorize('mercadolibre', {failureRedirect: '/error'}),
    function (req, res) {
        // Successful authentication, redirect home.
        console.log("Successful login!");
        res.redirect('/success');
    });


module.exports = router;
