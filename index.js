const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors')
const admin = require("firebase-admin");
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;
// const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qifrc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}


async function run() {
    try{
        await client.connect();
        // console.log('connected to database');
        const database = client.db("carSales");
        const servicesCollection = database.collection("services");
        const ordersCollection = database.collection("orders");
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection('reviews');


         // GET API OR LOAD ALL DATA
         app.get('/services', async(req, res) =>{
            const cursor = servicesCollection.find({});
            const services = await cursor.toArray();
            res.send(services);
        })


        // GET Single Service (for booking)
        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const user = await servicesCollection.findOne(query);
            // console.log('load user with id: ', id);
            res.send(user);
        })


        // POST API
        app.post('/services', async(req, res) =>{
            const service = req.body;
            console.log('hit the post api',service);
            const result = await servicesCollection.insertOne(service);
            console.log(result);
            res.json(result)
        })


        // GET API OR LOAD ALL REVIEWS
        app.get('/reviews', async(req, res) =>{
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        })


        // Reviews POST API
        app.post('/reviews', async(req, res) =>{
            const review = req.body;
            console.log('hit the post api',review);
            const result = await reviewsCollection.insertOne(review);
            console.log(result);
            res.json(result)
        })


        // ORDERS GET API
        app.get('/orders/:email', async(req, res) =>{
            console.log(req.params.email)
            const cursor = ordersCollection.find({email:req.params.email});
            const services = await cursor.toArray();
            console.log(services);
            res.send(services);
        })


        // ORDERS POST API 
        app.post('/orders', async(req, res) => {
            const orders = req.body;
            console.log('hit the order post api', orders);

            const result = await ordersCollection.insertOne(orders);
            console.log(result);
            res.json(result)
        });


        // USER
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });


        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        //User Set Admin Role and verify
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })


        // User Admin
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })


        // DELETE CAR API, From UI
        app.delete('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        })


        // DELETE MANAGE CAR API
        app.delete('/delete-services/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const result = await servicesCollection.deleteOne(query);
            console.log(result);
            res.json(result);
        })


      } 
      finally {
        // await client.close();
      }

}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running Car Sales Server');
  });
  
  app.listen(port, () => {
    console.log('Running Car Sales Server on port', port);
  })