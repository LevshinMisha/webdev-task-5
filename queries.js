'use strict';

module.exports = class Queries {
    constructor(mongoose, { souvenirsCollection, cartsCollection }) {
        const souvenirSchema = new mongoose.Schema({
            tags: [String],
            reviews: [mongoose.Schema.Types.Mixed],
            name: String,
            image: String,
            price: { type: Number, index: true },
            amount: Number,
            country: { type: String, index: true },
            rating: { type: Number, index: true },
            isRecent: Boolean
        });

        const cartSchema = new mongoose.Schema({
            login: { type: String, unique: true },
            items: [{
                souvenirId: mongoose.Schema.Types.ObjectId,
                amount: Number
            }]
        });

        this._Souvenir = mongoose.model('Souvenir', souvenirSchema, souvenirsCollection);
        this._Cart = mongoose.model('Cart', cartSchema, cartsCollection);
    }

    getAllSouvenirs() {
        return this._Souvenir.find();
    }

    getCheapSouvenirs(price) {
        return this._Souvenir.find()
            .where('price')
            .lte(price);
    }

    getTopRatingSouvenirs(n) {
        return this._Souvenir.find()
            .sort({ rating: -1 })
    }

    getSouvenirsByTag(tag) {
        return this._Souvenir.find({ tags: tag }, { name: 1, image: 1, price: 1, _id: 0 });
    }

    getSouvenrisCount({ country, rating, price }) {
        return this._Souvenir.count({ country, rating: { $gte: rating }, price: { $lte: price } });
    }

    searchSouvenirs(substring) {
        return this._Souvenir.find({ name: { $regex: substring, $options: 'i' } });
    }

    getDisscusedSouvenirs(date) {
        return this._Souvenir.find({ 'reviews.0.date': { $gte: date } });
    }

    deleteOutOfStockSouvenirs() {
        return this._Souvenir.remove({ amount: 0 });
    }

    async addReview(souvenirId, { login, rating, text }) {
        return this._Souvenir.findById(souvenirId)
            .then(souvenir => {
                if (!souvenir) {
                    return;
                }
                const ratingSum = Math.round(souvenir.rating * souvenir.reviews.length);
                souvenir.reviews.push({ login, rating, text, date: new Date(), isApproved: false });
                souvenir.rating = (ratingSum + rating) / souvenir.reviews.length;

                return souvenir.save();
            });
    }

    async getCartSum(login) {
        return this._Cart.findOne({ login })
            .populate({ path: 'items.souvenirId', select: 'price', model: this._Souvenir })
            .then(cart => cart
                ? cart.items.map(i => i.amount * i.souvenirId.price).reduce((i, j) => i + j, 0)
                : 0);
    }
};
