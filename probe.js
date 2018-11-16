const https = require('https');
const events = require('events');
const fs = require('fs');

const myEmitter = new events.EventEmitter();

const MAX_OCAS = 1;
var readings = [];
var testsPerformed = 0;

myEmitter.on('finish', function(result) {
  testsPerformed++;
  if(testsPerformed < MAX_OCAS) {
    console.log("Test finished, waiting for others...");
    return;
  }
  console.log("All tests finished");
  console.log(JSON.stringify(readings));
  for(var i = 0; i < readings.length; i++) {
    var timeSpent = readings[i].end - readings[i].start;
    readings[i].timeSpent = timeSpent;
    var dataSize = parseInt(readings[i].dataSize) * 8;
    var speed = dataSize / timeSpent / 1e3;
    readings[i].speed = speed;
    console.log("Speed: "+speed);
  }
  saveReadingsToFile();
});


function sendDownloadRequest(testUrl) {

  var timingData = {};
  var testDateTime = new Date();
  timingData.testDateTime = testDateTime.toLocaleString();

  https.get(testUrl, (resp) => {
    timingData.start = parseHrtime(process.hrtime());

    resp.once('readable', () => {

    })

    var dataSize = 0;
    resp.on('data', (d) => {
      dataSize += d.length;
    });

    resp.on('end', () => {
      timingData.end = parseHrtime(process.hrtime());
      timingData.dataSize = dataSize;
      readings.push(timingData);
      myEmitter.emit('finish');
    });

  }).on("error", (err) => {
    console.log("Error: "+err.message);
  });
};

function parseHrtime(hrtime) {
  const nanoseconds = (hrtime[0] * 1e9) + hrtime[1];
	const milliseconds = nanoseconds / 1e6;

  return parseInt(milliseconds);
}

function getNodeList(url) {
  https.get(url, (resp) => {
    var data = '';
    resp.on('data', (d) => {
      data += d;
    });

    resp.on('end', () => {
      resJson = JSON.parse(data);
      performSpeedTests(resJson.targets);
    });

  }).on("error", (err) => {
    console.log("Error: "+err.message);
  });
}

function performSpeedTests(targets) {
  for(var i = 0; i < targets.length && i < MAX_OCAS; i++) {
    sendDownloadRequest(targets[i].url);
  }
}

function saveReadingsToFile() {
  var dataToWrite = '';
  if(!fs.existsSync('./results.csv')) {
    dataToWrite = "testDateTime,startTime,endTime,downloadTime,dataSize,speed\n";
  }
  readings.forEach(function(read) {
    var timeSpent = (parseInt(read.end) - parseInt(read.start));
    var dataSize = parseInt(read.dataSize) * 8;
    var speed = dataSize / timeSpent / 1e3;
    dataToWrite += read.testDateTime+","+read.start+","+read.end+","+read.timeSpent+","+read.dataSize+","+read.speed+"\n";
  });

  fs.appendFile('./results.csv', dataToWrite, (err) => {
    if(err) {
      console.log("Couldn't write data to file");
    }
    console.log("Data saved to file");
  })

}

getNodeList('https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm&urlCount=5');
