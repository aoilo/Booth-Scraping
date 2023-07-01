const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const { Op } = require('sequelize');
const moment = require('moment');
const sequelize = require('../service/database');
const BoothItem = require('../models/BoothItem');
const ItemLog = require('../models/ItemLog');


sequelize.authenticate();

const now = moment();

const oneWeekAgo = now.clone().subtract(1, 'week');

const query = {
    where: {
        created_at: {
            [Op.between]: [oneWeekAgo, now],
        },
    },
};

const scrapeWebsite = async () => {
    try {
        const results = await BoothItem.findAll(query);
        const itemData = [];

        await Promise.all(
            results.map(async (el) => {
                const item = {};

                try {
                    const response = await axios.get(el.url);
                    const $ = cheerio.load(response.data);
                    item.booth_item_id = el.id;
                    item.data_product_id = $('.market').attr('data-product-id');
                    item.data_product_brand = $('.market').attr('data-product-brand');
                    // item.data_shop_tracking_product_id = $('.market').attr('data-shop-tracking-product-id');
                    item.data_product_category = $('.market').attr('data-product-category');
                    item.img = $('.market-item-detail-item-image-wrapper > img').attr('src');
                    like = $('.wishlists_count').first().text();
                    if (typeof like == 'undefined') {
                        like = null
                    } else if (like == null) {
                        like = null
                    } else if (isNaN(like)) {
                        like = 0
                    } else {
                        like = parseInt(like, 10);
                    }
                    item.like = like


                    itemData.push(item);
                } catch (error) {
                    console.error(error);
                }
            })
        );
        return itemData;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const insertItemData = async (itemData) => {
    try {
        await Promise.all(
            itemData.map(async (item) => {
                await ItemLog.create({
                    item_id: item.booth_item_id,
                    data_product_id: item.data_product_id,
                    like: item.like
                });
            })
        );
    } catch (error) {
        console.error(error)
    }
};




cron.schedule('*/15 * * * *', () => {
    console.log('Running the scraper...');
    scrapeWebsite().then(async (itemData) => {
        console.log(itemData);
        await insertItemData(itemData)

    })
    console.log('Scraped Data:', scrapedData);
});


