'use strict';


class JsonFilter {
    async process(frame) {
        if (frame.message) {
            try {
                const data = JSON.parse(frame.message);
                delete frame.message;
                Object.assign(frame, data);

                if (data.timestamp) {
                    frame.$timestamp = new Date(data.timestamp);
                }


            } catch (e) {
                e;
            }
        }
        return true;
    }
}

module.exports = JsonFilter;
