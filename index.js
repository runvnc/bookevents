const fetch = require('node-fetch')
const pgp_ = require('pg-promise')
const pgp = pgp_()
const readFile = require('fs').readFileSync
const delay = require('delay')
const AWS = require ('aws-sdk')
const mustache = require('mustache').render

const pw = process.env.pw

const cn = { host: 'pricesdb.cerqhtf4ui7b.us-east-2.rds.amazonaws.com',
             port: 5432, database: 'postgres',
             user: 'postgres', password: pw }

const db = pgp(cn)

let lambda = null;

async function initDB() {
  const initSQL = readFile(__dirname+'/init.sql','utf8')
  console.log(initSQL)
  await db.any(initSQL)
}

/* 
runs once every minute

get the list of coins and exchanges

for each coin:
  try
    try
      fire off getbooks events for all exchanges
    catch

    wait one second
  catch

let lambda;
*/

let coins = [
 { ourname: 'btc_usd', exchanges: { kraken: 'XXBTZUSD' } }
]

let mktparams = {
  kraken: {
    "url": "https://api.kraken.com/0/public/Depth?pair={{sym}}",
    "parser": "simple",
    "field": "result"
  }
}


async function init() {
  AWS.config.region = "us-east-2"
  lambda = new AWS.Lambda()

}
    
async function bookEvent({oursym, mktname, symbol, params}) {
  let obj = { exchange: mktname, symbol: symbol+'$'+oursym}
  Object.assign(obj, params)
  obj.url = mustache(obj.url, {sym:symbol})
  let lambdaArgs = {
    ClientContext: "Screener", 
    FunctionName: "getbooks", 
    InvocationType: "Event", 
    LogType: "Tail", 
    Payload: JSON.stringify(obj) //, 
    //Qualifier: "1"
 }
 console.log({lambdaArgs})

 return lambda.invoke(lambdaArgs).promise()

}

async function recordbooks({coins, mktparams}) {
  for (let coin of coins) {  
    try {
      for (let mktname of Object.keys(coin.exchanges)) {
        const symbol = coin.exchanges[mktname]
        const params = mktparams[mktname]
        const oursym = coin.ourname
        const toTrigger = []
        try {
          toTrigger.push(bookEvent({oursym, symbol, mktname, params}))
          await Promise.all(toTrigger)
        } catch (e) {
          console.error("bookEvent trigger error: "+mktname + " " +e.message)
        } 
      }

    } catch (e) {
      console.error("recordbooks error coin="+coin.ourname + e.message)
    }
    await delay(2000);
  }
}

exports.handler = async (event) => {
    let text = 'ok'
    await init()
 
    await recordbooks({coins, mktparams}) 
   //await initDB()
   //text = await dbquery()
    const response = {
        statusCode: 200,
        body: text,
    }
    return response
};

