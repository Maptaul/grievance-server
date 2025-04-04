const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6vndn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("grievance").collection("users");
    const categoryCollection = client.db("grievance").collection("category");
    const complaintsCollection = client
      .db("grievance")
      .collection("complaints");

    // User registration endpoint
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const { role } = req.body;
      const query = { email: email };
      const updateDoc = { $set: { role: role } };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/category", async (req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/complaints", async (req, res) => {
      const complaint = req.body;
      const result = await complaintsCollection.insertOne(complaint);
      res.send(result);
    });

    app.get("/complaints", async (req, res) => {
      const cursor = complaintsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // New endpoint: Get complaints by user email
    app.get("/complaints/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = complaintsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.put("/complaints/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: status } };
      const result = await complaintsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete("/complaints/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await complaintsCollection.deleteOne(query);
      res.send(result);
    });

    console.log("Connected to MongoDB!");
  } finally {
    // Remove client.close() to maintain connection
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
