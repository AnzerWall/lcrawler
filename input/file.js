'use strict';
const chokidar = require('chokidar');
const { readFileSync, existsSync, writeFileSync } = require('fs');
const { open, exists, stat, read, close } = require('fs');
const EventEmitter = require('events').EventEmitter;
const { promisify } = require('util');
const [ openAsync, existsAsync, statAsync, readAsync ] = [ open, exists, stat, read ].map(promisify);
const BUFFER_SIZE = 1000;
const LRU = require('lru-cache');
const cache = LRU({
    max: 100,
    dispose(key, n) {
        close(n);
    },
    maxAge: 1000 * 60 * 60 * 24,
});

class File extends EventEmitter {

    static async getFileID(filePath) {
        if (!await existsAsync(filePath)) return null;
        const stat = await statAsync(filePath);

        return stat.dev + ':' + stat.rdev + ':' + stat.ino;
    }

    constructor(options = {}) {
        super();
        this.accessMap = {};
        this.workingFiles = {};
        this.BUFFER_SIZE = options.bufferSize || BUFFER_SIZE;
        this.match = options.match;
        this.access_file_path = options.access_file_path;
        this.access_save_interval = options.access_save_interval || 10000;
    }

    run() {
        if (this.match) {
            const watcher = this.watcher = chokidar.watch(this.match);
            watcher.on('add', this.onNewFile.bind(this)).on('change', this.onChangeFile.bind(this));
        }

        if (this.access_file_path) {
            this.readAccessFile();
            this.timer = setInterval(() => {
                this.saveAccessFile();
            }, this.access_save_interval);
        }

        return this;
    }


    readAccessFile() {
        try {
            if (existsSync(this.access_file_path)) {
                this.accessMap = JSON.parse(readFileSync(this.access_file_path));
            }
        } catch (e) {
            console.error(e.stack);
        }
    }

    saveAccessFile() {
        try {
            if (this.access_file_path) {
                writeFileSync(this.access_file_path, JSON.stringify(this.accessMap));
            }
        } catch (e) {
            console.error(e.stack);
        }
    }

    async collect(filePath) {
        const fileID = await File.getFileID(filePath);
        let fd = cache.get(fileID);
        if (!fd) {
            fd = await openAsync(filePath, 'r');
            cache.set(fileID, fd);
        }

        console.log('[file]', `collect '${filePath}' ${fileID} ${fd}`);

        if (!fd || !fileID) return false;
        if (this.workingFiles[fileID]) return false;

        this.workingFiles[fileID] = true; // 锁住，不然其他异步函数去收集该文件
        try {
            let len = 0;
            let line = null;
            let ok = false;
            do {
                const pos = this.accessMap[fileID] || 0;
                [ ok, len, line ] = await this.collectLine(fd, pos);

                if (ok) {
                    this.accessMap[fileID] = pos + len;
                    if (line) {
                        try {
                            // console.log('[data]', { len, line });
                            this.emit('data', {
                                $timestamp: new Date(),
                                $output: '$all',
                                $input: 'file',
                                message: line,
                                file: filePath,
                            });
                        } catch (e) {
                            console.log(e.stack);
                        }
                    }
                }

            } while (ok);
        } catch (e) {
            console.log(e.stack);
        }


        this.workingFiles[fileID] = false;
    }

    async collectLine(fd, pos) {
        const datas = [];
        let len = 0;
        let endFound = false;

        while (!endFound) {
            try {
                const buf = Buffer.allocUnsafe(this.BUFFER_SIZE);
                const { bytesRead } = await readAsync(fd, buf, 0, this.BUFFER_SIZE, pos + len);
                if (bytesRead === 0) break;


                for (let idx = 0; idx < bytesRead; idx++) { // 寻找换行符
                    if (buf[idx] === 10) {
                        len += idx;
                        datas.push(buf.slice(0, idx));
                        endFound = true;
                        break;
                    }
                }

                if (endFound) {
                    break;
                }

                len += bytesRead;
                datas.push(buf);

            } catch (e) {
                console.error(e.stack);
                return [ false ];
            }
        }

        if (!endFound) return [ false ];

        const line = Buffer.concat(datas, len).toString();

        return [ true, len + 1, line ]; // 换行符视为读取了


    }

    onNewFile(filePath) {
        this.collect(filePath);
    }

    onChangeFile(filePath) {
        this.collect(filePath);
    }
}


module.exports = File;
