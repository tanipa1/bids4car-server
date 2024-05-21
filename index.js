const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
const axios = require("axios");

// middlewear
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k8q0byg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    /* Database and Collections:  */
    const userCollection = client.db("Bids4Car").collection("users");
    const rateCollection = client.db("Bids4Car").collection("rates");
    const ridesharersCollection = client
      .db("Bids4Car")
      .collection("ridesharers");

    /* ==================== USER ==================== */
    // User Data Post
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const exitingUser = await userCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // User Data Get
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Delete Specific services
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    /* ==================== Ridesharers ==================== */
    // Ridesharers Data Post
    app.post("/ridesharers", async (req, res) => {
      const ridesharers = req.body;
      const query = { email: ridesharers.email };
      const exitingUser = await ridesharersCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: "ridesharers already exists" });
      }
      const result = await ridesharersCollection.insertOne(ridesharers);
      res.send(result);
    });

    // Ridesharers Data Get
    app.get("/ridesharers", async (req, res) => {
      const result = await ridesharersCollection.find().toArray();
      res.send(result);
    });

    // Delete Specific shops
    app.delete("/ridesharers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ridesharersCollection.deleteOne(query);
      res.send(result);
    });

    // Approve the shops
    app.patch("/ridesharers/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const ridesharers = req.body;
      const updateDoc = {
        $set: {
          status: true,
        },
      };
      const result = await ridesharersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /* ==================== Map ==================== */
    app.post("/calculate-distance", async (req, res) => {
      const { pickup, destination } = req.body;

      // Use OpenStreetMap Nominatim API to get coordinates for pickup and destination
      const [pickupCoords, destCoords] = await Promise.all([
        axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            pickup
          )}&format=json`
        ),
        axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            destination
          )}&format=json`
        ),
      ]);

      // Extract latitude and longitude from the response
      const pickupLngLat = [
        parseFloat(pickupCoords.data[0].lat),
        parseFloat(pickupCoords.data[0].lon),
      ];
      const destLngLat = [
        parseFloat(destCoords.data[0].lat),
        parseFloat(destCoords.data[0].lon),
      ];

      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        pickupLngLat[0],
        pickupLngLat[1],
        destLngLat[0],
        destLngLat[1]
      );

      res.json({ distance });
    });

    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radius of the earth in km
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // Distance in km
      return distance;
    }

    /* ==================== Set Rent ==================== */
    // Add a Rate
    app.post("/rates", async (req, res) => {
      const rates = req.body;
      const query = { carType: rates.carType };
      const exitingRate = await rateCollection.findOne(query);
      if (exitingRate) {
        return res.send({ message: "rate already exists" });
      }
      const result = await rateCollection.insertOne(rates);
      res.send(result);
    });

    // Update Rate
    app.patch("/rates/:carType", async (req, res) => {
      const rates = req.body;
      const carType = req.params.carType;
      const filter = { carType: carType };
      const updateDoc = {
        $set: {
          rent: rates.rent,
        },
      };
      const result = await rateCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /* ==================== END ==================== */

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Bids4CarRents!");
});

app.listen(port, () => {
  console.log(`Bids4CarRents listening on port ${port}`);
});
