const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const request = require("request-promise");
const refresh = require('passport-oauth2-refresh');
const Promise = require('bluebird');

const accountSchema = new Schema({
    id: Number,
    nickname: String,
    firstName: String,
    lastName: String,
    email: String,
    auth: {
        accessToken: String,
        refreshToken: String,
        expires: Date
    }
});

accountSchema.methods.refreshToken = async function () {

    const requestNewAccessToken = Promise.promisify(refresh.requestNewAccessToken);
    let accessToken;
    try {
        accessToken = await requestNewAccessToken('mercadolibre', this.auth.refreshToken);
    } catch(e) {
        console.log(`Could not refresh token for ${this.nickname}. `, e);
        throw new Error(e);
    }

    let expires = new Date();
    expires.setSeconds(expires.getSeconds() + 21000);

    this.auth.accessToken = accessToken;
    this.auth.expires = expires;
    await this.save();

    console.log(`Refresh token success for ${this.nickname}`);
};

accountSchema.statics.register = async function (profile, auth) {
    let {id, nickname, first_name, last_name, email} = profile;
    let {accessToken, refreshToken} = auth;

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

    await this.findOneAndUpdate({id}, account, {upsert: true}).exec();

    console.log(`Login & save ${nickname} account auth successful!`);
};


const Account = mongoose.model('Account', accountSchema);

module.exports = Account;