const express = require("express");
const app = express();
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");

require("dotenv").config();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    const complaintsCollection = client.db("grievance").collection("complaints");

    // User registration endpoint
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email.toLowerCase() };
      const updateDoc = {
        $set: {
          email: user.email.toLowerCase(),
          name: user.name || user.displayName || "",
          photo:
            user.photo || user.photoURL || "https://via.placeholder.com/150",
          role: user.role || "citizen",
          designation: user.designation || "",
          department: user.department || "",
          mobileNumber: user.mobileNumber || "",
          suspended: user.suspended || false,
          createdAt: user.createdAt || new Date().toISOString(),
        },
      };

      if (user.password) {
        const saltRounds = 10;
        updateDoc.$set.password = await bcrypt.hash(user.password, saltRounds);
      }
      const options = { upsert: true };
      try {
        const result = await usersCollection.updateOne(
          query,
          updateDoc,
          options
        );
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/users", async (req, res) => {
      const { role } = req.query;
      const query = role ? { role } : {};
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email.toLowerCase();
      const query = { email: { $regex: new RegExp(`^${email}$`, "i") } };
      try {
        const user = await usersCollection.findOne(query);
        res.send(user || {});
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email.toLowerCase();
      const { role, suspended } = req.body;
      const query = { email };
      const updateDoc = { $set: {} };
      if (role !== undefined) updateDoc.$set.role = role;
      if (suspended !== undefined) updateDoc.$set.suspended = suspended;
      try {
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.delete("/users/:email", async (req, res) => {
      const email = req.params.email.toLowerCase();
      const query = { email };
      try {
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/category", async (req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/complaints", async (req, res) => {
      const complaint = req.body;
      const result = await complaintsCollection.insertOne({
        ...complaint,
        status: "Pending",
        employeeId: null,
        history: [],
      });
      res.send(result);
    });

    app.get("/complaints", async (req, res) => {
      const cursor = complaintsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/complaints/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = complaintsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/complaints/employee/:id", async (req, res) => {
      try {
        const employeeId = req.params.id;
        // Query employeeId as a string to match the current data in the database
        const query = { employeeId: employeeId };
        const cursor = complaintsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // NEW: GET /complaints/:id - Fetch a single complaint by ID
    app.get("/complaints/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid complaint ID" });
        }
        const complaint = await complaintsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!complaint) {
          return res.status(404).send({ message: "Complaint not found" });
        }
        res.status(200).json(complaint);
      } catch (err) {
        console.error("Error fetching complaint:", err);
        res.status(500).send({ error: err.message });
      }
    });

    app.put("/complaints/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status, history, employeeId } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid complaint ID" });
        }

        const complaint = await complaintsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!complaint) {
          return res.status(404).send({ message: "Complaint not found" });
        }

        const validTransitions = {
          Pending: ["Viewed", "Assigned"],
          Viewed: ["Assigned"],
          Assigned: ["Ongoing", "Resolved"],
          Ongoing: ["Resolved"],
        };

        if (!status || !validTransitions[complaint.status]?.includes(status)) {
          return res.status(400).send({
            message: `Invalid status transition from ${complaint.status} to ${
              status || "undefined"
            }`,
          });
        }

        let newHistory = complaint.history || [];
        if (history) {
          try {
            newHistory = JSON.parse(history);
          } catch (err) {
            return res.status(400).send({ message: "Invalid history format" });
          }
        }

        const updateDoc = {
          $set: {
            status,
            history: newHistory,
          },
        };

        if (status === "Assigned") {
          if (!employeeId) {
            return res.status(400).send({
              message: "employeeId is required when assigning a complaint",
            });
          }
          // Store employeeId as an ObjectId for future consistency
          updateDoc.$set.employeeId = ObjectId.isValid(employeeId)
            ? new ObjectId(employeeId)
            : employeeId;
        } else if (status === "Pending" || status === "Viewed") {
          updateDoc.$set.employeeId = null;
        }

        const result = await complaintsCollection.updateOne(
          { _id: new ObjectId(id) },
          updateDoc
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
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