require('dotenv').config()

const express = require('express')
const app = express()
const cors = require('cors')

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://admin:${process.env.MONGOPW}@cluster0.tbguvim.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.use(cors())
app.use(express.json())

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const storeItems = new Map([
    ['adult', { priceInCents: 2200, name: 'Adult Ticket' }],
    ['children', { priceInCents: 1400, name: 'Children Ticket' }],
    ['discount', { priceInCents: 1800, name: 'Discount Ticket' }]
])

app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: req.body.ticketClasses.map(ticketClass => {
                const storeItem = storeItems.get(ticketClass.name)
                if (ticketClass.quantity >= 1) {
                    return {
                        price_data: {
                            currency: 'chf',
                            product_data: {
                                name: storeItem.name
                            },
                            unit_amount: storeItem.priceInCents
                        },
                        quantity: ticketClass.quantity
                    }
                }
            }),
            success_url: `${process.env.CLIENT_URL}`,
            cancel_url: `${process.env.SERVER_URL}/canceledSession?session_id={CHECKOUT_SESSION_ID}&bookedSeats=${req.body.selectedTickets}&movieID=${req.body.movieID}`,
            expires_at: Math.floor(Date.now() / 1000) + 60 * 30
        })
        console.log('Body: ', req.body)
        // reserveSeats(req.body)
        res.json({ url: session.url})
    } catch (e) {
        res.status(500).json({ error: e.message })
        console.log(e)
        console.log(req.body)
    }
})

const reserveSeats = async (body, res) => {
    try {
        await client.connect()
        const db = client.db('cinema-app_dev')
        const movies = db.collection('movies')

        const query = {"id" : body.movieID.toString()}
        console.log('MovieID query: ', body.movieID.toString())

        const updateDoc = {
            $push: {
                bookedSeats: { $each: body.selectedTickets }
            }
        }

        console.log(body.selectedTickets)

        const result = await movies.updateOne(query, updateDoc)
        console.log(result)
        res.status(300).json({ message: 'Seats reserved'})
    } catch(e) {
        console.log(e)
        res.status(500).json({ error: e.message })
    } finally {
        await client.close()
    }
}

const cancelReservedSeats = async (bookedSeats, movieID) => {
    try {
        await client.connect()
        const db = client.db('cinema-app_dev')
        const movies = db.collection('movies')

        console.log(bookedSeats)

        const query = {"id" : movieID.toString()}

        const updateDoc = {
            $pull: {
                bookedSeats: { $in: bookedSeats}
            }
        }

        const result = await movies.updateOne(query, updateDoc)
        console.log(result)
    } catch(e) {
        console.log(e)
    } finally {
        await client.close()
    }
}

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.get('/api/getMovies', async (req, res) => {
    try {
        let response = []

        await client.connect()

        const db = client.db('cinema-app_dev')
        const movies = db.collection('movies')
    
        const cursor = movies.find()
    
        for await (const doc of cursor) {
            response.push(doc)
        }

        res.json(response)
        
      } catch (e){
        console.log(e)
      
      } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
      }
})

app.get('/api/canceledSession', (req, res) => {
    const session_id = req.query.session_id;
    let bookedSeats = req.query.bookedSeats;
    const movieID = req.query.movieID;

    if (!bookedSeats.isArray()) {
        bookedSeats = bookedSeats.split(',')
    }

    cancelReservedSeats(bookedSeats, movieID)

    res.redirect(303, `${process.env.CLIENT_URL}`)

})

app.post('/api/bookSeats', (req, res) => {
    reserveSeats(req.body, res)
})

app.post('/api/canelReservation', (req, res) => {
    cancelReservedSeats(req.body.selectedTickets, req.body.movieID)
    res.status(200).json({ message: 'Seats canceled'})
})

app.listen(4040)