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

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;