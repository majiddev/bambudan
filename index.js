var express = require('express');
var fs = require('fs');

var urlWriter = fs.createWriteStream('urls.txt', {
    flags: 'a' // 'a' means appending (old data will be preserved)
});
var errorWriter = fs.createWriteStream('errors.txt', {
    flags: 'a' // 'a' means appending (old data will be preserved)
});

var request = require('request');
var cheerio = require('cheerio');
var app     = express();
var path = require('path');

var domainNameBase = '//perfectionservo.com';
var domainNameBaseWWW = '//www.perfectionservo.com';
var allUrls = new Array();
var crawledUrls = new Array();
var saveUrls = new Array();
var hitCounter = {};

var appId = 'oii2o34io234i23u4o23u4o23';
var masterKey = 'ajsuidha87sy788ka09d*&*^&asjdioajsdo';
var serverURL = 'https://bambudan.herokuapp.com/parse';
var bodyParser = require('body-parser');

var ParseServer = require('parse-server').ParseServer;
var api = new ParseServer({
  databaseURI: 'mongodb://dbuser:123456789@ds035816.mlab.com:35816/pangaapp',
  appId: appId,
  masterKey: masterKey,
  serverURL: serverURL
});

var Parse = require('parse/node');

Parse.initialize(appId, masterKey);
Parse.serverURL = serverURL;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    httpServer.timeout = 0;
    console.log('Crawler running on port ' + port + '.');
});

//fs.writeFile('urls.txt', 'Just now, we have created this file');

app.get('/', function(req, res) {
    res.send('Welcome node js url crawler');
});

app.get('/reset', function(req, res) {
    fs.writeFile('urls.txt', '');
    fs.writeFile('errors.txt', '');
    res.send('File have been reset');
});

app.get('/test', function(req, res) {
    if(fs.existsSync('urls.txt')) {
        console.log('Found file');
  }
  else{
      console.log('not Found file');
  }
  fs.writeFile('urls.txt', 'Just now, we have created this file');
  fs.readFile('urls.txt', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    console.log(data);
  });
  res.send('file data...');
    
    
});

app.get('/urls.txt', function(req, res) {
    
  fs.readFile('urls.txt', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    res.send('<pre>'+data+'</pre>');
  });
    
});

app.get('/errors.txt', function(req, res) {
    
  fs.readFile('errors.txt', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    res.send('<pre>'+data+'</pre>');
  });
    
});

app.get('/scrape', function(req, res){
    
    url = 'http://www.perfectionservo.com';
    saveCrawling(url);

    res.send('Crawling started...');
  
});

app.use('/scrape', function (req, res, next) {
    console.log('Accessing the email section ...');
    sendMail(res);
});

function sendMail(res){
    
    var message = 'Email status\n';
    
    var nodemailer = require("nodemailer");
    var smtpTransport = nodemailer.createTransport("SMTP",{
        service: "Gmail",
        auth: {
            user: "mianmajid.dev@gmail.com",
            pass: "dogood#1"
        }
    });
    
    var mailOptions={
        from: 'Mian Majid <mianmajid.dev@gmail.com>',
        to : 'majid.ali@nxb.com.pk',
        subject : 'URL Collection Completed',
        text : 'URL Collection Completed'
     };
     
     smtpTransport.sendMail(mailOptions, function(error, response){
     if(error){
        console.log(error);
     res.end("error");
     }else{
        console.log("Message sent: " + response.message);
        res.end("sent");
     }
     });
}



function saveCrawling(url){
    continueCrawling( url );
}

function continueCrawling( url, retry ){
    console.log('Continue crawling for ... '+url);
    request(url, function (error, response, html) {
        if (!error && response.statusCode === 200) {
            console.log('Request sent...');
            var $ = cheerio.load(html);
            var linksLength = $('a').length;
            if( linksLength < 1 ){
                console.log('Links not found...');
                errorWriter.write(url+'___links not found\n');
                crawledUrls.push(url);
            }
            else{
                console.log(linksLength+' Found Links, Continue Collection...');
                crawledUrls.push(url);
                $('a').each(function(i, element){
                    
                    var a = $(this);
                    var href = a.attr('href');
                    if( typeof href !== 'undefined'  ){
                        var validatedUrl = validateURL( href );
                        if( validatedUrl !== false && validatedUrl !== '' ){
                            if( validatedUrl.indexOf('javascript:') > -1 ){
                                crawledUrls.push(validatedUrl);
                                allUrls.push(validatedUrl);
                                return true;
                            }
                            if( allUrls.indexOf(validatedUrl) < 0 ){
                                urlWriter.write(validatedUrl+'\n');
                                console.log('Saved URL: '+validatedUrl);
                                //saveUrl(validatedUrl);
                                allUrls.push(validatedUrl);
                            }
                            if( validatedUrl.indexOf('?tag=') > -1 ){
                                crawledUrls.push(validatedUrl);
                            }
                            else if( crawledUrls.indexOf(validatedUrl) < 0 ){
                                setTimeout(function(){
                                    continueCrawling(validatedUrl);
                                }, 3000);
                            } 
                        }

                    }
                });
            }
        }
        else{
            console.log('error url:', url);
            if( hitCounter[url] === 5 ){
                var errorNo = ( error.errno ) ? '>>>'+error.errno : '';
                errorWriter.write(url+errorNo+'\n');
                console.log('Error Logged url:', error.errno);
            }
            else if( ! hitCounter[url] || hitCounter[url] < 5 ){
                hitCounter[url] = ( hitCounter[url] >= 0 ) ? hitCounter[url]+=1 : 1;
                console.log('Error Retry '+hitCounter[url]+':', url);
                setTimeout(function(){
                    continueCrawling(url, true);
                }, 5000);
            }
        }
        //console.log('Hit Counter...');
        //console.log(hitCounter);
    });
}

