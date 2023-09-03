const cron = require('node-cron')
const axios = require('axios')
const { Op } = require('sequelize')
const moment = require('moment')
const sequelize = require('../service/database')
const BoothItem = require('../models/BoothItem')
const ItemLog = require('../models/ItemLog')

sequelize.authenticate()

const scrapeWebsite = async () => {
    const now = moment()
    const oneWeekAgo = now.clone().subtract(1, 'week')
    const query = {
        where: {
            created_at: {
                [Op.between]: [oneWeekAgo, now],
            },
        },
    }
    try {
        const results = await BoothItem.findAll(query)
        const itemData = []

        const itemIds = results.map(result => result.data_product_id)
        const itemIdx = results.map(result => result.id)
        for (let i = 0; i < itemIds.length; i += 60) {
            const ids = itemIds.slice(i, i + 60)
            const url = `https://accounts.booth.pm/wish_lists.json?${ids.map(id => `item_ids[]=${id}`).join('&')}`
            
            const response = await axios.get(url)
            const json = response.data

            const jsonTemplate = ids.map((id, index) => ({
                id: itemIdx[i + index],
                data_product_id: id,
                wish_lists_count: null,
            }))

            jsonTemplate.forEach(item => {
                let like = json.wishlists_counts[item.data_product_id]
                if (typeof like == 'undefined') {
                    like = null
                } else if (like == null) {
                    like = null
                } else if (isNaN(like)) {
                    like = 0
                } else {
                    like = parseInt(like, 10)
                }
                item.wish_lists_count = like
            })

            itemData.push(...jsonTemplate)

            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        return itemData
    } catch (error) {
        console.error(error)
        return null
    }
}

const insertItemData = async (itemData) => {
    try {
        await Promise.all(
            itemData.map(async (item) => {
                await ItemLog.create({
                    item_id: item.id,
                    data_product_id: item.data_product_id,
                    likes: item.wish_lists_count
                })

                boothItem = await BoothItem.findByPk(item.id)
                boothItem.likes = item.wish_lists_count
                await boothItem.save()
            })
        )
    } catch (error) {
        console.error(error)
    }
}

cron.schedule('*/11 * * * *', async () => {
    console.log('Running the scraper...')
    try {
        const itemData = await scrapeWebsite()
        console.log(itemData)
        await insertItemData(itemData)
        console.log('Scraped Data:', itemData)
    } catch (error) {
        console.error('Error during scraping or data insertion:', error)
    }
})
