const fetch = require('node-fetch')
const pgp_ = require('pg-promise')
const pgp = pgp_()
const readFile = require('fs').readFileSync
const delay = require('delay')
const AWS = require ('aws-sdk')
const mustache = require('mustache').render
const groupBy = require('group-by')

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

async function getparams() {
  let params = await db.any('select lower(exchange) as exchange, params from bookparams')
  params = groupBy(params,'exchange') 
  let ret = {}
  for (let [key,val] of Object.entries(params)) {
     ret[key] = val[0].params;
  }
  return ret;
}

async function getpairs() {
  let pairs = await db.any('select ourpair as ourname, exchange, theirpair from exchangepairs order by ourpair ')
  return groupBy(pairs,'ourname')
}

async function init() {
  AWS.config.region = "us-east-2"
  lambda = new AWS.Lambda()

}
    
async function bookEvent({oursym, mktname, symbol, params}) {
  let obj = { exchange: mktname, symbol: symbol+'$'+oursym}
  Object.assign(obj, params)

  let tokens = symbol.split(/[^A-Za-z]/)
  let sym1 = '', sym2 = ''
  if (tokens.length>1) [sym1, sym2] = tokens

  obj.url = mustache(obj.url, {sym:symbol,sym1,sym2})
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
  for (let coin of Object.keys(coins)) {  
    try {
      for (let mkt of coins[coin]) {
        if (mkt.exchange.toLowerCase() == 'tagz') continue;
 
        const symbol = mkt.theirpair
        const params = mktparams[mkt.exchange.toLowerCase()]
        console.log({mktparams, mkt,params})
        const oursym = coin
        const toTrigger = []
        try {
          toTrigger.push(bookEvent({oursym, symbol, mktname:mkt.exchange, params}))
          await Promise.all(toTrigger)
        } catch (e) {
          console.error("bookEvent trigger error: "+mkt.exchange + " " +e.message)
        } 
      }

    } catch (e) {
      console.error("recordbooks error coin="+coin + e.message)
    }
    await delay(2000);
  }
}


exports.handler = async (event) => {
    let text = 'ok'
    await init()
   const mktparams = await getparams()
   const coins = await getpairs()
   console.log({mktparams,coins:JSON.stringify(coins)})  
   await recordbooks({coins, mktparams})
   //await initDB()
   //text = await dbquery()
   const response = {
        statusCode: 200,
        body: text,
    }
    return response
};

