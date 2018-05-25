'use strict';
const { MongoClient } = require('mongodb');
const format = require('sffjs');
const BULK_SIZE = 100;
/**
 * TODO: 背压, 批量写入
 */

class MongodbOutput {
    constructor(options = {}) {
        this.options = options;
        this.connection = null;
        // this.writing = false;


    }

    getConnection() {
        return this.connection || (this.connection = MongoClient.connect(this.options.uri, { useNewUrlParser: true }));
    }


    async process(frame) {
        let { database, collection } = this.options;
        database = format(database, frame);
        collection = format(collection, frame);

        const connection = await this.getConnection();

        const doc = {};
        for (const key of Object.keys(frame)) {
            if (!key.startsWith('$')) {
                doc[key] = frame[key];
            }
        }
        await connection.db(database).collection(collection).insert(doc);
        // console.log(frame);

    }
}

module.exports = MongodbOutput;
