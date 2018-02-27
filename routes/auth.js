const router = require('express').Router();

const passport = require('passport');
const MercadoLibreStrategy = require('passport-mercadolibre').Strategy;
const refresh = require("passport-oauth2-refresh");

const Account = require('../model/account');

const {clientId, clientSecret} = require('../config').auth.mercadolibre;

let mercadoLibreStrategy = new MercadoLibreStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: '/auth/mercadolibre/callback',
    },
    async function (accessToken, refreshToken, profile, cb) {
        // + store/retrieve user from database, together with access token and refresh token
        // await db.users.save(profile)
        await Account.register(profile, {accessToken, refreshToken});

        return cb(null, profile);
    }
);
passport.use(mercadoLibreStrategy);
refresh.use(mercadoLibreStrategy);

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((obj, cb) => {
    cb(null, obj);
});

router.get('/mercadolibre', passport.authorize('mercadolibre'));

router.get('/mercadolibre/callback', passport.authorize('mercadolibre', {failureRedirect: '/auth/error'}),
    function (req, res) {
        // Successful authentication, redirect home.
        console.log("Successful login!");
        res.redirect('/auth/success');
    });

router.get('/success', (req, res) => res.send("You have successfully logged in"));

router.get('/error', (req, res) => res.send("error logging in"));


module.exports = router;
