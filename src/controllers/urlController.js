const UrlModel = require("../models/urlModel");
const validUrl = require("valid-url");
const redis = require("redis");
const sortId = require('shortid')
const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  14141, //PORT NO
  "redis-14141.c264.ap-south-1-1.ec2.cloud.redislabs.com", //USER ID
  { no_ready_check: true }
);
redisClient.auth("rEZNJUOarZ9IB40nWBYwi3chb2bqQoZT", function (err) { //PASSWORD
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//=========================================CREATE URL=============================================//

const generateShortUrl = async function (req, res) {
  try {
    let data = req.body;

    if (!Object.keys(data).length)
      return res
        .status(400)
        .send({ status: false, message: " You must provide data first " });

    if (!validUrl.isWebUri(data.longUrl.trim()))
      return res
        .status(400)
        .send({ status: false, message: "Please Provide a valid long Url" });

    let checkUrl = await UrlModel.findOne({ longUrl: data.longUrl }).select({
      __v: 0,
      createdAt: 0,
      updatedAt: 0,
    });

    if (checkUrl)
     return res.status(200).send({ status: true, message:" With this Long url already a shorted Url already exists, Please Enter a New One",
        data: checkUrl,
      });

    // const urlCodegenerate = function (length) {
    //   const characters =
    //     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    //   let result = "";
    //   const charactersLength = characters.length;
    //   for (let i = 0; i < length; i++) {
    //     result += characters.charAt(
    //       Math.floor(Math.random() * charactersLength)
    //     );
    //   }
    //   return result.toLocaleLowerCase();
    // };

    // let urlcode = urlCodegenerate(6);

    let urlCode = sortId.generate()

    const isUrlCodeExist = await UrlModel.findOne({ urlCode: data.urlCode });
    if (isUrlCodeExist) {
      return res.status(200).send({
        status: true,
        message: "urlCode is already present in DB. Please hit the api",
      });
    }

    let shortUrl = `http://localhost:3000/${urlcode}`;

    data.urlCode = urlcode;
    data.shortUrl = shortUrl;

    let createUrl = await UrlModel.create(data);

    await SET_ASYNC(`${urlcode}`, JSON.stringify(createUrl));
    return res.status(201).send({ status: true, data: createUrl });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
    // "{"kim":"ans"}"
  }
};

//=========================================GET URL=============================================//

const getUrlCode = async function (req, res) {
  try {
    let requestParams = req.params.urlCode;
    let cachesUrlData = await GET_ASYNC(requestParams);
    let parseData = JSON.parse(cachesUrlData);
    if (!parseData)
      return res
        .status(404)
        .send({ status: false, message: "Short url doesn't exist" });

    if (cachesUrlData) {
    //  console.log("cache");
      return res.status(302).redirect(parseData.longUrl);
    } else {
      let findUrlCode = await UrlModel.findOne({
        urlCode: requestParams,
      }).select({ urlCode: 1, longUrl: 1, shortUrl: 1 });
      if (!findUrlCode)
        return res
          .status(404)
          .send({ status: false, message: "Not found this url code" });
         
      await SET_ASYNC(requestParams, JSON.stringify(findUrlCode.longUrl));
      return res.status(302).redirect(findUrlCode.longUrl);
    }
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = { generateShortUrl, getUrlCode };
