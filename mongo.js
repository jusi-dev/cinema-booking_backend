require('dotenv').config()

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGOSTRING;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const db = client.db('cinema-app_dev')
    const movies = db.collection('movies')

    const query = { "id": "2"}

    const updateDoc = {
        $set: {
            bookedSeats: [ 'D3', 'C3', 'C2' ]
        }
    }

    const result = await movies.updateOne(query, updateDoc)
    console.log(result)

  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
