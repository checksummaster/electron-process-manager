const { EventEmitter } = require('events');
const { app, webContents } = require('electron');
const { parse } = require('url');
const memoize = require("memoizee");

const stripPathRegexp = /^.*app\.asar[\/\\](.*)$/;

let URLDomain = urlString => {
  const url = parse(urlString);

  if (url.protocol == 'https:' | url.protocol == 'http:' ) {
    return url.hostname;
  }

  return '';
}
// memoize it for performance
URLDomain = memoize(URLDomain, { max: 100 });

class ProcessStatsReporter extends EventEmitter {
  start() {
    // check if not already started
    if (this._intervalId) return;

    this._intervalId = setInterval(() => {
      this.emit('data', this.getReportData());
    }, 1000)
  }

  stop() {
    if (this._intervalId) clearInterval(this._intervalId);
    this._intervalId = null;
  }

  getReportData() {
    const processMetric = app.getAppMetrics();

    const webContentsInfo =  webContents.getAllWebContents().map(wc => ({
      type: wc.getType(),
      id: wc.id,
      pid: wc.getOSProcessId(),
      URL: wc.getURL(),
      URLDomain: URLDomain(wc.getURL())
    }));

    return processMetric.map(proc => {
      const wc = webContentsInfo.find(wc => wc.pid === proc.pid);
      if (!wc) return proc;

      proc.webContents = proc.webContents || [];
      proc.webContents.push(wc);

      return proc
    });
  }

}

module.exports = ProcessStatsReporter;