function saveUrl( url ){
    //console.log('length-1:', saveUrls.length);
    if( saveUrls.length < 11 ){
        saveUrls.push(url);
    }
    else{
        setTimeout(function(){
            //console.log('length-2:', saveUrls.length);
            saveUrls.push(url);
            var SSR = new Parse.Object('perfection_urls');
            SSR.set('urls', saveUrls);
            saveUrls = new Array();
            SSR.save().then(function(obj) {
                console.log(obj.toJSON());
            }, function(err) { 
                console.log(err); 
            });
        }, 1000);
        
    }
    
}

function validateURL( url ){
    if( typeof url === 'undefined'  ){
        return false;
    }
    if( ! allowedExt( url ) ){
        return false;
    }
    if( url === '/' ){
        return false;
    }
    if( url.indexOf('mailto:') > -1 ){
        return false;
    }
    var validReq = true;
    
    var verifyDomain = checkSetDomain( url );
    if( verifyDomain ){
        var finalUrl = cleanHash( verifyDomain.trim() );
        request(finalUrl, function (error, response, html) {
            if (error || ( typeof response !== 'undefined' && response.statusCode !== 200 ) ) {
                validReq = false;
            }  
        });
        if( ! validReq ){
            return false;
        }
        
        return finalUrl;
    }
    return false;
}

function allowedExt( url ){
    if( url.lastIndexOf( '.' ) > -1 ){
        var filesExt = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'zip', 'rar', 'tar', 'doc', 'docx', 'xls', 'xlsx'];
        var extArr = url.split('.');
        var ext = extArr[extArr.length - 1].toLowerCase();
        if( filesExt.lastIndexOf(ext) < 0 ){
            return url;
        }
        return false;
    }
    return url;
}



function checkSetDomain( url ){
    if( typeof url === 'undefined'  ){
        return false;
    }
    var domainPos = url.indexOf(domainNameBase);
    var domainPosWWW = url.indexOf(domainNameBaseWWW);
    //  If url has local domain
    if( domainPos > -1 || domainPosWWW > -1 ){
        var httpPos = url.indexOf('http:');
        var httpsPos = url.indexOf('https:');
        return ( httpPos > -1 || httpsPos > -1 ) ? setWWW(url) : setWWW('http:'+url);                    
    }

    //  Check for other domain URL
    var httpPos = url.indexOf('http:');
    var httpsPos = url.indexOf('https:');
    var wwwPos = url.indexOf('//www.');

    if( httpPos > -1 || httpsPos > -1 || wwwPos > -1 ){ //  URL belongs to other domain
        return false;
    }
    
    //  If there is no slash prefix
    var firstChar = url.charAt(0);
    url = ( firstChar === '/' ) ? url : '/'+url;
    
    //  URL belongs to local domain, but do not has domain prefix, so add prefix
    return setWWW('http:'+domainNameBaseWWW+url);
}

function setWWW( url ){
    var finalUrl = '';
    if( url.indexOf('//www.') > -1 ){
        return url;
    }
    if( url.indexOf('http://') > -1 ){
        var urlArr = url.split('http://');
        finalUrl = 'http://www.'+urlArr[1];
    }
    else if( url.indexOf('https://') > -1 ){
        var urlArr = url.split('https://');
        finalUrl = 'https://www.'+urlArr[1];
    }
    if( finalUrl !== '' ){
        return finalUrl;
    }
    return url;
}

function cleanHash( url ){
    var hashPos = url.indexOf('#');
    if( hashPos > -1 ){
        var hashArr = url.split('#');
        return hashArr[0];
    }
    return url;
}