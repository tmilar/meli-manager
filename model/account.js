const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const request = require("request-promise");

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

accountSchema.statics.refreshToken = async function () {
    let refreshUrl = `https://api.mercadolibre.com/oauth/token?grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`;
    let auth = await request.post(refreshUrl);
    ///  todo update expires to a date...
    /// complete this.. move elsewhere..
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