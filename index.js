const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6vndn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    //     await client.connect();

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

    // Get all users endpoint (for testing)
    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/category", async (req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Add this endpoint after other endpoints
    app.post("/complaints", async (req, res) => {
      const complaint = req.body;
      const result = await complaintsCollection.insertOne(complaint);
      res.send(result);
    });

    // Get all complaints (for testing)
    app.get("/complaints", async (req, res) => {
      const cursor = complaintsCollection.find();
      const result = await cursor.toArray();
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
