const cron = require('node-cron');
const cheerio = require('cheerio');
const { Op } = require('sequelize');
const moment = require('moment');
const sequelize = require('../service/database');
const BoothItem = require('../models/BoothItem');
const ItemLog = require('../models/ItemLog');

sequelize.authenticate();

const scrapeWebsite = async () => {
    const now = moment();
    const oneWeekAgo = now.clone().subtract(1, 'week');
    const query = {
        where: {
            created_at: {
                [Op.between]: [oneWeekAgo, now],
            },
        },
    }
    try {
        const results = await BoothItem.findAll(query);
        const itemData = [];

        await Promise.all(
            results.map(async (el) => {
                const item = {};

                let jsonUrl = "https://booth.pm/ja/items/" + el.data_product_id + ".json"
                try {
                    const response = await fetch(jsonUrl);
                    let data = response.json()
                    item.booth_item_id = el.id;
                    item.data_product_id = data.id;
                    item.data_product_brand = data.shop.subdomain;
                    item.shop_name = data.shop.name;
                    item.category_id = data.category.id;
                    item.img = data.images.original;
                    let like = data.wish_lists_count;
                    if (typeof like == 'undefined') {
                        like = null
                    } else if (like == null) {
                        like = null
                    } else if (isNaN(like)) {
                        like = 0
                    } else {
                        like = parseInt(like, 10);
                    }
                    item.likes = like
                    itemData.push(item);
                    return item;
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
                    likes: item.likes
                });
            })
        );
    } catch (error) {
        console.error(error)
    }
};

cron.schedule('*/15 * * * *', async () => {
    console.log('Running the scraper...');
    try {
        const itemData = await scrapeWebsite();
        console.log(itemData);
        await insertItemData(itemData);
        console.log('Scraped Data:', itemData);
    } catch (error) {
        console.error('Error during scraping or data insertion:', error);
    }
});
