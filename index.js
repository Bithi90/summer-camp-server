const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_SK)
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {

    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).send({ error: true, messege: 'unAuthorized access' });
    }

    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, messege: 'unAuthorized access' });
        }

        req.decoded = decoded;
        next();

    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.avf7i9k.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });

        const classCollection = client.db("sportsDB").collection("class");
        const instractorsCollection = client.db("sportsDB").collection("instractors");
        const selectedCollection = client.db("sportsDB").collection("selected");
        const usersCollection = client.db("sportsDB").collection("users");
        const pendingclassCollection = client.db("sportsDB").collection("pendingClass");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token });
        })

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, messege: 'forbidden message' });
            }
            next();
        }

        app.get('/class', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })
        app.post('/class', async (req, res) => {
            const item = req.body;
            console.log({item});
            const result = await classCollection.insertOne(item);
            res.send(result);
        })
        app.post('/pendingClass', async (req, res) => {
            const item = req.body;
            console.log({item});
            const result = await pendingclassCollection.insertOne(item);
            res.send(result);
        })

        app.get('/pendingClass', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await pendingclassCollection.find().toArray();
            res.send(result);
        })

        app.get('/instractors', async (req, res) => {
            const result = await instractorsCollection.find().toArray();
            res.send(result);
        })
        // user collection

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ messege: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        app.patch('/pendingClass/approved/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'approved'
                },
            };
            const result = await pendingclassCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        app.patch('/users/instractor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instractor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })
        app.get('/users/instractor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instractor: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instractor: user?.role === 'instractor' }
            res.send(result);
        })

        // select collection 

        app.post('/selected', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await selectedCollection.insertOne(item);
            res.send(result);
        })

        app.get('/selected', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, messege: 'forbidden access' });
            }

            const query = { email: email };
            const result = await selectedCollection.find(query).toArray();
            res.send(result);
        })

        app.delete('/selected/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedCollection.deleteOne(query);
            res.send(result);
        })
        app.get('/selected/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedCollection.findOne(query);
            res.send(result);
        })
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // create payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('summer camp server is running')
})

app.listen(port, () => {
    console.log(`summer camp server is running on port ${port}`);
})