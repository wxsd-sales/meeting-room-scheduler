import { MongoClient, ObjectId } from 'mongodb';
import { config } from './config.js';

let client;
let db;

export async function connectDatabase() {
  try {
    client = new MongoClient(config.mongodb.uri);
    await client.connect();
    db = client.db(config.mongodb.database);
    
    await db.collection(config.mongodb.collections.bookings)
      .createIndex({ "end": 1 },  { expireAfterSeconds: 0 });
    console.log('Database connected successfully');
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}

export async function getBooking(code) {
  let data = await db.collection(config.mongodb.collections.bookings)
    .findOne({ guestCode: code });
  if(!data){
    data = await db.collection(config.mongodb.collections.bookings)
      .findOne({ hostCode: code });
  }
  return data;
}

export async function insertBooking(data) {
  return await db.collection(config.mongodb.collections.bookings)
    .insertOne(data);
}

export async function updateBooking(id, data) {
  return await db.collection(config.mongodb.collections.bookings)
    .updateOne({ "_id": new ObjectId(id) }, { "$set": data });
}


export { ObjectId };