const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware

app.use(cors());
app.use(express.json());


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

        app.get('/class', async(req, res)=>{
            const result = await classCollection.find().toArray();
            res.send(result);
        })
        app.get('/instractors', async(req, res)=>{
            const result = await instractorsCollection.find().toArray();
            res.send(result);
        })
        // user collection

        app.get('/users', async(req,res) =>{
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async(req, res)=>{
            const user = req.body;
            const query = {email: user.email}
            const existingUser = await usersCollection.findOne(query);
            if(existingUser){
                return res.send({messege:'user already exists'})
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req,res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const updateDoc = {
                $set:{
                    role:'admin'
                },
            };
            const result= await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // select collection 

        app.post('/selected', async(req, res) =>{
            const item = req.body;
            console.log(item);
            const result = await selectedCollection.insertOne(item);
            res.send(result);
        })

        app.get('/selected', async(req, res) =>{
            const email = req.query.email;
            if(!email){
                res.send([]);
            }
           const query = {email:email};
           const result = await selectedCollection.find(query).toArray();
           res.send(result);
        })

        app.delete('/selected/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await selectedCollection.deleteOne(query);
            res.send(result);
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