const fetch = require('node-fetch')
const pgp_ = require('pg-promise')
const pgp = pgp_()
const readFile = require('fs').readFileSync
const AWS = require ('aws-sdk')

const pw = process.env.pw

const cn = { host: 'pricesdb.cerqhtf4ui7b.us-east-2.rds.amazonaws.com',
             port: 5432, database: 'postgres',
             user: 'postgres', password: pw }

const db = pgp(cn)

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

async function init() {
  AWS.config.region = "us-east-2"
  lambda = new AWS.Lambda()

}
    
async function bookEvent({coin, mkt}) {
  let obj = {
     exchange: mkt,
     symbol: coin.ourname
   }
  Object.assign(obj, params)

  let lambdaArgs = {
    ClientContext: "Screener", 
    FunctionName: "getbooks", 
    InvocationType: "Event", 
    LogType: "Tail", 
    Payload: JSON.stringify(obj), 
    Qualifier: "1"
 }
 return lambda.invoke(lambdaArgs).promise()

}

async function recordbooks(coins) {
  for (coin of coins) {  
    try {
      for (mkt of coin.exchanges) {
        let toTrigger = []
        try {
          toTrigger.push(bookEvent({coin, mkt}))
          await Promise.all(toTrigger)
        } catch (e) {
          console.error("bookEvent trigger error: "+mkt + " " +e.message)
        } 
      }

    } catch (e) {
      console.error("recordbooks error coin="+coin.name + e.message)
    }
    await delay(2000);
  }
}

exports.handler = async (event) => {
    //let text = await getBooks(event)
    let text = 'ok'
    //await initDB()
    await init()
    //text = await dbquery()
    const response = {
        statusCode: 200,
        body: text,
    }
    return response
};

